
from datetime import timedelta

import jwt
import pytest

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_is_hashed():
    password = "Secure-Test-Password-123!"

    hashed_password = hash_password(password)

    assert hashed_password != password
    assert verify_password(password, hashed_password)


def test_password_verification_rejects_wrong_password():
    hashed_password = hash_password(
        "Secure-Test-Password-123!"
    )

    assert not verify_password(
        "Incorrect-Password-123!",
        hashed_password,
    )


def test_password_hashing_uses_different_salts():
    password = "Secure-Test-Password-123!"

    first_hash = hash_password(password)
    second_hash = hash_password(password)

    assert first_hash != second_hash
    assert verify_password(password, first_hash)
    assert verify_password(password, second_hash)


def test_access_token_contains_expected_claims():
    token = create_access_token(subject="123")

    payload = decode_access_token(token)

    assert payload["sub"] == "123"
    assert "iat" in payload
    assert "exp" in payload
    assert payload["exp"] > payload["iat"]


def test_access_token_supports_custom_expiration():
    token = create_access_token(
        subject="123",
        expires_delta=timedelta(minutes=10),
    )

    payload = decode_access_token(token)

    assert payload["sub"] == "123"
    assert payload["exp"] - payload["iat"] == 600


def test_expired_access_token_is_rejected():
    token = create_access_token(
        subject="123",
        expires_delta=timedelta(seconds=-1),
    )

    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(token)


def test_invalid_access_token_is_rejected():
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token("invalid.token.value")


def test_token_signed_with_wrong_secret_is_rejected():
    settings = get_settings()

    token = jwt.encode(
        {
            "sub": "123",
            "iat": 1_800_000_000,
            "exp": 1_800_000_600,
        },
        "a-different-test-secret-that-is-not-the-configured-secret",
        algorithm=settings.jwt_algorithm,
    )

    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(token)
