
from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models.notification import Notification


def list_user_notifications(
    db: Session,
    recipient_id: int,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[Notification], int, int]:
    total = db.scalar(
        select(func.count(Notification.id)).where(
            Notification.recipient_id == recipient_id
        )
    ) or 0

    unread_count = get_unread_count(db, recipient_id)

    notifications = db.scalars(
        select(Notification)
        .where(Notification.recipient_id == recipient_id)
        .order_by(
            Notification.created_at.desc(),
            Notification.id.desc(),
        )
        .offset(skip)
        .limit(limit)
    ).all()

    return list(notifications), total, unread_count


def get_unread_count(
    db: Session,
    recipient_id: int,
) -> int:
    count = db.scalar(
        select(func.count(Notification.id)).where(
            Notification.recipient_id == recipient_id,
            Notification.is_read.is_(False),
        )
    )

    return count or 0


def mark_notification_as_read(
    db: Session,
    recipient_id: int,
    notification_id: int,
) -> Notification | None:
    notification = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.recipient_id == recipient_id,
        )
    )

    if notification is None:
        return None

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(notification)

    return notification


def mark_all_notifications_as_read(
    db: Session,
    recipient_id: int,
) -> int:
    result = db.execute(
        update(Notification)
        .where(
            Notification.recipient_id == recipient_id,
            Notification.is_read.is_(False),
        )
        .values(
            is_read=True,
            read_at=datetime.now(timezone.utc),
        )
    )

    db.commit()

    return result.rowcount or 0
