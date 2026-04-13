from dataclasses import dataclass

from src.modules.forms.application.ports.join_request_store import JoinRequestStore
from src.modules.forms.domain.entities import JoinRequest


@dataclass
class DenyJoinRequest:
    join_request_store: JoinRequestStore

    def execute(self, join_request_id: str) -> JoinRequest:
        join_request = self.join_request_store.get(join_request_id)
        if join_request is None:
            raise ValueError(f"Join request {join_request_id!r} not found.")
        if join_request.status != "pending":
            raise ValueError(
                f"Join request {join_request_id!r} has status {join_request.status!r} "
                "and cannot be denied."
            )

        return self.join_request_store.update_status(join_request_id, "denied")
