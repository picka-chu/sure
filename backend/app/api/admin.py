from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, desc
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.middleware.auth import get_current_admin
from app.models.user import User
from app.models.business import Business
from app.models.staff import StaffUser
from app.models.bank import BankAccount
from app.models.verification import Verification
from app.models.payment import Payment
from app.schemas.verification import VerificationResponse
from app.schemas.subscription import PaymentResponse
from uuid import UUID
from datetime import datetime, timezone, timedelta
from typing import Optional

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/dashboard")
async def admin_dashboard(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    biz_count = await db.scalar(select(func.count(Business.id)))
    active_biz = await db.scalar(select(func.count(Business.id)).where(Business.is_active == True))
    owner_count = await db.scalar(select(func.count(User.id)))
    staff_count = await db.scalar(select(func.count(StaffUser.id)))
    ver_count = await db.scalar(select(func.count(Verification.id)))
    verified_count = await db.scalar(select(func.count(Verification.id)).where(Verification.status == "verified"))
    scam_count = await db.scalar(select(func.count(Verification.id)).where(Verification.status == "scam"))
    pending_payments = await db.scalar(select(func.count(Payment.id)).where(Payment.status == "pending"))

    revenue = await db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == "verified")
    )

    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    daily_rows = await db.execute(
        select(
            func.date_trunc("day", Verification.created_at).label("date"),
            func.count().label("total"),
            func.sum(case((Verification.status == "verified", 1), else_=0)).label("verified"),
            func.sum(case((Verification.status == "scam", 1), else_=0)).label("scam"),
        )
        .where(Verification.created_at >= thirty_days_ago)
        .group_by(func.date_trunc("day", Verification.created_at))
        .order_by(func.date_trunc("day", Verification.created_at))
    )
    daily_stats = [
        {
            "date": str(row.date),
            "total": row.total,
            "verified": int(row.verified),
            "scam": int(row.scam),
        }
        for row in daily_rows
    ]

    biz_rows = await db.execute(
        select(Business).order_by(Business.created_at.desc()).limit(5)
    )
    recent_businesses = [
        {
            "id": str(b.id),
            "name": b.name,
            "email": b.email,
            "subscription_status": b.subscription_status.value if b.subscription_status else None,
            "is_active": b.is_active,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }
        for b in biz_rows.scalars()
    ]

    ver_rows = await db.execute(
        select(Verification).order_by(Verification.created_at.desc()).limit(5)
    )
    recent_verifications = [
        {
            "id": str(v.id),
            "business_id": str(v.business_id),
            "bank_name": v.bank_name,
            "amount": v.amount,
            "status": v.status.value if v.status else None,
            "payer_name": v.payer_name,
            "created_at": v.created_at.isoformat() if v.created_at else None,
        }
        for v in ver_rows.scalars()
    ]

    return {
        "total_businesses": biz_count or 0,
        "active_businesses": active_biz or 0,
        "total_owners": owner_count or 0,
        "total_staff": staff_count or 0,
        "total_verifications": ver_count or 0,
        "total_verified": verified_count or 0,
        "total_scam": scam_count or 0,
        "pending_payments": pending_payments or 0,
        "total_revenue": float(revenue or 0),
        "recent_businesses": recent_businesses,
        "recent_verifications": recent_verifications,
        "daily_stats": daily_stats,
    }


