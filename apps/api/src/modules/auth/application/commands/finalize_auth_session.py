from dataclasses import dataclass

from src.modules.auth.application.ports.identity_provider import AuthIdentityProvider
from src.modules.auth.domain.entities import CurrentUser


@dataclass(frozen=True)
class FinalizeAuthSession:
    provider: AuthIdentityProvider

    async def execute(self, authorization_code: str, redirect_uri: str) -> CurrentUser:
        return await self.provider.exchange_code_for_user(
            code=authorization_code,
            redirect_uri=redirect_uri,
        )
