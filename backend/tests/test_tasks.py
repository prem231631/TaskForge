
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.dependencies import get_db
from app.main import app


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


def register_and_login(
    client: TestClient,
    email: str,
) -> str:
    registration = client.post(
        "/auth/register",
        json={
            "full_name": "Task Test User",
            "email": email,
            "password": "Secure-Test-Password-123!",
        },
    )
    assert registration.status_code == 201

    login = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": "Secure-Test-Password-123!",
        },
    )
    assert login.status_code == 200

    return login.json()["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def get_user_id(client: TestClient, token: str) -> int:
    response = client.get(
        "/auth/me",
        headers=auth_headers(token),
    )
    assert response.status_code == 200
    return response.json()["id"]


def create_workspace(
    client: TestClient,
    token: str,
) -> dict:
    response = client.post(
        "/workspaces",
        headers=auth_headers(token),
        json={
            "name": "Task Test Workspace",
            "description": "Workspace for task API tests.",
        },
    )

    assert response.status_code == 201
    return response.json()


def create_task(
    client: TestClient,
    token: str,
    workspace_id: int,
    payload: dict | None = None,
):
    if payload is None:
        payload = {
            "title": "Implement task management",
            "description": "Build and test the task API.",
            "priority": "high",
        }

    return client.post(
        f"/workspaces/{workspace_id}/tasks",
        headers=auth_headers(token),
        json=payload,
    )


def test_create_task_with_defaults(client: TestClient):
    token = register_and_login(client, "task-create@example.com")
    workspace = create_workspace(client, token)

    response = create_task(
        client,
        token,
        workspace["id"],
        {"title": "  First task  "},
    )

    assert response.status_code == 201

    task = response.json()
    assert task["title"] == "First task"
    assert task["workspace_id"] == workspace["id"]
    assert task["created_by_id"] == workspace["owner_id"]
    assert task["description"] is None
    assert task["status"] == "todo"
    assert task["priority"] == "medium"
    assert task["assigned_to_id"] is None
    assert task["due_date"] is None
    assert "id" in task
    assert "created_at" in task
    assert "updated_at" in task


def test_create_task_rejects_blank_title(client: TestClient):
    token = register_and_login(client, "blank-task-title@example.com")
    workspace = create_workspace(client, token)

    response = create_task(
        client,
        token,
        workspace["id"],
        {"title": "   "},
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "payload",
    [
        {"title": "Invalid status", "status": "blocked"},
        {"title": "Invalid priority", "priority": "urgent"},
    ],
)
def test_create_task_rejects_invalid_options(
    client: TestClient,
    payload: dict,
):
    token = register_and_login(
        client,
        f"invalid-task-{payload['title'].replace(' ', '-').lower()}@example.com",
    )
    workspace = create_workspace(client, token)

    response = create_task(
        client,
        token,
        workspace["id"],
        payload,
    )

    assert response.status_code == 422


def test_create_task_with_due_date(client: TestClient):
    token = register_and_login(
        client,
        "task-due-date-create@example.com",
    )
    workspace = create_workspace(client, token)
    due_date = "2027-06-15T12:00:00Z"

    response = create_task(
        client,
        token,
        workspace["id"],
        {
            "title": "Task with deadline",
            "due_date": due_date,
        },
    )

    assert response.status_code == 201

    returned_due_date = response.json()["due_date"]
    assert returned_due_date is not None

    parsed_due_date = datetime.fromisoformat(
        returned_due_date.replace("Z", "+00:00")
    )

    # SQLite may return a timezone-naive datetime for this column.
    if parsed_due_date.tzinfo is None:
        parsed_due_date = parsed_due_date.replace(tzinfo=timezone.utc)

    assert parsed_due_date == datetime(
        2027, 6, 15, 12, 0, tzinfo=timezone.utc
    )


def test_member_can_list_and_get_tasks(client: TestClient):
    token = register_and_login(client, "task-list@example.com")
    workspace = create_workspace(client, token)

    first = create_task(
        client,
        token,
        workspace["id"],
        {"title": "First task"},
    )
    second = create_task(
        client,
        token,
        workspace["id"],
        {
            "title": "Second task",
            "status": "in_progress",
            "priority": "high",
        },
    )

    assert first.status_code == 201
    assert second.status_code == 201

    listing = client.get(
        f"/workspaces/{workspace['id']}/tasks",
        headers=auth_headers(token),
    )

    assert listing.status_code == 200

    result = listing.json()
    tasks = result["items"]

    assert len(tasks) == 2
    assert result["total"] == 2
    assert result["limit"] == 50
    assert result["offset"] == 0
    assert result["has_more"] is False

    assert {task["title"] for task in tasks} == {
        "First task",
        "Second task",
    }

    task_id = first.json()["id"]
    detail = client.get(
        f"/workspaces/{workspace['id']}/tasks/{task_id}",
        headers=auth_headers(token),
    )

    assert detail.status_code == 200
    assert detail.json()["id"] == task_id
    assert detail.json()["title"] == "First task"


def test_member_can_update_task(client: TestClient):
    token = register_and_login(client, "task-update@example.com")
    workspace = create_workspace(client, token)

    created = create_task(client, token, workspace["id"])
    assert created.status_code == 201

    task_id = created.json()["id"]

    response = client.patch(
        f"/workspaces/{workspace['id']}/tasks/{task_id}",
        headers=auth_headers(token),
        json={
            "title": "Updated task title",
            "status": "in_progress",
            "priority": "low",
            "description": "Updated task description.",
        },
    )

    assert response.status_code == 200

    updated = response.json()
    assert updated["id"] == task_id
    assert updated["title"] == "Updated task title"
    assert updated["status"] == "in_progress"
    assert updated["priority"] == "low"
    assert updated["description"] == "Updated task description."


@pytest.mark.parametrize(
    "payload",
    [
        {"status": "blocked"},
        {"priority": "urgent"},
        {"title": "   "},
        {"title": None},
        {"status": None},
        {"priority": None},
    ],
)
def test_task_update_rejects_invalid_values(
    client: TestClient,
    payload: dict,
):
    # Each test fixture gets a fresh database, so this address is reusable.
    token = register_and_login(
        client,
        "invalid-update@example.com",
    )
    workspace = create_workspace(client, token)
    created = create_task(client, token, workspace["id"])

    assert created.status_code == 201

    response = client.patch(
        f"/workspaces/{workspace['id']}/tasks/{created.json()['id']}",
        headers=auth_headers(token),
        json=payload,
    )

    assert response.status_code == 422


def test_empty_task_update_is_rejected(client: TestClient):
    token = register_and_login(client, "empty-task-update@example.com")
    workspace = create_workspace(client, token)
    created = create_task(client, token, workspace["id"])

    assert created.status_code == 201

    response = client.patch(
        f"/workspaces/{workspace['id']}/tasks/{created.json()['id']}",
        headers=auth_headers(token),
        json={},
    )

    assert response.status_code == 422


def test_task_due_date_can_be_updated_and_cleared(
    client: TestClient,
):
    token = register_and_login(
        client,
        "task-due-date-update@example.com",
    )
    workspace = create_workspace(client, token)
    created = create_task(client, token, workspace["id"])

    assert created.status_code == 201

    task_id = created.json()["id"]
    task_url = f"/workspaces/{workspace['id']}/tasks/{task_id}"
    headers = auth_headers(token)

    updated = client.patch(
        task_url,
        headers=headers,
        json={"due_date": "2027-08-20T09:30:00Z"},
    )

    assert updated.status_code == 200
    assert updated.json()["due_date"] is not None

    cleared = client.patch(
        task_url,
        headers=headers,
        json={"due_date": None},
    )

    assert cleared.status_code == 200
    assert cleared.json()["due_date"] is None


def test_workspace_member_can_be_assigned_task(
    client: TestClient,
):
    owner_token = register_and_login(
        client,
        "task-assignment-owner-valid@example.com",
    )
    member_email = "task-assignment-member-valid@example.com"

    register_and_login(client, member_email)
    member_token = register_and_login(
        client,
        "task-assignment-member-login@example.com",
    )

    # Add the registered member by the email expected by the workspace API.
    workspace = create_workspace(client, owner_token)

    membership = client.post(
        f"/workspaces/{workspace['id']}/members",
        headers=auth_headers(owner_token),
        json={"email": member_email},
    )

    assert membership.status_code == 201
    member_id = membership.json()["user_id"]

    response = create_task(
        client,
        owner_token,
        workspace["id"],
        {
            "title": "Assigned task",
            "assigned_to_id": member_id,
        },
    )

    assert response.status_code == 201
    assert response.json()["assigned_to_id"] == member_id


def test_member_can_delete_task(client: TestClient):
    token = register_and_login(client, "task-delete@example.com")
    workspace = create_workspace(client, token)
    created = create_task(client, token, workspace["id"])

    assert created.status_code == 201
    task_id = created.json()["id"]

    response = client.delete(
        f"/workspaces/{workspace['id']}/tasks/{task_id}",
        headers=auth_headers(token),
    )

    assert response.status_code == 204

    detail = client.get(
        f"/workspaces/{workspace['id']}/tasks/{task_id}",
        headers=auth_headers(token),
    )

    assert detail.status_code == 404


def test_nonexistent_task_returns_404_for_detail_update_and_delete(
    client: TestClient,
):
    token = register_and_login(
        client,
        "task-nonexistent@example.com",
    )
    workspace = create_workspace(client, token)
    task_url = f"/workspaces/{workspace['id']}/tasks/99999"
    headers = auth_headers(token)

    detail = client.get(task_url, headers=headers)
    update = client.patch(
        task_url,
        headers=headers,
        json={"title": "Updated title"},
    )
    delete = client.delete(task_url, headers=headers)

    assert detail.status_code == 404
    assert update.status_code == 404
    assert delete.status_code == 404


def test_non_member_cannot_access_workspace_tasks(
    client: TestClient,
):
    owner_token = register_and_login(
        client,
        "task-access-owner@example.com",
    )
    other_token = register_and_login(
        client,
        "task-access-other@example.com",
    )
    workspace = create_workspace(client, owner_token)

    created = create_task(client, owner_token, workspace["id"])
    assert created.status_code == 201

    headers = auth_headers(other_token)
    workspace_id = workspace["id"]
    task_id = created.json()["id"]

    listing = client.get(
        f"/workspaces/{workspace_id}/tasks",
        headers=headers,
    )
    detail = client.get(
        f"/workspaces/{workspace_id}/tasks/{task_id}",
        headers=headers,
    )
    creation = client.post(
        f"/workspaces/{workspace_id}/tasks",
        headers=headers,
        json={"title": "Unauthorized task"},
    )

    assert listing.status_code == 404
    assert detail.status_code == 404
    assert creation.status_code == 404


def test_task_endpoints_require_authentication(
    client: TestClient,
):
    response_create = client.post(
        "/workspaces/1/tasks",
        json={"title": "Unauthenticated task"},
    )
    response_list = client.get("/workspaces/1/tasks")
    response_detail = client.get("/workspaces/1/tasks/1")
    response_update = client.patch(
        "/workspaces/1/tasks/1",
        json={"title": "Updated title"},
    )
    response_delete = client.delete("/workspaces/1/tasks/1")

    assert response_create.status_code == 401
    assert response_list.status_code == 401
    assert response_detail.status_code == 401
    assert response_update.status_code == 401
    assert response_delete.status_code == 401


def test_task_must_belong_to_requested_workspace(
    client: TestClient,
):
    token = register_and_login(
        client,
        "task-workspace-boundary@example.com",
    )
    first_workspace = create_workspace(client, token)

    second_workspace_response = client.post(
        "/workspaces",
        headers=auth_headers(token),
        json={"name": "Another Workspace"},
    )
    assert second_workspace_response.status_code == 201
    second_workspace = second_workspace_response.json()

    created = create_task(client, token, first_workspace["id"])
    assert created.status_code == 201

    task_id = created.json()["id"]

    detail = client.get(
        f"/workspaces/{second_workspace['id']}/tasks/{task_id}",
        headers=auth_headers(token),
    )
    update = client.patch(
        f"/workspaces/{second_workspace['id']}/tasks/{task_id}",
        headers=auth_headers(token),
        json={"title": "Should not update"},
    )
    delete = client.delete(
        f"/workspaces/{second_workspace['id']}/tasks/{task_id}",
        headers=auth_headers(token),
    )

    assert detail.status_code == 404
    assert update.status_code == 404
    assert delete.status_code == 404


def test_task_assignment_requires_workspace_membership(
    client: TestClient,
):
    owner_token = register_and_login(
        client,
        "task-assignment-owner@example.com",
    )
    other_token = register_and_login(
        client,
        "task-assignment-other@example.com",
    )
    workspace = create_workspace(client, owner_token)
    other_user_id = get_user_id(client, other_token)

    response = create_task(
        client,
        owner_token,
        workspace["id"],
        {
            "title": "Assign to non-member",
            "assigned_to_id": other_user_id,
        },
    )

    assert response.status_code == 422
