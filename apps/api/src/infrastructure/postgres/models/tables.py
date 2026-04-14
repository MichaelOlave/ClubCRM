import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.postgres.models.base import Base


def _now() -> datetime:
    return datetime.now(UTC)


def _uuid() -> str:
    return str(uuid.uuid4())


class OrganizationModel(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )

    clubs: Mapped[list["ClubModel"]] = relationship("ClubModel", back_populates="organization")
    members: Mapped[list["MemberModel"]] = relationship(
        "MemberModel", back_populates="organization"
    )
    admin_users: Mapped[list["AdminUserModel"]] = relationship(
        "AdminUserModel", back_populates="organization"
    )


class ClubModel(Base):
    __tablename__ = "clubs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )

    organization: Mapped["OrganizationModel"] = relationship(
        "OrganizationModel", back_populates="clubs"
    )
    memberships: Mapped[list["MembershipModel"]] = relationship(
        "MembershipModel", back_populates="club"
    )
    events: Mapped[list["EventModel"]] = relationship("EventModel", back_populates="club")
    announcements: Mapped[list["AnnouncementModel"]] = relationship(
        "AnnouncementModel", back_populates="club"
    )
    manager_roles: Mapped[list["ClubManagerRoleModel"]] = relationship(
        "ClubManagerRoleModel", back_populates="club"
    )


class MemberModel(Base):
    __tablename__ = "members"
    __table_args__ = (UniqueConstraint("organization_id", "email", name="uq_member_email_per_org"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    student_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )

    organization: Mapped["OrganizationModel"] = relationship(
        "OrganizationModel", back_populates="members"
    )
    memberships: Mapped[list["MembershipModel"]] = relationship(
        "MembershipModel", back_populates="member"
    )
    manager_roles: Mapped[list["ClubManagerRoleModel"]] = relationship(
        "ClubManagerRoleModel", back_populates="member"
    )
    auth_bindings: Mapped[list["AuthUserBindingModel"]] = relationship(
        "AuthUserBindingModel", back_populates="member"
    )


class MembershipModel(Base):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("club_id", "member_id", name="uq_membership_club_member"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    club_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False
    )
    member_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="member")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    club: Mapped["ClubModel"] = relationship("ClubModel", back_populates="memberships")
    member: Mapped["MemberModel"] = relationship("MemberModel", back_populates="memberships")


class AdminUserModel(Base):
    __tablename__ = "admin_users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    organization: Mapped["OrganizationModel"] = relationship(
        "OrganizationModel", back_populates="admin_users"
    )
    auth_bindings: Mapped[list["AuthUserBindingModel"]] = relationship(
        "AuthUserBindingModel", back_populates="admin_user"
    )


class AuthUserBindingModel(Base):
    __tablename__ = "auth_user_bindings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    provider_subject: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    admin_user_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("admin_users.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
    )
    member_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("members.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )

    admin_user: Mapped["AdminUserModel | None"] = relationship(
        "AdminUserModel", back_populates="auth_bindings"
    )
    member: Mapped["MemberModel | None"] = relationship(
        "MemberModel", back_populates="auth_bindings"
    )


class ClubManagerRoleModel(Base):
    __tablename__ = "club_manager_roles"
    __table_args__ = (UniqueConstraint("club_id", "member_id", name="uq_manager_role_club_member"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    club_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False
    )
    member_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    role_name: Mapped[str] = mapped_column(String(100), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    club: Mapped["ClubModel"] = relationship("ClubModel", back_populates="manager_roles")
    member: Mapped["MemberModel"] = relationship("MemberModel", back_populates="manager_roles")


class EventModel(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    club_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    club: Mapped["ClubModel"] = relationship("ClubModel", back_populates="events")


class AnnouncementModel(Base):
    __tablename__ = "announcements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    club_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    created_by: Mapped[str | None] = mapped_column(String(255), nullable=True)

    club: Mapped["ClubModel"] = relationship("ClubModel", back_populates="announcements")
