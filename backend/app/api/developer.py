import os
import uuid
import logging
import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.middleware.api_key import get_api_client
from app.models.api_key import ApiKey, generate_api_key, hash_api_key
from app.models.business import Business
from app.models.bank import BankAccount, BankName
from app.models.verification import Verification, VerificationStatus
from app.schemas.developer import (
    ApiKeyCreateRequest, ApiKeyCreateResponse, ApiKeyListResponse,
    DeveloperVerifyResponse, DeveloperVerificationResponse, DeveloperVerificationListResponse,
    ErrorResponse,
)
from app.services.verification_service import verify_receipt, detect_bank_from_url, detect_bank_from_text, extract_reference, extract_qr_from_image, extract_text_from_image, fetch_receipt_from_url, extract_with_gemini
from app.config import settings

logger = logging.getLogger("surepay.developer")

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "bmp", "webp"}
ALLOWED_MIME_PREFIXES = {"image/"}
MAX_FILE_SIZE = 10 * 1024 * 1024

router = APIRouter(prefix="/api/v1", tags=["Developer API"])


# ─── Verification ───

@router.post(
    "/verify",
    response_model=DeveloperVerifyResponse,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
    summary="Verify a bank transfer receipt",
    description="Upload a receipt image to verify a bank transfer. Optionally provide bank_name and reference for better accuracy.",
)
async def developer_verify(
    request: Request,
    file: UploadFile = File(..., description="Receipt image (PNG, JPG, WEBP, etc.)"),
    bank_name: Optional[str] = Form(None, description="Bank name hint: cbe, dashen, awash, boa, zemen, telebirr"),
    reference: Optional[str] = Form(None, description="Transaction reference / FT number"),
    api_client: tuple = Depends(get_api_client),
    db: AsyncSession = Depends(get_db),
):
    api_key, business = api_client
    logger.info(f"[dev:verify] business={business.id}, key={api_key.key_prefix}..., bank={bank_name}, ref={reference}")

    ext = os.path.splitext(file.filename or "receipt.png")[1].lower().lstrip(".") or "png"
    if ext not in ALLOWED_EXTENSIONS or not file.content_type or not file.content_type.startswith(tuple(ALLOWED_MIME_PREFIXES)):
        raise HTTPException(status_code=400, detail="Invalid file type. Only images are allowed.")
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Max {MAX_FILE_SIZE // (1024*1024)}MB.")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_name = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, file_name)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    bank = bank_name
    ref = reference

    qr_data = await extract_qr_from_image(file_path)
    text_data = await extract_text_from_image(file_path)
    combined = f"{qr_data or ''} {text_data or ''}"

    if qr_data and qr_data.startswith("http"):
        receipt_data = await fetch_receipt_from_url(qr_data)
        if receipt_data:
            accounts_result = await db.execute(
                select(BankAccount).where(
                    BankAccount.business_id == business.id,
                    BankAccount.is_active == True,
                )
            )
            accounts = accounts_result.scalars().all()
            result_data = await _handle_receipt_data_dev(receipt_data, qr_data, bank, ref, business, accounts, file_path, db)
            return DeveloperVerifyResponse(verification=_to_dev_response(result_data["verification"], result_data["is_verified"], result_data["reason"]))

    detected_bank = detect_bank_from_url(combined) or detect_bank_from_text(combined)
    if detected_bank:
        bank = bank or detected_bank

    if qr_data and not qr_data.startswith("http"):
        ref_val = extract_reference(qr_data, bank_hint=bank)
        if ref_val:
            ref = ref or ref_val
    else:
        ref_val = extract_reference(combined, bank_hint=bank)
        if ref_val:
            ref = ref or ref_val

    if not bank or not ref:
        logger.info(f"[dev:verify] Missing bank/ref — trying Gemini fallback")
        gemini_data = await extract_with_gemini(file_path)
        if gemini_data:
            accounts_result = await db.execute(
                select(BankAccount).where(
                    BankAccount.business_id == business.id,
                    BankAccount.is_active == True,
                )
            )
            accounts = accounts_result.scalars().all()
            result_data = await _handle_gemini_fallback_dev(gemini_data, business, accounts, file_path, db)
            return DeveloperVerifyResponse(verification=_to_dev_response(result_data["verification"], result_data["is_verified"], result_data["reason"]))

    if not ref:
        verification = Verification(
            business_id=business.id,
            staff_id=None,
            bank_name=bank,
            status=VerificationStatus.FAILED,
            screenshot_path=file_path,
            error_message="Could not extract transaction reference from image",
        )
        db.add(verification)
        await db.flush()
        await db.refresh(verification)
        return DeveloperVerifyResponse(verification=_to_dev_response(verification, False, "Could not read the transaction reference. Provide a `reference` parameter or upload a clearer image."))

    if not bank:
        verification = Verification(
            business_id=business.id,
            staff_id=None,
            bank_name=None,
            status=VerificationStatus.FAILED,
            screenshot_path=file_path,
            error_message="Could not detect bank from image",
        )
        db.add(verification)
        await db.flush()
        await db.refresh(verification)
        return DeveloperVerifyResponse(verification=_to_dev_response(verification, False, "Could not identify the bank. Provide a `bank_name` parameter or try a clearer image."))

    accounts_result = await db.execute(
        select(BankAccount).where(
            BankAccount.business_id == business.id,
            BankAccount.is_active == True,
        )
    )
    accounts = accounts_result.scalars().all()

    acct_number = next(
        (a.account_number for a in accounts if (a.bank_name.value if hasattr(a.bank_name, 'value') else a.bank_name) == bank),
        None,
    )

    existing = await db.execute(
        select(Verification).where(
            Verification.transaction_reference == ref,
            Verification.business_id == business.id,
        )
    )
    if existing.scalar_one_or_none():
        logger.info(f"[dev:verify] Duplicate ref={ref} — continuing")

    result = await verify_receipt(bank, ref, acct_number)

    if not result["success"]:
        gemini_data = await extract_with_gemini(file_path)
        if gemini_data:
            result_data = await _handle_gemini_fallback_dev(gemini_data, business, accounts, file_path, db)
            return DeveloperVerifyResponse(verification=_to_dev_response(result_data["verification"], result_data["is_verified"], result_data["reason"]))
        verification = Verification(
            business_id=business.id,
            staff_id=None,
            bank_name=bank,
            transaction_reference=ref,
            status=VerificationStatus.FAILED,
            screenshot_path=file_path,
            error_message=result.get("error", "Bank verification failed"),
            verification_data=result,
        )
        db.add(verification)
        await db.flush()
        await db.refresh(verification)
        return DeveloperVerifyResponse(verification=_to_dev_response(verification, False, f"Bank verification failed: {result.get('error', 'unknown')}"))

    data = result["data"]
    result_data = await _process_result_dev(data, bank, business, accounts, file_path, ref, db)
    return DeveloperVerifyResponse(verification=_to_dev_response(result_data["verification"], result_data["is_verified"], result_data["reason"]))


@router.post(
    "/verify-link",
    response_model=DeveloperVerifyResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Verify a bank transfer by reference number",
    description="Verify a transfer using bank name and transaction reference without uploading an image.",
)
async def developer_verify_link(
    request: Request,
    bank_name: str = Form(..., description="Bank name: cbe, dashen, awash, boa, zemen, telebirr"),
    reference: str = Form(..., description="Transaction reference / FT number"),
    api_client: tuple = Depends(get_api_client),
    db: AsyncSession = Depends(get_db),
):
    api_key, business = api_client
    logger.info(f"[dev:verify-link] business={business.id}, bank={bank_name}, ref={reference}")

    result = await verify_receipt(bank_name, reference)

    if not result["success"]:
        verification = Verification(
            business_id=business.id,
            staff_id=None,
            bank_name=bank_name,
            transaction_reference=reference,
            status=VerificationStatus.FAILED,
            error_message=result.get("error"),
            verification_data=result,
        )
        db.add(verification)
        await db.flush()
        await db.refresh(verification)
        return DeveloperVerifyResponse(verification=_to_dev_response(verification, False, f"Bank API error: {result.get('error', 'unknown')}"))

    data = result["data"]
    accounts_result = await db.execute(
        select(BankAccount).where(
            BankAccount.business_id == business.id,
            BankAccount.is_active == True,
        )
    )
    accounts = accounts_result.scalars().all()

    def _nm(acct, rname):
        n = acct.account_holder_name.lower().strip()
        r = (rname or "").lower().strip()
        return n and r and len(n) >= 3 and (n == r or r.startswith(n) or r.endswith(n) or f" {n} " in f" {r} ")

    matches = any(
        acct.account_number == data.get("receiver_account") or
        _nm(acct, data.get("receiver_name"))
        for acct in accounts
    )
    is_verified = data.get("status") == "SUCCESS" and matches
    status_enum = VerificationStatus.VERIFIED if is_verified else VerificationStatus.SCAM

    if is_verified:
        reason = f"Transaction confirmed by {data.get('bank_name', bank_name)}. Receiver account matches your registered business account."
    elif data.get("status") != "SUCCESS":
        reason = f"Bank returned non-success status: {data.get('status', 'unknown')}."
    else:
        matched_name = data.get("receiver_name", "unknown")
        matched_acct = data.get("receiver_account", "unknown")
        all_expected = ", ".join(f"{a.bank_name.value}: {a.account_number} ({a.account_holder_name})" for a in accounts) if accounts else "N/A"
        reason = f"Receiver mismatch. Received by: {matched_name} ({matched_acct}). Your accounts: {all_expected}."

    verification = Verification(
        business_id=business.id,
        staff_id=None,
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
        verified_at=datetime.now(timezone.utc),
    )
    db.add(verification)
    await db.flush()
    await db.refresh(verification)
    return DeveloperVerifyResponse(verification=_to_dev_response(verification, is_verified, reason))


# ─── Check verification status ───

@router.get(
    "/verifications/{verification_id}",
    response_model=DeveloperVerifyResponse,
    responses={404: {"model": ErrorResponse}},
    summary="Get a verification result",
    description="Retrieve the result of a previous verification by its ID.",
)
async def developer_get_verification(
    verification_id: uuid.UUID,
    api_client: tuple = Depends(get_api_client),
    db: AsyncSession = Depends(get_db),
):
    api_key, business = api_client
    result = await db.execute(
        select(Verification).where(
            Verification.id == verification_id,
            Verification.business_id == business.id,
        )
    )
    verification = result.scalar_one_or_none()
    if not verification:
        raise HTTPException(status_code=404, detail="Verification not found")
    is_verified = verification.status == VerificationStatus.VERIFIED
    reason = verification.error_message or (
        "Transaction confirmed." if is_verified else "Transaction could not be confirmed."
    )
    return DeveloperVerifyResponse(verification=_to_dev_response(verification, is_verified, reason))


@router.get(
    "/verifications",
    response_model=DeveloperVerificationListResponse,
    summary="List verifications",
    description="List all verifications for your business. Paginated, newest first.",
)
async def developer_list_verifications(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    api_client: tuple = Depends(get_api_client),
    db: AsyncSession = Depends(get_db),
):
    api_key, business = api_client
    total_result = await db.execute(
        select(func.count(Verification.id)).where(Verification.business_id == business.id)
    )
    total = total_result.scalar() or 0
    result = await db.execute(
        select(Verification)
        .where(Verification.business_id == business.id)
        .order_by(Verification.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    verifications = result.scalars().all()
    items = [
        _to_dev_response(v, v.status == VerificationStatus.VERIFIED, None)
        for v in verifications
    ]
    return DeveloperVerificationListResponse(verifications=items, total=total)


# ─── API Key Management ───

@router.post(
    "/keys",
    response_model=ApiKeyCreateResponse,
    summary="Create a new API key",
    description="Generate a new API key for programmatic access. The full key is returned only once — store it securely.",
)
async def developer_create_key(
    body: ApiKeyCreateRequest,
    api_client: tuple = Depends(get_api_client),
    db: AsyncSession = Depends(get_db),
):
    api_key_obj, business = api_client
    raw_key = generate_api_key()
    key_hash = hash_api_key(raw_key)
    key_prefix = raw_key[:10]

    key = ApiKey(
        business_id=business.id,
        name=body.name,
        key_prefix=key_prefix,
        key_hash=key_hash,
    )
    db.add(key)
    await db.flush()
    await db.refresh(key)

    return ApiKeyCreateResponse(
        id=key.id,
        name=key.name,
        key_prefix=key.key_prefix,
        key=raw_key,
        rate_limit=key.rate_limit,
        is_active=key.is_active,
        created_at=key.created_at,
    )


@router.get(
    "/keys",
    response_model=List[ApiKeyListResponse],
    summary="List API keys",
    description="List all API keys for your business. The full key is never returned — only the prefix for identification.",
)
async def developer_list_keys(
    api_client: tuple = Depends(get_api_client),
    db: AsyncSession = Depends(get_db),
):
    api_key_obj, business = api_client
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.business_id == business.id,
        ).order_by(ApiKey.created_at.desc())
    )
    keys = result.scalars().all()
    return [
        ApiKeyListResponse(
            id=k.id,
            name=k.name,
            key_prefix=k.key_prefix,
            rate_limit=k.rate_limit,
            is_active=k.is_active,
            last_used_at=k.last_used_at,
            created_at=k.created_at,
        )
        for k in keys
    ]


@router.delete(
    "/keys/{key_id}",
    status_code=204,
    summary="Revoke an API key",
    description="Deactivate an API key. It will immediately stop working.",
)
async def developer_revoke_key(
    key_id: uuid.UUID,
    api_client: tuple = Depends(get_api_client),
    db: AsyncSession = Depends(get_db),
):
    api_key_obj, business = api_client
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.business_id == business.id,
        )
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    key.is_active = False
    await db.flush()


