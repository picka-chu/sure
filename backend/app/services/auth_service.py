from datetime import datetime, timedelta, timezone
from uuid import UUID
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.models.user import User
from app.models.business import Business, SubscriptionStatus
from app.models.staff import StaffUser


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def register_business(
    db: AsyncSession,
    business_name: str,
    email: str,
    password: str,
    full_name: str,
    phone: str | None = None,
) -> dict:
    existing = await db.execute(select(Business).where(Business.email == email))
    if existing.scalar_one_or_none():
        raise ValueError("Business with this email already exists")

    business = Business(
        name=business_name,
        email=email,
        phone=phone,
        subscription_status=SubscriptionStatus.TRIAL,
        trial_end_date=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(business)
    await db.flush()

    owner = User(
        business_id=business.id,
        email=email,
        full_name=full_name,
        role="owner",
    )
    owner.set_password(password)
    db.add(owner)
    await db.flush()

    token = create_access_token({"sub": str(owner.id), "role": "owner"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(owner.id),
            "email": owner.email,
            "full_name": owner.full_name,
            "role": owner.role,
            "business_id": str(business.id),
            "business_name": business.name,
        },
    }


async def login_owner(db: AsyncSession, email: str, password: str) -> dict:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not user.verify_password(password):
        raise ValueError("Invalid email or password")

    result = await db.execute(select(Business).where(Business.id == user.business_id))
    business = result.scalar_one_or_none()
    if not business or not business.is_active:
        raise ValueError("Business account is inactive")

    token = create_access_token({"sub": str(user.id), "role": "owner"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "business_id": str(business.id),
            "business_name": business.name,
        },
    }


async def change_owner_password(
    db: AsyncSession,
    user: User,
    current_password: str,
    new_password: str,
) -> None:
    if not user.verify_password(current_password):
        raise ValueError("Current password is incorrect")
    if len(new_password) < 6:
        raise ValueError("New password must be at least 6 characters")
    user.set_password(new_password)
    await db.flush()


async def login_staff_by_email(db: AsyncSession, email: str, pin: str) -> dict:
    result = await db.execute(
        select(StaffUser).where(
            StaffUser.email == email,
            StaffUser.is_active == True,
        )
    )
    staff = result.scalar_one_or_none()

    if not staff or not staff.verify_pin(pin):
        raise ValueError("Invalid email or PIN")

    result = await db.execute(select(Business).where(Business.id == staff.business_id))
    business = result.scalar_one_or_none()
    if not business or not business.is_active:
        raise ValueError("Business account is inactive")

    staff.last_login_at = datetime.now(timezone.utc)
    await db.flush()

    token = create_access_token({"sub": str(staff.id), "role": "staff"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "staff": {
            "id": str(staff.id),
            "full_name": staff.full_name,
            "business_id": str(business.id),
            "business_name": business.name,
        },
    }


async def login_staff(db: AsyncSession, pin: str, business_code: str) -> dict:
    result = await db.execute(
        select(Business).where(Business.id == UUID(business_code) if len(business_code) == 36 else Business.id == business_code)
    )
    business = result.scalar_one_or_none()

    if not business:
        result = await db.execute(
            select(Business).where(Business.name.ilike(f"%{business_code}%"))
        )
        business = result.scalar_one_or_none()

    if not business or not business.is_active:
        raise ValueError("Invalid business")

    result = await db.execute(
        select(StaffUser).where(
            StaffUser.business_id == business.id,
            StaffUser.is_active == True,
        )
    )
    staff_list = result.scalars().all()

    for staff in staff_list:
        if staff.verify_pin(pin):
            staff.last_login_at = datetime.now(timezone.utc)
            await db.flush()
            token = create_access_token({"sub": str(staff.id), "role": "staff"})
            return {
                "access_token": token,
                "token_type": "bearer",
                "staff": {
                    "id": str(staff.id),
                    "full_name": staff.full_name,
                    "business_id": str(business.id),
                    "business_name": business.name,
                },
            }

    raise ValueError("Invalid PIN")
