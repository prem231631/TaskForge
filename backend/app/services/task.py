
from sqlalchemy import case, func, select
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
        raise ValueError(
            "The assigned user must be a member of this workspace."
        )


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
    *,
    status_filter: str | None = None,
    priority_filter: str | None = None,
    assigned_to_id: int | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Task], int]:
    statement = select(Task).where(Task.workspace_id == workspace_id)

    if status_filter is not None:
        statement = statement.where(Task.status == status_filter)

    if priority_filter is not None:
        statement = statement.where(Task.priority == priority_filter)

    if assigned_to_id is not None:
        statement = statement.where(Task.assigned_to_id == assigned_to_id)

    total_statement = (
        select(func.count())
        .select_from(statement.subquery())
    )
    total = db.scalar(total_statement) or 0

    sort_columns = {
        "created_at": Task.created_at,
        "due_date": Task.due_date,
        "title": Task.title,
        "priority": case(
            (Task.priority == "high", 3),
            (Task.priority == "medium", 2),
            (Task.priority == "low", 1),
            else_=0,
        ),
    }

    sort_column = sort_columns[sort_by]
    ordering = sort_column.desc() if sort_order == "desc" else sort_column.asc()

    paginated_statement = (
        statement
        .order_by(ordering, Task.id.desc())
        .offset(offset)
        .limit(limit)
    )

    items = list(db.scalars(paginated_statement).all())

    return items, total


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
