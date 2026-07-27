import json
import firebase_admin
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
from firebase_admin import auth as firebase_auth, credentials

security = HTTPBearer(auto_error=False)

logger = logging.getLogger("surepay.firebase_auth")

if not firebase_admin._apps:
    if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        cred = credentials.Certificate(json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON))
    else:
        cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)


async def _find_or_create_user_from_firebase(
    db: AsyncSession, fb_user: dict, role: str = "owner"
) -> User:
    email = fb_user.get("email") or fb_user.get("uid")
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user:
        return user

    full_name = (
        fb_user.get("name")
        or email.split("@")[0]
    )
    business_name = f"{full_name}'s Business"

    business = Business(
        name=business_name,
        email=email,
        phone=fb_user.get("phone_number"),
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
    user.set_password(UUID(fb_user["uid"]).hex)
    db.add(user)
    await db.flush()

    logger.info(f"Created user+business from Firebase auth: email={email}, business={business.id}")
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = credentials.credentials

    try:
        decoded = firebase_auth.verify_id_token(token)
        return await _find_or_create_user_from_firebase(db, decoded, role="owner")
    except Exception:
        pass

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

    try:
        decoded = firebase_auth.verify_id_token(token)
        return await _find_or_create_user_from_firebase(db, decoded, role="owner")
    except Exception:
        pass

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
        result = await db.execute(select(StaffUser).where(StaffUser.id == UUID(staff_id)))
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

    try:
        decoded = firebase_auth.verify_id_token(token)
        user = await _find_or_create_user_from_firebase(db, decoded, role="super_admin")
        if not user.is_super_admin:
            user.is_super_admin = True
            await db.flush()
        return user
    except Exception:
        pass

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
