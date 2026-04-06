from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models.tables import MemberModel
from src.modules.members.application.models import CreateMemberInput, UpdateMemberInput
from src.modules.members.application.ports.member_repository import MemberRepository
from src.modules.members.domain.entities import Member


class PostgresMemberRepository(MemberRepository):
    def __init__(self, client: PostgresClient) -> None:
        self.client = client

    def _to_member(self, row: MemberModel) -> Member:
        return Member(
            id=row.id,
            organization_id=row.organization_id,
            first_name=row.first_name,
            last_name=row.last_name,
            email=row.email,
            student_id=row.student_id,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def list_members(self, organization_id: str) -> list[Member]:
        with self.client.create_session() as session:
            rows = (
                session.execute(
                    select(MemberModel)
                    .where(MemberModel.organization_id == organization_id)
                    .order_by(MemberModel.last_name, MemberModel.first_name, MemberModel.email)
                )
                .scalars()
                .all()
            )
            return [self._to_member(row) for row in rows]

    def get_member(self, member_id: str) -> Member | None:
        with self.client.create_session() as session:
            row = session.get(MemberModel, member_id)
            if row is None:
                return None
            return self._to_member(row)

    def create_member(self, member: CreateMemberInput) -> Member:
        now = datetime.now(UTC)
        row = MemberModel(
            organization_id=member.organization_id,
            first_name=member.first_name,
            last_name=member.last_name,
            email=member.email,
            student_id=member.student_id,
            created_at=now,
            updated_at=now,
        )

        with self.client.create_session() as session:
            session.add(row)
            try:
                session.commit()
            except IntegrityError as exc:
                session.rollback()
                raise ValueError("Member could not be created.") from exc
            session.refresh(row)
            return self._to_member(row)

    def update_member(self, member_id: str, member: UpdateMemberInput) -> Member | None:
        with self.client.create_session() as session:
            row = session.get(MemberModel, member_id)
            if row is None:
                return None

            if member.first_name is not None:
                row.first_name = member.first_name
            if member.last_name is not None:
                row.last_name = member.last_name
            if member.email is not None:
                row.email = member.email
            if member.student_id is not None:
                row.student_id = member.student_id
            row.updated_at = datetime.now(UTC)

            try:
                session.commit()
            except IntegrityError as exc:
                session.rollback()
                raise ValueError("Member could not be updated.") from exc

            session.refresh(row)
            return self._to_member(row)

    def delete_member(self, member_id: str) -> bool:
        with self.client.create_session() as session:
            row = session.get(MemberModel, member_id)
            if row is None:
                return False

            session.delete(row)
            session.commit()
            return True
