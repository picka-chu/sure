import os
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.middleware.auth import get_current_user, get_current_staff, get_current_any
from app.middleware.subscription import require_active_subscription
from app.models.user import User
from app.models.staff import StaffUser
from app.models.business import Business
from app.models.bank import BankAccount, BankName
from app.models.verification import Verification, VerificationStatus
from app.schemas.verification import VerificationResponse, VerifyCaptureResponse
from app.services.verification_service import verify_receipt, detect_bank_from_url, detect_bank_from_text, extract_ft_number, extract_qr_from_image, extract_text_from_image, fetch_receipt_from_url, extract_with_gemini
from typing import List, Optional
from app.config import settings

logger = logging.getLogger("surepay.verify")
from app.limiter import limiter

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "bmp", "webp"}
ALLOWED_MIME_PREFIXES = {"image/"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

router = APIRouter(prefix="/api/verifications", tags=["Verifications"])


@router.post("/verify-link", response_model=VerifyCaptureResponse)
@limiter.limit("30/minute")
async def verify_by_link(
    request: Request,
    bank_name: str = Form(...),
    reference: str = Form(...),
    account_number: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_active_subscription),
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
        return _build_response(verification, False, False, reason=f"Bank API error: {result.get('error', 'unknown')}")

    data = result["data"]
    bank_accounts = await db.execute(
        select(BankAccount).where(
            BankAccount.business_id == current_user.business_id,
            BankAccount.is_active == True,
        )
    )
    accounts = bank_accounts.scalars().all()

    def _name_matches(acct, receiver_name):
        name = acct.account_holder_name.lower().strip()
        rname = (receiver_name or "").lower().strip()
        if not name or not rname or len(name) < 3:
            return False
        return name == rname or rname.startswith(name) or rname.endswith(name) or f" {name} " in f" {rname} "

    matches = any(
        acct.account_number == data.get("receiver_account") or
        _name_matches(acct, data.get("receiver_name"))
        for acct in accounts
    )

    is_verified = data.get("status") == "SUCCESS" and matches
    status_enum = VerificationStatus.VERIFIED if is_verified else VerificationStatus.SCAM

    ref_reason = None
    expected_acct = next((acct.account_number for acct in accounts if acct.bank_name.value == bank_name), None)
    if is_verified:
        ref_reason = f"Transaction confirmed by {data.get('bank_name', bank_name)}. Receiver account matches your registered business account."
    elif data.get("status") != "SUCCESS":
        ref_reason = f"Bank returned non-success status: {data.get('status', 'unknown')}. This transaction could not be confirmed."
    else:
        ref_reason = f"Bank confirmed the transaction but the receiver does not match your business. Expected: {expected_acct or 'N/A'}, got: {data.get('receiver_name', 'unknown')} ({data.get('receiver_account', 'unknown')})."

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
    return _build_response(verification, is_verified, matches, reason=ref_reason)


@router.post("/capture", response_model=VerifyCaptureResponse)
@limiter.limit("20/minute")
async def verify_by_capture(
    request: Request,
    file: UploadFile = File(...),
    bank_name: Optional[str] = Form(None),
    reference: Optional[str] = Form(None),
    current_user = Depends(get_current_any),
    _: None = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_db),
):
    from app.models.user import User
    is_staff = not isinstance(current_user, User)
    staff_id = None if not is_staff else current_user.id
    business_id = current_user.business_id

    ext = os.path.splitext(file.filename or "capture.png")[1].lower().lstrip(".") or "png"
    if ext not in ALLOWED_EXTENSIONS or not file.content_type or not file.content_type.startswith(tuple(ALLOWED_MIME_PREFIXES)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type. Only images are allowed.")
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB.")

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

    bank = bank_name
    ref = reference
    logger.info(f"[capture] Starting verification — business={business_id}, staff={staff_id}, manual_bank={bank_name}, manual_ref={reference}")

    qr_data = await extract_qr_from_image(file_path)
    text_data = await extract_text_from_image(file_path)
    combined = f"{qr_data or ''} {text_data or ''}"
    logger.info(f"[capture] QR from image: {qr_data or 'none'}")
    logger.info(f"[capture] OCR text: {text_data[:200] if text_data else 'none'}")

    if qr_data and qr_data.startswith("http"):
        logger.info(f"[capture] QR is a URL — fetching receipt page")
        receipt_data = await fetch_receipt_from_url(qr_data)
        if receipt_data:
            logger.info(f"[capture] Receipt fetched from URL successfully — bank={receipt_data.get('bank_name')}, ref={receipt_data.get('reference') or receipt_data.get('transaction_reference')}")
            return await _handle_receipt_data(receipt_data, qr_data, accounts, accounts_list, business_id, staff_id, file_path, bank, ref, db)
        logger.warning(f"[capture] Failed to fetch receipt from QR URL — falling through")

    if qr_data and not qr_data.startswith("http"):
        ref_val = extract_ft_number(qr_data)
        if ref_val:
            ref = ref or ref_val
            logger.info(f"[capture] Extracted FT number from QR: {ref}")
        else:
            logger.info(f"[capture] QR data (non-URL) but no FT number found: {qr_data[:100]}")
    else:
        ref_val = extract_ft_number(combined)
        if ref_val:
            ref = ref or ref_val
            logger.info(f"[capture] Extracted FT number from OCR text: {ref}")
        else:
            logger.info(f"[capture] No FT number found in OCR text")

    detected_bank = detect_bank_from_url(combined) or detect_bank_from_text(combined)
    if detected_bank:
        bank = bank or detected_bank
        logger.info(f"[capture] Bank detected from image: {bank}")
    else:
        logger.info(f"[capture] Bank not detectable from image")

    if not bank or not ref:
        logger.info(f"[capture] Missing bank or ref — trying Gemini fallback on image")
        gemini_data = await extract_with_gemini(file_path)
        if gemini_data:
            logger.info(f"[capture] Gemini extracted — bank={gemini_data.get('bank_name')}, ref={gemini_data.get('transaction_reference')}, receiver={gemini_data.get('receiver_name')}")
            return await _handle_gemini_fallback(gemini_data, accounts, business_id, staff_id, file_path, db)
        logger.warning(f"[capture] Gemini extraction also failed — no fallback data")

    if not ref:
        logger.warning(f"[capture] No reference extracted — returning error to user")
        verification = _create_failed_verification(business_id, staff_id, file_path, "Could not extract transaction reference from image", bank=bank)
        db.add(verification)
        await db.flush()
        await db.refresh(verification)
        return _build_response(verification, False, False, reason="Could not read the transaction reference from the image. Enter the FT/reference number manually before capturing.")

    if not bank:
        logger.warning(f"[capture] No bank detected — returning error to user")
        verification = _create_failed_verification(business_id, staff_id, file_path, "Could not detect bank from image")
        db.add(verification)
        await db.flush()
        await db.refresh(verification)
        return _build_response(verification, False, False, reason="Could not identify the bank from the image. Select the bank manually before capturing or try a clearer photo.")

    acct_number = None
    for acct in accounts_list:
        if acct["bank_name"] == bank:
            acct_number = acct["account_number"]
            break

    existing = await db.execute(select(Verification).where(Verification.transaction_reference == ref, Verification.business_id == business_id))
    if existing.scalar_one_or_none():
        logger.warning(f"[capture] Duplicate verification for ref={ref} — allowing re-verification")

    logger.info(f"[capture] Calling verify_receipt — bank={bank}, ref={ref}, account_last8={acct_number[-8:] if acct_number else 'none'}")
    result = await verify_receipt(bank, ref, acct_number)
    logger.info(f"[capture] verify_receipt result — success={result['success']}, error={result.get('error', 'none')}")

    if not result["success"]:
        logger.info(f"[capture] Library extraction failed — trying Gemini fallback on image")
        gemini_data = await extract_with_gemini(file_path)
        if gemini_data:
            logger.info(f"[capture] Gemini extracted — bank={gemini_data.get('bank_name')}, ref={gemini_data.get('transaction_reference')}, receiver={gemini_data.get('receiver_name')}")
            return await _handle_gemini_fallback(gemini_data, accounts, business_id, staff_id, file_path, db)
        logger.warning(f"[capture] All extraction methods failed — returning error")
        verification = _create_failed_verification(business_id, staff_id, file_path, result.get("error", "Bank verification failed"), bank=bank, ref=ref, data=result)
        db.add(verification)
        await db.flush()
        await db.refresh(verification)
        return _build_response(verification, False, False, reason=f"Bank verification failed: {result.get('error', 'unknown')}")

    data = result["data"]
    logger.info(f"[capture] Verification data — payer={data.get('payer_name')}, receiver={data.get('receiver_name')}({data.get('receiver_account')}), amount={data.get('amount')}, status={data.get('status')}")
    return await _process_result(data, bank, accounts, business_id, staff_id, file_path, ref, db)


async def _handle_receipt_data(data: dict, receipt_url: str, accounts: list, accounts_list: list, business_id, staff_id, file_path, bank_name, ref, db):
    bank = bank_name or data.get("bank_name") or detect_bank_from_url(receipt_url) or detect_bank_from_text(json.dumps(data))
    txn_ref = ref or data.get("reference") or data.get("transaction_reference")
    logger.info(f"[handle_receipt] bank={bank}, ref={txn_ref}, matching {len(accounts)} business accounts")
    def _nm(acct, rname):
        n = acct.account_holder_name.lower().strip(); r = (rname or "").lower().strip()
        return n and r and len(n) >= 3 and (n == r or r.startswith(n) or r.endswith(n) or f" {n} " in f" {r} ")
    matches = any(acct.account_number == data.get("receiver_account") or _nm(acct, data.get("receiver_name")) for acct in accounts)
    status = data.get("status")
    is_verified = matches if status is None else (status == "SUCCESS" and matches)
    status_enum = VerificationStatus.VERIFIED if is_verified else VerificationStatus.SCAM
    expected = next((a.account_number for a in accounts if a.bank_name.value == (bank or "unknown")), None) if accounts else None
    if is_verified:
        reason = f"Transaction confirmed by {data.get('bank_name', bank or 'bank')}. Receiver account matches your registered business account."
    elif status is not None and status != "SUCCESS":
        reason = f"Bank returned non-success status: {status}. This transaction could not be confirmed."
    else:
        reason = f"Bank confirmed the transaction but the receiver does not match your business. Expected: {expected or 'N/A'}, got: {data.get('receiver_name', 'unknown')} ({data.get('receiver_account', 'unknown')})."
    verification = Verification(
        business_id=business_id,
        staff_id=staff_id,
        bank_name=bank or "unknown",
        bank_account_id=next((a.id for a in accounts if a.account_number == data.get("receiver_account")), None),
        transaction_reference=txn_ref or receipt_url,
        payer_name=data.get("payer_name"),
        payer_account=data.get("payer_account"),
        receiver_name=data.get("receiver_name"),
        receiver_account=data.get("receiver_account"),
        amount=data.get("amount"),
        currency=data.get("currency", "ETB"),
        status=status_enum,
        screenshot_path=file_path,
        receipt_url=receipt_url,
        verification_data=data,
        verified_at=datetime.now(timezone.utc),
    )
    logger.info(f"[handle_receipt] Result — is_verified={is_verified}, matches_business={matches}, reason={reason[:80]}")
    db.add(verification)
    await db.flush()
    await db.refresh(verification)
    return _build_response(verification, is_verified, matches, reason=reason)


def _create_failed_verification(business_id, staff_id, file_path, error, bank=None, ref=None, data=None):
    return Verification(
        business_id=business_id,
        staff_id=staff_id,
        bank_name=bank,
        transaction_reference=ref,
        status=VerificationStatus.FAILED,
        screenshot_path=file_path,
        error_message=error,
        verification_data=data,
    )


async def _process_result(data: dict, bank: str, accounts: list, business_id, staff_id, file_path, ref, db):
    def _nm(acct, rname):
        n = acct.account_holder_name.lower().strip(); r = (rname or "").lower().strip()
        return n and r and len(n) >= 3 and (n == r or r.startswith(n) or r.endswith(n) or f" {n} " in f" {r} ")
    matches = any(acct.account_number == data.get("receiver_account") or _nm(acct, data.get("receiver_name")) for acct in accounts)
    is_verified = data.get("status") == "SUCCESS" and matches
    status_enum = VerificationStatus.VERIFIED if is_verified else VerificationStatus.SCAM
    expected = next((a.account_number for a in accounts if a.bank_name.value == bank), None)
    logger.info(f"[process_result] bank={bank}, receiver={data.get('receiver_name')}({data.get('receiver_account')}), matches_business={matches}, is_verified={is_verified}")
    if is_verified:
        reason = f"Transaction confirmed by {data.get('bank_name', bank)}. Receiver account matches your registered business account."
    elif data.get("status") != "SUCCESS":
        reason = f"Bank returned non-success status: {data.get('status', 'unknown')}. This transaction could not be confirmed."
    else:
        reason = f"Bank confirmed the transaction but the receiver does not match your business. Expected receiver account: {expected or 'N/A'}, but the payment was sent to {data.get('receiver_name', 'unknown')} ({data.get('receiver_account', 'unknown')})."
    verification = Verification(
        business_id=business_id,
        staff_id=staff_id,
        bank_name=bank,
        bank_account_id=next((a.id for a in accounts if a.account_number == data.get("receiver_account")), None),
        transaction_reference=data.get("reference", ref),
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
    return _build_response(verification, is_verified, matches, reason=reason)


async def _handle_gemini_fallback(data: dict, accounts: list, business_id, staff_id, file_path, db):
    bank = data.get("bank_name")
    ref = data.get("transaction_reference")
    logger.info(f"[gemini_fallback] Processing Gemini data — bank={bank}, ref={ref}, receiver={data.get('receiver_name')}({data.get('receiver_account')}), amount={data.get('amount')}")
    def _nm(acct, rname):
        n = acct.account_holder_name.lower().strip(); r = (rname or "").lower().strip()
        return n and r and len(n) >= 3 and (n == r or r.startswith(n) or r.endswith(n) or f" {n} " in f" {r} ")
    matches = any(acct.account_number == data.get("receiver_account") or _nm(acct, data.get("receiver_name")) for acct in accounts)
    status = data.get("status")
    is_verified = matches if status is None else (status == "SUCCESS" and matches)
    status_enum = VerificationStatus.VERIFIED if is_verified else VerificationStatus.SCAM
    expected = next((a.account_number for a in accounts if a.bank_name.value.lower() in (bank or "").lower()), None) if accounts else None
    if is_verified:
        reason = f"AI-extracted from image — not confirmed by bank. Receiver matches your business account. Verify manually if needed."
    elif status is not None and status != "SUCCESS":
        reason = f"Receipt shows non-success status: {status}."
    else:
        actual_receiver = data.get("receiver_name", "unknown")
        actual_account = data.get("receiver_account", "unknown")
        reason = f"AI-extracted receipt data — receiver does not match your business. Expected: {expected or 'N/A'}, got: {actual_receiver} ({actual_account})."
    verification = Verification(
        business_id=business_id,
        staff_id=staff_id,
        bank_name=bank or "unknown",
        bank_account_id=next((a.id for a in accounts if a.account_number == data.get("receiver_account")), None),
        transaction_reference=ref,
        payer_name=data.get("payer_name"),
        payer_account=data.get("payer_account"),
        receiver_name=data.get("receiver_name"),
        receiver_account=data.get("receiver_account"),
        amount=data.get("amount"),
        currency=data.get("currency", "ETB"),
        status=status_enum,
        screenshot_path=file_path,
        verification_data={"source": "gemini_fallback", **data},
        verified_at=datetime.now(timezone.utc),
    )
    logger.info(f"[gemini_fallback] Result — is_verified={is_verified}, matches_business={matches}, reason={reason[:80]}")
    db.add(verification)
    await db.flush()
    await db.refresh(verification)
    return _build_response(verification, is_verified, matches, reason=reason)


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


def _build_response(verification: Verification, is_verified: bool, matches: bool, reason: Optional[str] = None) -> dict:
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
        "reason": reason,
    }
