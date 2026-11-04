
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.rate_limiter import limiter
from app.db.base import Base
from app.db.dependencies import get_db
from app.main import app
from app.models import EmailVerificationToken, User
from app.core.security import hash_email_verification_token


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


def register_test_user(
    client: TestClient,
    email: str = "test@example.com",
) -> dict:
    """Register a user and return the mocked verification token."""

    token = "test-verification-token"

    with patch(
        "app.api.auth.send_verification_email"
    ) as email_mock:
        email_mock.return_value = None

        response = client.post(
            "/auth/register",
            json={
                "full_name": "Test User",
                "email": email,
                "password": "Secure-Test-Password-123!",
            },
        )

    assert response.status_code == 201
    email_mock.assert_called_once()

    return {
        "response": response,
        "token": token,
    }


def set_verification_token(
    email: str,
    token: str,
) -> None:
    """Replace the stored token hash with a predictable test token."""

    with TestingSessionLocal() as db:
        user = db.scalar(
            select(User).where(User.email == email)
        )

        assert user is not None

        verification_token = db.scalar(
            select(EmailVerificationToken).where(
                EmailVerificationToken.user_id == user.id
            )
        )

        assert verification_token is not None

        verification_token.token_hash = hash_email_verification_token(
            token
        )

        db.commit()


def test_register_user(client: TestClient):
    token = "test-verification-token"

    with patch(
        "app.api.auth.send_verification_email"
    ) as email_mock:
        response = client.post(
            "/auth/register",
            json={
                "full_name": "Test User",
                "email": "test@example.com",
                "password": "Secure-Test-Password-123!",
            },
        )

    assert response.status_code == 201

    data = response.json()

    assert data["email"] == "test@example.com"
    assert "verify" in data["message"].lower()

    email_mock.assert_called_once()

    with TestingSessionLocal() as db:
        user = db.scalar(
            select(User).where(User.email == "test@example.com")
        )

        assert user is not None
        assert user.is_verified is False
        assert user.hashed_password != "Secure-Test-Password-123!"


def test_duplicate_registration(client: TestClient):
    payload = {
        "full_name": "Test User",
        "email": "duplicate@example.com",
        "password": "Secure-Test-Password-123!",
    }

    with patch("app.api.auth.send_verification_email"):
        first = client.post("/auth/register", json=payload)
        second = client.post("/auth/register", json=payload)

    assert first.status_code == 201
    assert second.status_code == 409


def test_unverified_user_cannot_login(client: TestClient):
    register_test_user(client, "unverified@example.com")

    response = client.post(
        "/auth/login",
        json={
            "email": "unverified@example.com",
            "password": "Secure-Test-Password-123!",
        },
    )

    assert response.status_code == 401


def test_verify_email_and_login(client: TestClient):
    token = "valid-test-verification-token"

    with patch("app.api.auth.send_verification_email"):
        registration = client.post(
            "/auth/register",
            json={
                "full_name": "Verified User",
                "email": "verified@example.com",
                "password": "Secure-Test-Password-123!",
            },
        )

    assert registration.status_code == 201

    set_verification_token("verified@example.com", token)

    verification_response = client.post(
        "/auth/verify-email",
        json={"token": token},
    )

    assert verification_response.status_code == 200

    login_response = client.post(
        "/auth/login",
        json={
            "email": "verified@example.com",
            "password": "Secure-Test-Password-123!",
        },
    )

    assert login_response.status_code == 200

    access_token = login_response.json()["access_token"]

    profile_response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert profile_response.status_code == 200
    assert profile_response.json()["email"] == "verified@example.com"
    assert profile_response.json()["is_verified"] is True
    assert "hashed_password" not in profile_response.json()


def test_verification_token_is_single_use(client: TestClient):
    token = "single-use-test-token"

    with patch("app.api.auth.send_verification_email"):
        client.post(
            "/auth/register",
            json={
                "full_name": "Single Use User",
                "email": "single@example.com",
                "password": "Secure-Test-Password-123!",
            },
        )

    set_verification_token("single@example.com", token)

    first = client.post(
        "/auth/verify-email",
        json={"token": token},
    )

    second = client.post(
        "/auth/verify-email",
        json={"token": token},
    )

    assert first.status_code == 200
    assert second.status_code == 400


def test_invalid_verification_token(client: TestClient):
    response = client.post(
        "/auth/verify-email",
        json={"token": "invalid-token"},
    )

    assert response.status_code == 400


def test_resend_verification(client: TestClient):
    register_test_user(client, "resend@example.com")

    with patch("app.api.auth.send_verification_email") as email_mock:
        response = client.post(
            "/auth/resend-verification",
            json={"email": "resend@example.com"},
        )

    assert response.status_code == 200
    email_mock.assert_called_once()


def test_resend_does_not_reveal_unknown_accounts(client: TestClient):
    with patch("app.api.auth.send_verification_email") as email_mock:
        response = client.post(
            "/auth/resend-verification",
            json={"email": "unknown@example.com"},
        )

    assert response.status_code == 200
    email_mock.assert_not_called()


def test_current_user_requires_token(client: TestClient):
    response = client.get("/auth/me")

    assert response.status_code == 401


def test_registration_rejects_invalid_email(client: TestClient):
    response = client.post(
        "/auth/register",
        json={
            "full_name": "Test User",
            "email": "not-an-email",
            "password": "Secure-Test-Password-123!",
        },
    )

    assert response.status_code == 422
