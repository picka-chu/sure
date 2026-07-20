import httpx
import re
import json
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse, parse_qs
import base64
import mimetypes
from app.config import settings

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


GEMINI_MODEL = "gemini-3.5-flash"

RECEIPT_PROMPT = """You are a receipt analyst for Ethiopian banks. Extract the following details as JSON from this receipt. Return ONLY valid JSON, no markdown, no explanation.

Fields:
- bank_name: one of "cbe", "dashen", "awash", "boa", "zemen", "telebirr"
- transaction_reference: the FT number or transaction ID (e.g. FT25211G11JQ)
- amount: numeric value (number, not string)
- currency: "ETB" by default
- payer_name: the sender's name
- payer_account: the sender's account number
- receiver_name: the recipient's name
- receiver_account: the recipient's account number
- date: transaction date

Example:
{"bank_name": "cbe", "transaction_reference": "FT25211G11JQ", "amount": 1250.75, "currency": "ETB", "payer_name": "John Doe", "payer_account": "1000223344", "receiver_name": "Sunshine Cafe PLC", "receiver_account": "1000135792", "date": "2024-01-15"}"""


async def _gemini_call(contents: list) -> Optional[dict]:
    if not settings.GEMINI_API_KEY:
        return None
    from google import genai
    from google.genai import errors
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    for attempt in range(5):
        try:
            response = client.models.generate_content(model=GEMINI_MODEL, contents=contents)
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[-1]
                text = text.rsplit("```", 1)[0]
            import json
            data = json.loads(text.strip())
            return data if isinstance(data, dict) else None
        except errors.ClientError as e:
            if e.code == 429:
                import asyncio
                await asyncio.sleep(2 ** attempt)
                continue
            return None
        except Exception:
            return None
    return None


async def fetch_receipt_page(url: str) -> Optional[str]:
    try:
        async with httpx.AsyncClient(verify=False, timeout=15) as client:
            resp = await client.get(url, follow_redirects=True)
            if resp.status_code == 200:
                ct = resp.headers.get("content-type", "")
                if "pdf" in ct:
                    return f"[PDF receipt from {url}]"
                return resp.text
    except Exception:
        return None
    return None


async def extract_with_gemini(image_path: str) -> Optional[dict]:
    mime_type, _ = mimetypes.guess_type(image_path)
    if not mime_type or not mime_type.startswith("image/"):
        mime_type = "image/png"
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    qr_data = await extract_qr_from_image(image_path)
    receipt_html = None
    if qr_data and qr_data.startswith("http"):
        receipt_html = await fetch_receipt_page(qr_data)

    if receipt_html:
        return await _gemini_call([RECEIPT_PROMPT + "\n\nReceipt page content:\n" + receipt_html[:10000]])

    return await _gemini_call([
        RECEIPT_PROMPT,
        {"inline_data": {"mime_type": mime_type, "data": image_bytes}},
    ])
