
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
            "full_name": "Pagination Test User",
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
        json={"name": "Pagination Test Workspace"},
    )
    assert response.status_code == 201
    return response.json()


def create_task(
    client: TestClient,
    token: str,
    workspace_id: int,
    title: str,
    **extra_fields,
):
    payload = {"title": title, **extra_fields}

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


def create_multiple_tasks(
    client: TestClient,
    token: str,
    workspace_id: int,
    count: int,
):
    for number in range(1, count + 1):
        response = create_task(
            client,
            token,
            workspace_id,
            f"Task {number:02d}",
        )
        assert response.status_code == 201


def test_default_pagination_returns_all_small_result_set(
    client: TestClient,
):
    token = register_and_login(
        client,
        "pagination-default@example.com",
    )
    workspace = create_workspace(client, token)

    create_multiple_tasks(client, token, workspace["id"], 5)

    response = list_tasks(client, token, workspace["id"])

    assert response.status_code == 200

    result = response.json()
    tasks = result["items"]

    assert len(tasks) == 5
    assert result["total"] == 5
    assert result["limit"] == 50
    assert result["offset"] == 0
    assert result["has_more"] is False


def test_limit_restricts_number_of_returned_tasks(
    client: TestClient,
):
    token = register_and_login(
        client,
        "pagination-limit@example.com",
    )
    workspace = create_workspace(client, token)

    create_multiple_tasks(client, token, workspace["id"], 5)

    response = list_tasks(
        client,
        token,
        workspace["id"],
        {"limit": 2},
    )

    assert response.status_code == 200

    result = response.json()
    tasks = result["items"]

    assert len(tasks) == 2
    assert result["total"] == 5
    assert result["limit"] == 2
    assert result["offset"] == 0
    assert result["has_more"] is True


def test_offset_skips_requested_number_of_tasks(
    client: TestClient,
):
    token = register_and_login(
        client,
        "pagination-offset@example.com",
    )
    workspace = create_workspace(client, token)

    create_multiple_tasks(client, token, workspace["id"], 5)

    response = list_tasks(
        client,
        token,
        workspace["id"],
        {
            "sort_by": "title",
            "sort_order": "asc",
            "offset": 2,
        },
    )

    assert response.status_code == 200

    result = response.json()
    tasks = result["items"]

    titles = [task["title"] for task in tasks]

    assert titles == ["Task 03", "Task 04", "Task 05"]
    assert result["total"] == 5
    assert result["limit"] == 50
    assert result["offset"] == 2
    assert result["has_more"] is False


def test_limit_and_offset_return_expected_page(
    client: TestClient,
):
    token = register_and_login(
        client,
        "pagination-page@example.com",
    )
    workspace = create_workspace(client, token)

    create_multiple_tasks(client, token, workspace["id"], 6)

    response = list_tasks(
        client,
        token,
        workspace["id"],
        {
            "sort_by": "title",
            "sort_order": "asc",
            "limit": 2,
            "offset": 2,
        },
    )

    assert response.status_code == 200

    result = response.json()
    tasks = result["items"]

    titles = [task["title"] for task in tasks]

    assert titles == ["Task 03", "Task 04"]
    assert result["total"] == 6
    assert result["limit"] == 2
    assert result["offset"] == 2
    assert result["has_more"] is True


def test_offset_beyond_available_tasks_returns_empty_list(
    client: TestClient,
):
    token = register_and_login(
        client,
        "pagination-empty@example.com",
    )
    workspace = create_workspace(client, token)

    create_multiple_tasks(client, token, workspace["id"], 3)

    response = list_tasks(
        client,
        token,
        workspace["id"],
        {"offset": 10},
    )

    assert response.status_code == 200

    result = response.json()

    assert result["items"] == []
    assert result["total"] == 3
    assert result["limit"] == 50
    assert result["offset"] == 10
    assert result["has_more"] is False


def test_pagination_works_with_filters_and_sorting(
    client: TestClient,
):
    token = register_and_login(
        client,
        "pagination-combined@example.com",
    )
    workspace = create_workspace(client, token)

    create_task(
        client,
        token,
        workspace["id"],
        "Alpha task",
        status="todo",
        priority="high",
    )
    create_task(
        client,
        token,
        workspace["id"],
        "Bravo task",
        status="in_progress",
        priority="high",
    )
    create_task(
        client,
        token,
        workspace["id"],
        "Charlie task",
        status="in_progress",
        priority="high",
    )
    create_task(
        client,
        token,
        workspace["id"],
        "Delta task",
        status="in_progress",
        priority="low",
    )

    response = list_tasks(
        client,
        token,
        workspace["id"],
        {
            "status": "in_progress",
            "priority": "high",
            "sort_by": "title",
            "sort_order": "asc",
            "limit": 1,
            "offset": 1,
        },
    )

    assert response.status_code == 200

    result = response.json()
    tasks = result["items"]

    assert len(tasks) == 1
    assert tasks[0]["title"] == "Charlie task"
    assert result["total"] == 2
    assert result["limit"] == 1
    assert result["offset"] == 1
    assert result["has_more"] is False


@pytest.mark.parametrize(
    "params",
    [
        {"limit": 0},
        {"limit": 101},
        {"limit": -1},
        {"offset": -1},
    ],
)
def test_pagination_rejects_invalid_values(
    client: TestClient,
    params: dict,
):
    token = register_and_login(
        client,
        "pagination-invalid@example.com",
    )
    workspace = create_workspace(client, token)

    response = list_tasks(
        client,
        token,
        workspace["id"],
        params,
    )

    assert response.status_code == 422
