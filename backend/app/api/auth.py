
import logging
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.rate_limiter import limiter
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.db.dependencies import get_db
from app.models import User
from app.schemas.user import (
    MessageResponse,
    RegistrationResponse,
    ResendVerificationRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserPasswordChange,
    UserProfileUpdate,
    UserResponse,
    VerifyEmailRequest,
)
from app.services.auth import (
    authenticate_user,
    get_user_by_email,
    register_user,
)
from app.services.email import send_verification_email
from app.services.email_verification import (
    create_verification_token,
    verify_email_token,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

DbSession = Annotated[Session, Depends(get_db)]


@router.post(
    "/register",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new account",
    description="""
Create a new TaskForge account and send an email verification link.

The account cannot log in until its email address is verified.
""",
    responses={
        409: {"description": "An account with this email already exists."},
        503: {
            "description": (
                "The account was created but email delivery failed."
            )
        },
        429: {"description": "Registration rate limit exceeded."},
    },
)
@limiter.limit("5/minute")
def register(
    request: Request,
    payload: UserCreate,
    db: DbSession,
) -> RegistrationResponse:
    try:
        user = register_user(db, payload)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    raw_token = create_verification_token(db, user)

    try:
        send_verification_email(
            recipient_email=user.email,
            recipient_name=user.full_name,
            verification_token=raw_token,
        )

    except RuntimeError as exc:
        logger.warning(
            "Account created, but verification email delivery failed."
        )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Your account was created, but the verification email "
                "could not be sent. Please use the resend verification "
                "endpoint after email delivery is configured."
            ),
        ) from exc

    return RegistrationResponse(
        message=(
            "Account created successfully. "
            "Please check your email to verify your account."
        ),
        email=user.email,
    )


@router.post(
    "/verify-email",
    response_model=MessageResponse,
    summary="Verify an email address",
    description=(
        "Verify an account using the single-use token sent to its email address."
    ),
    responses={
        400: {
            "description": "The verification token is invalid or expired."
        },
        429: {"description": "Verification rate limit exceeded."},
    },
)
@limiter.limit("10/minute")
def verify_email(
    request: Request,
    payload: VerifyEmailRequest,
    db: DbSession,
) -> MessageResponse:
    user = verify_email_token(db, payload.token)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The verification link is invalid or has expired.",
        )

    return MessageResponse(
        message=(
            "Your email address has been verified successfully. "
            "You can now log in."
        )
    )


@router.post(
    "/resend-verification",
    response_model=MessageResponse,
    summary="Resend a verification email",
    description=(
        "Request a replacement verification email. "
        "The response does not reveal whether an account exists."
    ),
    responses={
        429: {"description": "Resend rate limit exceeded."},
    },
)
@limiter.limit("3/hour")
def resend_verification(
    request: Request,
    payload: ResendVerificationRequest,
    db: DbSession,
) -> MessageResponse:
    user = get_user_by_email(db, str(payload.email))

    if user is not None and user.is_active and not user.is_verified:
        try:
            raw_token = create_verification_token(db, user)

            send_verification_email(
                recipient_email=user.email,
                recipient_name=user.full_name,
                verification_token=raw_token,
            )

        except RuntimeError:
            logger.warning("Verification email resend failed.")

    return MessageResponse(
        message=(
            "If an unverified account exists for that email address, "
            "a verification email will be sent."
        )
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in to TaskForge",
    description="""
Authenticate an existing, active, verified user.

A successful login returns a bearer access token.
""",
    responses={
        401: {
            "description": (
                "Invalid credentials, inactive account, or unverified email."
            )
        },
        429: {"description": "Login rate limit exceeded."},
    },
)
@limiter.limit("5/minute")
def login(
    request: Request,
    payload: UserLogin,
    db: DbSession,
) -> TokenResponse:
    user = authenticate_user(
        db,
        str(payload.email),
        payload.password,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Incorrect email or password, or account is inactive "
                "or email is not verified."
            ),
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        subject=str(user.id),
        token_version=user.token_version,
    )

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
        token_version = payload.get("ver", 0)

        if (
            not isinstance(subject, str)
            or not subject.isdigit()
            or type(token_version) is not int
            or token_version < 0
        ):
            raise unauthorized

    except (jwt.InvalidTokenError, ValueError) as exc:
        raise unauthorized from exc

    user = db.get(User, int(subject))

    if (
        user is None
        or not user.is_active
        or not user.is_verified
        or token_version != user.token_version
    ):
        raise unauthorized

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the current user",
    description="Retrieve the profile of the authenticated user.",
    responses={
        401: {
            "description": (
                "Missing, invalid, or expired authentication token."
            )
        },
    },
)
def read_current_user(current_user: CurrentUser) -> User:
    return current_user


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update the current user's profile",
    description=(
        "Update the full name of the authenticated user."
    ),
    responses={
        401: {
            "description": (
                "Missing, invalid, or expired authentication token."
            )
        },
        422: {"description": "Invalid profile information."},
    },
)
def update_current_user(
    payload: UserProfileUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> User:
    current_user.full_name = payload.full_name

    db.commit()
    db.refresh(current_user)

    return current_user


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change the current user's password",
    description=(
        "Change the password after verifying the current password. "
        "All existing access tokens are invalidated."
    ),
    responses={
        400: {
            "description": (
                "The current password is incorrect or the new password "
                "matches the current password."
            )
        },
        401: {"description": "Authentication is required."},
        429: {"description": "Password change rate limit exceeded."},
        422: {"description": "Invalid password information."},
    },
)
@limiter.limit("5/hour")
def change_password(
    request: Request,
    payload: UserPasswordChange,
    current_user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    if not verify_password(
        payload.current_password,
        current_user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The current password is incorrect.",
        )

    if verify_password(
        payload.new_password,
        current_user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The new password must be different from the current password.",
        )

    current_user.hashed_password = hash_password(payload.new_password)
    current_user.token_version += 1

    db.commit()

    return MessageResponse(
        message=(
            "Password changed successfully. "
            "Please log in again with your new password."
        )
    )
