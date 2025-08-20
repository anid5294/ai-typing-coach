"""add_typing_started_at_to_sessions

Revision ID: fe6e53289735
Revises: 952119df276a
Create Date: 2025-08-19 20:33:13.997963

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fe6e53289735'
down_revision: Union[str, Sequence[str], None] = '952119df276a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add typing_started_at column to sessions table
    op.add_column('sessions', sa.Column('typing_started_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove typing_started_at column from sessions table
    op.drop_column('sessions', 'typing_started_at')
