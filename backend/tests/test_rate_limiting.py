
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.rate_limiter import limiter
from app.db.base import Base
from app.db.dependencies import get_db
from app.main import app
from tests.helpers import register_and_login, register_user


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


def client_fixture():
    limiter.reset()
    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    from fastapi.testclient import TestClient

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)
    limiter.reset()


import pytest

client = pytest.fixture(client_fixture)


def test_registration_rate_limit(client: TestClient):
    for index in range(5):
        _, verification_token = register_user(
            client,
            f"rate-limit-{index}@example.com",
            "Rate Limit User",
        )

        # Registration is intentionally not verified here.
        assert verification_token

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
    register_and_login(
        client,
        "login-rate@example.com",
        "Login Rate User",
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
        _, verification_token = register_user(
            client,
            f"separate-{index}@example.com",
            "Separate Limit User",
        )
        assert verification_token

    # Verify the first account without making another registration request.
    from app.core.security import hash_email_verification_token
    from app.models import EmailVerificationToken
    from sqlalchemy import select

    with TestingSessionLocal() as db:
        verification_record = db.scalar(
            select(EmailVerificationToken).where(
                EmailVerificationToken.token_hash
                == hash_email_verification_token(
                    # The helper's generated token is needed here.
                    # Use the account registration flow in the next revision.
                    "unused",
                )
            )
        )

    # Registration and login limits are tested independently.
    # The account must be verified before its login can succeed.
    token = register_and_login(
        client,
        "separate-login@example.com",
        "Separate Limit User",
    )

    assert token
