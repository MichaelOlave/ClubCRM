# ruff: noqa: E402,I001
import os
import unittest
from contextlib import contextmanager
from unittest.mock import patch

from fastapi.testclient import TestClient
from helpers import add_api_root_to_path

add_api_root_to_path()

from src.bootstrap.app_factory import create_app
from src.bootstrap.dependencies import (
    get_app_settings,
    get_auth_session_store,
    get_authorization_repository,
    get_optional_auth_identity_provider,
)
from src.config import get_settings
from src.modules.auth.application.ports.auth_session_store import (
    AuthSessionRecord,
    AuthSessionStore,
)
from src.modules.auth.application.ports.authorization_repository import (
    AuthorizationRepository,
    AuthorizationResolution,
    ClubManagerGrant,
)
from src.modules.auth.application.ports.identity_provider import AuthIdentityProvider
from src.modules.auth.domain.entities import AppAccess, CurrentUser


class InMemoryAuthSessionStore(AuthSessionStore):
    def __init__(self) -> None:
        self.records: dict[str, AuthSessionRecord] = {}
        self.created_count = 0
        self.touched: set[str] = set()

    def create(self, record: AuthSessionRecord) -> str:
        self.created_count += 1
        session_id = f"session-{self.created_count}"
        self.records[session_id] = record
        return session_id

    def get(self, session_id: str) -> AuthSessionRecord | None:
        return self.records.get(session_id)

    def save(self, session_id: str, record: AuthSessionRecord) -> None:
        self.records[session_id] = record

    def delete(self, session_id: str) -> None:
        self.records.pop(session_id, None)

    def touch(self, session_id: str) -> None:
        if session_id in self.records:
            self.touched.add(session_id)


class FakeAuthIdentityProvider(AuthIdentityProvider):
    async def build_login_url(self, redirect_uri: str, state: str) -> str:
        return f"https://auth.example/authorize?redirect_uri={redirect_uri}&state={state}"

    async def exchange_code_for_user(self, code: str, redirect_uri: str) -> CurrentUser:
        _ = redirect_uri
        if code == "bad-code":
            raise ValueError("bad code")

        return CurrentUser(
            sub="auth0|user-123",
            email="manager@example.edu",
            name="Morgan Manager",
            email_verified=True,
        )

    def build_logout_url(self, return_to_url: str) -> str:
        return f"https://auth.example/logout?returnTo={return_to_url}"


class FakeAuthorizationRepository(AuthorizationRepository):
    def __init__(self) -> None:
        self.email_resolution_count = 0
        self.subject_resolution_count = 0
        self.inactive_admin_emails: set[str] = set()
        self.subject_bindings: dict[str, AuthorizationResolution] = {}
        self.email_grants: dict[str, AuthorizationResolution] = {
            "developer@clubcrm.local": AuthorizationResolution(
                admin_user_id="admin-user-1",
                member_id=None,
                access=AppAccess(
                    primary_role="org_admin",
                    organization_id="org-1",
                    managed_club_ids=(),
                ),
            ),
            "manager@example.edu": AuthorizationResolution(
                admin_user_id=None,
                member_id="member-1",
                access=AppAccess(
                    primary_role="club_manager",
                    organization_id="org-1",
                    managed_club_ids=("club-1",),
                ),
            ),
        }

    def resolve_access_for_identity(
        self,
        *,
        provider_subject: str,
        email: str | None,
    ) -> AuthorizationResolution:
        if provider_subject in self.subject_bindings:
            self.subject_resolution_count += 1
            return self.subject_bindings[provider_subject]

        if email is not None and email in self.inactive_admin_emails:
            return AuthorizationResolution(
                admin_user_id=None,
                member_id=None,
                access=None,
            )

        if email is not None and email in self.email_grants:
            self.email_resolution_count += 1
            resolution = self.email_grants[email]
            self.subject_bindings[provider_subject] = resolution
            return resolution

        return AuthorizationResolution(
            admin_user_id=None,
            member_id=None,
            access=None,
        )

    def list_club_manager_grants(self, club_id: str) -> list[ClubManagerGrant]:
        _ = club_id
        return []

    def create_club_manager_grant(
        self,
        *,
        club_id: str,
        member_id: str,
        role_name: str,
    ) -> ClubManagerGrant:
        raise NotImplementedError((club_id, member_id, role_name))

    def delete_club_manager_grant(self, *, club_id: str, grant_id: str) -> bool:
        raise NotImplementedError((club_id, grant_id))


