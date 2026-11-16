from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.auth import CurrentUser
from app.db.dependencies import get_db
from app.schemas.activity import ActivityListResponse
from app.services.activity import list_workspace_activity


router = APIRouter(
    prefix="/workspaces/{workspace_id}/activities",
    tags=["Activity"],
)


@router.get(
    "",
    response_model=ActivityListResponse,
)
def get_workspace_activity(
    workspace_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
):
    result = list_workspace_activity(
        db=db,
        workspace_id=workspace_id,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )

    activities, total = result

    return {
        "items": activities,
        "total": total,
        "skip": skip,
        "limit": limit,
        "has_more": skip + len(activities) < total,
    }