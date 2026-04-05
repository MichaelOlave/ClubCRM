from dataclasses import dataclass

from src.modules.auth.application.ports.identity_provider import AuthIdentityProvider


@dataclass(frozen=True)
class StartLogin:
    provider: AuthIdentityProvider

    async def execute(self, redirect_uri: str, state: str) -> str:
        return await self.provider.build_login_url(
            redirect_uri=redirect_uri,
            state=state,
        )