# ─── Internal helpers ───

async def _handle_receipt_data_dev(data: dict, receipt_url: str, bank_name: Optional[str], ref: Optional[str], business: Business, accounts: list, file_path: str, db: AsyncSession) -> dict:
    bank = bank_name or data.get("bank_name") or detect_bank_from_url(receipt_url) or detect_bank_from_text(json.dumps(data))
    txn_ref = ref or data.get("reference") or data.get("transaction_reference")

    def _nm(acct, rname):
        n = acct.account_holder_name.lower().strip()
        r = (rname or "").lower().strip()
        return n and r and len(n) >= 3 and (n == r or r.startswith(n) or r.endswith(n) or f" {n} " in f" {r} ")

    matches = any(
        acct.account_number == data.get("receiver_account") or
        _nm(acct, data.get("receiver_name"))
        for acct in accounts
    )
    status_val = data.get("status")
    is_verified = matches if status_val is None else (status_val == "SUCCESS" and matches)
    status_enum = VerificationStatus.VERIFIED if is_verified else VerificationStatus.SCAM

    if is_verified:
        reason = f"Transaction confirmed by {data.get('bank_name', bank or 'bank')}. Receiver account matches your registered business account."
    elif status_val is not None and status_val != "SUCCESS":
        reason = f"Bank returned non-success status: {status_val}."
    else:
        matched_name = data.get("receiver_name", "")
        matched_acct = data.get("receiver_account", "")
        all_expected = ", ".join(f"{a.bank_name.value}: {a.account_number} ({a.account_holder_name})" for a in accounts) if accounts else "N/A"
        reason = f"Receiver mismatch. Received by: {matched_name} ({matched_acct}). Your accounts: {all_expected}."

    verification = Verification(
        business_id=business.id,
        staff_id=None,
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
    db.add(verification)
    await db.flush()
    await db.refresh(verification)
    return {"verification": verification, "is_verified": is_verified, "matches": matches, "reason": reason}


async def _process_result_dev(data: dict, bank: str, business: Business, accounts: list, file_path: str, ref: Optional[str], db: AsyncSession) -> dict:
    def _nm(acct, rname):
        n = acct.account_holder_name.lower().strip()
        r = (rname or "").lower().strip()
        return n and r and len(n) >= 3 and (n == r or r.startswith(n) or r.endswith(n) or f" {n} " in f" {r} ")

    matches = any(
        acct.account_number == data.get("receiver_account") or
        _nm(acct, data.get("receiver_name"))
        for acct in accounts
    )
    is_verified = data.get("status") == "SUCCESS" and matches
    status_enum = VerificationStatus.VERIFIED if is_verified else VerificationStatus.SCAM

    if is_verified:
        reason = f"Transaction confirmed by {data.get('bank_name', bank)}. Receiver account matches your registered business account."
    elif data.get("status") != "SUCCESS":
        reason = f"Bank returned non-success status: {data.get('status', 'unknown')}."
    else:
        matched_name = data.get("receiver_name", "unknown")
        matched_acct = data.get("receiver_account", "unknown")
        all_expected = ", ".join(f"{a.bank_name.value}: {a.account_number} ({a.account_holder_name})" for a in accounts) if accounts else "N/A"
        reason = f"Receiver mismatch. Received by: {matched_name} ({matched_acct}). Your accounts: {all_expected}."

    verification = Verification(
        business_id=business.id,
        staff_id=None,
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
    return {"verification": verification, "is_verified": is_verified, "matches": matches, "reason": reason}


async def _handle_gemini_fallback_dev(data: dict, business: Business, accounts: list, file_path: str, db: AsyncSession) -> dict:
    bank = data.get("bank_name")
    ref = data.get("transaction_reference")

    def _nm(acct, rname):
        n = acct.account_holder_name.lower().strip()
        r = (rname or "").lower().strip()
        return n and r and len(n) >= 3 and (n == r or r.startswith(n) or r.endswith(n) or f" {n} " in f" {r} ")

    matches = any(
        acct.account_number == data.get("receiver_account") or
        _nm(acct, data.get("receiver_name"))
        for acct in accounts
    )
    is_verified = matches
    status_enum = VerificationStatus.VERIFIED if is_verified else VerificationStatus.SCAM

    if is_verified:
        reason = f"AI-extracted — not confirmed by bank. Receiver account matches your registered business account."
    else:
        all_expected = ", ".join(f"{a.bank_name.value}: {a.account_number} ({a.account_holder_name})" for a in accounts) if accounts else "N/A"
        reason = f"AI-extracted — not confirmed by bank. Receiver mismatch. Your accounts: {all_expected}."

    verification = Verification(
        business_id=business.id,
        staff_id=None,
        bank_name=bank or "unknown",
        bank_account_id=next((a.id for a in accounts if a.account_number == data.get("receiver_account")), None),
        transaction_reference=ref or "unknown",
        payer_name=data.get("payer_name"),
        payer_account=data.get("payer_account"),
        receiver_name=data.get("receiver_name"),
        receiver_account=data.get("receiver_account"),
        amount=data.get("amount"),
        currency=data.get("currency", "ETB"),
        status=status_enum,
        screenshot_path=file_path,
        verification_data={**data, "extracted_by": "gemini", "note": "AI-extracted — not confirmed by bank"},
        verified_at=datetime.now(timezone.utc),
    )
    db.add(verification)
    await db.flush()
    await db.refresh(verification)
    return {"verification": verification, "is_verified": is_verified, "matches": matches, "reason": reason}


def _to_dev_response(verification: Verification, is_verified: bool, reason: Optional[str] = None) -> DeveloperVerificationResponse:
    if reason is None:
        reason = verification.error_message or (
            "Transaction confirmed." if is_verified else "Transaction could not be confirmed."
        )
    return DeveloperVerificationResponse(
        id=verification.id,
        status=verification.status.value if hasattr(verification.status, 'value') else verification.status,
        bank_name=verification.bank_name,
        transaction_reference=verification.transaction_reference,
        payer_name=verification.payer_name,
        payer_account=verification.payer_account,
        receiver_name=verification.receiver_name,
        receiver_account=verification.receiver_account,
        amount=str(verification.amount) if verification.amount is not None else None,
        currency=verification.currency,
        is_verified=is_verified,
        reason=reason,
        created_at=verification.created_at,
    )
