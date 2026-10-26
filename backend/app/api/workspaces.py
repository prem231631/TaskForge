
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.auth import CurrentUser
from app.db.dependencies import get_db
from app.models import User, Workspace
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceDetailResponse,
    WorkspaceResponse,
)
from app.services.workspace import (
    create_workspace,
    get_user_workspace,
    list_user_workspaces,
)

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

DbSession = Annotated[Session, Depends(get_db)]


@router.post(
    "",
    response_model=WorkspaceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_workspace_endpoint(
    payload: WorkspaceCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> Workspace:
    try:
        return create_workspace(db, current_user, payload)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create workspace.",
        ) from exc


@router.get("", response_model=list[WorkspaceDetailResponse])
def list_workspaces_endpoint(
    db: DbSession,
    current_user: CurrentUser,
) -> list[WorkspaceDetailResponse]:
    workspaces = list_user_workspaces(db, current_user)

    return [
        WorkspaceDetailResponse(
            id=workspace.id,
            name=workspace.name,
            description=workspace.description,
            owner_id=workspace.owner_id,
            created_at=workspace.created_at,
            updated_at=workspace.updated_at,
            role=role,
        )
        for workspace, role in workspaces
    ]


@router.get("/{workspace_id}", response_model=WorkspaceDetailResponse)
def get_workspace_endpoint(
    workspace_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> WorkspaceDetailResponse:
    result = get_user_workspace(db, workspace_id, current_user)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        )

    workspace, role = result

    return WorkspaceDetailResponse(
        id=workspace.id,
        name=workspace.name,
        description=workspace.description,
        owner_id=workspace.owner_id,
        created_at=workspace.created_at,
        updated_at=workspace.updated_at,
        role=role,
    )
