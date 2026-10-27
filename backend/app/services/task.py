
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Task, User, Workspace, WorkspaceMembership
from app.schemas.task import TaskCreate, TaskUpdate


def _is_workspace_member(
    db: Session,
    workspace_id: int,
    user_id: int,
) -> bool:
    statement = select(WorkspaceMembership.id).where(
        WorkspaceMembership.workspace_id == workspace_id,
        WorkspaceMembership.user_id == user_id,
    )
    return db.scalar(statement) is not None


def _validate_assignee(
    db: Session,
    workspace_id: int,
    assigned_to_id: int,
) -> None:
    assignee = db.get(User, assigned_to_id)

    if assignee is None or not assignee.is_active:
        raise ValueError("The assigned user does not have an active account.")

    if not _is_workspace_member(db, workspace_id, assigned_to_id):
        raise ValueError("The assigned user must be a member of this workspace.")


def create_task(
    db: Session,
    workspace_id: int,
    creator: User,
    task_data: TaskCreate,
) -> Task:
    workspace = db.get(Workspace, workspace_id)

    if workspace is None:
        raise ValueError("Workspace not found.")

    if not _is_workspace_member(db, workspace_id, creator.id):
        raise ValueError("You must be a workspace member to create tasks.")

    if task_data.assigned_to_id is not None:
        _validate_assignee(
            db,
            workspace_id,
            task_data.assigned_to_id,
        )

    task = Task(
        workspace_id=workspace_id,
        title=task_data.title,
        description=task_data.description,
        status=task_data.status,
        priority=task_data.priority,
        assigned_to_id=task_data.assigned_to_id,
        created_by_id=creator.id,
        due_date=task_data.due_date,
    )

    try:
        db.add(task)
        db.commit()
        db.refresh(task)
    except Exception:
        db.rollback()
        raise

    return task


def list_workspace_tasks(
    db: Session,
    workspace_id: int,
) -> list[Task]:
    statement = (
        select(Task)
        .where(Task.workspace_id == workspace_id)
        .order_by(Task.created_at.desc(), Task.id.desc())
    )

    return list(db.scalars(statement).all())


def get_workspace_task(
    db: Session,
    workspace_id: int,
    task_id: int,
) -> Task | None:
    statement = select(Task).where(
        Task.id == task_id,
        Task.workspace_id == workspace_id,
    )

    return db.scalar(statement)


def update_task(
    db: Session,
    workspace_id: int,
    task_id: int,
    task_data: TaskUpdate,
) -> Task | None:
    task = get_workspace_task(db, workspace_id, task_id)

    if task is None:
        return None

    updates = task_data.model_dump(exclude_unset=True)

    if not updates:
        raise ValueError("Provide at least one field to update.")

    if (
        "assigned_to_id" in updates
        and updates["assigned_to_id"] is not None
    ):
        _validate_assignee(
            db,
            workspace_id,
            updates["assigned_to_id"],
        )

    try:
        for field, value in updates.items():
            setattr(task, field, value)

        db.commit()
        db.refresh(task)
    except Exception:
        db.rollback()
        raise

    return task


def delete_task(
    db: Session,
    workspace_id: int,
    task_id: int,
) -> bool:
    task = get_workspace_task(db, workspace_id, task_id)

    if task is None:
        return False

    try:
        db.delete(task)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return True
