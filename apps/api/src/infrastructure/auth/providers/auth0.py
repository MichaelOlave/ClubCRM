from dataclasses import dataclass
from urllib.parse import quote_plus, urlencode

import httpx
from authlib.integrations.httpx_client.oauth2_client import AsyncOAuth2Client

from src.modules.auth.application.ports.identity_provider import (
    AuthIdentityProvider,
    AuthIdentityProviderError,
)
from src.modules.auth.domain.entities import CurrentUser


@dataclass(frozen=True)
class Auth0IdentityProvider(AuthIdentityProvider):
    domain: str
    client_id: str
    client_secret: str
    scopes: str

    @property
    def authorize_url(self) -> str:
        return f"https://{self.domain}/authorize"

    @property
    def token_url(self) -> str:
        return f"https://{self.domain}/oauth/token"

    @property
    def userinfo_url(self) -> str:
        return f"https://{self.domain}/userinfo"

    def build_logout_url(self, return_to_url: str) -> str:
        return "https://{domain}/v2/logout?{query}".format(
            domain=self.domain,
            query=urlencode(
                {
                    "returnTo": return_to_url,
                    "client_id": self.client_id,
                },
                quote_via=quote_plus,
            ),
        )

    async def build_login_url(self, redirect_uri: str, state: str) -> str:
        client = AsyncOAuth2Client(
            client_id=self.client_id,
            client_secret=self.client_secret,
            scope=self.scopes,
            redirect_uri=redirect_uri,
        )
        try:
            authorization_url, _ = client.create_authorization_url(
                self.authorize_url,
                state=state,
            )
        except Exception as exc:  # pragma: no cover
            raise AuthIdentityProviderError("Unable to build the Auth0 login URL.") from exc

        return str(authorization_url)

    async def exchange_code_for_user(self, code: str, redirect_uri: str) -> CurrentUser:
        token_client = AsyncOAuth2Client(
            client_id=self.client_id,
            client_secret=self.client_secret,
            scope=self.scopes,
            redirect_uri=redirect_uri,
        )
        try:
            token = await token_client.fetch_token(
                url=self.token_url,
                code=code,
                grant_type="authorization_code",
            )
        except (httpx.HTTPError, ValueError) as exc:
            raise AuthIdentityProviderError("Unable to complete the Auth0 login flow.") from exc

        user_client = AsyncOAuth2Client(token=token)
        try:
            response = await user_client.request("GET", self.userinfo_url)
            response.raise_for_status()
            claims = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise AuthIdentityProviderError("Unable to complete the Auth0 login flow.") from exc

        subject = claims.get("sub")
        if not isinstance(subject, str) or not subject:
            raise AuthIdentityProviderError(
                "Auth0 user information is missing a subject identifier."
            )

        email = claims.get("email")
        name = claims.get("name") or claims.get("nickname")
        picture = claims.get("picture")

        return CurrentUser(
            sub=subject,
            email=email if isinstance(email, str) and email else None,
            name=name if isinstance(name, str) and name else None,
            picture=picture if isinstance(picture, str) and picture else None,
            email_verified=bool(claims.get("email_verified", False)),
        )
