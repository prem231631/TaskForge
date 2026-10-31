
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.rate_limiter import limiter
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


def test_register_user(client: TestClient):
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
    assert data["full_name"] == "Test User"
    assert data["email"] == "test@example.com"
    assert "hashed_password" not in data


def test_duplicate_registration(client: TestClient):
    payload = {
        "full_name": "Test User",
        "email": "duplicate@example.com",
        "password": "Secure-Test-Password-123!",
    }

    first = client.post("/auth/register", json=payload)
    second = client.post("/auth/register", json=payload)

    assert first.status_code == 201
    assert second.status_code == 409


def test_login_and_current_user(client: TestClient):
    client.post(
        "/auth/register",
        json={
            "full_name": "Login User",
            "email": "login@example.com",
            "password": "Secure-Test-Password-123!",
        },
    )

    login_response = client.post(
        "/auth/login",
        json={
            "email": "login@example.com",
            "password": "Secure-Test-Password-123!",
        },
    )

    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    assert login_response.json()["token_type"] == "bearer"

    profile_response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert profile_response.status_code == 200
    assert profile_response.json()["email"] == "login@example.com"
    assert "hashed_password" not in profile_response.json()


def test_login_rejects_wrong_password(client: TestClient):
    client.post(
        "/auth/register",
        json={
            "full_name": "Login User",
            "email": "wrong-password@example.com",
            "password": "Secure-Test-Password-123!",
        },
    )

    response = client.post(
        "/auth/login",
        json={
            "email": "wrong-password@example.com",
            "password": "Incorrect-Password-123!",
        },
    )

    assert response.status_code == 401


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
