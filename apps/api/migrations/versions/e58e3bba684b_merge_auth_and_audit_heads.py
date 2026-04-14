"""merge auth and audit heads

Revision ID: e58e3bba684b
Revises: 1db0b0f6b3c9, da4f8b9c2a41
Create Date: 2026-04-14 11:26:56.617344

"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "e58e3bba684b"
down_revision: str | Sequence[str] | None = ("1db0b0f6b3c9", "da4f8b9c2a41")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
