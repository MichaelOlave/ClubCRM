"""add club slugs and uniqueness

Revision ID: ba9d0d3b5f2a
Revises: e58e3bba684b
Create Date: 2026-04-20 14:25:00.000000

"""

from collections.abc import Sequence
import re
import unicodedata

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "ba9d0d3b5f2a"
down_revision: str | Sequence[str] | None = "e58e3bba684b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_NON_ALPHANUMERIC_PATTERN = re.compile(r"[^a-z0-9]+")
_EDGE_HYPHEN_PATTERN = re.compile(r"(^-+|-+$)")


def _slugify(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name)
    ascii_name = normalized.encode("ascii", "ignore").decode("ascii")
    collapsed = _NON_ALPHANUMERIC_PATTERN.sub("-", ascii_name.lower()).strip()
    slug = _EDGE_HYPHEN_PATTERN.sub("", collapsed)
    return slug or "club"


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("clubs", sa.Column("slug", sa.String(length=255), nullable=True))

    connection = op.get_bind()
    clubs = connection.execute(sa.text("SELECT id, name FROM clubs")).mappings().all()
    for club in clubs:
        connection.execute(
            sa.text("UPDATE clubs SET slug = :slug WHERE id = :club_id"),
            {
                "slug": _slugify(club["name"]),
                "club_id": club["id"],
            },
        )

    op.alter_column("clubs", "slug", existing_type=sa.String(length=255), nullable=False)
    op.create_unique_constraint("uq_club_name_per_org", "clubs", ["organization_id", "name"])
    op.create_unique_constraint("uq_club_slug_per_org", "clubs", ["organization_id", "slug"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("uq_club_slug_per_org", "clubs", type_="unique")
    op.drop_constraint("uq_club_name_per_org", "clubs", type_="unique")
    op.drop_column("clubs", "slug")
