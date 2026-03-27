from abc import ABC, abstractmethod

from src.modules.forms.domain.entities import JoinRequest


class JoinRequestStore(ABC):
    @abstractmethod
    def save(self, join_request: JoinRequest) -> JoinRequest:
        """Persist a raw join request document."""