@contextmanager
def auth_test_environment(**overrides: str | None):
    original_values = {key: os.environ.get(key) for key in overrides}

    try:
        for key, value in overrides.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

        get_settings.cache_clear()
        get_app_settings.cache_clear()
        get_auth_session_store.cache_clear()
        yield
    finally:
        for key, value in original_values.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

        get_settings.cache_clear()
        get_app_settings.cache_clear()
        get_auth_session_store.cache_clear()


@contextmanager
def auth_test_client(
    *,
    store: AuthSessionStore | None = None,
    provider: AuthIdentityProvider | None = None,
    authorization_repository: AuthorizationRepository | None = None,
    **environment: str | None,
):
    active_store = store or InMemoryAuthSessionStore()
    active_authorization_repository = authorization_repository or FakeAuthorizationRepository()

    with auth_test_environment(**environment):
        with patch(
            "src.modules.auth.presentation.http.dependencies.get_auth_session_store",
            return_value=active_store,
        ):
            with patch(
                "src.modules.auth.presentation.http.dependencies.get_authorization_repository",
                return_value=active_authorization_repository,
            ):
                app = create_app()
                app.dependency_overrides[get_authorization_repository] = (
                    lambda: active_authorization_repository
                )
                if provider is not None:
                    app.dependency_overrides[get_optional_auth_identity_provider] = lambda: provider

                with TestClient(app) as client:
                    yield client, active_store, active_authorization_repository


