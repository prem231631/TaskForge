
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.auth import CurrentUser
from app.db.dependencies import get_db
from app.models import Task
from app.schemas.task import (
    TaskCreate,
    TaskListResponse,
    TaskResponse,
    TaskUpdate,
)
from app.services.task import (
    create_task,
    delete_task,
    get_workspace_task,
    list_workspace_tasks,
    update_task,
)
from app.services.workspace import get_user_workspace

router = APIRouter(
    prefix="/workspaces/{workspace_id}/tasks",
    tags=["Tasks"],
)

DbSession = Annotated[Session, Depends(get_db)]


def require_workspace_membership(
    db: Session,
    workspace_id: int,
    current_user: CurrentUser,
) -> None:
    result = get_user_workspace(db, workspace_id, current_user)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        )


@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_task_endpoint(
    workspace_id: int,
    payload: TaskCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> Task:
    require_workspace_membership(db, workspace_id, current_user)

    try:
        return create_task(db, workspace_id, current_user, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create task.",
        ) from exc


@router.get(
    "",
    response_model=TaskListResponse,
)
def list_tasks_endpoint(
    workspace_id: int,
    db: DbSession,
    current_user: CurrentUser,
    status_filter: Annotated[
        Literal["todo", "in_progress", "done"] | None,
        Query(alias="status"),
    ] = None,
    priority_filter: Annotated[
        Literal["low", "medium", "high"] | None,
        Query(alias="priority"),
    ] = None,
    assigned_to_id: Annotated[int | None, Query(gt=0)] = None,
    sort_by: Annotated[
        Literal["created_at", "due_date", "title", "priority"],
        Query(),
    ] = "created_at",
    sort_order: Annotated[
        Literal["asc", "desc"],
        Query(),
    ] = "desc",
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> TaskListResponse:
    require_workspace_membership(db, workspace_id, current_user)

    items, total = list_workspace_tasks(
        db,
        workspace_id,
        status_filter=status_filter,
        priority_filter=priority_filter,
        assigned_to_id=assigned_to_id,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )

    return TaskListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(items) < total,
    )


@router.get(
    "/{task_id}",
    response_model=TaskResponse,
)
def get_task_endpoint(
    workspace_id: int,
    task_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> Task:
    require_workspace_membership(db, workspace_id, current_user)

    task = get_workspace_task(db, workspace_id, task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    return task


@router.patch(
    "/{task_id}",
    response_model=TaskResponse,
)
def update_task_endpoint(
    workspace_id: int,
    task_id: int,
    payload: TaskUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> Task:
    require_workspace_membership(db, workspace_id, current_user)

    try:
        task = update_task(db, workspace_id, task_id, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update task.",
        ) from exc

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    return task


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_task_endpoint(
    workspace_id: int,
    task_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> None:
    require_workspace_membership(db, workspace_id, current_user)

    try:
        deleted = delete_task(db, workspace_id, task_id)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to delete task.",
        ) from exc

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
