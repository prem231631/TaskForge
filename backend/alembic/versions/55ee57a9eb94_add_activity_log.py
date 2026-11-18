
"""add activity log

Revision ID: 55ee57a9eb94
Revises: 9b2047e78eff
Create Date: 2026-11-17 17:58:53.540875

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "55ee57a9eb94"
down_revision: Union[str, Sequence[str], None] = "9b2047e78eff"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the activity log table."""

    op.create_table(
        "activities",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=True),
        sa.Column("actor_id", sa.Integer(), nullable=True),
        sa.Column("target_user_id", sa.Integer(), nullable=True),
        sa.Column("action_type", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["actor_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["target_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["task_id"],
            ["tasks.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_activities_actor_id",
        "activities",
        ["actor_id"],
        unique=False,
    )

    op.create_index(
        "ix_activities_id",
        "activities",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_activities_task_id",
        "activities",
        ["task_id"],
        unique=False,
    )

    op.create_index(
        "ix_activities_workspace_created",
        "activities",
        ["workspace_id", "created_at"],
        unique=False,
    )

    op.create_index(
        op.f("ix_activities_workspace_id"),
        "activities",
        ["workspace_id"],
        unique=False,
    )


def downgrade() -> None:
    """Remove the activity log table."""

    op.drop_index(
        op.f("ix_activities_workspace_id"),
        table_name="activities",
    )

    op.drop_index(
        "ix_activities_workspace_created",
        table_name="activities",
    )

    op.drop_index(
        "ix_activities_task_id",
        table_name="activities",
    )

    op.drop_index(
        op.f("ix_activities_id"),
        table_name="activities",
    )

    op.drop_index(
        op.f("ix_activities_actor_id"),
        table_name="activities",
    )

    op.drop_table("activities")
