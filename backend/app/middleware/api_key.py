import hashlib
import logging
from fastapi import Header, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.api_key import ApiKey
from app.models.business import Business

logger = logging.getLogger("surepay.api_key")


async def get_api_client(
    x_api_key: str = Header(..., description="Your Surepay API key (sk-...)"),
    db: AsyncSession = Depends(get_db),
) -> tuple[ApiKey, Business]:
    if not x_api_key.startswith("sk-"):
        raise HTTPException(status_code=401, detail="Invalid API key format. Must start with 'sk-'")

    key_hash = hashlib.sha256(x_api_key.encode()).hexdigest()

    result = await db.execute(select(ApiKey).where(ApiKey.key_hash == key_hash))
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid or revoked API key")

    if not api_key.is_active:
        raise HTTPException(status_code=401, detail="API key is deactivated")

    result = await db.execute(select(Business).where(Business.id == api_key.business_id))
    business = result.scalar_one_or_none()

    if not business or not business.is_active:
        raise HTTPException(status_code=403, detail="Business account is inactive")

    from datetime import datetime, timezone
    api_key.last_used_at = datetime.now(timezone.utc)
    await db.flush()

    return api_key, business
