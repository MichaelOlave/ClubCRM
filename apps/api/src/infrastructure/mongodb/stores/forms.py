from dataclasses import replace
from datetime import UTC, datetime

from src.infrastructure.mongodb.client import MongoDBClient
from src.modules.forms.application.ports.join_request_store import JoinRequestStore
from src.modules.forms.domain.entities import JoinRequest


class MongoDBJoinRequestStore(JoinRequestStore):
    def __init__(self, client: MongoDBClient) -> None:
        self.client = client

    def save(self, join_request: JoinRequest) -> JoinRequest:
        doc = {
            "organizationId": join_request.organization_id,
            "clubId": join_request.club_id,
            "formType": "join_request",
            "submittedAt": datetime.now(UTC),
            "submitter": {
                "name": join_request.submitter_name,
                "email": join_request.submitter_email,
            },
            "payload": join_request.payload,
            "status": join_request.status,
        }
        result = self.client.get_database()["join_requests"].insert_one(doc)
        return replace(join_request, id=str(result.inserted_id))
