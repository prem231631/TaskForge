
from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @model_validator(mode="after")
    def validate_security_settings(self):
        environment = self.app_env.strip().lower()

        if self.access_token_expire_minutes <= 0:
            raise ValueError(
                "ACCESS_TOKEN_EXPIRE_MINUTES must be greater than zero."
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

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
