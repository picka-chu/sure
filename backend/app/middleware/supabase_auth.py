import httpx
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.business import Business, SubscriptionStatus
from app.models.staff import StaffUser
from datetime import datetime, timezone, timedelta
from uuid import UUID
from typing import Union

security = HTTPBearer(auto_error=False)

logger = logging.getLogger("surepay.supabase_auth")


async def _verify_supabase_token(token: str) -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{settings.SUPABASE_URL}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        logger.error(f"Supabase token verification failed: {e}")
    return None


async def _find_or_create_user_from_supabase(
    db: AsyncSession, supabase_user: dict, role: str = "owner"
) -> User:
    email = supabase_user.get("email") or supabase_user.get("id")
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user:
        return user

    app_metadata = supabase_user.get("app_metadata", {})
    user_metadata = supabase_user.get("user_metadata", {})
    full_name = (
        user_metadata.get("full_name")
        or user_metadata.get("name")
        or email.split("@")[0]
    )
    business_name = user_metadata.get("business_name") or f"{full_name}'s Business"

    business = Business(
        name=business_name,
        email=email,
        phone=user_metadata.get("phone"),
        subscription_status=SubscriptionStatus.TRIAL,
        trial_end_date=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(business)
    await db.flush()

    user = User(
        business_id=business.id,
        email=email,
        full_name=full_name,
        role=role,
    )
    user.set_password(UUID(supabase_user["id"]).hex)
    db.add(user)
    await db.flush()

    logger.info(f"Created user+business from Supabase auth: email={email}, business={business.id}")
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = credentials.credentials

    supabase_user = await _verify_supabase_token(token)
    if supabase_user:
        return await _find_or_create_user_from_supabase(db, supabase_user, role="owner")

    from jose import JWTError, jwt
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if user_id is None or role != "owner":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


async def get_current_staff(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> StaffUser:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = credentials.credentials

    from jose import JWTError, jwt
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        staff_id: str = payload.get("sub")
        role: str = payload.get("role")
        if staff_id is None or role != "staff":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(select(StaffUser).where(StaffUser.id == UUID(staff_id)))
    staff = result.scalar_one_or_none()
    if staff is None or not staff.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Staff not found or inactive")
    return staff


async def get_current_any(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Union[User, StaffUser]:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = credentials.credentials

    supabase_user = await _verify_supabase_token(token)
    if supabase_user:
        return await _find_or_create_user_from_supabase(db, supabase_user, role="owner")

    from jose import JWTError, jwt
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if user_id is None or role not in ("owner", "staff"):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    if role == "owner":
        result = await db.execute(select(User).where(User.id == UUID(user_id)))
        user = result.scalar_one_or_none()
        if user is None or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
        return user
    else:
        result = await db.execute(select(StaffUser).where(StaffUser.id == UUID(user_id)))
        staff = result.scalar_one_or_none()
        if staff is None or not staff.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Staff not found or inactive")
        return staff


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = credentials.credentials

    supabase_user = await _verify_supabase_token(token)
    if supabase_user:
        user = await _find_or_create_user_from_supabase(db, supabase_user, role="super_admin")
        if not user.is_super_admin:
            user.is_super_admin = True
            await db.flush()
        return user

    from jose import JWTError, jwt
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if user_id is None or role != "super_admin":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active or not user.is_super_admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin not found or inactive")
    return user
