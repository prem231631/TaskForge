
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models import User
from app.schemas.user import UserCreate


def get_user_by_email(db: Session, email: str) -> User | None:
    """Find a user by email address, ignoring case."""
    normalized_email = str(email).strip().lower()

    statement = select(User).where(
        User.email == normalized_email
    )
    return db.scalar(statement)


def register_user(db: Session, user_data: UserCreate) -> User:
    """Create a user account with a securely hashed password."""
    normalized_email = str(user_data.email).strip().lower()

    if get_user_by_email(db, normalized_email) is not None:
        raise ValueError("An account with this email already exists.")

    user = User(
        full_name=user_data.full_name.strip(),
        email=normalized_email,
        hashed_password=hash_password(user_data.password),
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError as exc:
        db.rollback()
        raise ValueError(
            "An account with this email already exists."
        ) from exc

    return user


def authenticate_user(
    db: Session,
    email: str,
    password: str,
) -> User | None:
    """Return an active user when their credentials are valid."""
    user = get_user_by_email(db, email)

    if user is None:
        return None

    if not verify_password(password, user.hashed_password):
        return None

    if not user.is_active:
        return None

    return user
