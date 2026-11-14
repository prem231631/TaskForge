
import pytest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.dependencies import get_db
from app.main import app
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


def create_workspace(
    client: TestClient,
    token: str,
) -> dict:
    response = client.post(
        "/workspaces",
        headers=auth_headers(token),
        json={"name": "Notification Test Workspace"},
    )

    assert response.status_code == 201
    return response.json()


def add_member(
    client: TestClient,
    owner_token: str,
    workspace_id: int,
    email: str,
) -> dict:
    response = client.post(
        f"/workspaces/{workspace_id}/members",
        headers=auth_headers(owner_token),
        json={"email": email},
    )

    assert response.status_code == 201
    return response.json()


def create_task(
    client: TestClient,
    token: str,
    workspace_id: int,
    payload: dict,
) -> dict:
    response = client.post(
        f"/workspaces/{workspace_id}/tasks",
        headers=auth_headers(token),
        json=payload,
    )

    assert response.status_code == 201
    return response.json()


def get_notifications(
    client: TestClient,
    token: str,
) -> list[dict]:
    response = client.get(
        "/notifications",
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    return response.json()["items"]


def test_adding_workspace_member_creates_notification(
    client: TestClient,
):
    owner_token = register_and_login(
        client,
        "event-workspace-owner@example.com",
    )
    member_token = register_and_login(
        client,
        "event-workspace-member@example.com",
    )

    workspace = create_workspace(client, owner_token)

    added = add_member(
        client,
        owner_token,
        workspace["id"],
        "event-workspace-member@example.com",
    )

    notifications = get_notifications(client, member_token)

    assert len(notifications) == 1
    assert notifications[0]["notification_type"] == "workspace_member_added"
    assert notifications[0]["workspace_id"] == workspace["id"]
    assert notifications[0]["actor_id"] == workspace["owner_id"]
    assert added["user_id"] != workspace["owner_id"]


def test_task_assignment_creates_notification_for_assignee(
    client: TestClient,
):
    owner_token = register_and_login(
        client,
        "event-assignment-owner@example.com",
    )
    assignee_token = register_and_login(
        client,
        "event-assignment-member@example.com",
    )

    workspace = create_workspace(client, owner_token)

    add_member(
        client,
        owner_token,
        workspace["id"],
        "event-assignment-member@example.com",
    )

    task = create_task(
        client,
        owner_token,
        workspace["id"],
        {
            "title": "Prepare project documentation",
            "assigned_to_id": (
                client.get(
                    "/auth/me",
                    headers=auth_headers(assignee_token),
                ).json()["id"]
            ),
        },
    )

    notifications = get_notifications(client, assignee_token)

    assert len(notifications) == 1
    assert notifications[0]["notification_type"] == "task_assigned"
    assert notifications[0]["task_id"] == task["id"]
    assert notifications[0]["workspace_id"] == workspace["id"]


def test_task_update_notifies_creator_and_assignee_only(
    client: TestClient,
):
    owner_token = register_and_login(
        client,
        "event-update-owner@example.com",
    )
    creator_token = register_and_login(
        client,
        "event-update-creator@example.com",
    )
    assignee_token = register_and_login(
        client,
        "event-update-assignee@example.com",
    )

    workspace = create_workspace(client, owner_token)

    add_member(
        client,
        owner_token,
        workspace["id"],
        "event-update-creator@example.com",
    )
    add_member(
        client,
        owner_token,
        workspace["id"],
        "event-update-assignee@example.com",
    )

    assignee_id = client.get(
        "/auth/me",
        headers=auth_headers(assignee_token),
    ).json()["id"]

    task = create_task(
        client,
        creator_token,
        workspace["id"],
        {
            "title": "Review project requirements",
            "assigned_to_id": assignee_id,
        },
    )

    update = client.patch(
        f"/workspaces/{workspace['id']}/tasks/{task['id']}",
        headers=auth_headers(owner_token),
        json={"status": "in_progress"},
    )

    assert update.status_code == 200

    creator_notifications = get_notifications(client, creator_token)
    assignee_notifications = get_notifications(client, assignee_token)
    owner_notifications = get_notifications(client, owner_token)

    assert any(
        item["notification_type"] == "task_updated"
        and item["task_id"] == task["id"]
        for item in creator_notifications
    )

    assert any(
        item["notification_type"] == "task_updated"
        and item["task_id"] == task["id"]
        for item in assignee_notifications
    )

    assert not any(
        item["task_id"] == task["id"]
        for item in owner_notifications
    )


def test_reassignment_notifies_new_assignee_without_duplicate(
    client: TestClient,
):
    owner_token = register_and_login(
        client,
        "event-reassign-owner@example.com",
    )
    first_token = register_and_login(
        client,
        "event-reassign-first@example.com",
    )
    second_token = register_and_login(
        client,
        "event-reassign-second@example.com",
    )

    workspace = create_workspace(client, owner_token)

    add_member(
        client,
        owner_token,
        workspace["id"],
        "event-reassign-first@example.com",
    )
    add_member(
        client,
        owner_token,
        workspace["id"],
        "event-reassign-second@example.com",
    )

    first_id = client.get(
        "/auth/me",
        headers=auth_headers(first_token),
    ).json()["id"]

    second_id = client.get(
        "/auth/me",
        headers=auth_headers(second_token),
    ).json()["id"]

    task = create_task(
        client,
        owner_token,
        workspace["id"],
        {
            "title": "Update deployment checklist",
            "assigned_to_id": first_id,
        },
    )

    response = client.patch(
        f"/workspaces/{workspace['id']}/tasks/{task['id']}",
        headers=auth_headers(owner_token),
        json={"assigned_to_id": second_id},
    )

    assert response.status_code == 200

    second_notifications = get_notifications(client, second_token)

    task_notifications = [
        item
        for item in second_notifications
        if item["task_id"] == task["id"]
    ]

    assert len(task_notifications) == 1
    assert task_notifications[0]["notification_type"] == "task_assigned"

    first_notifications = get_notifications(client, first_token)

    assert not any(
        item["task_id"] == task["id"]
        for item in first_notifications
    )
