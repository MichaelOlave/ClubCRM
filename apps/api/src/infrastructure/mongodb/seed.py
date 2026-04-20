from __future__ import annotations

from datetime import UTC, datetime

from src.config import get_settings
from src.infrastructure.mongodb.client import MongoDBClient
from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models.tables import ClubModel, OrganizationModel
from src.infrastructure.postgres.seed import DEFAULT_ORGANIZATION_NAME

DEFAULT_CLUB_NAME = "Computer Science Club"

DEFAULT_JOIN_REQUESTS = (
    {
        "submitter": {
            "name": "Casey Nguyen",
            "email": "casey.nguyen@champlain.edu",
        },
        "payload": {
            "student_id": "S100",
            "role": "Treasurer",
            "message": "I would love to help with budgeting and event planning.",
        },
        "status": "pending",
    },
    {
        "submitter": {
            "name": "Jordan Lee",
            "email": "jordan.lee@champlain.edu",
        },
        "payload": {
            "student_id": "S101",
            "role": "General member",
            "message": "Looking for a community to build projects with.",
        },
        "status": "pending",
    },
)


def _create_mongodb_client() -> MongoDBClient:
    return MongoDBClient(database_url=get_settings().mongodb.url)


def _create_postgres_client() -> PostgresClient:
    return PostgresClient(dsn=get_settings().postgres.url)


def seed(
    mongodb_client: MongoDBClient | None = None,
    postgres_client: PostgresClient | None = None,
) -> bool:
    mongo_client = mongodb_client or _create_mongodb_client()
    relational_client = postgres_client or _create_postgres_client()
    database = mongo_client.get_database()
    join_requests = database["join_requests"]

    if join_requests.count_documents({}, limit=1) > 0:
        print("MongoDB seed skipped because join_requests already contains documents.")
        return False

    with relational_client.create_session() as session:
        organization = (
            session.query(OrganizationModel)
            .filter(OrganizationModel.name == DEFAULT_ORGANIZATION_NAME)
            .one_or_none()
        )
        if organization is None:
            print("MongoDB seed skipped because the baseline organization was not found.")
            return False

        club = (
            session.query(ClubModel)
            .filter(
                ClubModel.organization_id == organization.id,
                ClubModel.name == DEFAULT_CLUB_NAME,
            )
            .one_or_none()
        )
        if club is None:
            print("MongoDB seed skipped because the baseline club was not found.")
            return False

    submitted_at = datetime.now(UTC)
    documents = [
        {
            "organizationId": organization.id,
            "clubId": club.id,
            "formType": "join_request",
            "submittedAt": submitted_at,
            "submitter": join_request["submitter"],
            "payload": join_request["payload"],
            "status": join_request["status"],
        }
        for join_request in DEFAULT_JOIN_REQUESTS
    ]
    join_requests.insert_many(documents)
    print("MongoDB seed data inserted successfully.")
    return True


if __name__ == "__main__":
    seed()
