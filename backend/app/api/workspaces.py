
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
    WorkspaceUpdate,
)
from app.services.workspace import (
    add_workspace_member,
    create_workspace,
    delete_workspace,
    get_user_workspace,
    list_user_workspaces,
    list_workspace_members,
    remove_workspace_member,
    update_workspace,
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
            detail="Only the workspace owner can manage this workspace.",
        )


@router.post(
    "",
    response_model=WorkspaceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a workspace",
    description="""
Create a new workspace for the authenticated user.

The authenticated user becomes the workspace owner.

**Requirements:**
- Workspace name must contain 2–120 characters.
- Description is optional and supports up to 500 characters.

""",
    responses={
        401: {"description": "Authentication required."},
        422: {"description": "Invalid workspace data."},
        500: {"description": "Unable to create workspace."},
    },
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


@router.get(
    "",
    response_model=list[WorkspaceDetailResponse],
    summary="List my workspaces",
    description="""
Retrieve all workspaces where the authenticated user is a member.

Each workspace includes the current user's membership role.
""",
    responses={
        401: {"description": "Authentication required."},
    },
)
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


@router.get(
    "/{workspace_id}",
    response_model=WorkspaceDetailResponse,
    summary="Get workspace details",
    description="""
Retrieve the details of a workspace the authenticated user belongs to.

The response includes the user's membership role.
""",
    responses={
        401: {"description": "Authentication required."},
        404: {"description": "Workspace not found or inaccessible."},
    },
)
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


@router.patch(
    "/{workspace_id}",
    response_model=WorkspaceResponse,
    summary="Update a workspace",
    description="""
Update a workspace's name or description.

**Permission:** Only the workspace owner can update workspace details.

Only the fields supplied in the request are updated.
""",
    responses={
        401: {"description": "Authentication required."},
        403: {"description": "Only the workspace owner can update this workspace."},
        404: {"description": "Workspace not found."},
        422: {"description": "Invalid workspace data."},
        500: {"description": "Unable to update workspace."},
    },
)
def update_workspace_endpoint(
    workspace_id: int,
    payload: WorkspaceUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> Workspace:
    require_workspace_owner(db, workspace_id, current_user)

    try:
        workspace = update_workspace(db, workspace_id, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update workspace.",
        ) from exc

    if workspace is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        )

    return workspace


@router.delete(
    "/{workspace_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a workspace",
    description="""
Permanently delete a workspace.

**Permission:** Only the workspace owner can delete the workspace.

A successful deletion returns HTTP 204 with no response body.
""",
    responses={
        401: {"description": "Authentication required."},
        403: {"description": "Only the workspace owner can delete this workspace."},
        404: {"description": "Workspace not found."},
        500: {"description": "Unable to delete workspace."},
    },
)
def delete_workspace_endpoint(
    workspace_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> None:
    require_workspace_owner(db, workspace_id, current_user)

    try:
        deleted = delete_workspace(db, workspace_id)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to delete workspace.",
        ) from exc

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        )


@router.get(
    "/{workspace_id}/members",
    response_model=list[WorkspaceMemberResponse],
    summary="List workspace members",
    description="""
Retrieve the members of a workspace.

Any authenticated workspace member can view the member list.
""",
    responses={
        401: {"description": "Authentication required."},
        404: {"description": "Workspace not found or inaccessible."},
    },
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
    summary="Add a workspace member",
    description="""
Add an existing TaskForge user to a workspace using their email address.

**Permission:** Only the workspace owner can add members.

The newly added member's information and membership role are returned.
""",
    responses={
        401: {"description": "Authentication required."},
        403: {"description": "Only the workspace owner can add members."},
        404: {"description": "Workspace not found."},
        409: {"description": "Unable to add member due to a membership conflict."},
        422: {"description": "Invalid email address."},
        500: {"description": "Unable to add workspace member."},
    },
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
    summary="Remove a workspace member",
    description="""
Remove a user from a workspace using their user ID.

**Permission:** Only the workspace owner can remove members.

A successful removal returns HTTP 204 with no response body.
""",
    responses={
        401: {"description": "Authentication required."},
        403: {"description": "Only the workspace owner can remove members."},
        404: {"description": "Workspace or member not found."},
        409: {"description": "The membership removal conflicts with workspace rules."},
        500: {"description": "Unable to remove workspace member."},
    },
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
