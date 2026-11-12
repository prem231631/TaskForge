
"""add user token version

Revision ID: 228cb505d3a9
Revises: defd3f139e98
Create Date: 2026-11-12 10:43:29.544481

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "228cb505d3a9"
down_revision: Union[str, Sequence[str], None] = "defd3f139e98"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "token_version",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "token_version")
