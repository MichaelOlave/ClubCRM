from dataclasses import replace
from datetime import UTC, datetime
from typing import Any

import pymongo
from bson import ObjectId
from bson.errors import InvalidId

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

    def list_pending(self, club_id: str) -> list[JoinRequest]:
        docs = self.client.get_database()["join_requests"].find(
            {"clubId": club_id, "status": "pending"}
        )
        return [self._to_entity(doc) for doc in docs]

    def get(self, join_request_id: str) -> JoinRequest | None:
        try:
            doc = self.client.get_database()["join_requests"].find_one(
                {"_id": ObjectId(join_request_id)}
            )
        except InvalidId:
            return None
        if doc is None:
            return None
        return self._to_entity(doc)

    def update_status(self, join_request_id: str, status: str) -> JoinRequest:
        doc = self.client.get_database()["join_requests"].find_one_and_update(
            {"_id": ObjectId(join_request_id)},
            {"$set": {"status": status}},
            return_document=pymongo.ReturnDocument.AFTER,
        )
        if doc is None:
            raise ValueError(f"Join request {join_request_id!r} not found.")
        return self._to_entity(doc)

    def _to_entity(self, doc: dict[str, Any]) -> JoinRequest:
        return JoinRequest(
            id=str(doc["_id"]),
            organization_id=doc["organizationId"],
            club_id=doc["clubId"],
            submitter_name=doc["submitter"]["name"],
            submitter_email=doc["submitter"]["email"],
            payload=doc.get("payload", {}),
            status=doc["status"],
        )
