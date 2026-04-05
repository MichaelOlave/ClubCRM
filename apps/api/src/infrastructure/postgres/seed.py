import uuid
from datetime import UTC, datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from src.infrastructure.postgres.models.tables import (
    AnnouncementModel,
    ClubModel,
    EventModel,
    MemberModel,
    MembershipModel,
    OrganizationModel,
)

DATABASE_URL = "postgresql+psycopg://clubcrm:clubcrm@postgres:5432/clubcrm"


def seed() -> None:
    engine = create_engine(DATABASE_URL)

    with Session(engine) as session:
        org = OrganizationModel(
            id=str(uuid.uuid4()),
            name="Champlain College",
        )
        session.add(org)
        session.flush()

        club = ClubModel(
            id=str(uuid.uuid4()),
            organization_id=org.id,
            name="Computer Science Club",
            description="A club for CS enthusiasts.",
            status="active",
        )
        session.add(club)
        session.flush()

        member1 = MemberModel(
            id=str(uuid.uuid4()),
            organization_id=org.id,
            first_name="Alice",
            last_name="Smith",
            email="alice@champlain.edu",
            student_id="S001",
        )
        member2 = MemberModel(
            id=str(uuid.uuid4()),
            organization_id=org.id,
            first_name="Bob",
            last_name="Jones",
            email="bob@champlain.edu",
            student_id="S002",
        )
        session.add_all([member1, member2])
        session.flush()

        session.add_all(
            [
                MembershipModel(
                    id=str(uuid.uuid4()),
                    club_id=club.id,
                    member_id=member1.id,
                    role="president",
                    status="active",
                ),
                MembershipModel(
                    id=str(uuid.uuid4()),
                    club_id=club.id,
                    member_id=member2.id,
                    role="member",
                    status="active",
                ),
            ]
        )

        session.add(
            EventModel(
                id=str(uuid.uuid4()),
                club_id=club.id,
                title="Kickoff Meeting",
                description="First meeting of the semester.",
                starts_at=datetime(2026, 4, 10, 18, 0, tzinfo=UTC),
            )
        )

        session.add(
            AnnouncementModel(
                id=str(uuid.uuid4()),
                club_id=club.id,
                title="Welcome!",
                body="Welcome to the CS Club. Stay tuned for updates.",
                created_by="alice@champlain.edu",
            )
        )

        session.commit()
        print("Seed data inserted successfully.")


if __name__ == "__main__":
    seed()
