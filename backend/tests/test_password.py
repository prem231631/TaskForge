
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.rate_limiter import limiter
from app.db.base import Base
from app.db.dependencies import get_db
from app.main import app


TEST_PASSWORD = "Secure-Test-Password-123!"
NEW_PASSWORD = "New-Secure-Password-456!"


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
    limiter.reset()
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
    limiter.reset()


def register_and_login(
    client: TestClient,
    email: str = "password-test@example.com",
) -> str:
    captured_tokens = []

    def capture_verification_email(
        recipient_email: str,
        recipient_name: str,
        verification_token: str,
    ):
        captured_tokens.append(verification_token)

    with patch(
        "app.api.auth.send_verification_email",
        side_effect=capture_verification_email,
    ):
        response = client.post(
            "/auth/register",
            json={
                "full_name": "Password Test User",
                "email": email,
                "password": TEST_PASSWORD,
            },
        )

    assert response.status_code == 201, response.text
    assert len(captured_tokens) == 1

    verification_response = client.post(
        "/auth/verify-email",
        json={"token": captured_tokens[0]},
    )

    assert verification_response.status_code == 200

    login_response = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": TEST_PASSWORD,
        },
    )

    assert login_response.status_code == 200

    return login_response.json()["access_token"]


def test_successful_password_change(client):
    token = register_and_login(client)

    response = client.post(
        "/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": TEST_PASSWORD,
            "new_password": NEW_PASSWORD,
        },
    )

    assert response.status_code == 200
    assert "Password changed successfully" in response.json()["message"]

    old_token_response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert old_token_response.status_code == 401

    old_password_login = client.post(
        "/auth/login",
        json={
            "email": "password-test@example.com",
            "password": TEST_PASSWORD,
        },
    )

    assert old_password_login.status_code == 401

    new_password_login = client.post(
        "/auth/login",
        json={
            "email": "password-test@example.com",
            "password": NEW_PASSWORD,
        },
    )

    assert new_password_login.status_code == 200


def test_incorrect_current_password_is_rejected(client):
    token = register_and_login(client)

    response = client.post(
        "/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": "Incorrect-Password-123!",
            "new_password": NEW_PASSWORD,
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "The current password is incorrect."

    login_response = client.post(
        "/auth/login",
        json={
            "email": "password-test@example.com",
            "password": TEST_PASSWORD,
        },
    )

    assert login_response.status_code == 200


def test_new_password_cannot_match_current_password(client):
    token = register_and_login(client)

    response = client.post(
        "/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": TEST_PASSWORD,
            "new_password": TEST_PASSWORD,
        },
    )

    assert response.status_code == 400
    assert "different from the current password" in response.json()["detail"]


def test_password_shorter_than_eight_characters_is_rejected(client):
    token = register_and_login(client)

    response = client.post(
        "/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": TEST_PASSWORD,
            "new_password": "Short1!",
        },
    )

    assert response.status_code == 422


def test_password_change_requires_authentication(client):
    response = client.post(
        "/auth/change-password",
        json={
            "current_password": TEST_PASSWORD,
            "new_password": NEW_PASSWORD,
        },
    )

    assert response.status_code == 401


def test_all_previous_sessions_are_invalidated(client):
    first_token = register_and_login(client)

    second_login = client.post(
        "/auth/login",
        json={
            "email": "password-test@example.com",
            "password": TEST_PASSWORD,
        },
    )

    assert second_login.status_code == 200

    second_token = second_login.json()["access_token"]

    change_response = client.post(
        "/auth/change-password",
        headers={"Authorization": f"Bearer {first_token}"},
        json={
            "current_password": TEST_PASSWORD,
            "new_password": NEW_PASSWORD,
        },
    )

    assert change_response.status_code == 200

    for token in (first_token, second_token):
        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 401


def test_new_password_login_creates_valid_session(client):
    token = register_and_login(client)

    change_response = client.post(
        "/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": TEST_PASSWORD,
            "new_password": NEW_PASSWORD,
        },
    )

    assert change_response.status_code == 200

    login_response = client.post(
        "/auth/login",
        json={
            "email": "password-test@example.com",
            "password": NEW_PASSWORD,
        },
    )

    assert login_response.status_code == 200

    new_token = login_response.json()["access_token"]

    profile_response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {new_token}"},
    )

    assert profile_response.status_code == 200
