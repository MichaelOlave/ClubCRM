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
    get_optional_auth_identity_provider,
)
from src.config import get_settings
from src.modules.auth.application.ports.auth_session_store import (
    AuthSessionRecord,
    AuthSessionStore,
)
from src.modules.auth.application.ports.identity_provider import AuthIdentityProvider
from src.modules.auth.domain.entities import CurrentUser


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
    **environment: str | None,
):
    active_store = store or InMemoryAuthSessionStore()

    with auth_test_environment(**environment):
        with patch(
            "src.modules.auth.presentation.http.dependencies.get_auth_session_store",
            return_value=active_store,
        ):
            app = create_app()
            if provider is not None:
                app.dependency_overrides[get_optional_auth_identity_provider] = lambda: provider

            with TestClient(app) as client:
                yield client, active_store


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
        ) as (client, store):
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
            self.assertEqual(session_record.csrf_token, csrf_token)
            self.assertIsNone(session_record.auth_flow_state)

            session_response = client.get("/auth/session")
            payload = session_response.json()

            self.assertTrue(payload["authenticated"])
            self.assertEqual(payload["user"]["email"], "developer@clubcrm.local")
            self.assertEqual(payload["csrfToken"], csrf_token)
            self.assertIn(session_id or "", store.touched)

    def test_login_creates_a_pre_auth_session_when_auth0_is_enabled(self) -> None:
        with auth_test_client(
            provider=FakeAuthIdentityProvider(),
            IS_AUTH_BYPASS="false",
            AUTH0_DOMAIN="example.us.auth0.com",
            AUTH0_CLIENT_ID="client-id",
            AUTH0_CLIENT_SECRET="client-secret",
        ) as (client, store):
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
        ) as (client, store):
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
            self.assertEqual(authenticated_session.csrf_token, csrf_token)
            self.assertIsNone(authenticated_session.auth_flow_state)

    def test_callback_returns_400_when_the_pre_auth_session_is_missing(self) -> None:
        with auth_test_client(
            provider=FakeAuthIdentityProvider(),
            IS_AUTH_BYPASS="false",
            AUTH0_DOMAIN="example.us.auth0.com",
            AUTH0_CLIENT_ID="client-id",
            AUTH0_CLIENT_SECRET="client-secret",
        ) as (client, store):
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
        ) as (client, _store):
            client.get("/auth/login", follow_redirects=False)

            response = client.get(
                "/auth/callback?code=code-123&state=wrong-state",
                follow_redirects=False,
            )

            self.assertEqual(response.status_code, 400)

    def test_logout_requires_a_csrf_header(self) -> None:
        with auth_test_client(IS_AUTH_BYPASS="true") as (client, _store):
            client.get("/auth/login", follow_redirects=False)

            response = client.post("/auth/logout", follow_redirects=False)

            self.assertEqual(response.status_code, 403)

    def test_logout_clears_the_redis_session_when_csrf_is_valid(self) -> None:
        with auth_test_client(
            IS_AUTH_BYPASS="true",
            AUTH_LOGOUT_REDIRECT_URL="http://localhost:3000/login",
        ) as (client, store):
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
            client = TestClient(create_app())

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
                client = TestClient(create_app())

                response = client.get("/auth/login", follow_redirects=False)

        self.assertEqual(response.status_code, 503)
