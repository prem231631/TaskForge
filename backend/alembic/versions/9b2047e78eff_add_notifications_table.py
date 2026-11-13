
"""add notifications table

Revision ID: 9b2047e78eff
Revises: 228cb505d3a9
Create Date: 2026-11-13 11:55:25.061565

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9b2047e78eff"
down_revision: Union[str, Sequence[str], None] = "228cb505d3a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("recipient_id", sa.Integer(), nullable=False),
        sa.Column("actor_id", sa.Integer(), nullable=True),
        sa.Column("workspace_id", sa.Integer(), nullable=True),
        sa.Column("task_id", sa.Integer(), nullable=True),
        sa.Column("notification_type", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "is_read",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["actor_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["recipient_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["task_id"],
            ["tasks.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_notifications_actor_id",
        "notifications",
        ["actor_id"],
        unique=False,
    )
    op.create_index(
        "ix_notifications_id",
        "notifications",
        ["id"],
        unique=False,
    )
    op.create_index(
        "ix_notifications_recipient_created",
        "notifications",
        ["recipient_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_notifications_recipient_id",
        "notifications",
        ["recipient_id"],
        unique=False,
    )
    op.create_index(
        "ix_notifications_recipient_read",
        "notifications",
        ["recipient_id", "is_read"],
        unique=False,
    )
    op.create_index(
        "ix_notifications_task_id",
        "notifications",
        ["task_id"],
        unique=False,
    )
    op.create_index(
        "ix_notifications_workspace_id",
        "notifications",
        ["workspace_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_notifications_workspace_id",
        table_name="notifications",
    )
    op.drop_index(
        "ix_notifications_task_id",
        table_name="notifications",
    )
    op.drop_index(
        "ix_notifications_recipient_read",
        table_name="notifications",
    )
    op.drop_index(
        "ix_notifications_recipient_id",
        table_name="notifications",
    )
    op.drop_index(
        "ix_notifications_recipient_created",
        table_name="notifications",
    )
    op.drop_index(
        "ix_notifications_id",
        table_name="notifications",
    )
    op.drop_index(
        "ix_notifications_actor_id",
        table_name="notifications",
    )
    op.drop_table("notifications")
