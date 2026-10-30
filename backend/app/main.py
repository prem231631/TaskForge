
from fastapi import FastAPI

from app.api.auth import router as auth_router
from app.api.tasks import router as tasks_router
from app.api.workspaces import router as workspaces_router


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
