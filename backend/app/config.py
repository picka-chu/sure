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
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    STRIPE_API_KEY: Optional[str] = os.getenv("STRIPE_API_KEY")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    PRICING_MONTHLY_AMOUNT: float = float(os.getenv("PRICING_MONTHLY_AMOUNT", "750"))
    PRICING_YEARLY_AMOUNT: float = float(os.getenv("PRICING_YEARLY_AMOUNT", "7500"))
    PAYMENT_CBE_BANK: str = os.getenv("PAYMENT_CBE_BANK", "Commercial Bank of Ethiopia (CBE)")
    PAYMENT_CBE_HOLDER: str = os.getenv("PAYMENT_CBE_HOLDER", "Bereket Tesfalem")
    PAYMENT_CBE_ACCOUNT: str = os.getenv("PAYMENT_CBE_ACCOUNT", "1000602869893")
    PAYMENT_TELEBIRR_BANK: str = os.getenv("PAYMENT_TELEBIRR_BANK", "Telebirr (Ethio telecom)")
    PAYMENT_TELEBIRR_HOLDER: str = os.getenv("PAYMENT_TELEBIRR_HOLDER", "Bereket Tesfalem")
    PAYMENT_TELEBIRR_ACCOUNT: str = os.getenv("PAYMENT_TELEBIRR_ACCOUNT", "0930529985")


settings = Settings()


PRICING = {
    "monthly": {"amount": settings.PRICING_MONTHLY_AMOUNT, "currency": "ETB", "label": "Monthly"},
    "yearly": {"amount": settings.PRICING_YEARLY_AMOUNT, "currency": "ETB", "label": "Yearly", "discount_note": "2 months free"},
}

PAYMENT_ACCOUNTS = {
    "cbe": {
        "bank_name": settings.PAYMENT_CBE_BANK,
        "account_holder": settings.PAYMENT_CBE_HOLDER,
        "account_number": settings.PAYMENT_CBE_ACCOUNT,
    },
    "telebirr": {
        "bank_name": settings.PAYMENT_TELEBIRR_BANK,
        "account_holder": settings.PAYMENT_TELEBIRR_HOLDER,
        "account_number": settings.PAYMENT_TELEBIRR_ACCOUNT,
    },
}
