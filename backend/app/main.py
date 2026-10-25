
from fastapi import FastAPI

from app.api.auth import router as auth_router

app = FastAPI(
    title="TaskForge API",
    description="API for the TaskForge team collaboration platform.",
    version="0.1.0",
)

app.include_router(auth_router)


@app.get("/", tags=["Health"])
def root() -> dict[str, str]:
    return {
        "message": "Welcome to TaskForge API",
        "status": "running",
    }


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "healthy"}
