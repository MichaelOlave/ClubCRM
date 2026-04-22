from sqlalchemy import and_, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models.tables import (
    AdminUserModel,
    AuthUserBindingModel,
    ClubManagerRoleModel,
    MemberModel,
    MembershipModel,
)
from src.modules.auth.application.ports.authorization_repository import (
    AuthorizationConflictError,
    AuthorizationRepository,
    AuthorizationResolution,
    ClubManagerGrant,
)
from src.modules.auth.domain.entities import AppAccess


class PostgresAuthorizationRepository(AuthorizationRepository):
    def __init__(self, client: PostgresClient) -> None:
        self.client = client

    def resolve_access_for_identity(
        self,
        *,
        provider_subject: str,
        email: str | None,
    ) -> AuthorizationResolution:
        with self.client.create_session() as session:
            binding = session.execute(
                select(AuthUserBindingModel).where(
                    AuthUserBindingModel.provider_subject == provider_subject
                )
            ).scalar_one_or_none()

            admin_user = None
            member = None
            binding_changed = False

            if binding is not None:
                if binding.admin_user_id:
                    admin_user = session.get(AdminUserModel, binding.admin_user_id)
                if binding.member_id:
                    member = session.get(MemberModel, binding.member_id)
                if email is not None and binding.email != email:
                    binding.email = email
                    binding_changed = True
            if email is not None:
                if admin_user is None:
                    admin_user = self._find_admin_user_by_email(session, email)

                if member is None:
                    member = self._find_manager_member_by_email(session, email)

            if binding is None and (admin_user is not None or member is not None):
                binding = self._find_binding_for_identity(
                    session,
                    admin_user_id=admin_user.id if admin_user is not None else None,
                    member_id=member.id if member is not None else None,
                )

            if binding is not None:
                if binding.admin_user_id and admin_user is None:
                    admin_user = session.get(AdminUserModel, binding.admin_user_id)
                if binding.member_id and member is None:
                    member = session.get(MemberModel, binding.member_id)
                if binding.provider_subject != provider_subject:
                    binding.provider_subject = provider_subject
                    binding_changed = True
                if admin_user is not None and binding.admin_user_id != admin_user.id:
                    binding.admin_user_id = admin_user.id
                    binding_changed = True
                if member is not None and binding.member_id != member.id:
                    binding.member_id = member.id
                    binding_changed = True
                if email is not None and binding.email != email:
                    binding.email = email
                    binding_changed = True

            if binding is None and (admin_user is not None or member is not None):
                binding = AuthUserBindingModel(
                    provider_subject=provider_subject,
                    email=email,
                    admin_user_id=admin_user.id if admin_user is not None else None,
                    member_id=member.id if member is not None else None,
                )
                session.add(binding)
                self._commit(session, "ClubCRM could not persist the auth access binding.")
            elif binding is not None and binding_changed:
                self._commit(session, "ClubCRM could not update the auth access binding.")

            member_id = (
                binding.member_id
                if binding is not None
                else member.id
                if member is not None
                else None
            )
            admin_user_id = (
                binding.admin_user_id
                if binding is not None
                else admin_user.id
                if admin_user is not None
                else None
            )
            access = self._build_access(session, admin_user=admin_user, member=member)
            return AuthorizationResolution(
                admin_user_id=admin_user_id,
                member_id=member_id,
                access=access,
            )

    def list_club_manager_grants(self, club_id: str) -> list[ClubManagerGrant]:
        with self.client.create_session() as session:
            rows = session.execute(
                select(ClubManagerRoleModel, MemberModel)
                .join(MemberModel, MemberModel.id == ClubManagerRoleModel.member_id)
                .where(ClubManagerRoleModel.club_id == club_id)
                .order_by(MemberModel.last_name, MemberModel.first_name, MemberModel.email)
            ).all()
            return [
                ClubManagerGrant(
                    id=grant.id,
                    club_id=grant.club_id,
                    member_id=grant.member_id,
                    role_name=grant.role_name,
                    assigned_at=grant.assigned_at,
                    member_email=member.email,
                    member_name=f"{member.first_name} {member.last_name}".strip(),
                )
                for grant, member in rows
            ]

    def create_club_manager_grant(
        self,
        *,
        club_id: str,
        member_id: str,
        role_name: str,
    ) -> ClubManagerGrant:
        with self.client.create_session() as session:
            member = session.get(MemberModel, member_id)
            if member is None:
                raise LookupError("Member not found.")

            membership = session.execute(
                select(MembershipModel).where(
                    MembershipModel.club_id == club_id,
                    MembershipModel.member_id == member_id,
                    MembershipModel.status == "active",
                )
            ).scalar_one_or_none()
            if membership is None:
                raise ValueError("Club manager access requires an active membership in this club.")

            grant = ClubManagerRoleModel(
                club_id=club_id,
                member_id=member_id,
                role_name=role_name,
            )
            session.add(grant)
            self._commit(session, "Club manager access could not be granted.")
            session.refresh(grant)

            return ClubManagerGrant(
                id=grant.id,
                club_id=grant.club_id,
                member_id=grant.member_id,
                role_name=grant.role_name,
                assigned_at=grant.assigned_at,
                member_email=member.email,
                member_name=f"{member.first_name} {member.last_name}".strip(),
            )

    def delete_club_manager_grant(self, *, club_id: str, grant_id: str) -> bool:
        with self.client.create_session() as session:
            grant = session.get(ClubManagerRoleModel, grant_id)
            if grant is None or grant.club_id != club_id:
                return False

            session.delete(grant)
            session.commit()
            return True

    def _find_admin_user_by_email(self, session: Session, email: str) -> AdminUserModel | None:
        return session.execute(
            select(AdminUserModel).where(AdminUserModel.email == email)
        ).scalar_one_or_none()

    def _find_manager_member_by_email(self, session: Session, email: str) -> MemberModel | None:
        return (
            session.execute(
                select(MemberModel)
                .join(ClubManagerRoleModel, ClubManagerRoleModel.member_id == MemberModel.id)
                .join(
                    MembershipModel,
                    and_(
                        MembershipModel.club_id == ClubManagerRoleModel.club_id,
                        MembershipModel.member_id == MemberModel.id,
                        MembershipModel.status == "active",
                    ),
                )
                .where(MemberModel.email == email)
                .order_by(MemberModel.id)
            )
            .scalars()
            .first()
        )

    def _find_binding_for_identity(
        self,
        session: Session,
        *,
        admin_user_id: str | None,
        member_id: str | None,
    ) -> AuthUserBindingModel | None:
        filters = []
        if admin_user_id is not None:
            filters.append(AuthUserBindingModel.admin_user_id == admin_user_id)
        if member_id is not None:
            filters.append(AuthUserBindingModel.member_id == member_id)
        if not filters:
            return None

        bindings = (
            session.execute(
                select(AuthUserBindingModel)
                .where(or_(*filters))
                .order_by(AuthUserBindingModel.created_at, AuthUserBindingModel.id)
            )
            .scalars()
            .all()
        )
        if len(bindings) > 1:
            raise AuthorizationConflictError(
                "ClubCRM found conflicting auth access bindings for this identity."
            )

        return bindings[0] if bindings else None

    def _list_managed_club_ids(self, session: Session, member_id: str) -> tuple[str, ...]:
        rows = session.execute(
            select(ClubManagerRoleModel.club_id)
            .join(
                MembershipModel,
                and_(
                    MembershipModel.club_id == ClubManagerRoleModel.club_id,
                    MembershipModel.member_id == ClubManagerRoleModel.member_id,
                    MembershipModel.status == "active",
                ),
            )
            .where(ClubManagerRoleModel.member_id == member_id)
            .order_by(ClubManagerRoleModel.club_id)
        ).scalars()
        return tuple(dict.fromkeys(rows))

    def _build_access(
        self,
        session: Session,
        *,
        admin_user: AdminUserModel | None,
        member: MemberModel | None,
    ) -> AppAccess | None:
        managed_club_ids = (
            self._list_managed_club_ids(session, member.id) if member is not None else ()
        )

        if admin_user is not None and admin_user.is_active:
            return AppAccess(
                primary_role="org_admin",
                organization_id=admin_user.organization_id,
                managed_club_ids=managed_club_ids,
            )

        if member is not None and managed_club_ids:
            return AppAccess(
                primary_role="club_manager",
                organization_id=member.organization_id,
                managed_club_ids=managed_club_ids,
            )

        return None

    def _commit(self, session: Session, message: str) -> None:
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise AuthorizationConflictError(message) from exc