class AuthRouteTests(unittest.TestCase):
    def test_auth_routes_are_registered_on_the_app(self) -> None:
        with auth_test_environment(IS_AUTH_BYPASS="true"):
            app = create_app()
            registered_paths = {route.path for route in app.router.routes}

        self.assertIn("/auth/login", registered_paths)
        self.assertIn("/auth/callback", registered_paths)
        self.assertIn("/auth/session", registered_paths)
        self.assertIn("/auth/logout", registered_paths)

    def test_bypass_login_creates_a_redis_session_and_csrf_cookie(self) -> None:
        with auth_test_client(
            IS_AUTH_BYPASS="true",
            AUTH_LOGIN_SUCCESS_URL="http://localhost:3000/dashboard",
        ) as (client, store, _authorization_repository):
            response = client.get("/auth/login", follow_redirects=False)

            self.assertEqual(response.status_code, 307)
            self.assertEqual(response.headers["location"], "http://localhost:3000/dashboard")

            session_id = client.cookies.get("clubcrm_session")
            csrf_token = client.cookies.get("clubcrm_csrf")
            self.assertIsNotNone(session_id)
            self.assertIsNotNone(csrf_token)

            session_record = store.get(session_id or "")
            self.assertIsNotNone(session_record)
            self.assertEqual(
                session_record.user,
                {
                    "sub": "dev-auth-bypass-user",
                    "email": "developer@clubcrm.local",
                    "name": "Local Developer",
                    "picture": None,
                    "email_verified": True,
                },
            )
            self.assertEqual(
                session_record.access,
                {
                    "primary_role": "org_admin",
                    "organization_id": "org-1",
                    "managed_club_ids": [],
                },
            )
            self.assertEqual(session_record.csrf_token, csrf_token)
            self.assertIsNone(session_record.auth_flow_state)

            session_response = client.get("/auth/session")
            payload = session_response.json()

            self.assertTrue(payload["authenticated"])
            self.assertTrue(payload["authorized"])
            self.assertEqual(payload["user"]["email"], "developer@clubcrm.local")
            self.assertEqual(payload["access"]["primaryRole"], "org_admin")
            self.assertEqual(payload["csrfToken"], csrf_token)
            self.assertIn(session_id or "", store.touched)

    def test_login_creates_a_pre_auth_session_when_auth0_is_enabled(self) -> None:
        with auth_test_client(
            provider=FakeAuthIdentityProvider(),
            IS_AUTH_BYPASS="false",
            AUTH0_DOMAIN="example.us.auth0.com",
            AUTH0_CLIENT_ID="client-id",
            AUTH0_CLIENT_SECRET="client-secret",
        ) as (client, store, _authorization_repository):
            response = client.get("/auth/login", follow_redirects=False)

            self.assertEqual(response.status_code, 307)
            self.assertIn("https://auth.example/authorize", response.headers["location"])

            session_id = client.cookies.get("clubcrm_session")
            self.assertIsNotNone(session_id)
            self.assertIsNone(client.cookies.get("clubcrm_csrf"))

            session_record = store.get(session_id or "")
            self.assertIsNotNone(session_record)
            self.assertIsNone(session_record.user)
            self.assertIsNone(session_record.csrf_token)
            self.assertIsNotNone(session_record.auth_flow_state)

    def test_callback_rotates_the_pre_auth_session_into_an_authenticated_session(self) -> None:
        with auth_test_client(
            provider=FakeAuthIdentityProvider(),
            IS_AUTH_BYPASS="false",
            AUTH0_DOMAIN="example.us.auth0.com",
            AUTH0_CLIENT_ID="client-id",
            AUTH0_CLIENT_SECRET="client-secret",
            AUTH_LOGIN_SUCCESS_URL="http://localhost:3000/dashboard",
        ) as (client, store, _authorization_repository):
            client.get("/auth/login", follow_redirects=False)
            pre_auth_session_id = client.cookies.get("clubcrm_session")
            pre_auth_session = store.get(pre_auth_session_id or "")
            state = pre_auth_session.auth_flow_state if pre_auth_session is not None else None

            response = client.get(
                f"/auth/callback?code=code-123&state={state}",
                follow_redirects=False,
            )

            self.assertEqual(response.status_code, 303)
            self.assertEqual(response.headers["location"], "http://localhost:3000/dashboard")

            authenticated_session_id = client.cookies.get("clubcrm_session")
            csrf_token = client.cookies.get("clubcrm_csrf")
            self.assertIsNotNone(authenticated_session_id)
            self.assertIsNotNone(csrf_token)
            self.assertNotEqual(pre_auth_session_id, authenticated_session_id)
            self.assertIsNone(store.get(pre_auth_session_id or ""))

            authenticated_session = store.get(authenticated_session_id or "")
            self.assertIsNotNone(authenticated_session)
            self.assertEqual(
                authenticated_session.user,
                {
                    "sub": "auth0|user-123",
                    "email": "manager@example.edu",
                    "name": "Morgan Manager",
                    "picture": None,
                    "email_verified": True,
                },
            )
            self.assertEqual(
                authenticated_session.access,
                {
                    "primary_role": "club_manager",
                    "organization_id": "org-1",
                    "managed_club_ids": ["club-1"],
                },
            )
            self.assertEqual(authenticated_session.csrf_token, csrf_token)
            self.assertIsNone(authenticated_session.auth_flow_state)

            session_response = client.get("/auth/session")
            payload = session_response.json()
            self.assertTrue(payload["authenticated"])
            self.assertTrue(payload["authorized"])
            self.assertEqual(payload["access"]["primaryRole"], "club_manager")
            self.assertEqual(payload["access"]["managedClubIds"], ["club-1"])

    def test_callback_binds_by_email_then_refreshes_existing_session_by_subject(self) -> None:
        authorization_repository = FakeAuthorizationRepository()
        with auth_test_client(
            provider=FakeAuthIdentityProvider(),
            authorization_repository=authorization_repository,
            IS_AUTH_BYPASS="false",
            AUTH0_DOMAIN="example.us.auth0.com",
            AUTH0_CLIENT_ID="client-id",
            AUTH0_CLIENT_SECRET="client-secret",
            AUTH_LOGIN_SUCCESS_URL="http://localhost:3000/dashboard",
        ) as (client, _store, _repo):
            client.get("/auth/login", follow_redirects=False)
            state = client.cookies.get("clubcrm_session")
            self.assertIsNotNone(state)

            session_record = _store.get(state or "")
            callback_state = session_record.auth_flow_state if session_record is not None else None
            client.get(
                f"/auth/callback?code=code-123&state={callback_state}",
                follow_redirects=False,
            )

            self.assertEqual(authorization_repository.email_resolution_count, 1)
            self.assertEqual(authorization_repository.subject_resolution_count, 0)

            authorization_repository.email_grants.pop("manager@example.edu", None)

            response = client.get("/auth/login", follow_redirects=False)

            self.assertEqual(response.status_code, 307)
            self.assertEqual(authorization_repository.email_resolution_count, 1)
            self.assertGreaterEqual(authorization_repository.subject_resolution_count, 1)

            session_payload = client.get("/auth/session").json()
            self.assertTrue(session_payload["authorized"])
            self.assertEqual(session_payload["access"]["primaryRole"], "club_manager")

    def test_authenticated_session_without_a_matching_grant_returns_authorized_false(self) -> None:
        authorization_repository = FakeAuthorizationRepository()
        authorization_repository.email_grants.pop("developer@clubcrm.local", None)

        with auth_test_client(
            authorization_repository=authorization_repository,
            IS_AUTH_BYPASS="true",
            AUTH_LOGIN_SUCCESS_URL="http://localhost:3000/dashboard",
        ) as (client, store, _repo):
            response = client.get("/auth/login", follow_redirects=False)

            self.assertEqual(response.status_code, 307)
            session_id = client.cookies.get("clubcrm_session")
            session_record = store.get(session_id or "")
            self.assertIsNotNone(session_record)
            self.assertIsNone(session_record.access)

            session_payload = client.get("/auth/session").json()
            self.assertTrue(session_payload["authenticated"])
            self.assertFalse(session_payload["authorized"])
            self.assertIsNone(session_payload["access"])

    def test_inactive_admin_grant_is_denied(self) -> None:
        authorization_repository = FakeAuthorizationRepository()
        authorization_repository.email_grants["manager@example.edu"] = AuthorizationResolution(
            admin_user_id="admin-user-2",
            member_id=None,
            access=AppAccess(
                primary_role="org_admin",
                organization_id="org-1",
                managed_club_ids=(),
            ),
        )
        authorization_repository.inactive_admin_emails.add("manager@example.edu")

        with auth_test_client(
            provider=FakeAuthIdentityProvider(),
            authorization_repository=authorization_repository,
            IS_AUTH_BYPASS="false",
            AUTH0_DOMAIN="example.us.auth0.com",
            AUTH0_CLIENT_ID="client-id",
            AUTH0_CLIENT_SECRET="client-secret",
            AUTH_LOGIN_SUCCESS_URL="http://localhost:3000/dashboard",
        ) as (client, store, _repo):
            client.get("/auth/login", follow_redirects=False)
            pre_auth_session_id = client.cookies.get("clubcrm_session")
            pre_auth_session = store.get(pre_auth_session_id or "")
            state = pre_auth_session.auth_flow_state if pre_auth_session is not None else None

            response = client.get(
                f"/auth/callback?code=code-123&state={state}",
                follow_redirects=False,
            )

            self.assertEqual(response.status_code, 303)

            session_payload = client.get("/auth/session").json()
            self.assertTrue(session_payload["authenticated"])
            self.assertFalse(session_payload["authorized"])
            self.assertIsNone(session_payload["access"])

    def test_callback_returns_400_when_the_pre_auth_session_is_missing(self) -> None:
        with auth_test_client(
            provider=FakeAuthIdentityProvider(),
            IS_AUTH_BYPASS="false",
            AUTH0_DOMAIN="example.us.auth0.com",
            AUTH0_CLIENT_ID="client-id",
            AUTH0_CLIENT_SECRET="client-secret",
        ) as (client, store, _authorization_repository):
            client.get("/auth/login", follow_redirects=False)
            session_id = client.cookies.get("clubcrm_session")
            session_record = store.get(session_id or "")
            state = session_record.auth_flow_state if session_record is not None else None
            store.delete(session_id or "")

            response = client.get(
                f"/auth/callback?code=code-123&state={state}",
                follow_redirects=False,
            )

            self.assertEqual(response.status_code, 400)

    def test_callback_returns_400_when_the_state_does_not_match(self) -> None:
        with auth_test_client(
            provider=FakeAuthIdentityProvider(),
            IS_AUTH_BYPASS="false",
            AUTH0_DOMAIN="example.us.auth0.com",
            AUTH0_CLIENT_ID="client-id",
            AUTH0_CLIENT_SECRET="client-secret",
        ) as (client, _store, _authorization_repository):
            client.get("/auth/login", follow_redirects=False)

            response = client.get(
                "/auth/callback?code=code-123&state=wrong-state",
                follow_redirects=False,
            )

            self.assertEqual(response.status_code, 400)

    def test_logout_requires_a_csrf_header(self) -> None:
        with auth_test_client(IS_AUTH_BYPASS="true") as (client, _store, _authorization_repository):
            client.get("/auth/login", follow_redirects=False)

            response = client.post("/auth/logout", follow_redirects=False)

            self.assertEqual(response.status_code, 403)

    def test_logout_clears_the_redis_session_when_csrf_is_valid(self) -> None:
        with auth_test_client(
            IS_AUTH_BYPASS="true",
            AUTH_LOGOUT_REDIRECT_URL="http://localhost:3000/login",
        ) as (client, store, _authorization_repository):
            client.get("/auth/login", follow_redirects=False)

            session_id = client.cookies.get("clubcrm_session")
            csrf_token = client.cookies.get("clubcrm_csrf")
            response = client.post(
                "/auth/logout",
                headers={"X-CSRF-Token": csrf_token or ""},
                follow_redirects=False,
            )

            self.assertEqual(response.status_code, 303)
            self.assertEqual(response.headers["location"], "http://localhost:3000/login")
            self.assertIsNone(store.get(session_id or ""))

            session_response = client.get("/auth/session")
            payload = session_response.json()

            self.assertFalse(payload["authenticated"])
            self.assertIsNone(payload["csrfToken"])

    def test_login_requires_auth0_when_bypass_is_disabled(self) -> None:
        with auth_test_environment(
            IS_AUTH_BYPASS="false",
            AUTH0_DOMAIN=None,
            AUTH0_CLIENT_ID=None,
            AUTH0_CLIENT_SECRET=None,
        ):
            app = create_app()
            app.dependency_overrides[get_authorization_repository] = (
                lambda: FakeAuthorizationRepository()
            )
            client = TestClient(app)

            response = client.get("/auth/login", follow_redirects=False)

            self.assertEqual(response.status_code, 503)

    def test_login_returns_503_when_optional_auth_provider_dependency_is_missing(self) -> None:
        missing_authlib_error = ModuleNotFoundError("No module named 'authlib'")
        missing_authlib_error.name = "authlib"

        with auth_test_environment(
            IS_AUTH_BYPASS="false",
            AUTH0_DOMAIN="example.us.auth0.com",
            AUTH0_CLIENT_ID="client-id",
            AUTH0_CLIENT_SECRET="client-secret",
        ):
            with patch(
                "src.bootstrap.dependencies.import_module",
                side_effect=missing_authlib_error,
            ):
                app = create_app()
                app.dependency_overrides[get_authorization_repository] = (
                    lambda: FakeAuthorizationRepository()
                )
                client = TestClient(app)

                response = client.get("/auth/login", follow_redirects=False)

        self.assertEqual(response.status_code, 503)
