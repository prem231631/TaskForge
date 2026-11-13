
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.auth import CurrentUser
from app.db.dependencies import get_db
from app.schemas.notification import (
    NotificationListResponse,
    NotificationMarkAllReadResponse,
    NotificationResponse,
    NotificationUnreadCountResponse,
)
from app.services.notification import (
    get_unread_count,
    list_user_notifications,
    mark_all_notifications_as_read,
    mark_notification_as_read,
)


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@router.get(
    "",
    response_model=NotificationListResponse,
)
def get_notifications(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
):
    notifications, total, unread_count = list_user_notifications(
        db=db,
        recipient_id=current_user.id,
        skip=skip,
        limit=limit,
    )

    return {
        "items": notifications,
        "total": total,
        "unread_count": unread_count,
        "skip": skip,
        "limit": limit,
    }


@router.get(
    "/unread-count",
    response_model=NotificationUnreadCountResponse,
)
def get_notifications_unread_count(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    unread_count = get_unread_count(
        db=db,
        recipient_id=current_user.id,
    )

    return {"unread_count": unread_count}


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
)
def mark_notification_read(
    notification_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    notification = mark_notification_as_read(
        db=db,
        recipient_id=current_user.id,
        notification_id=notification_id,
    )

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    return notification


@router.patch(
    "/read-all",
    response_model=NotificationMarkAllReadResponse,
)
def mark_all_notifications_read(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    updated_count = mark_all_notifications_as_read(
        db=db,
        recipient_id=current_user.id,
    )

    return {
        "message": "All notifications marked as read",
        "updated_count": updated_count,
    }
