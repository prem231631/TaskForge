
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import Task, User, Workspace, WorkspaceMembership
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.activity import create_activity
from app.services.notification import create_notification


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
        db.flush()

        create_activity(
            db,
            workspace_id=workspace_id,
            task_id=task.id,
            actor_id=creator.id,
            action_type="task_created",
            description=f"{creator.full_name} created the task '{task.title}'.",
        )

        if (
            task.assigned_to_id is not None
            and task.assigned_to_id != creator.id
        ):
            create_notification(
                db,
                recipient_id=task.assigned_to_id,
                actor_id=creator.id,
                workspace_id=workspace_id,
                task_id=task.id,
                notification_type="task_assigned",
                title="Task assigned to you",
                message=(
                    f"{creator.full_name} assigned you the task "
                    f"'{task.title}' in '{workspace.name}'."
                ),
            )

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
    actor: User,
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

    original_values = {
        field: getattr(task, field)
        for field in updates
    }
    actual_changes = {
        field: value
        for field, value in updates.items()
        if original_values[field] != value
    }

    previous_assignee_id = task.assigned_to_id
    assignment_changed = (
        "assigned_to_id" in actual_changes
    )

    previous_assignee = (
        db.get(User, previous_assignee_id)
        if assignment_changed and previous_assignee_id is not None
        else None
    )

    new_assignee_id = (
        actual_changes.get("assigned_to_id")
        if assignment_changed
        else previous_assignee_id
    )
    new_assignee = (
        db.get(User, new_assignee_id)
        if assignment_changed and new_assignee_id is not None
        else None
    )

    try:
        for field, value in actual_changes.items():
            setattr(task, field, value)

        db.flush()

        workspace = db.get(Workspace, workspace_id)

        if actual_changes:
            if "status" in actual_changes:
                if task.status == "done":
                    create_activity(
                        db,
                        workspace_id=workspace_id,
                        task_id=task.id,
                        actor_id=actor.id,
                        action_type="task_completed",
                        description=(
                            f"{actor.full_name} completed the task "
                            f"'{task.title}'."
                        ),
                    )
                else:
                    create_activity(
                        db,
                        workspace_id=workspace_id,
                        task_id=task.id,
                        actor_id=actor.id,
                        action_type="task_status_changed",
                        description=(
                            f"{actor.full_name} changed the status of "
                            f"'{task.title}' from "
                            f"'{original_values['status']}' to "
                            f"'{task.status}'."
                        ),
                    )

            descriptive_fields = {
                "title",
                "description",
                "priority",
                "due_date",
            }
            changed_descriptive_fields = (
                descriptive_fields.intersection(actual_changes)
            )

            if changed_descriptive_fields:
                field_names = ", ".join(
                    sorted(changed_descriptive_fields)
                )
                create_activity(
                    db,
                    workspace_id=workspace_id,
                    task_id=task.id,
                    actor_id=actor.id,
                    action_type="task_updated",
                    description=(
                        f"{actor.full_name} updated {field_names} "
                        f"for the task '{task.title}'."
                    ),
                )

            if assignment_changed:
                if new_assignee is None:
                    action_type = "task_unassigned"
                    description = (
                        f"{actor.full_name} removed the assignee "
                        f"from the task '{task.title}'."
                    )
                    target_user_id = previous_assignee_id
                else:
                    action_type = (
                        "task_reassigned"
                        if previous_assignee_id is not None
                        else "task_assigned"
                    )
                    if previous_assignee is not None:
                        description = (
                            f"{actor.full_name} reassigned the task "
                            f"'{task.title}' from "
                            f"{previous_assignee.full_name} to "
                            f"{new_assignee.full_name}."
                        )
                    else:
                        description = (
                            f"{actor.full_name} assigned the task "
                            f"'{task.title}' to {new_assignee.full_name}."
                        )
                    target_user_id = new_assignee.id

                create_activity(
                    db,
                    workspace_id=workspace_id,
                    task_id=task.id,
                    actor_id=actor.id,
                    target_user_id=target_user_id,
                    action_type=action_type,
                    description=description,
                )

        notified_user_ids: set[int] = set()

        if (
            assignment_changed
            and task.assigned_to_id is not None
            and task.assigned_to_id != actor.id
        ):
            create_notification(
                db,
                recipient_id=task.assigned_to_id,
                actor_id=actor.id,
                workspace_id=workspace_id,
                task_id=task.id,
                notification_type="task_assigned",
                title="Task assigned to you",
                message=(
                    f"{actor.full_name} assigned you the task "
                    f"'{task.title}' in '{workspace.name}'."
                ),
            )
            notified_user_ids.add(task.assigned_to_id)

        if assignment_changed and previous_assignee_id is not None:
            if (
                previous_assignee_id != actor.id
                and previous_assignee_id != task.assigned_to_id
            ):
                notified_user_ids.add(previous_assignee_id)

        notification_recipient_ids = {
            task.created_by_id,
            task.assigned_to_id,
        }

        notification_recipient_ids.discard(None)
        notification_recipient_ids.discard(actor.id)
        notification_recipient_ids.difference_update(notified_user_ids)

        for recipient_id in notification_recipient_ids:
            create_notification(
                db,
                recipient_id=recipient_id,
                actor_id=actor.id,
                workspace_id=workspace_id,
                task_id=task.id,
                notification_type="task_updated",
                title="Task updated",
                message=(
                    f"{actor.full_name} updated the task "
                    f"'{task.title}' in '{workspace.name}'."
                ),
            )

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
    actor: User,
) -> bool:
    task = get_workspace_task(db, workspace_id, task_id)

    if task is None:
        return False

    try:
        create_activity(
            db,
            workspace_id=workspace_id,
            task_id=task.id,
            actor_id=actor.id,
            action_type="task_deleted",
            description=(
                f"{actor.full_name} deleted the task '{task.title}'."
            ),
        )

        db.delete(task)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return True
