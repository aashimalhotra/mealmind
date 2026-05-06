"""add_household_id_to_users

Revision ID: c16285044831
Revises: f6023d1ce3c5
Create Date: 2026-05-06 10:47:26.956243

This migration is now a no-op because the household_id column
has been moved to the initial migration (f6023d1ce3c5).
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c16285044831'
down_revision: Union[str, Sequence[str], None] = 'f6023d1ce3c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op: household_id already added to initial migration."""
    pass


def downgrade() -> None:
    """No-op: household_id will be dropped by initial migration downgrade."""
    pass
