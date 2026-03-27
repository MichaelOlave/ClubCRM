from dataclasses import replace
from uuid import uuid4

from src.infrastructure.mongodb.client import MongoDBClient
from src.modules.forms.application.ports.join_request_store import JoinRequestStore
from src.modules.forms.domain.entities import JoinRequest


class MongoDBJoinRequestStore(JoinRequestStore):
    def __init__(self, client: MongoDBClient) -> None:
        self.client = client

    def save(self, join_request: JoinRequest) -> JoinRequest:
        _ = self.client

        if join_request.id is not None:
            return join_request

        return replace(join_request, id=str(uuid4()))
