from datetime import datetime, timezone, timedelta, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date, case
from app.models.verification import Verification, VerificationStatus
from uuid import UUID


async def get_dashboard_stats(db: AsyncSession, business_id: UUID) -> dict:
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)
    today_end = datetime.combine(today, datetime.max.time(), tzinfo=timezone.utc)

    total_count = await db.scalar(
        select(func.count(Verification.id)).where(Verification.business_id == business_id)
    )

    today_count = await db.scalar(
        select(func.count(Verification.id)).where(
            Verification.business_id == business_id,
            Verification.created_at >= today_start,
            Verification.created_at <= today_end,
        )
    )

    verified_today = await db.scalar(
        select(func.count(Verification.id)).where(
            Verification.business_id == business_id,
            Verification.status == VerificationStatus.VERIFIED,
            Verification.created_at >= today_start,
            Verification.created_at <= today_end,
        )
    )

    scam_today = await db.scalar(
        select(func.count(Verification.id)).where(
            Verification.business_id == business_id,
            Verification.status == VerificationStatus.SCAM,
            Verification.created_at >= today_start,
            Verification.created_at <= today_end,
        )
    )

    recent_result = await db.execute(
        select(Verification)
        .where(Verification.business_id == business_id)
        .order_by(Verification.created_at.desc())
        .limit(10)
    )
    recent_verifications = recent_result.scalars().all()

    thirty_days_ago = today_start - timedelta(days=30)
    daily_rows = await db.execute(
        select(
            cast(Verification.created_at, Date).label("day"),
            func.count(Verification.id).label("total"),
            func.sum(case((Verification.status == VerificationStatus.VERIFIED, 1), else_=0)).label("verified"),
            func.sum(case((Verification.status == VerificationStatus.SCAM, 1), else_=0)).label("scam"),
        )
        .where(
            Verification.business_id == business_id,
            Verification.created_at >= thirty_days_ago,
        )
        .group_by(cast(Verification.created_at, Date))
        .order_by(cast(Verification.created_at, Date))
    )

    bank_rows = await db.execute(
        select(
            Verification.bank_name,
            func.count(Verification.id).label("count"),
        )
        .where(Verification.business_id == business_id)
        .group_by(Verification.bank_name)
    )

    scam_rate = (scam_today / today_count * 100) if today_count and today_count > 0 else 0

    return {
        "total_verifications": total_count or 0,
        "verified_today": verified_today or 0,
        "scam_today": scam_today or 0,
        "scam_rate": round(scam_rate, 2),
        "total_scans_today": today_count or 0,
        "recent_verifications": [
            {
                "id": str(v.id),
                "bank_name": v.bank_name,
                "amount": v.amount,
                "status": v.status.value,
                "payer_name": v.payer_name,
                "created_at": v.created_at.isoformat(),
            }
            for v in recent_verifications
        ],
        "daily_stats": [
            {
                "date": str(row.day),
                "total": row.total,
                "verified": row.verified or 0,
                "scam": row.scam or 0,
                "pending": row.total - (row.verified or 0) - (row.scam or 0),
            }
            for row in daily_rows
        ],
        "bank_breakdown": {row.bank_name or "unknown": row.count for row in bank_rows},
    }
