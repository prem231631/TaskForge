
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
    summary="Create a task",
    description="""
Create a new task inside a workspace.

**Permission:** The authenticated user must be a workspace member.

**Task defaults:**
- Status: `todo`
- Priority: `medium`

**Task fields:**
- Title: 1–200 characters, cannot be blank.
- Description: Optional, up to 5,000 characters.
- Assignee: Optional workspace member ID.
- Due date: Optional datetime.
""",
    responses={
        401: {"description": "Authentication required."},
        404: {"description": "Workspace not found or inaccessible."},
        422: {"description": "Invalid task data or assignee."},
        500: {"description": "Unable to create task."},
    },
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
    summary="List workspace tasks",
    description="""
Retrieve workspace tasks with optional filtering, sorting, and pagination.

**Available filters:**
- `status`: `todo`, `in_progress`, or `done`.
- `priority`: `low`, `medium`, or `high`.
- `assigned_to_id`: Positive user ID of the assignee.

**Sorting:**
- `sort_by`: `created_at`, `due_date`, `title`, or `priority`.
- `sort_order`: `asc` or `desc`.

**Pagination:**
- `limit`: Number of tasks per page (1–100, default 50).
- `offset`: Number of matching tasks to skip (default 0).

**Response metadata:**
- `items`: Tasks on the current page.
- `total`: Total number of tasks matching the filters before pagination.
- `limit`: Requested page size.
- `offset`: Number of skipped matching tasks.
- `has_more`: Whether additional matching tasks are available.

All filters are optional. Workspace membership is required.
""",
    responses={
        401: {"description": "Authentication required."},
        404: {"description": "Workspace not found or inaccessible."},
        422: {"description": "Invalid filter, sorting, or pagination parameter."},
    },
)
def list_tasks_endpoint(
    workspace_id: int,
    db: DbSession,
    current_user: CurrentUser,
    status_filter: Annotated[
        Literal["todo", "in_progress", "done"] | None,
        Query(
            alias="status",
            description="Filter tasks by status.",
        ),
    ] = None,
    priority_filter: Annotated[
        Literal["low", "medium", "high"] | None,
        Query(
            alias="priority",
            description="Filter tasks by priority.",
        ),
    ] = None,
    assigned_to_id: Annotated[
        int | None,
        Query(
            gt=0,
            description="Filter tasks assigned to a specific workspace member.",
        ),
    ] = None,
    sort_by: Annotated[
        Literal["created_at", "due_date", "title", "priority"],
        Query(description="Field used to sort the task list."),
    ] = "created_at",
    sort_order: Annotated[
        Literal["asc", "desc"],
        Query(description="Sorting direction."),
    ] = "desc",
    limit: Annotated[
        int,
        Query(
            ge=1,
            le=100,
            description="Maximum number of tasks returned per page.",
        ),
    ] = 50,
    offset: Annotated[
        int,
        Query(
            ge=0,
            description="Number of matching tasks to skip.",
        ),
    ] = 0,
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
    summary="Get a task",
    description="""
Retrieve a specific task by its ID within a workspace.

The authenticated user must be a member of the workspace.
""",
    responses={
        401: {"description": "Authentication required."},
        404: {"description": "Workspace or task not found."},
    },
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
    summary="Update a task",
    description="""
Update an existing task within a workspace.

The authenticated user must be a workspace member.

Only the fields provided in the request are updated.

**Updatable fields:**
- Title
- Description
- Status
- Priority
- Assignee
- Due date

At least one field must be provided.
""",
    responses={
        401: {"description": "Authentication required."},
        404: {"description": "Workspace or task not found."},
        422: {"description": "Invalid task update data."},
        500: {"description": "Unable to update task."},
    },
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
    summary="Delete a task",
    description="""
Permanently delete a task from a workspace.

The authenticated user must be a workspace member.

A successful deletion returns HTTP 204 with no response body.
""",
    responses={
        401: {"description": "Authentication required."},
        404: {"description": "Workspace or task not found."},
        500: {"description": "Unable to delete task."},
    },
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
