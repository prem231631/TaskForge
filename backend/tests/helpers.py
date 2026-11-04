
from unittest.mock import patch

from fastapi.testclient import TestClient


TEST_PASSWORD = "Secure-Test-Password-123!"


def register_user(
    client: TestClient,
    email: str,
    full_name: str = "Test User",
) -> tuple[dict, str]:
    """Register a user and capture the token sent by the mocked email service."""

    captured_tokens: list[str] = []

    def capture_verification_email(
        recipient_email: str,
        recipient_name: str,
        verification_token: str,
    ) -> None:
        captured_tokens.append(verification_token)

    with patch(
        "app.api.auth.send_verification_email",
        side_effect=capture_verification_email,
    ):
        response = client.post(
            "/auth/register",
            json={
                "full_name": full_name,
                "email": email,
                "password": TEST_PASSWORD,
            },
        )

    assert response.status_code == 201, response.text
    assert len(captured_tokens) == 1

    return response.json(), captured_tokens[0]


def verify_user(
    client: TestClient,
    token: str,
) -> dict:
    """Verify a registered user through the real verification endpoint."""

    response = client.post(
        "/auth/verify-email",
        json={"token": token},
    )

    assert response.status_code == 200, response.text

    return response.json()


def register_and_login(
    client: TestClient,
    email: str,
    full_name: str = "Test User",
) -> str:
    """Register, verify, and log in a test user."""

    _, verification_token = register_user(
        client=client,
        email=email,
        full_name=full_name,
    )

    verify_user(client, verification_token)

    login_response = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": TEST_PASSWORD,
        },
    )

    assert login_response.status_code == 200, login_response.text

    return login_response.json()["access_token"]
