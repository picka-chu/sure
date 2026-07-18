import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.business import Business
from app.models.payment import Payment, PaymentStatus
from app.schemas.subscription import (
    SubscriptionStatusResponse,
    PaymentSubmitRequest,
    PaymentResponse,
    AdminVerifyPaymentRequest,
    PricingInfo,
    PaymentAccountInfo,
    PRICING,
    PAYMENT_ACCOUNTS,
)
from app.services.subscription_service import (
    get_subscription_status,
    submit_payment,
    verify_payment,
    get_payment_history,
    get_pending_payments,
)
from app.config import settings
from typing import List

router = APIRouter(prefix="/api/subscription", tags=["Subscription"])


@router.get("/pricing")
async def get_pricing():
    return {"plans": list(PRICING.values())}


@router.get("/payment-accounts")
async def get_payment_accounts():
    return PAYMENT_ACCOUNTS


@router.get("/status", response_model=SubscriptionStatusResponse)
async def subscription_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_subscription_status(db, current_user.business_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/submit-payment", response_model=PaymentResponse)
async def submit_payment_endpoint(
    plan_type: str = Form(...),
    payment_method: str = Form(...),
    sender_name: str = Form(None),
    sender_account: str = Form(None),
    transaction_reference: str = Form(None),
    screenshot: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if plan_type not in ("monthly", "yearly"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid plan type")

    if payment_method not in ("cbe", "telebirr"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payment method")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_ext = os.path.splitext(screenshot.filename or "payment.png")[1] or ".png"
    file_name = f"payment_{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, file_name)

    content = await screenshot.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Screenshot too large. Max 5MB.")

    with open(file_path, "wb") as f:
        f.write(content)

    try:
        payment = await submit_payment(
            db,
            business_id=current_user.business_id,
            plan_type=plan_type,
            payment_method=payment_method,
            screenshot_path=file_path,
            sender_name=sender_name,
            sender_account=sender_account,
            transaction_reference=transaction_reference,
        )
        return payment
    except ValueError as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/payments", response_model=List[PaymentResponse])
async def payment_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_payment_history(db, current_user.business_id)


@router.get("/admin/pending-payments", response_model=List[PaymentResponse])
async def admin_pending_payments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    business = await db.get(Business, current_user.business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")

    result = await db.execute(
        select(Payment).where(
            Payment.business_id == current_user.business_id,
            Payment.status == PaymentStatus.PENDING,
        ).order_by(Payment.created_at.asc())
    )
    return result.scalars().all()


@router.post("/admin/verify-payment/{payment_id}", response_model=PaymentResponse)
async def admin_verify_payment(
    payment_id: uuid.UUID,
    req: AdminVerifyPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        payment = await verify_payment(
            db,
            payment_id=payment_id,
            admin_user_id=current_user.id,
            approve=req.status == "verified",
            notes=req.admin_notes,
        )
        return payment
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
