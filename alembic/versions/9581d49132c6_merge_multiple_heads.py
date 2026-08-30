"""merge multiple heads

Revision ID: 9581d49132c6
Revises: 5cd01b0eb05c, 620ff94539f5
Create Date: 2026-08-13 13:20:28.511205

"""
from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = '9581d49132c6'
down_revision: str | Sequence[str] | None = ('5cd01b0eb05c', '620ff94539f5')
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""


def downgrade() -> None:
    """Downgrade schema."""
