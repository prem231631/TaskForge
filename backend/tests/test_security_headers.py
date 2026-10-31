
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_security_headers_on_root_endpoint():
    response = client.get("/")

    assert response.status_code == 200

    assert (
        response.headers["x-content-type-options"]
        == "nosniff"
    )
    assert response.headers["x-frame-options"] == "DENY"
    assert (
        response.headers["referrer-policy"]
        == "strict-origin-when-cross-origin"
    )
    assert (
        response.headers["permissions-policy"]
        == "camera=(), microphone=(), geolocation=()"
    )


def test_security_headers_on_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200

    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"


def test_security_headers_on_validation_error():
    response = client.post("/auth/register", json={})

    assert response.status_code == 422
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"


def test_security_headers_on_not_found():
    response = client.get("/route-that-does-not-exist")

    assert response.status_code == 404
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
