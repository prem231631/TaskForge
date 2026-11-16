from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.workspace import WorkspaceMembership


def create_activity(
    db: Session,
    *,
    workspace_id: int,
    action_type: str,
    description: str,
    actor_id: int | None = None,
    task_id: int | None = None,
    target_user_id: int | None = None,
) -> Activity:
    """Add an activity record to the current transaction."""

    activity = Activity(
        workspace_id=workspace_id,
        task_id=task_id,
        actor_id=actor_id,
        target_user_id=target_user_id,
        action_type=action_type,
        description=description,
    )

    db.add(activity)

    return activity


def list_workspace_activity(
    db: Session,
    *,
    workspace_id: int,
    user_id: int,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[Activity], int] | None:
    """Return workspace activity if the requesting user is a member."""

    membership_exists = db.scalar(
        select(WorkspaceMembership.id).where(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.user_id == user_id,
        )
    )

    if membership_exists is None:
        return None

    total = db.scalar(
        select(func.count(Activity.id)).where(
            Activity.workspace_id == workspace_id,
        )
    ) or 0

    activities = db.scalars(
        select(Activity)
        .where(Activity.workspace_id == workspace_id)
        .order_by(
            Activity.created_at.desc(),
            Activity.id.desc(),
        )
        .offset(skip)
        .limit(limit)
    ).all()

    return list(activities), total