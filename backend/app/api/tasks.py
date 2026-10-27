
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.auth import CurrentUser
from app.db.dependencies import get_db
from app.models import Task
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate
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
    current_user,
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
    response_model=list[TaskResponse],
)
def list_tasks_endpoint(
    workspace_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> list[Task]:
    require_workspace_membership(db, workspace_id, current_user)
    return list_workspace_tasks(db, workspace_id)


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
