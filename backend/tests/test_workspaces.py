import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.dependencies import get_db
from app.main import app
from app.models import Workspace, WorkspaceMembership


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


def create_workspace(
    client: TestClient,
    token: str,
    name: str = "Test Workspace",
) -> dict:
    response = client.post(
        "/workspaces",
        headers=auth_headers(token),
        json={"name": name},
    )
    assert response.status_code == 201
    return response.json()


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

    first_workspace = create_workspace(client, first_token, "First Workspace")
    second_workspace = create_workspace(client, second_token, "Second Workspace")

    response = client.get(
        "/workspaces",
        headers=auth_headers(first_token),
    )

    assert response.status_code == 200
    workspaces = response.json()

    assert len(workspaces) == 1
    assert workspaces[0]["id"] == first_workspace["id"]
    assert workspaces[0]["name"] == "First Workspace"
    assert workspaces[0]["role"] == "owner"
    assert second_workspace["id"] != first_workspace["id"]


def test_non_member_cannot_view_workspace(client: TestClient):
    owner_token = register_and_login(client, "owner-access@example.com")
    other_token = register_and_login(client, "other-access@example.com")

    workspace = create_workspace(client, owner_token, "Private Workspace")

    response = client.get(
        f"/workspaces/{workspace['id']}",
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
    members_response = client.get("/workspaces/1/members")
    add_response = client.post(
        "/workspaces/1/members",
        json={"email": "member@example.com"},
    )
    remove_response = client.delete("/workspaces/1/members/2")

    assert create_response.status_code == 401
    assert list_response.status_code == 401
    assert detail_response.status_code == 401
    assert members_response.status_code == 401
    assert add_response.status_code == 401
    assert remove_response.status_code == 401


def test_workspace_name_must_not_be_blank(client: TestClient):
    token = register_and_login(client, "blank-name@example.com")

    response = client.post(
        "/workspaces",
        headers=auth_headers(token),
        json={"name": "   "},
    )

    assert response.status_code == 422


def test_owner_can_list_workspace_members(client: TestClient):
    token = register_and_login(client, "list-owner@example.com")
    workspace = create_workspace(client, token, "Member Listing")

    response = client.get(
        f"/workspaces/{workspace['id']}/members",
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    members = response.json()

    assert len(members) == 1
    assert members[0]["user_id"] == workspace["owner_id"]
    assert members[0]["email"] == "list-owner@example.com"
    assert members[0]["role"] == "owner"
    assert "hashed_password" not in members[0]


def test_owner_can_add_registered_member(client: TestClient):
    owner_token = register_and_login(client, "add-owner@example.com")
    register_and_login(client, "new-member@example.com")
    workspace = create_workspace(client, owner_token, "Adding Members")

    response = client.post(
        f"/workspaces/{workspace['id']}/members",
        headers=auth_headers(owner_token),
        json={"email": "NEW-MEMBER@example.com"},
    )

    assert response.status_code == 201
    member = response.json()

    assert member["email"] == "new-member@example.com"
    assert member["role"] == "member"
    assert member["user_id"] != workspace["owner_id"]

    listing = client.get(
        f"/workspaces/{workspace['id']}/members",
        headers=auth_headers(owner_token),
    )

    assert listing.status_code == 200
    assert len(listing.json()) == 2


def test_owner_cannot_add_duplicate_member(client: TestClient):
    owner_token = register_and_login(client, "duplicate-owner@example.com")
    register_and_login(client, "duplicate-member@example.com")
    workspace = create_workspace(client, owner_token, "Duplicate Check")

    url = f"/workspaces/{workspace['id']}/members"
    headers = auth_headers(owner_token)
    payload = {"email": "duplicate-member@example.com"}

    first_response = client.post(url, headers=headers, json=payload)
    second_response = client.post(url, headers=headers, json=payload)

    assert first_response.status_code == 201
    assert second_response.status_code == 409


def test_owner_cannot_add_unknown_member(client: TestClient):
    owner_token = register_and_login(client, "unknown-owner@example.com")
    workspace = create_workspace(client, owner_token, "Unknown User")

    response = client.post(
        f"/workspaces/{workspace['id']}/members",
        headers=auth_headers(owner_token),
        json={"email": "unknown@example.com"},
    )

    assert response.status_code == 409


def test_non_owner_cannot_manage_workspace_members(client: TestClient):
    owner_token = register_and_login(client, "permission-owner@example.com")
    member_token = register_and_login(client, "permission-member@example.com")
    workspace = create_workspace(client, owner_token, "Permission Check")

    add_response = client.post(
        f"/workspaces/{workspace['id']}/members",
        headers=auth_headers(owner_token),
        json={"email": "permission-member@example.com"},
    )
    assert add_response.status_code == 201

    forbidden_add = client.post(
        f"/workspaces/{workspace['id']}/members",
        headers=auth_headers(member_token),
        json={"email": "permission-owner@example.com"},
    )

    forbidden_remove = client.delete(
        f"/workspaces/{workspace['id']}/members/{add_response.json()['user_id']}",
        headers=auth_headers(member_token),
    )

    assert forbidden_add.status_code == 403
    assert forbidden_remove.status_code == 403


def test_owner_can_remove_regular_member(client: TestClient):
    owner_token = register_and_login(client, "remove-owner@example.com")
    register_and_login(client, "remove-member@example.com")
    workspace = create_workspace(client, owner_token, "Remove Member")

    added = client.post(
        f"/workspaces/{workspace['id']}/members",
        headers=auth_headers(owner_token),
        json={"email": "remove-member@example.com"},
    )
    assert added.status_code == 201

    removed = client.delete(
        f"/workspaces/{workspace['id']}/members/{added.json()['user_id']}",
        headers=auth_headers(owner_token),
    )

    assert removed.status_code == 204

    listing = client.get(
        f"/workspaces/{workspace['id']}/members",
        headers=auth_headers(owner_token),
    )

    assert listing.status_code == 200
    assert len(listing.json()) == 1
    assert listing.json()[0]["role"] == "owner"


def test_workspace_owner_cannot_be_removed(client: TestClient):
    owner_token = register_and_login(client, "protected-owner@example.com")
    workspace = create_workspace(client, owner_token, "Protect Owner")

    response = client.delete(
        f"/workspaces/{workspace['id']}/members/{workspace['owner_id']}",
        headers=auth_headers(owner_token),
    )

    assert response.status_code == 409

    listing = client.get(
        f"/workspaces/{workspace['id']}/members",
        headers=auth_headers(owner_token),
    )

    assert listing.status_code == 200
    assert len(listing.json()) == 1
    assert listing.json()[0]["role"] == "owner"


def test_non_member_cannot_list_workspace_members(client: TestClient):
    owner_token = register_and_login(client, "private-list-owner@example.com")
    other_token = register_and_login(client, "private-list-other@example.com")
    workspace = create_workspace(client, owner_token, "Private Member List")

    response = client.get(
        f"/workspaces/{workspace['id']}/members",
        headers=auth_headers(other_token),
    )

    assert response.status_code == 404


def test_owner_can_update_workspace_name_and_description(client: TestClient):
    token = register_and_login(client, "update-owner@example.com")
    workspace = create_workspace(client, token, "Original Workspace")

    response = client.patch(
        f"/workspaces/{workspace['id']}",
        headers=auth_headers(token),
        json={
            "name": "Updated Workspace",
            "description": "Updated workspace description.",
        },
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["name"] == "Updated Workspace"
    assert updated["description"] == "Updated workspace description."
    assert updated["id"] == workspace["id"]


def test_owner_can_clear_workspace_description(client: TestClient):
    token = register_and_login(client, "clear-description-owner@example.com")
    workspace_response = client.post(
        "/workspaces",
        headers=auth_headers(token),
        json={
            "name": "Description Workspace",
            "description": "This description will be cleared.",
        },
    )
    assert workspace_response.status_code == 201
    workspace = workspace_response.json()

    response = client.patch(
        f"/workspaces/{workspace['id']}",
        headers=auth_headers(token),
        json={"description": None},
    )

    assert response.status_code == 200
    assert response.json()["description"] is None


def test_empty_workspace_update_is_rejected(client: TestClient):
    token = register_and_login(client, "empty-update-owner@example.com")
    workspace = create_workspace(client, token, "Empty Update")

    response = client.patch(
        f"/workspaces/{workspace['id']}",
        headers=auth_headers(token),
        json={},
    )

    assert response.status_code == 422
    assert "at least one field" in response.json()["detail"].lower()


def test_workspace_name_cannot_be_set_to_null(client: TestClient):
    token = register_and_login(client, "null-name-owner@example.com")
    workspace = create_workspace(client, token, "Keep This Name")

    response = client.patch(
        f"/workspaces/{workspace['id']}",
        headers=auth_headers(token),
        json={"name": None},
    )

    assert response.status_code == 422


def test_non_owner_cannot_update_workspace(client: TestClient):
    owner_token = register_and_login(client, "update-permission-owner@example.com")
    member_token = register_and_login(client, "update-permission-member@example.com")
    workspace = create_workspace(client, owner_token, "Protected Workspace")

    added = client.post(
        f"/workspaces/{workspace['id']}/members",
        headers=auth_headers(owner_token),
        json={"email": "update-permission-member@example.com"},
    )
    assert added.status_code == 201

    response = client.patch(
        f"/workspaces/{workspace['id']}",
        headers=auth_headers(member_token),
        json={"name": "Unauthorized Rename"},
    )

    assert response.status_code == 403

    detail = client.get(
        f"/workspaces/{workspace['id']}",
        headers=auth_headers(owner_token),
    )
    assert detail.status_code == 200
    assert detail.json()["name"] == "Protected Workspace"


def test_owner_can_delete_workspace_and_memberships(client: TestClient):
    owner_token = register_and_login(client, "delete-owner@example.com")
    register_and_login(client, "delete-member@example.com")
    workspace = create_workspace(client, owner_token, "Workspace To Delete")

    added = client.post(
        f"/workspaces/{workspace['id']}/members",
        headers=auth_headers(owner_token),
        json={"email": "delete-member@example.com"},
    )
    assert added.status_code == 201

    workspace_id = workspace["id"]

    response = client.delete(
        f"/workspaces/{workspace_id}",
        headers=auth_headers(owner_token),
    )

    assert response.status_code == 204

    with TestingSessionLocal() as db:
        assert db.get(Workspace, workspace_id) is None
        memberships = db.scalars(
            select(WorkspaceMembership).where(
                WorkspaceMembership.workspace_id == workspace_id
            )
        ).all()
        assert memberships == []


def test_non_owner_cannot_delete_workspace(client: TestClient):
    owner_token = register_and_login(client, "delete-permission-owner@example.com")
    member_token = register_and_login(client, "delete-permission-member@example.com")
    workspace = create_workspace(client, owner_token, "Protected From Deletion")

    added = client.post(
        f"/workspaces/{workspace['id']}/members",
        headers=auth_headers(owner_token),
        json={"email": "delete-permission-member@example.com"},
    )
    assert added.status_code == 201

    response = client.delete(
        f"/workspaces/{workspace['id']}",
        headers=auth_headers(member_token),
    )

    assert response.status_code == 403

    detail = client.get(
        f"/workspaces/{workspace['id']}",
        headers=auth_headers(owner_token),
    )
    assert detail.status_code == 200
    assert detail.json()["name"] == "Protected From Deletion"


def test_nonexistent_workspace_cannot_be_updated_or_deleted(client: TestClient):
    token = register_and_login(client, "missing-workspace-owner@example.com")

    update_response = client.patch(
        "/workspaces/9999",
        headers=auth_headers(token),
        json={"name": "Missing Workspace"},
    )
    delete_response = client.delete(
        "/workspaces/9999",
        headers=auth_headers(token),
    )

    assert update_response.status_code == 404
    assert delete_response.status_code == 404
