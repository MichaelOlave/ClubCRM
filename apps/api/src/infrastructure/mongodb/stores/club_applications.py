from dataclasses import replace
from datetime import UTC, datetime
from typing import Any

import pymongo
from bson import ObjectId
from bson.errors import InvalidId

from src.infrastructure.mongodb.client import MongoDBClient
from src.modules.forms.application.ports.club_application_store import ClubApplicationStore
from src.modules.forms.domain.entities import ClubApplication


class MongoDBClubApplicationStore(ClubApplicationStore):
    def __init__(self, client: MongoDBClient) -> None:
        self.client = client

    def save(self, application: ClubApplication) -> ClubApplication:
        doc = {
            "organizationId": application.organization_id,
            "formType": "club_application",
            "submittedAt": datetime.now(UTC),
            "applicant": {
                "name": application.applicant_name,
                "email": application.applicant_email,
            },
            "proposedClubName": application.proposed_club_name,
            "description": application.description,
            "payload": application.payload,
            "status": application.status,
        }
        result = self.client.get_database()["club_applications"].insert_one(doc)
        return replace(application, id=str(result.inserted_id))

    def list_pending(self, organization_id: str) -> list[ClubApplication]:
        docs = self.client.get_database()["club_applications"].find(
            {"organizationId": organization_id, "status": "pending"}
        )
        return [self._to_entity(doc) for doc in docs]

    def get(self, application_id: str) -> ClubApplication | None:
        try:
            doc = self.client.get_database()["club_applications"].find_one(
                {"_id": ObjectId(application_id)}
            )
        except InvalidId:
            return None
        if doc is None:
            return None
        return self._to_entity(doc)

    def update_status(self, application_id: str, status: str) -> ClubApplication:
        doc = self.client.get_database()["club_applications"].find_one_and_update(
            {"_id": ObjectId(application_id)},
            {"$set": {"status": status}},
            return_document=pymongo.ReturnDocument.AFTER,
        )
        if doc is None:
            raise ValueError(f"Club application {application_id!r} not found.")
        return self._to_entity(doc)

    def _to_entity(self, doc: dict[str, Any]) -> ClubApplication:
        return ClubApplication(
            id=str(doc["_id"]),
            organization_id=doc["organizationId"],
            applicant_name=doc["applicant"]["name"],
            applicant_email=doc["applicant"]["email"],
            proposed_club_name=doc["proposedClubName"],
            description=doc["description"],
            payload=doc.get("payload", {}),
            status=doc["status"],
        )
