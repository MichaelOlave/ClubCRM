"""add role-based auth access bindings

Revision ID: 1db0b0f6b3c9
Revises: a5fd9fef13bc
Create Date: 2026-04-14 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "1db0b0f6b3c9"
down_revision: str | Sequence[str] | None = "a5fd9fef13bc"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column("admin_users", "password_hash")
    op.create_table(
        "auth_user_bindings",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("provider_subject", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("admin_user_id", sa.String(length=36), nullable=True),
        sa.Column("member_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["admin_user_id"], ["admin_users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("admin_user_id"),
        sa.UniqueConstraint("member_id"),
        sa.UniqueConstraint("provider_subject"),
    )
    op.create_unique_constraint(
        "uq_manager_role_club_member",
        "club_manager_roles",
        ["club_id", "member_id"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("uq_manager_role_club_member", "club_manager_roles", type_="unique")
    op.drop_table("auth_user_bindings")
    op.add_column(
        "admin_users",
        sa.Column(
            "password_hash",
            sa.String(length=255),
            nullable=False,
            server_default="",
        ),
    )
    op.alter_column("admin_users", "password_hash", server_default=None)
