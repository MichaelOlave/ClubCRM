import asyncio
import unittest

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.infrastructure.auth.providers.auth0 import Auth0IdentityProvider
from src.modules.auth.application.ports.identity_provider import AuthIdentityProvider


class AuthInfrastructureContractTests(unittest.TestCase):
    def test_auth0_identity_provider_matches_the_port(self) -> None:
        provider = Auth0IdentityProvider(
            domain="example.us.auth0.com",
            client_id="client-id",
            client_secret="client-secret",
            scopes="openid profile email",
        )

        self.assertIsInstance(provider, AuthIdentityProvider)

    def test_auth0_identity_provider_builds_expected_urls(self) -> None:
        provider = Auth0IdentityProvider(
            domain="example.us.auth0.com",
            client_id="client-id",
            client_secret="client-secret",
            scopes="openid profile email",
        )

        logout_url = provider.build_logout_url("http://localhost:3000/login")
        login_url = asyncio.run(
            provider.build_login_url(
                redirect_uri="http://localhost:8000/auth/callback",
                state="state-123",
            )
        )

        self.assertIn("v2/logout", logout_url)
        self.assertIn("returnTo=http%3A%2F%2Flocalhost%3A3000%2Flogin", logout_url)
        self.assertIn("https://example.us.auth0.com/authorize", login_url)
        self.assertIn("state=state-123", login_url)
