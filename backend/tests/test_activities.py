
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


def create_workspace(client: TestClient, token: str) -> dict:
    response = client.post(
        "/workspaces",
        headers=auth_headers(token),
        json={"name": "Activity Test Workspace"},
    )
    assert response.status_code == 201
    return response.json()


def create_task(
    client: TestClient,
    token: str,
    workspace_id: int,
    title: str = "Activity Test Task",
) -> dict:
    response = client.post(
        f"/workspaces/{workspace_id}/tasks",
        headers=auth_headers(token),
        json={"title": title},
    )
    assert response.status_code == 201
    return response.json()


def get_activities(
    client: TestClient,
    token: str,
    workspace_id: int,
    params: dict | None = None,
):
    return client.get(
        f"/workspaces/{workspace_id}/activities",
        headers=auth_headers(token),
        params=params,
    )


def test_task_creation_creates_activity(client: TestClient):
    token = register_and_login(
        client,
        "activity-create@example.com",
    )
    workspace = create_workspace(client, token)

    task = create_task(
        client,
        token,
        workspace["id"],
        "Prepare project documentation",
    )

    response = get_activities(
        client,
        token,
        workspace["id"],
    )

    assert response.status_code == 200

    result = response.json()
    assert result["total"] == 1
    assert result["has_more"] is False

    activity = result["items"][0]

    assert activity["workspace_id"] == workspace["id"]
    assert activity["task_id"] == task["id"]
    assert activity["actor_id"] == workspace["owner_id"]
    assert activity["action_type"] == "task_created"
    assert "Prepare project documentation" in activity["description"]


def test_task_status_change_creates_activity(client: TestClient):
    token = register_and_login(
        client,
        "activity-status@example.com",
    )
    workspace = create_workspace(client, token)
    task = create_task(client, token, workspace["id"])

    response = client.patch(
        f"/workspaces/{workspace['id']}/tasks/{task['id']}",
        headers=auth_headers(token),
        json={"status": "in_progress"},
    )

    assert response.status_code == 200

    activities = get_activities(
        client,
        token,
        workspace["id"],
    ).json()["items"]

    status_activity = next(
        item
        for item in activities
        if item["action_type"] == "task_status_changed"
    )

    assert status_activity["task_id"] == task["id"]
    assert "todo" in status_activity["description"]
    assert "in_progress" in status_activity["description"]


def test_completing_task_creates_completion_activity(
    client: TestClient,
):
    token = register_and_login(
        client,
        "activity-complete@example.com",
    )
    workspace = create_workspace(client, token)
    task = create_task(client, token, workspace["id"])

    response = client.patch(
        f"/workspaces/{workspace['id']}/tasks/{task['id']}",
        headers=auth_headers(token),
        json={"status": "done"},
    )

    assert response.status_code == 200

    activities = get_activities(
        client,
        token,
        workspace["id"],
    ).json()["items"]

    completion_activity = next(
        item
        for item in activities
        if item["action_type"] == "task_completed"
    )

    assert completion_activity["task_id"] == task["id"]


def test_task_details_update_creates_activity(client: TestClient):
    token = register_and_login(
        client,
        "activity-update@example.com",
    )
    workspace = create_workspace(client, token)
    task = create_task(client, token, workspace["id"])

    response = client.patch(
        f"/workspaces/{workspace['id']}/tasks/{task['id']}",
        headers=auth_headers(token),
        json={
            "title": "Revised task title",
            "priority": "high",
            "description": "Updated task details.",
        },
    )

    assert response.status_code == 200

    activities = get_activities(
        client,
        token,
        workspace["id"],
    ).json()["items"]

    update_activity = next(
        item
        for item in activities
        if item["action_type"] == "task_updated"
    )

    assert update_activity["task_id"] == task["id"]
    assert "description" in update_activity["description"]
    assert "priority" in update_activity["description"]
    assert "title" in update_activity["description"]


def test_unchanged_task_values_do_not_create_activity(
    client: TestClient,
):
    token = register_and_login(
        client,
        "activity-no-change@example.com",
    )
    workspace = create_workspace(client, token)
    task = create_task(client, token, workspace["id"])

    before = get_activities(
        client,
        token,
        workspace["id"],
    ).json()["total"]

    response = client.patch(
        f"/workspaces/{workspace['id']}/tasks/{task['id']}",
        headers=auth_headers(token),
        json={"title": task["title"]},
    )

    assert response.status_code == 200

    after = get_activities(
        client,
        token,
        workspace["id"],
    ).json()["total"]

    assert after == before


