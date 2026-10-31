
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


def test_registration_rate_limit(client: TestClient):
    for index in range(5):
        response = client.post(
            "/auth/register",
            json={
                "full_name": "Rate Limit User",
                "email": f"rate-limit-{index}@example.com",
                "password": "Secure-Test-Password-123!",
            },
        )

        assert response.status_code == 201

    blocked_response = client.post(
        "/auth/register",
        json={
            "full_name": "Rate Limit User",
            "email": "rate-limit-blocked@example.com",
            "password": "Secure-Test-Password-123!",
        },
    )

    assert blocked_response.status_code == 429


def test_login_rate_limit(client: TestClient):
    client.post(
        "/auth/register",
        json={
            "full_name": "Login Rate User",
            "email": "login-rate@example.com",
            "password": "Secure-Test-Password-123!",
        },
    )

    payload = {
        "email": "login-rate@example.com",
        "password": "Secure-Test-Password-123!",
    }

    for _ in range(5):
        response = client.post("/auth/login", json=payload)
        assert response.status_code == 200

    blocked_response = client.post("/auth/login", json=payload)

    assert blocked_response.status_code == 429


def test_registration_and_login_have_separate_limits(
    client: TestClient,
):
    for index in range(5):
        response = client.post(
            "/auth/register",
            json={
                "full_name": "Separate Limit User",
                "email": f"separate-{index}@example.com",
                "password": "Secure-Test-Password-123!",
            },
        )

        assert response.status_code == 201

    login_response = client.post(
        "/auth/login",
        json={
            "email": "separate-0@example.com",
            "password": "Secure-Test-Password-123!",
        },
    )

    assert login_response.status_code == 200
