import asyncio
import unittest

from helpers import add_api_root_to_path, collect_import_violations

add_api_root_to_path()

from src.modules.auth.application.commands.finalize_auth_session import FinalizeAuthSession
from src.modules.auth.application.commands.start_login import StartLogin
from src.modules.auth.application.ports.identity_provider import AuthIdentityProvider
from src.modules.auth.application.queries.get_current_user import GetCurrentUser
from src.modules.auth.domain.entities import CurrentUser


class FakeAuthIdentityProvider(AuthIdentityProvider):
    async def build_login_url(self, redirect_uri: str, state: str) -> str:
        return f"{redirect_uri}?state={state}"

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
        return return_to_url


class AuthBoundaryTests(unittest.TestCase):
    def test_auth_application_avoids_framework_and_infrastructure_imports(self) -> None:
        violations = collect_import_violations(
            "modules/auth/application", ("fastapi", "src.infrastructure")
        )

        self.assertEqual(violations, [])

    def test_start_login_uses_the_identity_provider_port(self) -> None:
        login_url = asyncio.run(
            StartLogin(provider=FakeAuthIdentityProvider()).execute(
                redirect_uri="http://localhost:8000/auth/callback",
                state="state-123",
            )
        )

        self.assertEqual(
            login_url,
            "http://localhost:8000/auth/callback?state=state-123",
        )

    def test_finalize_auth_session_uses_the_identity_provider_port(self) -> None:
        current_user = asyncio.run(
            FinalizeAuthSession(provider=FakeAuthIdentityProvider()).execute(
                authorization_code="code-123",
                redirect_uri="http://localhost:8000/auth/callback",
            )
        )

        self.assertEqual(current_user.sub, "auth0|user-123")
        self.assertEqual(current_user.email, "manager@example.edu")
        self.assertTrue(current_user.email_verified)

    def test_get_current_user_rehydrates_a_session_payload(self) -> None:
        current_user = GetCurrentUser().execute(
            {
                "sub": "auth0|user-123",
                "email": "manager@example.edu",
                "name": "Morgan Manager",
                "email_verified": True,
            }
        )

        self.assertEqual(current_user.name, "Morgan Manager")

    def test_finalize_auth_session_surfaces_provider_failures(self) -> None:
        with self.assertRaises(ValueError):
            asyncio.run(
                FinalizeAuthSession(provider=FakeAuthIdentityProvider()).execute(
                    authorization_code="bad-code",
                    redirect_uri="http://localhost:8000/auth/callback",
                )
            )
