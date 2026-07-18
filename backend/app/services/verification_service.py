import httpx
import re
import json
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse, parse_qs

BANK_CONFIGS = {
    "cbe": {
        "name": "Commercial Bank of Ethiopia",
        "receipt_pattern": r"https://apps\.cbe\.com\.et:100/\?id=(FT[a-zA-Z0-9]+)",
        "ft_pattern": r"FT[a-zA-Z0-9]+",
        "verify_url": "https://apps.cbe.com.et:100/",
    },
    "dashen": {
        "name": "Dashen Bank",
        "receipt_pattern": r"https://receipt\.dashensuperapp\.com/receipt/([a-zA-Z0-9]+)",
        "verify_url": "https://receipt.dashensuperapp.com/receipt/",
    },
    "awash": {
        "name": "Awash Bank",
        "receipt_pattern": r"https://awashpay\.awashbank\.com:8225/([a-zA-Z0-9\-]+)",
        "verify_url": "https://awashpay.awashbank.com:8225/",
    },
    "boa": {
        "name": "Bank of Abyssinia",
        "receipt_pattern": r"https://cs\.bankofabyssinia\.com/slip/\?trx=([a-zA-Z0-9]+)",
        "verify_url": "https://cs.bankofabyssinia.com/slip/",
    },
    "zemen": {
        "name": "Zemen Bank",
        "receipt_pattern": r"https://share\.zemenbank\.com/rt/([a-zA-Z0-9]+)/pdf",
        "verify_url": "https://share.zemenbank.com/rt/",
    },
    "telebirr": {
        "name": "Telebirr (Ethio telecom)",
        "receipt_pattern": r"https://transactioninfo\.ethiotelecom\.et/receipt/([a-zA-Z0-9]+)",
        "verify_url": "https://transactioninfo.ethiotelecom.et/receipt/",
    },
}

BANK_SHORT_NAMES = {
    "cbe": "cbe", "commercial bank of ethiopia": "cbe",
    "dashen": "dashen", "dashen bank": "dashen",
    "awash": "awash", "awash bank": "awash",
    "boa": "boa", "bank of abyssinia": "boa",
    "zemen": "zemen", "zemen bank": "zemen",
    "telebirr": "telebirr", "ethio telecom": "telebirr",
}


def detect_bank_from_url(url: str) -> Optional[str]:
    for key, config in BANK_CONFIGS.items():
        if re.search(config["receipt_pattern"], url):
            return key
    return None


def detect_bank_from_text(text: str) -> Optional[str]:
    text_lower = text.lower()
    for name, short in BANK_SHORT_NAMES.items():
        if name in text_lower:
            return short
    return None


def extract_reference_from_url(url: str, bank: str) -> Optional[str]:
    config = BANK_CONFIGS.get(bank)
    if not config:
        return None
    match = re.search(config.get("receipt_pattern", ""), url)
    if match:
        return match.group(1)
    if bank == "cbe":
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        ref = params.get("id", [None])[0]
        if ref:
            return ref
    return None


def extract_ft_number(text: str) -> Optional[str]:
    match = re.search(r"FT[a-zA-Z0-9]+", text)
    return match.group(0) if match else None


async def verify_receipt(bank: str, reference: str, account_number: Optional[str] = None) -> dict:
    try:
        from ethiobank_receipts import extract_receipt
        if bank == "cbe" and account_number:
            from ethiobank_receipts.extractors.cbe import extract_cbe_receipt_info_from_ft
            if reference.startswith("FT") or reference.startswith("ft"):
                data = extract_cbe_receipt_info_from_ft(reference, account_number[-8:])
            else:
                data = extract_receipt(bank, reference)
        else:
            data = extract_receipt(bank, reference)
        return {"success": True, "data": data}
    except ImportError:
        return await _verify_receipt_direct(bank, reference, account_number)
    except Exception as e:
        return {"success": False, "error": str(e)}


async def _verify_receipt_direct(bank: str, reference: str, account_number: Optional[str] = None) -> dict:
    config = BANK_CONFIGS.get(bank)
    if not config:
        return {"success": False, "error": f"Unsupported bank: {bank}"}

    verify_url = config["verify_url"]
    url = verify_url + reference

    try:
        async with httpx.AsyncClient(timeout=30.0, verify=True) as client:
            if bank == "cbe":
                params = {"id": reference}
                if account_number:
                    params["account"] = account_number[-8:]
                resp = await client.get(verify_url, params=params)
            else:
                resp = await client.get(url)

            if resp.status_code == 200:
                text = resp.text
                data = _parse_receipt_html(bank, text, reference)
                data["raw_html"] = text[:500]
                return {"success": True, "data": data}
            else:
                return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
    except httpx.TimeoutException:
        return {"success": False, "error": "Request timed out. The bank server may be slow or unreachable."}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _parse_receipt_html(bank: str, html: str, reference: str) -> dict:
    data = {
        "reference": reference,
        "bank": bank,
        "status": "SUCCESS",
    }
    patterns = {
        "payer_name": r"(?:Payer|From|Sender|Customer)\s*:?\s*([A-Za-z\s]+)",
        "payer_account": r"(?:Payer Account|From Account|Sender Account)\s*:?\s*(\d+)",
        "receiver_name": r"(?:Receiver|To|Beneficiary|Payee)\s*:?\s*([A-Za-z\s]+)",
        "receiver_account": r"(?:Receiver Account|To Account|Beneficiary Account)\s*:?\s*(\d+)",
        "amount": r"(?:Amount|Total|Amt)\s*:?\s*([\d,]+\.?\d*)",
        "date": r"(?:Date|Transaction Date|Time)\s*:?\s*([\d/:\-\s]+)",
    }
    for key, pattern in patterns.items():
        match = re.search(pattern, html, re.IGNORECASE)
        if match:
            val = match.group(1).strip()
            if key == "amount":
                val = float(val.replace(",", ""))
            data[key] = val
    if "amount" in data and "currency" not in data:
        data["currency"] = "ETB"
    return data


async def verify_from_image(
    image_path: str,
    business_accounts: list,
) -> dict:
    qr_data = await extract_qr_from_image(image_path)
    text_data = await extract_text_from_image(image_path)

    combined_text = f"{qr_data or ''} {text_data or ''}"

    bank = detect_bank_from_url(combined_text) or detect_bank_from_text(combined_text)
    if not bank:
        return {"success": False, "error": "Could not detect bank from image"}

    reference = None
    if qr_data:
        reference = extract_reference_from_url(qr_data, bank)
    if not reference:
        reference = extract_ft_number(combined_text)

    if not reference:
        return {"success": False, "error": "Could not extract transaction reference from image"}

    account_number = None
    for acct in business_accounts:
        if acct["bank_name"] == bank:
            account_number = acct["account_number"]
            break

    result = await verify_receipt(bank, reference, account_number)
    return result


async def extract_qr_from_image(image_path: str) -> Optional[str]:
    try:
        from PIL import Image
        import numpy as np
        try:
            from pyzbar.pyzbar import decode
        except ImportError:
            return None
        img = Image.open(image_path)
        decoded_objects = decode(img)
        for obj in decoded_objects:
            data = obj.data.decode("utf-8")
            if data and ("http" in data or "FT" in data):
                return data
        return None
    except Exception:
        return None


async def extract_text_from_image(image_path: str) -> Optional[str]:
    try:
        import pytesseract
        from PIL import Image
        text = pytesseract.image_to_string(Image.open(image_path))
        return text.strip() if text.strip() else None
    except ImportError:
        return None
    except Exception:
        return None
