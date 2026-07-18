import os
import re
from dotenv import load_dotenv
from typing import Optional

load_dotenv()


def _fix_db_url(url: str) -> str:
    if not url:
        return url
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://") and "+asyncpg" not in url:
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


class Settings:
    DATABASE_URL: str = _fix_db_url(
        os.getenv(
            "DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres@localhost:5432/sure",
        )
    )
    DATABASE_SSL: bool = os.getenv("DATABASE_SSL", "false").lower() == "true"
    DATABASE_POOLER: bool = os.getenv("DATABASE_POOLER", "false").lower() == "true"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-this-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080")
    )
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    STRIPE_API_KEY: Optional[str] = os.getenv("STRIPE_API_KEY")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")


settings = Settings()
