from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models.tables import MembershipModel
from src.modules.memberships.application.ports.membership_repository import (
    MembershipConflictError,
    MembershipRepository,
)
from src.modules.memberships.domain.entities import Membership


class PostgresMembershipRepository(MembershipRepository):
    def __init__(self, client: PostgresClient) -> None:
        self.client = client

    def list_memberships(
        self,
        club_id: str | None = None,
        member_id: str | None = None,
    ) -> list[Membership]:
        with self.client.create_session() as session:
            statement = select(MembershipModel)
            if club_id is not None:
                statement = statement.where(MembershipModel.club_id == club_id)
            if member_id is not None:
                statement = statement.where(MembershipModel.member_id == member_id)

            rows = session.execute(statement.order_by(MembershipModel.joined_at)).scalars().all()
            return [self._to_domain(row) for row in rows]

    def get_membership(self, membership_id: str) -> Membership | None:
        with self.client.create_session() as session:
            row = session.get(MembershipModel, membership_id)
            if row is None:
                return None

            return self._to_domain(row)

    def create_membership(
        self,
        club_id: str,
        member_id: str,
        role: str,
        status: str,
    ) -> Membership:
        with self.client.create_session() as session:
            row = MembershipModel(
                club_id=club_id,
                member_id=member_id,
                role=role,
                status=status,
            )
            session.add(row)
            self._commit(session, "Could not create membership with the provided data.")
            session.refresh(row)
            return self._to_domain(row)

    def update_membership(
        self,
        membership_id: str,
        *,
        role: str | None = None,
        status: str | None = None,
    ) -> Membership | None:
        with self.client.create_session() as session:
            row = session.get(MembershipModel, membership_id)
            if row is None:
                return None

            if role is not None:
                row.role = role
            if status is not None:
                row.status = status

            self._commit(session, "Could not update membership with the provided data.")
            session.refresh(row)
            return self._to_domain(row)

    def delete_membership(self, membership_id: str) -> bool:
        with self.client.create_session() as session:
            row = session.get(MembershipModel, membership_id)
            if row is None:
                return False

            session.delete(row)
            session.commit()
            return True

    def _commit(self, session, message: str) -> None:
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise MembershipConflictError(message) from exc

    def _to_domain(self, row: MembershipModel) -> Membership:
        return Membership(
            id=row.id,
            club_id=row.club_id,
            member_id=row.member_id,
            role=row.role,
            status=row.status,
            joined_at=row.joined_at,
        )
