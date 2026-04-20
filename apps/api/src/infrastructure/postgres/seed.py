import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.config import get_settings
from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models.tables import (
    AdminUserModel,
    AnnouncementModel,
    AuditLogModel,
    AuthUserBindingModel,
    ClubManagerRoleModel,
    ClubModel,
    EventModel,
    MemberModel,
    MembershipModel,
    OrganizationModel,
)

DEFAULT_ORGANIZATION_NAME = "Champlain College"
DEFAULT_ADMIN_EMAILS = (
    "developer@clubcrm.local",
    "michael.olave@mymail.champlain.edu",
)
DEFAULT_BOUND_ADMIN_EMAIL = "developer@clubcrm.local"


def _seed_event_window() -> tuple[datetime, datetime]:
    starts_at = datetime.now(UTC).replace(minute=0, second=0, microsecond=0) + timedelta(days=14)
    return starts_at, starts_at + timedelta(hours=2)


def _create_postgres_client() -> PostgresClient:
    return PostgresClient(dsn=get_settings().postgres.url)


def _database_has_seed_data(session: Session) -> bool:
    return session.scalar(select(OrganizationModel.id).limit(1)) is not None


def _get_seed_organization(session: Session) -> OrganizationModel | None:
    return session.execute(
        select(OrganizationModel).where(OrganizationModel.name == DEFAULT_ORGANIZATION_NAME)
    ).scalar_one_or_none()


def _ensure_seed_admin_users(session: Session, organization_id: str) -> bool:
    existing_admin_emails = set(
        session.execute(
            select(AdminUserModel.email).where(
                AdminUserModel.organization_id == organization_id,
                AdminUserModel.email.in_(DEFAULT_ADMIN_EMAILS),
            )
        )
        .scalars()
        .all()
    )
    missing_admin_emails = [
        email for email in DEFAULT_ADMIN_EMAILS if email not in existing_admin_emails
    ]

    if not missing_admin_emails:
        return False

    session.add_all(
        [
            AdminUserModel(
                id=str(uuid.uuid4()),
                organization_id=organization_id,
                email=email,
                is_active=True,
            )
            for email in missing_admin_emails
        ]
    )
    return True


def _ensure_seed_auth_binding(session: Session, organization_id: str) -> bool:
    bound_admin = session.execute(
        select(AdminUserModel).where(
            AdminUserModel.organization_id == organization_id,
            AdminUserModel.email == DEFAULT_BOUND_ADMIN_EMAIL,
        )
    ).scalar_one_or_none()
    if bound_admin is None:
        return False

    existing_binding = session.execute(
        select(AuthUserBindingModel.id).where(AuthUserBindingModel.admin_user_id == bound_admin.id)
    ).scalar_one_or_none()
    if existing_binding is not None:
        return False

    session.add(
        AuthUserBindingModel(
            id=str(uuid.uuid4()),
            provider_subject=f"seed|{DEFAULT_BOUND_ADMIN_EMAIL}",
            email=bound_admin.email,
            admin_user_id=bound_admin.id,
        )
    )
    return True


def _ensure_seed_audit_log(session: Session, club_id: str) -> bool:
    existing_audit_log = session.execute(select(AuditLogModel.id).limit(1)).scalar_one_or_none()
    if existing_audit_log is not None:
        return False

    session.add(
        AuditLogModel(
            id=str(uuid.uuid4()),
            actor_sub=f"seed|{DEFAULT_BOUND_ADMIN_EMAIL}",
            actor_email=DEFAULT_BOUND_ADMIN_EMAIL,
            actor_name="Seeded System Admin",
            action="seed",
            resource_type="club",
            resource_id=club_id,
            resource_label="Computer Science Club",
            api_route="/seed",
            http_method="POST",
            origin_path="/system/health",
            request_id=str(uuid.uuid4()),
            summary_json={
                "source": "postgres_seed",
                "seeded": True,
            },
        )
    )
    return True


def seed(client: PostgresClient | None = None) -> bool:
    postgres_client = client or _create_postgres_client()

    with postgres_client.create_session() as session:
        if _database_has_seed_data(session):
            org = _get_seed_organization(session)
            if org is not None:
                changed = _ensure_seed_admin_users(session, org.id)
                club = session.execute(
                    select(ClubModel).where(
                        ClubModel.organization_id == org.id,
                        ClubModel.name == "Computer Science Club",
                    )
                ).scalar_one_or_none()
                changed = _ensure_seed_auth_binding(session, org.id) or changed
                if club is not None:
                    changed = _ensure_seed_audit_log(session, club.id) or changed
                    event = session.execute(
                        select(EventModel).where(EventModel.club_id == club.id).limit(1)
                    ).scalar_one_or_none()
                    if event is not None and event.starts_at <= datetime.now(UTC):
                        starts_at, ends_at = _seed_event_window()
                        event.starts_at = starts_at
                        event.ends_at = ends_at
                        changed = True
                if changed:
                    session.commit()
                    print("Seed data backfilled successfully.")
                    return True

            print("Seed data skipped because the database already contains organizations.")
            return False

        org = OrganizationModel(
            id=str(uuid.uuid4()),
            name=DEFAULT_ORGANIZATION_NAME,
        )
        session.add(org)
        session.flush()

        _ensure_seed_admin_users(session, org.id)

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
        local_club_manager = MemberModel(
            id=str(uuid.uuid4()),
            organization_id=org.id,
            first_name="Local",
            last_name="Club Manager",
            email="club-manager@clubcrm.local",
            student_id="S003",
        )
        session.add_all([member1, member2, local_club_manager])
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
                MembershipModel(
                    id=str(uuid.uuid4()),
                    club_id=club.id,
                    member_id=local_club_manager.id,
                    role="member",
                    status="active",
                ),
                ClubManagerRoleModel(
                    id=str(uuid.uuid4()),
                    club_id=club.id,
                    member_id=local_club_manager.id,
                    role_name="club_manager",
                ),
            ]
        )
        session.flush()

        _ensure_seed_auth_binding(session, org.id)
        _ensure_seed_audit_log(session, club.id)

        starts_at, ends_at = _seed_event_window()

        session.add(
            EventModel(
                id=str(uuid.uuid4()),
                club_id=club.id,
                title="Kickoff Meeting",
                description="First meeting of the semester.",
                starts_at=starts_at,
                ends_at=ends_at,
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
        return True


if __name__ == "__main__":
    seed()
