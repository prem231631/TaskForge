
import logging
import time

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.tasks import router as tasks_router
from app.api.workspaces import router as workspaces_router
from app.core.config import get_settings
from app.core.exception_handlers import (
    http_exception_handler,
    unexpected_exception_handler,
    validation_exception_handler,
)
from app.core.logging_config import configure_logging
from app.core.rate_limiter import limiter


settings = get_settings()

configure_logging(debug=settings.debug)

logger = logging.getLogger("taskforge.api")


tags_metadata = [
    {
        "name": "Health",
        "description": "API availability and health-check endpoints.",
    },
    {
        "name": "Authentication",
        "description": (
            "User registration, login, and authenticated account information. "
            "Use the access token returned by login to authorize protected requests."
        ),
    },
    {
        "name": "Workspaces",
        "description": (
            "Create and manage workspaces, view workspace information, "
            "and manage workspace memberships. Workspace owners have "
            "additional management permissions."
        ),
    },
    {
        "name": "Tasks",
        "description": (
            "Create, retrieve, update, delete, filter, sort, and paginate "
            "tasks within workspaces. Workspace membership is required."
        ),
    },
]


app = FastAPI(
    title="TaskForge API",
    description="""
TaskForge is a team collaboration and task management platform.

## Core capabilities

- **Authentication:** Register accounts and obtain bearer access tokens.
- **Workspaces:** Create workspaces and manage workspace members.
- **Task management:** Create, update, retrieve, and delete workspace tasks.
- **Task organization:** Filter, sort, and paginate task lists.

## Authentication

Protected endpoints require a valid bearer access token.

1. Register an account using `POST /auth/register`.
2. Log in using `POST /auth/login`.
3. Copy the returned `access_token`.
4. Click **Authorize** in Swagger UI and enter the token.

## Task statuses

- `todo`
- `in_progress`
- `done`

## Task priorities

- `low`
- `medium`
- `high`

## Documentation

- Swagger UI: `/docs`
- ReDoc: `/redoc`
- OpenAPI schema: `/openapi.json`
""",
    version="0.1.0",
    openapi_tags=tags_metadata,
)


# Rate limiting configuration
app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler,
)


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
    ],
)


# Centralized exception handlers
app.add_exception_handler(
    StarletteHTTPException,
    http_exception_handler,
)

app.add_exception_handler(
    RequestValidationError,
    validation_exception_handler,
)

app.add_exception_handler(
    Exception,
    unexpected_exception_handler,
)


@app.middleware("http")
async def log_http_requests(
    request: Request,
    call_next,
):
    """Log HTTP requests and apply security response headers."""

    start_time = time.perf_counter()

    method = request.method
    path = request.url.path

    try:
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = (
            "strict-origin-when-cross-origin"
        )
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )

        duration_ms = round(
            (time.perf_counter() - start_time) * 1000,
            2,
        )

        logger.info(
            "HTTP request completed",
            extra={
                "method": method,
                "path": path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )

        return response

    except Exception:
        duration_ms = round(
            (time.perf_counter() - start_time) * 1000,
            2,
        )

        logger.exception(
            "HTTP request failed",
            extra={
                "method": method,
                "path": path,
                "duration_ms": duration_ms,
            },
        )

        raise


app.include_router(auth_router)
app.include_router(workspaces_router)
app.include_router(tasks_router)


@app.get("/", tags=["Health"])
def root() -> dict[str, str]:
    return {
        "message": "Welcome to TaskForge API",
        "status": "running",
    }


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "healthy"}
