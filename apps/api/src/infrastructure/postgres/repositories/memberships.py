from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models.tables import ClubModel, MemberModel, MembershipModel
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
            statement = (
                select(
                    MembershipModel,
                    ClubModel.name,
                    MemberModel.first_name,
                    MemberModel.last_name,
                )
                .join(ClubModel, ClubModel.id == MembershipModel.club_id)
                .join(MemberModel, MemberModel.id == MembershipModel.member_id)
            )
            if club_id is not None:
                statement = statement.where(MembershipModel.club_id == club_id)
            if member_id is not None:
                statement = statement.where(MembershipModel.member_id == member_id)

            rows = session.execute(statement.order_by(MembershipModel.joined_at)).all()
            return [
                self._to_domain(
                    row,
                    club_name=club_name,
                    member_name=f"{first_name} {last_name}".strip(),
                )
                for row, club_name, first_name, last_name in rows
            ]

    def get_membership(self, membership_id: str) -> Membership | None:
        with self.client.create_session() as session:
            return self._get_membership(session, membership_id)

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
            membership = self._get_membership(session, row.id)
            if membership is None:
                raise MembershipConflictError("Could not load the created membership.")
            return membership

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
            return self._get_membership(session, row.id)

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

    def _get_membership(self, session, membership_id: str) -> Membership | None:
        row = session.execute(
            select(
                MembershipModel,
                ClubModel.name,
                MemberModel.first_name,
                MemberModel.last_name,
            )
            .join(ClubModel, ClubModel.id == MembershipModel.club_id)
            .join(MemberModel, MemberModel.id == MembershipModel.member_id)
            .where(MembershipModel.id == membership_id)
        ).one_or_none()
        if row is None:
            return None

        membership_row, club_name, first_name, last_name = row
        return self._to_domain(
            membership_row,
            club_name=club_name,
            member_name=f"{first_name} {last_name}".strip(),
        )

    def _to_domain(
        self,
        row: MembershipModel,
        *,
        club_name: str | None = None,
        member_name: str | None = None,
    ) -> Membership:
        return Membership(
            id=row.id,
            club_id=row.club_id,
            member_id=row.member_id,
            role=row.role,
            status=row.status,
            joined_at=row.joined_at,
            club_name=club_name,
            member_name=member_name,
        )
