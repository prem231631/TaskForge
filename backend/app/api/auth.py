
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.rate_limiter import limiter
from app.core.security import create_access_token, decode_access_token
from app.db.dependencies import get_db
from app.models import User
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse
from app.services.auth import authenticate_user, get_user_by_email, register_user


router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

DbSession = Annotated[Session, Depends(get_db)]


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new account",
    description="""
Create a new TaskForge user account.

**Requirements:**
- Full name must contain 2–120 characters.
- Email must be a valid email address.
- Password must contain 8–128 characters.

A successful registration returns the newly created user profile.
""",
    responses={
        409: {"description": "An account with this email already exists."},
        429: {"description": "Registration rate limit exceeded."},
    },
)
@limiter.limit("5/minute")
def register(
    request: Request,
    payload: UserCreate,
    db: DbSession,
) -> User:
    try:
        return register_user(db, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in to TaskForge",
    description="""
Authenticate an existing user using their email and password.

A successful login returns a bearer access token.

Use the returned `access_token` with Swagger UI's **Authorize** button
to access protected endpoints.
""",
    responses={
        401: {
            "description": "Invalid credentials or inactive account.",
        },
        429: {
            "description": "Login rate limit exceeded.",
        },
    },
)
@limiter.limit("5/minute")
def login(
    request: Request,
    payload: UserLogin,
    db: DbSession,
) -> TokenResponse:
    user = authenticate_user(db, str(payload.email), payload.password)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password, or account is inactive.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=str(user.id))

    return TokenResponse(access_token=access_token)


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: DbSession,
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        subject = payload.get("sub")

        if not isinstance(subject, str) or not subject.isdigit():
            raise unauthorized
    except (jwt.InvalidTokenError, ValueError) as exc:
        raise unauthorized from exc

    user = db.get(User, int(subject))

    if user is None or not user.is_active:
        raise unauthorized

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the current user",
    description="""
Retrieve the profile of the currently authenticated user.

Requires a valid bearer access token.
""",
    responses={
        401: {
            "description": "Missing, invalid, or expired authentication token.",
        },
    },
)
def read_current_user(current_user: CurrentUser) -> User:
    return current_user
