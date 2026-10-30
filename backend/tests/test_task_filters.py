
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


def register_and_login(client: TestClient, email: str) -> str:
    registration = client.post(
        "/auth/register",
        json={
            "full_name": "Task Filter Test User",
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


def create_workspace(client: TestClient, token: str) -> dict:
    response = client.post(
        "/workspaces",
        headers=auth_headers(token),
        json={"name": "Filter Test Workspace"},
    )
    assert response.status_code == 201
    return response.json()


def create_task(
    client: TestClient,
    token: str,
    workspace_id: int,
    payload: dict,
):
    return client.post(
        f"/workspaces/{workspace_id}/tasks",
        headers=auth_headers(token),
        json=payload,
    )


def list_tasks(
    client: TestClient,
    token: str,
    workspace_id: int,
    params: dict | None = None,
):
    return client.get(
        f"/workspaces/{workspace_id}/tasks",
        headers=auth_headers(token),
        params=params,
    )


def test_filter_tasks_by_status(client: TestClient):
    token = register_and_login(client, "filter-status@example.com")
    workspace = create_workspace(client, token)

    create_task(
        client,
        token,
        workspace["id"],
        {"title": "Todo task", "status": "todo"},
    )
    create_task(
        client,
        token,
        workspace["id"],
        {"title": "In progress task", "status": "in_progress"},
    )
    create_task(
        client,
        token,
        workspace["id"],
        {"title": "Completed task", "status": "done"},
    )

    response = list_tasks(
        client,
        token,
        workspace["id"],
        {"status": "in_progress"},
    )

    assert response.status_code == 200
    tasks = response.json()
    assert len(tasks) == 1
    assert tasks[0]["title"] == "In progress task"
    assert tasks[0]["status"] == "in_progress"


def test_filter_tasks_by_priority(client: TestClient):
    token = register_and_login(client, "filter-priority@example.com")
    workspace = create_workspace(client, token)

    create_task(
        client,
        token,
        workspace["id"],
        {"title": "Low priority task", "priority": "low"},
    )
    create_task(
        client,
        token,
        workspace["id"],
        {"title": "Medium priority task", "priority": "medium"},
    )
    create_task(
        client,
        token,
        workspace["id"],
        {"title": "High priority task", "priority": "high"},
    )

    response = list_tasks(
        client,
        token,
        workspace["id"],
        {"priority": "high"},
    )

    assert response.status_code == 200
    tasks = response.json()
    assert len(tasks) == 1
    assert tasks[0]["title"] == "High priority task"
    assert tasks[0]["priority"] == "high"


def test_filter_tasks_by_assignee(client: TestClient):
    owner_token = register_and_login(
        client,
        "filter-assignee-owner@example.com",
    )
    member_email = "filter-assignee-member@example.com"
    register_and_login(client, member_email)

    workspace = create_workspace(client, owner_token)

    membership = client.post(
        f"/workspaces/{workspace['id']}/members",
        headers=auth_headers(owner_token),
        json={"email": member_email},
    )
    assert membership.status_code == 201
    member_id = membership.json()["user_id"]

    create_task(
        client,
        owner_token,
        workspace["id"],
        {"title": "Assigned task", "assigned_to_id": member_id},
    )
    create_task(
        client,
        owner_token,
        workspace["id"],
        {"title": "Unassigned task"},
    )

    response = list_tasks(
        client,
        owner_token,
        workspace["id"],
        {"assigned_to_id": member_id},
    )

    assert response.status_code == 200
    tasks = response.json()
    assert len(tasks) == 1
    assert tasks[0]["title"] == "Assigned task"
    assert tasks[0]["assigned_to_id"] == member_id


def test_combine_status_and_priority_filters(client: TestClient):
    token = register_and_login(client, "combined-filters@example.com")
    workspace = create_workspace(client, token)

    create_task(
        client,
        token,
        workspace["id"],
        {
            "title": "Matching task",
            "status": "in_progress",
            "priority": "high",
        },
    )
    create_task(
        client,
        token,
        workspace["id"],
        {
            "title": "Wrong status",
            "status": "todo",
            "priority": "high",
        },
    )
    create_task(
        client,
        token,
        workspace["id"],
        {
            "title": "Wrong priority",
            "status": "in_progress",
            "priority": "low",
        },
    )

    response = list_tasks(
        client,
        token,
        workspace["id"],
        {
            "status": "in_progress",
            "priority": "high",
        },
    )

    assert response.status_code == 200
    tasks = response.json()
    assert len(tasks) == 1
    assert tasks[0]["title"] == "Matching task"


def test_sort_tasks_by_title_ascending(client: TestClient):
    token = register_and_login(client, "sort-title@example.com")
    workspace = create_workspace(client, token)

    create_task(
        client,
        token,
        workspace["id"],
        {"title": "Zebra task"},
    )
    create_task(
        client,
        token,
        workspace["id"],
        {"title": "Alpha task"},
    )

    response = list_tasks(
        client,
        token,
        workspace["id"],
        {"sort_by": "title", "sort_order": "asc"},
    )

    assert response.status_code == 200
    titles = [task["title"] for task in response.json()]
    assert titles == ["Alpha task", "Zebra task"]


def test_sort_tasks_by_priority_descending(client: TestClient):
    token = register_and_login(client, "sort-priority@example.com")
    workspace = create_workspace(client, token)

    create_task(
        client,
        token,
        workspace["id"],
        {"title": "Low task", "priority": "low"},
    )
    create_task(
        client,
        token,
        workspace["id"],
        {"title": "High task", "priority": "high"},
    )
    create_task(
        client,
        token,
        workspace["id"],
        {"title": "Medium task", "priority": "medium"},
    )

    response = list_tasks(
        client,
        token,
        workspace["id"],
        {"sort_by": "priority", "sort_order": "desc"},
    )

    assert response.status_code == 200
    priorities = [task["priority"] for task in response.json()]
    assert priorities == ["high", "medium", "low"]


def test_sort_tasks_by_due_date_ascending(client: TestClient):
    token = register_and_login(client, "sort-due-date@example.com")
    workspace = create_workspace(client, token)

    create_task(
        client,
        token,
        workspace["id"],
        {
            "title": "Later task",
            "due_date": "2027-06-15T12:00:00Z",
        },
    )
    create_task(
        client,
        token,
        workspace["id"],
        {
            "title": "Earlier task",
            "due_date": "2027-06-10T12:00:00Z",
        },
    )

    response = list_tasks(
        client,
        token,
        workspace["id"],
        {"sort_by": "due_date", "sort_order": "asc"},
    )

    assert response.status_code == 200

    tasks_with_dates = [
        task for task in response.json()
        if task["due_date"] is not None
    ]

    parsed_dates = [
        datetime.fromisoformat(
            task["due_date"].replace("Z", "+00:00")
        )
        for task in tasks_with_dates
    ]

    # SQLite may return timezone-naive datetime values.
    parsed_dates = [
        value.replace(tzinfo=timezone.utc)
        if value.tzinfo is None else value
        for value in parsed_dates
    ]

    assert len(parsed_dates) == 2
    assert parsed_dates == sorted(parsed_dates)


@pytest.mark.parametrize(
    "params",
    [
        {"status": "blocked"},
        {"priority": "urgent"},
        {"sort_by": "invalid"},
        {"sort_order": "random"},
    ],
)
def test_task_list_rejects_invalid_query_parameters(
    client: TestClient,
    params: dict,
):
    token = register_and_login(
        client,
        "invalid-list-parameters@example.com",
    )
    workspace = create_workspace(client, token)

    response = list_tasks(
        client,
        token,
        workspace["id"],
        params,
    )

    assert response.status_code == 422
