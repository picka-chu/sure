import uuid
import logging
from datetime import datetime, timezone, timedelta
from uuid import UUID
from typing import Union

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.business import Business, SubscriptionStatus
from app.models.staff import StaffUser

security = HTTPBearer(auto_error=False)

logger = logging.getLogger("surepay.auth")


async def find_or_create_user(
    db: AsyncSession, email: str, full_name: str, uid: str, role: str = "owner"
) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    if user:
        return user

    business_name = f"{full_name}'s Business"
    now = datetime.now(timezone.utc)

    try:
        business = Business(
            name=business_name,
            email=email,
            subscription_status=SubscriptionStatus.TRIAL,
            trial_end_date=now + timedelta(days=7),
        )
        db.add(business)
        await db.flush()

        user = User(
            business_id=business.id,
            email=email,
            full_name=full_name,
            role=role,
        )
        user.set_password(uuid.uuid4().hex)
        db.add(user)
        await db.flush()

        logger.info(f"Created user+business from OAuth: email={email}, business={business.id}")
        return user
    except IntegrityError:
        await db.rollback()
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        if user:
            return user
        raise


def _decode_custom_jwt(token: str) -> dict:
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    return payload


async def _get_user_by_id(db: AsyncSession, user_id: str) -> User:
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = _decode_custom_jwt(credentials.credentials)
        user_id = payload.get("sub")
        role = payload.get("role")
        if user_id is None or role != "owner":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return await _get_user_by_id(db, user_id)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def get_current_staff(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> StaffUser:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = _decode_custom_jwt(credentials.credentials)
        staff_id = payload.get("sub")
        role = payload.get("role")
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
    try:
        payload = _decode_custom_jwt(credentials.credentials)
        user_id = payload.get("sub")
        role = payload.get("role")
        if user_id is None or role not in ("owner", "staff"):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    if role == "owner":
        return await _get_user_by_id(db, user_id)
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
    try:
        payload = _decode_custom_jwt(credentials.credentials)
        user_id = payload.get("sub")
        role = payload.get("role")
        if user_id is None or role != "super_admin":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active or not user.is_super_admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin not found or inactive")
    return user
