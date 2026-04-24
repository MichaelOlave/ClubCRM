"""add club slugs and uniqueness

Revision ID: ba9d0d3b5f2a
Revises: e58e3bba684b
Create Date: 2026-04-20 14:25:00.000000

"""

import re
import unicodedata
from collections.abc import Sequence

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


def _build_unique_slug(base_slug: str, used_slugs: set[str]) -> str:
    if base_slug not in used_slugs:
        used_slugs.add(base_slug)
        return base_slug

    suffix = 2
    while True:
        candidate = f"{base_slug}-{suffix}"
        if candidate not in used_slugs:
            used_slugs.add(candidate)
            return candidate
        suffix += 1


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("clubs", sa.Column("slug", sa.String(length=255), nullable=True))

    connection = op.get_bind()
    clubs = (
        connection.execute(
            sa.text(
                "SELECT id, organization_id, name FROM clubs "
                "ORDER BY organization_id, created_at, id"
            )
        )
        .mappings()
        .all()
    )
    used_slugs_by_org: dict[str, set[str]] = {}
    for club in clubs:
        organization_id = club["organization_id"]
        used_slugs = used_slugs_by_org.setdefault(organization_id, set())
        slug = _build_unique_slug(_slugify(club["name"]), used_slugs)
        connection.execute(
            sa.text("UPDATE clubs SET slug = :slug WHERE id = :club_id"),
            {
                "slug": slug,
                "club_id": club["id"],
            },
        )

    op.alter_column("clubs", "slug", existing_type=sa.String(length=255), nullable=False)
    op.create_unique_constraint("uq_club_slug_per_org", "clubs", ["organization_id", "slug"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("uq_club_slug_per_org", "clubs", type_="unique")
    op.drop_column("clubs", "slug")