def test_task_deletion_creates_activity(client: TestClient):
    token = register_and_login(
        client,
        "activity-delete@example.com",
    )
    workspace = create_workspace(client, token)
    task = create_task(
        client,
        token,
        workspace["id"],
        "Task to preserve in history",
    )

    response = client.delete(
        f"/workspaces/{workspace['id']}/tasks/{task['id']}",
        headers=auth_headers(token),
    )

    assert response.status_code == 204

    activities = get_activities(
        client,
        token,
        workspace["id"],
    ).json()["items"]

    deletion_activity = next(
        item
        for item in activities
        if item["action_type"] == "task_deleted"
    )

    assert "Task to preserve in history" in deletion_activity["description"]


def test_activity_list_requires_authentication(client: TestClient):
    response = client.get("/workspaces/1/activities")

    assert response.status_code == 401


def test_non_member_cannot_view_workspace_activity(
    client: TestClient,
):
    owner_token = register_and_login(
        client,
        "activity-owner@example.com",
    )
    other_token = register_and_login(
        client,
        "activity-outsider@example.com",
    )

    workspace = create_workspace(client, owner_token)

    response = get_activities(
        client,
        other_token,
        workspace["id"],
    )

    assert response.status_code == 404


def test_activity_pagination(client: TestClient):
    token = register_and_login(
        client,
        "activity-pagination@example.com",
    )
    workspace = create_workspace(client, token)

    create_task(client, token, workspace["id"], "First activity task")
    create_task(client, token, workspace["id"], "Second activity task")
    create_task(client, token, workspace["id"], "Third activity task")

    first_page = get_activities(
        client,
        token,
        workspace["id"],
        {"skip": 0, "limit": 2},
    )

    assert first_page.status_code == 200

    first_result = first_page.json()

    assert first_result["total"] == 3
    assert len(first_result["items"]) == 2
    assert first_result["skip"] == 0
    assert first_result["limit"] == 2
    assert first_result["has_more"] is True

    second_page = get_activities(
        client,
        token,
        workspace["id"],
        {"skip": 2, "limit": 2},
    )

    assert second_page.status_code == 200

    second_result = second_page.json()

    assert second_result["total"] == 3
    assert len(second_result["items"]) == 1
    assert second_result["has_more"] is False


@pytest.mark.parametrize(
    "params",
    [
        {"skip": -1},
        {"limit": 0},
        {"limit": 101},
    ],
)
def test_activity_pagination_rejects_invalid_values(
    client: TestClient,
    params: dict,
):
    token = register_and_login(
        client,
        "activity-invalid-pagination@example.com",
    )
    workspace = create_workspace(client, token)

    response = get_activities(
        client,
        token,
        workspace["id"],
        params,
    )

    assert response.status_code == 422


def test_workspace_member_addition_creates_activity(
    client: TestClient,
):
    owner_token = register_and_login(
        client,
        "activity-member-owner@example.com",
    )
    member_email = "activity-member@example.com"

    register_and_login(client, member_email)

    workspace = create_workspace(client, owner_token)

    member_response = client.get(
        "/auth/me",
        headers=auth_headers(
            register_and_login(
                client,
                "activity-member-lookup@example.com",
            )
        ),
    )
    assert member_response.status_code == 200

    added = client.post(
        f"/workspaces/{workspace['id']}/members",
        headers=auth_headers(owner_token),
        json={"email": member_email},
    )

    assert added.status_code == 201

    activities = get_activities(
        client,
        owner_token,
        workspace["id"],
    ).json()["items"]

    member_activity = next(
        item
        for item in activities
        if item["action_type"] == "workspace_member_added"
    )

    assert member_activity["target_user_id"] == added.json()["user_id"]


def test_workspace_member_removal_creates_activity(
    client: TestClient,
):
    owner_token = register_and_login(
        client,
        "activity-remove-owner@example.com",
    )
    member_email = "activity-remove-member@example.com"
    member_token = register_and_login(client, member_email)

    workspace = create_workspace(client, owner_token)

    member_info = client.get(
        "/auth/me",
        headers=auth_headers(member_token),
    )
    assert member_info.status_code == 200
    member_id = member_info.json()["id"]

    added = client.post(
        f"/workspaces/{workspace['id']}/members",
        headers=auth_headers(owner_token),
        json={"email": member_email},
    )
    assert added.status_code == 201

    removed = client.delete(
        f"/workspaces/{workspace['id']}/members/{member_id}",
        headers=auth_headers(owner_token),
    )

    assert removed.status_code == 204

    activities = get_activities(
        client,
        owner_token,
        workspace["id"],
    ).json()["items"]

    removal_activity = next(
        item
        for item in activities
        if item["action_type"] == "workspace_member_removed"
    )

    assert removal_activity["target_user_id"] == member_id
