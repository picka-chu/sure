from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.models.staff import StaffUser
from app.middleware.auth import get_current_any
from typing import Union
from datetime import datetime, timezone


async def require_active_subscription(
    current_user: Union[User, StaffUser] = Depends(get_current_any),
    db: AsyncSession = Depends(get_db),
):
    from app.models.business import Business, SubscriptionStatus
    business = await db.get(Business, current_user.business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")

    now = datetime.now(timezone.utc)
    trial_ok = business.trial_end_date and business.trial_end_date > now
    sub_ok = business.subscription_end_date and business.subscription_end_date > now

    if not trial_ok and not sub_ok:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Your subscription has expired. Please renew to continue using Surepay.",
        )
    return current_user
