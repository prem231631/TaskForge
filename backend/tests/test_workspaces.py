
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.dependencies import get_db
from app.main import app
from app.models import WorkspaceMembership


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
            "full_name": "Workspace Test User",
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


def test_create_workspace_assigns_owner_role(client: TestClient):
    token = register_and_login(client, "workspace-owner@example.com")

    response = client.post(
        "/workspaces",
        headers=auth_headers(token),
        json={
            "name": "Product Development",
            "description": "Planning and building our product.",
        },
    )

    assert response.status_code == 201
    workspace = response.json()

    assert workspace["name"] == "Product Development"
    assert workspace["description"] == "Planning and building our product."
    assert workspace["owner_id"] > 0
    assert "role" not in workspace
    assert "hashed_password" not in workspace

    listing = client.get("/workspaces", headers=auth_headers(token))

    assert listing.status_code == 200
    assert len(listing.json()) == 1
    assert listing.json()[0]["id"] == workspace["id"]
    assert listing.json()[0]["role"] == "owner"


def test_workspace_creator_has_owner_membership(client: TestClient):
    token = register_and_login(client, "membership-owner@example.com")

    response = client.post(
        "/workspaces",
        headers=auth_headers(token),
        json={"name": "Engineering Team"},
    )

    assert response.status_code == 201
    workspace_id = response.json()["id"]

    with TestingSessionLocal() as db:
        membership = db.scalar(
            select(WorkspaceMembership).where(
                WorkspaceMembership.workspace_id == workspace_id
            )
        )

        assert membership is not None
        assert membership.role == "owner"
        assert membership.user_id == response.json()["owner_id"]


def test_user_only_lists_their_workspaces(client: TestClient):
    first_token = register_and_login(client, "first-user@example.com")
    second_token = register_and_login(client, "second-user@example.com")

    first_workspace = client.post(
        "/workspaces",
        headers=auth_headers(first_token),
        json={"name": "First Workspace"},
    )
    second_workspace = client.post(
        "/workspaces",
        headers=auth_headers(second_token),
        json={"name": "Second Workspace"},
    )

    assert first_workspace.status_code == 201
    assert second_workspace.status_code == 201

    response = client.get(
        "/workspaces",
        headers=auth_headers(first_token),
    )

    assert response.status_code == 200
    workspaces = response.json()

    assert len(workspaces) == 1
    assert workspaces[0]["name"] == "First Workspace"
    assert workspaces[0]["role"] == "owner"


def test_non_member_cannot_view_workspace(client: TestClient):
    owner_token = register_and_login(client, "owner-access@example.com")
    other_token = register_and_login(client, "other-access@example.com")

    created = client.post(
        "/workspaces",
        headers=auth_headers(owner_token),
        json={"name": "Private Workspace"},
    )

    assert created.status_code == 201
    workspace_id = created.json()["id"]

    response = client.get(
        f"/workspaces/{workspace_id}",
        headers=auth_headers(other_token),
    )

    assert response.status_code == 404


def test_workspace_endpoints_require_authentication(client: TestClient):
    create_response = client.post(
        "/workspaces",
        json={"name": "Unauthorized Workspace"},
    )
    list_response = client.get("/workspaces")
    detail_response = client.get("/workspaces/1")

    assert create_response.status_code == 401
    assert list_response.status_code == 401
    assert detail_response.status_code == 401


def test_workspace_name_must_not_be_blank(client: TestClient):
    token = register_and_login(client, "blank-name@example.com")

    response = client.post(
        "/workspaces",
        headers=auth_headers(token),
        json={"name": "   "},
    )

    assert response.status_code == 422
