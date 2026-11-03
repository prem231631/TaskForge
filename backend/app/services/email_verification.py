from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    generate_email_verification_token,
    hash_email_verification_token,
)
from app.models import EmailVerificationToken, User


def create_verification_token(
    db: Session,
    user: User,
) -> str:
    """Create or replace a user's email verification token."""

    settings = get_settings()

    raw_token = generate_email_verification_token()
    token_hash = hash_email_verification_token(raw_token)

    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.email_verification_expire_minutes
    )

    existing_token = db.scalar(
        select(EmailVerificationToken)
        .where(EmailVerificationToken.user_id == user.id)
        .with_for_update()
    )

    if existing_token is not None:
        existing_token.token_hash = token_hash
        existing_token.expires_at = expires_at
    else:
        verification_token = EmailVerificationToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        db.add(verification_token)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return raw_token


def verify_email_token(
    db: Session,
    raw_token: str,
) -> User | None:
    """Verify a user's email using a valid, unexpired token."""

    token_hash = hash_email_verification_token(raw_token)

    verification_token = db.scalar(
        select(EmailVerificationToken)
        .where(EmailVerificationToken.token_hash == token_hash)
        .with_for_update()
    )

    if verification_token is None:
        return None

    expires_at = verification_token.expires_at

    # SQLite may return a naive datetime even though the column
    # is configured to use timezone-aware datetimes.
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= datetime.now(timezone.utc):
        db.delete(verification_token)
        db.commit()
        return None

    user = verification_token.user

    if user is None or not user.is_active:
        db.delete(verification_token)
        db.commit()
        return None

    user.is_verified = True
    db.delete(verification_token)

    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise

    return user