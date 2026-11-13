
import pytest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.dependencies import get_db
from app.main import app
from app.models.notification import Notification
from tests.helpers import register_and_login


test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    bind=test_engine,
    autoflush=False,
    autocommit=False,
)


@pytest.fixture
def client():
    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_notification(
    recipient_id: int,
    title: str = "Test notification",
    is_read: bool = False,
) -> int:
    db = TestingSessionLocal()

    try:
        notification = Notification(
            recipient_id=recipient_id,
            notification_type="task_updated",
            title=title,
            message="This is a test notification.",
            is_read=is_read,
        )

        db.add(notification)
        db.commit()
        db.refresh(notification)

        return notification.id
    finally:
        db.close()


def get_user_id(client: TestClient, token: str) -> int:
    response = client.get(
        "/auth/me",
        headers=auth_headers(token),
    )

    assert response.status_code == 200

    return response.json()["id"]


def test_notification_endpoints_require_authentication(
    client: TestClient,
):
    responses = [
        client.get("/notifications"),
        client.get("/notifications/unread-count"),
        client.patch("/notifications/1/read"),
        client.patch("/notifications/read-all"),
    ]

    assert all(response.status_code == 401 for response in responses)


def test_user_can_list_notifications_with_pagination(
    client: TestClient,
):
    token = register_and_login(
        client,
        "notification-list@example.com",
    )
    user_id = get_user_id(client, token)

    create_notification(user_id, "First notification")
    create_notification(user_id, "Second notification")
    create_notification(user_id, "Third notification")

    response = client.get(
        "/notifications?skip=0&limit=2",
        headers=auth_headers(token),
    )

    assert response.status_code == 200

    result = response.json()

    assert len(result["items"]) == 2
    assert result["total"] == 3
    assert result["unread_count"] == 3
    assert result["skip"] == 0
    assert result["limit"] == 2

    assert result["items"][0]["id"] > result["items"][1]["id"]


def test_notification_pagination_rejects_invalid_values(
    client: TestClient,
):
    token = register_and_login(
        client,
        "notification-pagination@example.com",
    )
    headers = auth_headers(token)

    invalid_skip = client.get(
        "/notifications?skip=-1",
        headers=headers,
    )
    invalid_limit = client.get(
        "/notifications?limit=0",
        headers=headers,
    )
    excessive_limit = client.get(
        "/notifications?limit=101",
        headers=headers,
    )

    assert invalid_skip.status_code == 422
    assert invalid_limit.status_code == 422
    assert excessive_limit.status_code == 422


def test_unread_count_only_includes_unread_notifications(
    client: TestClient,
):
    token = register_and_login(
        client,
        "notification-unread-count@example.com",
    )
    user_id = get_user_id(client, token)

    create_notification(user_id, "Unread one")
    create_notification(user_id, "Unread two")
    create_notification(
        user_id,
        "Already read",
        is_read=True,
    )

    response = client.get(
        "/notifications/unread-count",
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    assert response.json() == {"unread_count": 2}


def test_user_can_mark_notification_as_read(
    client: TestClient,
):
    token = register_and_login(
        client,
        "notification-mark-read@example.com",
    )
    user_id = get_user_id(client, token)

    notification_id = create_notification(user_id)

    response = client.patch(
        f"/notifications/{notification_id}/read",
        headers=auth_headers(token),
    )

    assert response.status_code == 200

    result = response.json()

    assert result["id"] == notification_id
    assert result["is_read"] is True
    assert result["read_at"] is not None

    unread_count = client.get(
        "/notifications/unread-count",
        headers=auth_headers(token),
    )

    assert unread_count.json()["unread_count"] == 0


def test_marking_already_read_notification_is_safe(
    client: TestClient,
):
    token = register_and_login(
        client,
        "notification-already-read@example.com",
    )
    user_id = get_user_id(client, token)

    notification_id = create_notification(
        user_id,
        is_read=True,
    )

    response = client.patch(
        f"/notifications/{notification_id}/read",
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    assert response.json()["is_read"] is True
    assert response.json()["read_at"] is None


def test_user_can_mark_all_notifications_as_read(
    client: TestClient,
):
    token = register_and_login(
        client,
        "notification-mark-all@example.com",
    )
    user_id = get_user_id(client, token)

    create_notification(user_id, "Unread one")
    create_notification(user_id, "Unread two")
    create_notification(
        user_id,
        "Already read",
        is_read=True,
    )

    response = client.patch(
        "/notifications/read-all",
        headers=auth_headers(token),
    )

    assert response.status_code == 200

    result = response.json()

    assert result["updated_count"] == 2

    unread_count = client.get(
        "/notifications/unread-count",
        headers=auth_headers(token),
    )

    assert unread_count.json()["unread_count"] == 0


def test_user_cannot_access_another_users_notifications(
    client: TestClient,
):
    first_token = register_and_login(
        client,
        "notification-owner@example.com",
    )
    second_token = register_and_login(
        client,
        "notification-other@example.com",
    )

    first_user_id = get_user_id(client, first_token)

    notification_id = create_notification(first_user_id)

    second_headers = auth_headers(second_token)

    listing = client.get(
        "/notifications",
        headers=second_headers,
    )

    mark_read = client.patch(
        f"/notifications/{notification_id}/read",
        headers=second_headers,
    )

    assert listing.status_code == 200
    assert listing.json()["items"] == []
    assert listing.json()["total"] == 0
    assert listing.json()["unread_count"] == 0

    assert mark_read.status_code == 404


def test_nonexistent_notification_returns_404(
    client: TestClient,
):
    token = register_and_login(
        client,
        "notification-not-found@example.com",
    )

    response = client.patch(
        "/notifications/99999/read",
        headers=auth_headers(token),
    )

    assert response.status_code == 404
