from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.business import Business
from app.schemas.business import BusinessResponse, BusinessUpdateRequest

router = APIRouter(prefix="/api/business", tags=["Business"])


@router.get("/me", response_model=BusinessResponse)
async def get_my_business(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    return business


@router.patch("/me", response_model=BusinessResponse)
async def update_my_business(
    req: BusinessUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")

    ALLOWED_FIELDS = {"name", "phone", "address", "logo_url"}
    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key in ALLOWED_FIELDS:
            setattr(business, key, value)
    await db.flush()
    await db.refresh(business)
    return business
