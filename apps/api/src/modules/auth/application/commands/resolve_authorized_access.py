from dataclasses import dataclass

from src.modules.auth.application.ports.authorization_repository import (
    AuthorizationRepository,
    AuthorizationResolution,
)
from src.modules.auth.domain.entities import CurrentUser


@dataclass(frozen=True)
class ResolveAuthorizedAccess:
    repository: AuthorizationRepository

    def execute(self, current_user: CurrentUser) -> AuthorizationResolution:
        return self.repository.resolve_access_for_identity(
            provider_subject=current_user.sub,
            email=current_user.email,
        )
