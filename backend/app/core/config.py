
from functools import lru_cache
from typing import Annotated

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "TaskForge"
    app_env: str = "development"
    debug: bool = False

    database_url: str = (
        "postgresql+psycopg://taskforge_user:"
        "replace_with_a_local_secret@localhost:5436/taskforge_db"
    )

    jwt_secret_key: str = "replace_with_a_long_random_secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    email_verification_expire_minutes: int = 30

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_sender_email: str = ""
    smtp_sender_name: str = "TaskForge"
    smtp_use_tls: bool = True

    frontend_base_url: str = "http://localhost:5173"

    allowed_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value):
        if isinstance(value, str):
            return [
                origin.strip().rstrip("/")
                for origin in value.split(",")
                if origin.strip()
            ]

        return value

    @field_validator("allowed_origins")
    @classmethod
    def validate_allowed_origins(cls, origins):
        normalized = [
            origin.strip().rstrip("/")
            for origin in origins
        ]

        if any(not origin for origin in normalized):
            raise ValueError(
                "Allowed origins cannot contain empty values."
            )

        if "*" in normalized:
            raise ValueError(
                "Wildcard CORS origins are not permitted."
            )

        return normalized

    @model_validator(mode="after")
    def validate_security_settings(self):
        environment = self.app_env.strip().lower()

        if self.access_token_expire_minutes <= 0:
            raise ValueError(
                "ACCESS_TOKEN_EXPIRE_MINUTES must be greater than zero."
            )

        if self.email_verification_expire_minutes <= 0:
            raise ValueError(
                "EMAIL_VERIFICATION_EXPIRE_MINUTES must be greater than zero."
            )

        if not 1 <= self.smtp_port <= 65535:
            raise ValueError("SMTP_PORT must be between 1 and 65535.")

        if not self.frontend_base_url.startswith(("http://", "https://")):
            raise ValueError(
                "FRONTEND_BASE_URL must be a valid HTTP or HTTPS URL."
            )

        if environment in {"production", "prod"}:
            if self.debug:
                raise ValueError(
                    "DEBUG must be false in production."
                )

            if (
                not self.jwt_secret_key
                or len(self.jwt_secret_key) < 32
                or "replace_with" in self.jwt_secret_key.lower()
            ):
                raise ValueError(
                    "Production requires a JWT secret of at least "
                    "32 characters that is not a placeholder."
                )

            if "replace_with" in self.database_url.lower():
                raise ValueError(
                    "Production requires a real DATABASE_URL."
                )

            if not self.allowed_origins:
                raise ValueError(
                    "Production requires at least one allowed CORS origin."
                )

            if any(
                origin.startswith("http://localhost")
                or origin.startswith("http://127.0.0.1")
                for origin in self.allowed_origins
            ):
                raise ValueError(
                    "Production CORS origins cannot contain localhost."
                )

            if not all(
                [
                    self.smtp_host,
                    self.smtp_username,
                    self.smtp_password,
                    self.smtp_sender_email,
                ]
            ):
                raise ValueError(
                    "Production requires complete SMTP configuration."
                )

            if not self.frontend_base_url.startswith("https://"):
                raise ValueError(
                    "Production FRONTEND_BASE_URL must use HTTPS."
                )

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