@router.get("/businesses")
async def admin_list_businesses(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    query = select(Business).options(selectinload(Business.owner))
    count_query = select(func.count(Business.id))

    if search:
        like = f"%{search}%"
        query = query.where(
            Business.name.ilike(like) | Business.email.ilike(like)
        )
        count_query = count_query.where(
            Business.name.ilike(like) | Business.email.ilike(like)
        )
    if status:
        query = query.where(Business.subscription_status == status)

    total = await db.scalar(count_query)
    rows = await db.execute(query.order_by(Business.created_at.desc()).offset(offset).limit(limit))
    businesses = rows.scalars().all()

    result = []
    for b in businesses:
        staff_count_val = await db.scalar(
            select(func.count(StaffUser.id)).where(StaffUser.business_id == b.id)
        )
        ver_count_val = await db.scalar(
            select(func.count(Verification.id)).where(Verification.business_id == b.id)
        )
        result.append({
            "id": str(b.id),
            "name": b.name,
            "email": b.email,
            "phone": b.phone,
            "owner_name": b.owner.full_name if b.owner else None,
            "owner_email": b.owner.email if b.owner else None,
            "subscription_status": b.subscription_status.value if b.subscription_status else None,
            "subscription_plan": b.subscription_plan.value if b.subscription_plan else None,
            "is_active": b.is_active,
            "staff_count": staff_count_val or 0,
            "verification_count": ver_count_val or 0,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        })

    return {"total": total or 0, "businesses": result}


@router.get("/businesses/{business_id}")
async def admin_get_business(
    business_id: UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Business)
        .options(selectinload(Business.owner), selectinload(Business.bank_accounts))
        .where(Business.id == business_id)
    )
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")

    staff_rows = await db.execute(
        select(StaffUser).where(StaffUser.business_id == business_id).order_by(StaffUser.created_at.desc())
    )
    ver_rows = await db.execute(
        select(Verification)
        .where(Verification.business_id == business_id)
        .order_by(Verification.created_at.desc())
        .limit(20)
    )
    pay_rows = await db.execute(
        select(Payment)
        .where(Payment.business_id == business_id)
        .order_by(Payment.created_at.desc())
    )

    return {
        "id": str(b.id),
        "name": b.name,
        "email": b.email,
        "phone": b.phone,
        "address": b.address,
        "subscription_status": b.subscription_status.value if b.subscription_status else None,
        "subscription_plan": b.subscription_plan.value if b.subscription_plan else None,
        "trial_end_date": b.trial_end_date.isoformat() if b.trial_end_date else None,
        "subscription_start_date": b.subscription_start_date.isoformat() if b.subscription_start_date else None,
        "subscription_end_date": b.subscription_end_date.isoformat() if b.subscription_end_date else None,
        "is_active": b.is_active,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "owner": {
            "id": str(b.owner.id),
            "email": b.owner.email,
            "full_name": b.owner.full_name,
            "is_active": b.owner.is_active,
        } if b.owner else None,
        "bank_accounts": [
            {
                "id": str(acc.id),
                "bank_name": acc.bank_name.value if acc.bank_name else acc.bank_name,
                "account_holder_name": acc.account_holder_name,
                "account_number": acc.account_number,
                "is_active": acc.is_active,
            }
            for acc in b.bank_accounts
        ],
        "staff": [
            {
                "id": str(s.id),
                "full_name": s.full_name,
                "email": s.email,
                "is_active": s.is_active,
                "last_login_at": s.last_login_at.isoformat() if s.last_login_at else None,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in staff_rows.scalars()
        ],
        "recent_verifications": [
            {
                "id": str(v.id),
                "bank_name": v.bank_name,
                "amount": v.amount,
                "status": v.status.value if v.status else None,
                "payer_name": v.payer_name,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in ver_rows.scalars()
        ],
        "payments": [
            {
                "id": str(p.id),
                "plan_type": p.plan_type,
                "amount": p.amount,
                "payment_method": p.payment_method,
                "status": p.status,
                "sender_name": p.sender_name,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in pay_rows.scalars()
        ],
    }


@router.put("/businesses/{business_id}/toggle")
async def admin_toggle_business(
    business_id: UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == business_id))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    b.is_active = not b.is_active
    await db.flush()
    return {"id": str(b.id), "is_active": b.is_active}


@router.get("/payments")
async def admin_list_payments(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    query = select(Payment)
    count_query = select(func.count(Payment.id))

    if status_filter:
        query = query.where(Payment.status == status_filter)
        count_query = count_query.where(Payment.status == status_filter)

    total = await db.scalar(count_query)
    rows = await db.execute(query.order_by(Payment.created_at.desc()).offset(offset).limit(limit))

    payments = []
    for p in rows.scalars():
        biz = await db.scalar(select(Business.name).where(Business.id == p.business_id))
        payments.append({
            "id": str(p.id),
            "business_id": str(p.business_id),
            "business_name": biz,
            "plan_type": p.plan_type,
            "amount": p.amount,
            "currency": p.currency,
            "payment_method": p.payment_method,
            "status": p.status,
            "sender_name": p.sender_name,
            "sender_account": p.sender_account,
            "transaction_reference": p.transaction_reference,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })

    return {"total": total or 0, "payments": payments}


@router.put("/payments/{payment_id}/verify")
async def admin_verify_payment(
    payment_id: UUID,
    body: dict,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    new_status = body.get("status")
    admin_notes = body.get("admin_notes", "")

    if new_status not in ("verified", "rejected"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status must be 'verified' or 'rejected'")

    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    payment.status = new_status
    payment.admin_notes = admin_notes
    payment.verified_by = admin.id
    payment.verified_at = datetime.now(timezone.utc)

    if new_status == "verified":
        biz_result = await db.execute(select(Business).where(Business.id == payment.business_id))
        business = biz_result.scalar_one_or_none()
        if business:
            from app.models.business import SubscriptionStatus, PlanType
            business.subscription_status = SubscriptionStatus.ACTIVE
            business.subscription_plan = PlanType(payment.plan_type)
            business.subscription_start_date = datetime.now(timezone.utc)
            from datetime import timedelta
            duration = timedelta(days=365 if payment.plan_type == "yearly" else 30)
            business.subscription_end_date = datetime.now(timezone.utc) + duration

    await db.flush()
    return {"id": str(payment.id), "status": payment.status}


@router.get("/verifications")
async def admin_list_verifications(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    query = select(Verification)
    count_query = select(func.count(Verification.id))

    if status_filter:
        query = query.where(Verification.status == status_filter)
        count_query = count_query.where(Verification.status == status_filter)

    total = await db.scalar(count_query)
    rows = await db.execute(query.order_by(Verification.created_at.desc()).offset(offset).limit(limit))

    verifications = []
    for v in rows.scalars():
        biz = await db.scalar(select(Business.name).where(Business.id == v.business_id))
        verifications.append({
            "id": str(v.id),
            "business_id": str(v.business_id),
            "business_name": biz,
            "staff_id": str(v.staff_id) if v.staff_id else None,
            "bank_name": v.bank_name,
            "transaction_reference": v.transaction_reference,
            "payer_name": v.payer_name,
            "amount": v.amount,
            "status": v.status.value if v.status else None,
            "error_message": v.error_message,
            "created_at": v.created_at.isoformat() if v.created_at else None,
        })

    return {"total": total or 0, "verifications": verifications}


@router.get("/staff")
async def admin_list_staff(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    total = await db.scalar(select(func.count(StaffUser.id)))
    rows = await db.execute(
        select(StaffUser).order_by(StaffUser.created_at.desc()).offset(offset).limit(limit)
    )
    staff_list = []
    for s in rows.scalars():
        biz = await db.scalar(select(Business.name).where(Business.id == s.business_id))
        ver_count = await db.scalar(
            select(func.count(Verification.id)).where(Verification.staff_id == s.id)
        )
        staff_list.append({
            "id": str(s.id),
            "full_name": s.full_name,
            "email": s.email,
            "business_id": str(s.business_id),
            "business_name": biz,
            "is_active": s.is_active,
            "verification_count": ver_count or 0,
            "last_login_at": s.last_login_at.isoformat() if s.last_login_at else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })

    return {"total": total or 0, "staff": staff_list}
