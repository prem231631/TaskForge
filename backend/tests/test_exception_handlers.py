
import asyncio
import logging

import pytest
from fastapi import Request
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.exception_handlers import unexpected_exception_handler
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


def test_http_exception_preserves_authentication_header(
    client: TestClient,
):
    response = client.get("/auth/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"
    assert response.headers["www-authenticate"] == "Bearer"


def test_validation_exception_returns_structured_details(
    client: TestClient,
):
    response = client.post(
        "/auth/register",
        json={},
    )

    assert response.status_code == 422

    data = response.json()

    assert "detail" in data
    assert isinstance(data["detail"], list)
    assert len(data["detail"]) > 0

    error = data["detail"][0]

    assert "loc" in error
    assert "msg" in error
    assert "type" in error


def test_unexpected_exception_returns_safe_server_error(
    caplog: pytest.LogCaptureFixture,
):
    request = Request(
        {
            "type": "http",
            "asgi": {
                "version": "3.0",
                "spec_version": "2.3",
            },
            "http_version": "1.1",
            "method": "GET",
            "scheme": "http",
            "path": "/test-unexpected-error",
            "raw_path": b"/test-unexpected-error",
            "query_string": b"",
            "headers": [],
            "client": ("testclient", 50000),
            "server": ("testserver", 80),
        }
    )

    with caplog.at_level(
        logging.ERROR,
        logger="taskforge.api.errors",
    ):
        try:
            raise RuntimeError("Internal test exception")
        except RuntimeError as exc:
            response = asyncio.run(
                unexpected_exception_handler(request, exc)
            )

    assert response.status_code == 500

    assert response.body == (
        b'{"detail":"An unexpected error occurred. '
        b'Please try again later."}'
    )

    assert "Unhandled application exception" in caplog.text
    assert "Internal test exception" in caplog.text
