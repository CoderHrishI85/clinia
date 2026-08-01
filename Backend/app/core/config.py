import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    database_url: str
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int
    allowed_origins: list[str]
    environment: str

    def __init__(self) -> None:
        self.database_url = self._required("DATABASE_URL")
        self.secret_key = self._required("SECRET_KEY")
        self.algorithm = os.getenv("ALGORITHM", "HS256")
        self.access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
        self.allowed_origins = self._list("ALLOWED_ORIGINS", ["http://localhost:3000"])
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.redis_url = os.getenv("REDIS_URL")
        self.phi_encryption_key = os.getenv("PHI_ENCRYPTION_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")

    @staticmethod
    def _required(name: str) -> str:
        value = os.getenv(name)
        if not value:
            raise RuntimeError(f"{name} environment variable is required")
        return value

    @staticmethod
    def _list(name: str, default: list[str]) -> list[str]:
        raw_value = os.getenv(name)
        if not raw_value:
            return default
        return [item.strip() for item in raw_value.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
