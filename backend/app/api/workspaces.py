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
    WorkspaceMemberCreate,
    WorkspaceMemberResponse,
    WorkspaceResponse,
)
from app.services.workspace import (
    add_workspace_member,
    create_workspace,
    get_user_workspace,
    list_user_workspaces,
    list_workspace_members,
    remove_workspace_member,
)

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

DbSession = Annotated[Session, Depends(get_db)]


def require_workspace_owner(
    db: Session,
    workspace_id: int,
    current_user: User,
) -> None:
    result = get_user_workspace(db, workspace_id, current_user)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        )

    _, role = result

    if role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the workspace owner can manage members.",
        )


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


@router.get(
    "/{workspace_id}/members",
    response_model=list[WorkspaceMemberResponse],
)
def list_workspace_members_endpoint(
    workspace_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> list[WorkspaceMemberResponse]:
    result = get_user_workspace(db, workspace_id, current_user)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        )

    members = list_workspace_members(db, workspace_id)

    return [
        WorkspaceMemberResponse(
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=role,
            joined_at=joined_at,
        )
        for user, role, joined_at in members
    ]


@router.post(
    "/{workspace_id}/members",
    response_model=WorkspaceMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_workspace_member_endpoint(
    workspace_id: int,
    payload: WorkspaceMemberCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> WorkspaceMemberResponse:
    require_workspace_owner(db, workspace_id, current_user)

    try:
        membership = add_workspace_member(
            db,
            workspace_id,
            str(payload.email),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to add workspace member.",
        ) from exc

    member = db.get(User, membership.user_id)

    if member is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve the added member.",
        )

    return WorkspaceMemberResponse(
        user_id=member.id,
        full_name=member.full_name,
        email=member.email,
        role=membership.role,
        joined_at=membership.joined_at,
    )


@router.delete(
    "/{workspace_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_workspace_member_endpoint(
    workspace_id: int,
    user_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> None:
    require_workspace_owner(db, workspace_id, current_user)

    try:
        removed = remove_workspace_member(db, workspace_id, user_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to remove workspace member.",
        ) from exc

    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace member not found.",
        )
