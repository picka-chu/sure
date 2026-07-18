import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.staff import StaffUser
from app.schemas.staff import StaffCreate, StaffUpdate, StaffResponse
from typing import List
from uuid import UUID

router = APIRouter(prefix="/api/staff", tags=["Staff Management"])


def generate_staff_email(full_name: str, business_id: UUID) -> str:
    name_part = full_name.lower().strip()
    name_part = re.sub(r"[^a-z0-9]", ".", name_part)
    name_part = re.sub(r"\.+", ".", name_part).strip(".")
    short_id = str(business_id).split("-")[0]
    return f"{name_part}@{short_id}.staff"


@router.get("", response_model=List[StaffResponse])
async def list_staff(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(StaffUser).where(
            StaffUser.business_id == current_user.business_id,
        ).order_by(StaffUser.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
async def create_staff(
    req: StaffCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if len(req.pin) < 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN must be at least 4 characters")

    email = req.email
    if not email:
        email = generate_staff_email(req.full_name, current_user.business_id)

    existing = await db.execute(select(StaffUser).where(StaffUser.email == email))
    if existing.scalar_one_or_none():
        email = f"{email.split('@')[0]}.{str(current_user.business_id).split('-')[1][:4]}@{email.split('@')[1]}"

    staff = StaffUser(
        business_id=current_user.business_id,
        full_name=req.full_name,
        email=email,
    )
    staff.set_pin(req.pin)
    db.add(staff)
    await db.flush()
    await db.refresh(staff)
    return staff


@router.patch("/{staff_id}", response_model=StaffResponse)
async def update_staff(
    staff_id: UUID,
    req: StaffUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(StaffUser).where(
            StaffUser.id == staff_id,
            StaffUser.business_id == current_user.business_id,
        )
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found")

    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(staff, key, value)
    await db.flush()
    await db.refresh(staff)
    return staff


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_staff(
    staff_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(StaffUser).where(
            StaffUser.id == staff_id,
            StaffUser.business_id == current_user.business_id,
        )
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found")
    staff.is_active = False
    await db.flush()
