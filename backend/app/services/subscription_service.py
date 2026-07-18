import os
import uuid
from datetime import datetime, timedelta, timezone
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.business import Business, SubscriptionStatus, PlanType
from app.models.payment import Payment, PaymentStatus, PaymentMethod, PlanType as PaymentPlanType
from app.config import settings

MONTHLY_PRICE = 750.0
YEARLY_PRICE = 7500.0
TRIAL_DAYS = 7

PAYMENT_ACCOUNTS = {
    "cbe": {
        "bank_name": "Commercial Bank of Ethiopia (CBE)",
        "account_holder": "Bereket Tesfalem",
        "account_number": "1000602869893",
    },
    "telebirr": {
        "bank_name": "Telebirr (Ethio telecom)",
        "account_holder": "Bereket Tesfalem",
        "account_number": "0930529985",
    },
}

PRICING = [
    {
        "plan": "monthly",
        "amount": MONTHLY_PRICE,
        "currency": "ETB",
        "label": "Monthly",
        "description": "Billed every month",
    },
    {
        "plan": "yearly",
        "amount": YEARLY_PRICE,
        "currency": "ETB",
        "label": "Yearly",
        "description": "Billed annually (2 months free)",
        "discount_note": "Save 2 months",
    },
]


async def get_subscription_status(db: AsyncSession, business_id: UUID) -> dict:
    result = await db.execute(select(Business).where(Business.id == business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise ValueError("Business not found")

    now = datetime.now(timezone.utc)

    if business.subscription_status == SubscriptionStatus.TRIAL:
        if business.trial_end_date and now > business.trial_end_date:
            business.subscription_status = SubscriptionStatus.EXPIRED
            business.subscription_plan = PlanType.NONE
            await db.flush()
            await db.refresh(business)
            days_remaining = 0
        else:
            days_remaining = (business.trial_end_date - now).days if business.trial_end_date else 0
            if days_remaining < 0:
                days_remaining = 0
    elif business.subscription_status == SubscriptionStatus.ACTIVE:
        if business.subscription_end_date and now > business.subscription_end_date:
            business.subscription_status = SubscriptionStatus.EXPIRED
            business.subscription_plan = PlanType.NONE
            await db.flush()
            await db.refresh(business)
            days_remaining = 0
        else:
            days_remaining = (business.subscription_end_date - now).days if business.subscription_end_date else 0
            if days_remaining < 0:
                days_remaining = 0
    else:
        days_remaining = 0

    return {
        "status": business.subscription_status.value,
        "plan": business.subscription_plan.value if business.subscription_plan else "none",
        "trial_end_date": business.trial_end_date,
        "subscription_start_date": business.subscription_start_date,
        "subscription_end_date": business.subscription_end_date,
        "days_remaining": days_remaining,
        "is_active": business.subscription_status in (SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE),
    }


async def submit_payment(
    db: AsyncSession,
    business_id: UUID,
    plan_type: str,
    payment_method: str,
    screenshot_path: str | None = None,
    sender_name: str | None = None,
    sender_account: str | None = None,
    transaction_reference: str | None = None,
) -> Payment:
    if plan_type not in ("monthly", "yearly"):
        raise ValueError("Invalid plan type. Must be 'monthly' or 'yearly'")

    if payment_method not in ("cbe", "telebirr"):
        raise ValueError("Invalid payment method. Must be 'cbe' or 'telebirr'")

    amount = MONTHLY_PRICE if plan_type == "monthly" else YEARLY_PRICE

    result = await db.execute(select(Business).where(Business.id == business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise ValueError("Business not found")

    existing_pending = await db.execute(
        select(Payment).where(
            Payment.business_id == business_id,
            Payment.status == PaymentStatus.PENDING,
        )
    )
    if existing_pending.scalar_one_or_none():
        raise ValueError("You already have a pending payment. Please wait for verification.")

    payment = Payment(
        business_id=business_id,
        plan_type=PaymentPlanType(plan_type),
        amount=amount,
        currency="ETB",
        payment_method=PaymentMethod(payment_method),
        status=PaymentStatus.PENDING,
        screenshot_path=screenshot_path,
        sender_name=sender_name,
        sender_account=sender_account,
        transaction_reference=transaction_reference,
    )
    db.add(payment)
    await db.flush()
    await db.refresh(payment)
    return payment


async def verify_payment(
    db: AsyncSession,
    payment_id: UUID,
    admin_user_id: UUID,
    approve: bool,
    notes: str | None = None,
) -> Payment:
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise ValueError("Payment not found")

    if payment.status != PaymentStatus.PENDING:
        raise ValueError("Payment is already processed")

    payment.status = PaymentStatus.VERIFIED if approve else PaymentStatus.REJECTED
    payment.admin_notes = notes
    payment.verified_by = admin_user_id
    payment.verified_at = datetime.now(timezone.utc)

    if approve:
        business_result = await db.execute(select(Business).where(Business.id == payment.business_id))
        business = business_result.scalar_one_or_none()
        if business:
            now = datetime.now(timezone.utc)
            plan = PlanType.MONTHLY if payment.plan_type == PaymentPlanType.MONTHLY else PlanType.YEARLY
            duration_days = 30 if plan == PlanType.MONTHLY else 365

            if business.subscription_status == SubscriptionStatus.EXPIRED or business.subscription_status == SubscriptionStatus.CANCELLED:
                business.subscription_start_date = now
            else:
                start = business.subscription_end_date or now
                if start < now:
                    start = now
                business.subscription_start_date = start

            business.subscription_end_date = business.subscription_start_date + timedelta(days=duration_days)
            business.subscription_status = SubscriptionStatus.ACTIVE
            business.subscription_plan = plan

            if business.subscription_status == SubscriptionStatus.TRIAL:
                business.trial_end_date = None

    await db.flush()
    await db.refresh(payment)
    return payment


async def get_payment_history(db: AsyncSession, business_id: UUID) -> list[Payment]:
    result = await db.execute(
        select(Payment)
        .where(Payment.business_id == business_id)
        .order_by(Payment.created_at.desc())
    )
    return result.scalars().all()


async def get_pending_payments(db: AsyncSession) -> list[Payment]:
    result = await db.execute(
        select(Payment)
        .where(Payment.status == PaymentStatus.PENDING)
        .order_by(Payment.created_at.asc())
    )
    return result.scalars().all()
