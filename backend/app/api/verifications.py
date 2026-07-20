import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.middleware.auth import get_current_user, get_current_staff, get_current_any
from app.models.user import User
from app.models.staff import StaffUser
from app.models.business import Business
from app.models.bank import BankAccount, BankName
from app.models.verification import Verification, VerificationStatus
from app.schemas.verification import VerificationResponse, VerifyCaptureResponse
from app.services.verification_service import verify_receipt, detect_bank_from_url, detect_bank_from_text, extract_reference_from_url, extract_ft_number, extract_qr_from_image, extract_text_from_image, extract_with_gemini
from typing import List, Optional
from app.config import settings

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "bmp", "webp"}
ALLOWED_MIME_PREFIXES = {"image/"}

router = APIRouter(prefix="/api/verifications", tags=["Verifications"])


@router.post("/verify-link", response_model=VerifyCaptureResponse)
async def verify_by_link(
    bank_name: str = Form(...),
    reference: str = Form(...),
    account_number: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await verify_receipt(bank_name, reference, account_number)
    if not result["success"]:
        bank_accounts = await db.execute(
            select(BankAccount).where(
                BankAccount.business_id == current_user.business_id,
                BankAccount.is_active == True,
            )
        )
        verification = Verification(
            business_id=current_user.business_id,
            bank_name=bank_name,
            transaction_reference=reference,
            status=VerificationStatus.FAILED,
            error_message=result.get("error"),
            verification_data=result,
        )
        db.add(verification)
        await db.flush()
        await db.refresh(verification)
        return _build_response(verification, False, False)

    data = result["data"]
    bank_accounts = await db.execute(
        select(BankAccount).where(
            BankAccount.business_id == current_user.business_id,
            BankAccount.is_active == True,
        )
    )
    accounts = bank_accounts.scalars().all()

    matches = any(
        acct.account_number == data.get("receiver_account") or
        acct.account_holder_name.lower() in data.get("receiver_name", "").lower()
        for acct in accounts
    )

    is_verified = data.get("status") == "SUCCESS" and matches
    status_enum = VerificationStatus.VERIFIED if is_verified else VerificationStatus.SCAM

    verification = Verification(
        business_id=current_user.business_id,
        bank_name=bank_name,
        bank_account_id=next(
            (acct.id for acct in accounts if acct.account_number == data.get("receiver_account")),
            None,
        ),
        transaction_reference=data.get("reference", reference),
        payer_name=data.get("payer_name"),
        payer_account=data.get("payer_account"),
        receiver_name=data.get("receiver_name"),
        receiver_account=data.get("receiver_account"),
        amount=data.get("amount"),
        currency=data.get("currency", "ETB"),
        status=status_enum,
        verification_data=data,
        receipt_url=result.get("receipt_url"),
        verified_at=datetime.now(timezone.utc),
    )
    db.add(verification)
    await db.flush()
    await db.refresh(verification)
    return _build_response(verification, is_verified, matches)


@router.post("/capture", response_model=VerifyCaptureResponse)
async def verify_by_capture(
    file: UploadFile = File(...),
    bank_name: Optional[str] = Form(None),
    reference: Optional[str] = Form(None),
    current_user = Depends(get_current_any),
    db: AsyncSession = Depends(get_db),
):
    from app.models.user import User
    is_staff = not isinstance(current_user, User)
    staff_id = None if not is_staff else current_user.id
    business_id = current_user.business_id

    ext = os.path.splitext(file.filename or "capture.png")[1].lower().lstrip(".") or "png"
    if ext not in ALLOWED_EXTENSIONS or not file.content_type or not file.content_type.startswith(tuple(ALLOWED_MIME_PREFIXES)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type. Only images are allowed.")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_name = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, file_name)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    bank_accounts = await db.execute(
        select(BankAccount).where(
            BankAccount.business_id == business_id,
            BankAccount.is_active == True,
        )
    )
    accounts = bank_accounts.scalars().all()
    accounts_list = [
        {"bank_name": a.bank_name.value if hasattr(a.bank_name, 'value') else a.bank_name, "account_number": a.account_number}
        for a in accounts
    ]

    gemini_data = await extract_with_gemini(file_path)

    if gemini_data:
        bank = bank_name or gemini_data.get("bank_name")
        ref = reference or gemini_data.get("transaction_reference")
    else:
        bank = bank_name
        ref = reference

    if not bank or not ref:
        qr_data = await extract_qr_from_image(file_path)
        text_data = await extract_text_from_image(file_path)
        combined = f"{qr_data or ''} {text_data or ''}"

    if not bank:
        bank = detect_bank_from_url(combined) or detect_bank_from_text(combined)

    if not bank:
        verification = Verification(
            business_id=business_id,
            staff_id=staff_id,
            status=VerificationStatus.FAILED,
            screenshot_path=file_path,
            error_message="Could not detect bank from image",
        )
        db.add(verification)
        await db.flush()
        await db.refresh(verification)
        return _build_response(verification, False, False)

    if not ref:
        if qr_data:
            ref = extract_reference_from_url(qr_data, bank)
        if not ref:
            ref = extract_ft_number(combined)

    if not ref:
        verification = Verification(
            business_id=business_id,
            staff_id=staff_id,
            bank_name=bank,
            status=VerificationStatus.FAILED,
            screenshot_path=file_path,
            error_message="Could not extract transaction reference from image",
        )
        db.add(verification)
        await db.flush()
        await db.refresh(verification)
        return _build_response(verification, False, False)

    acct_number = None
    for acct in accounts_list:
        if acct["bank_name"] == bank:
            acct_number = acct["account_number"]
            break

    result = await verify_receipt(bank, ref, acct_number)

    if not result["success"]:
        verification = Verification(
            business_id=business_id,
            staff_id=staff_id,
            bank_name=bank,
            transaction_reference=ref,
            status=VerificationStatus.FAILED,
            screenshot_path=file_path,
            error_message=result.get("error"),
            verification_data=result,
        )
        db.add(verification)
        await db.flush()
        await db.refresh(verification)
        return _build_response(verification, False, False)

    data = result["data"]
    matches = any(
        acct.account_number == data.get("receiver_account") or
        acct.account_holder_name.lower() in data.get("receiver_name", "").lower()
        for acct in accounts
    )

    is_verified = data.get("status") == "SUCCESS" and matches
    status_enum = VerificationStatus.VERIFIED if is_verified else VerificationStatus.SCAM

    verification = Verification(
        business_id=business_id,
        staff_id=staff_id,
        bank_name=bank,
        bank_account_id=next(
            (acct.id for acct in accounts if acct.account_number == data.get("receiver_account")),
            None,
        ),
        transaction_reference=data.get("reference", reference),
        payer_name=data.get("payer_name"),
        payer_account=data.get("payer_account"),
        receiver_name=data.get("receiver_name"),
        receiver_account=data.get("receiver_account"),
        amount=data.get("amount"),
        currency=data.get("currency", "ETB"),
        status=status_enum,
        screenshot_path=file_path,
        verification_data=data,
        verified_at=datetime.now(timezone.utc),
    )
    db.add(verification)
    await db.flush()
    await db.refresh(verification)
    return _build_response(verification, is_verified, matches)


@router.get("", response_model=List[VerificationResponse])
async def list_verifications(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Verification)
        .where(Verification.business_id == current_user.business_id)
        .order_by(Verification.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/staff", response_model=List[VerificationResponse])
async def list_staff_verifications(
    limit: int = 20,
    offset: int = 0,
    current_staff: StaffUser = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Verification)
        .where(
            Verification.business_id == current_staff.business_id,
            Verification.staff_id == current_staff.id,
        )
        .order_by(Verification.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/staff/today", response_model=dict)
async def staff_today_stats(
    current_staff: StaffUser = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db),
):
    today_start = datetime.combine(datetime.now(timezone.utc).date(), datetime.min.time(), tzinfo=timezone.utc)
    today_end = datetime.combine(datetime.now(timezone.utc).date(), datetime.max.time(), tzinfo=timezone.utc)

    from sqlalchemy import func
    total = await db.scalar(
        select(func.count(Verification.id)).where(
            Verification.staff_id == current_staff.id,
            Verification.created_at >= today_start,
            Verification.created_at <= today_end,
        )
    )
    verified = await db.scalar(
        select(func.count(Verification.id)).where(
            Verification.staff_id == current_staff.id,
            Verification.status == VerificationStatus.VERIFIED,
            Verification.created_at >= today_start,
            Verification.created_at <= today_end,
        )
    )
    scam = await db.scalar(
        select(func.count(Verification.id)).where(
            Verification.staff_id == current_staff.id,
            Verification.status == VerificationStatus.SCAM,
            Verification.created_at >= today_start,
            Verification.created_at <= today_end,
        )
    )

    return {
        "total": total or 0,
        "verified": verified or 0,
        "scam": scam or 0,
    }


@router.get("/{verification_id}", response_model=VerificationResponse)
async def get_verification(
    verification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Verification).where(
            Verification.id == verification_id,
            Verification.business_id == current_user.business_id,
        )
    )
    verification = result.scalar_one_or_none()
    if not verification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification not found")
    return verification


def _build_response(verification: Verification, is_verified: bool, matches: bool) -> dict:
    return {
        "verification": {
            "id": str(verification.id),
            "business_id": str(verification.business_id),
            "staff_id": str(verification.staff_id) if verification.staff_id else None,
            "bank_account_id": str(verification.bank_account_id) if verification.bank_account_id else None,
            "bank_name": verification.bank_name,
            "transaction_reference": verification.transaction_reference,
            "payer_name": verification.payer_name,
            "payer_account": verification.payer_account,
            "receiver_name": verification.receiver_name,
            "receiver_account": verification.receiver_account,
            "amount": verification.amount,
            "currency": verification.currency,
            "status": verification.status.value,
            "receipt_url": verification.receipt_url,
            "verification_data": verification.verification_data,
            "confidence_score": verification.confidence_score,
            "error_message": verification.error_message,
            "verified_at": verification.verified_at.isoformat() if verification.verified_at else None,
            "created_at": verification.created_at.isoformat(),
        },
        "is_verified": is_verified,
        "matches_business_account": matches,
    }
