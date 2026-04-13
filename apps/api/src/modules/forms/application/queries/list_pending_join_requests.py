from dataclasses import dataclass

from src.modules.forms.application.ports.join_request_store import JoinRequestStore
from src.modules.forms.domain.entities import JoinRequest


@dataclass
class ListPendingJoinRequests:
    store: JoinRequestStore

    def execute(self, club_id: str) -> list[JoinRequest]:
        return self.store.list_pending(club_id)
