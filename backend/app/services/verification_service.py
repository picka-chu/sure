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


_receipt_cache: dict = {}
GEMINI_MODEL = "gemini-3.5-flash"
_http_client: Optional[httpx.AsyncClient] = None


def _get_client():
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(verify=False, timeout=10, limits=httpx.Limits(max_keepalive_connections=5))
    return _http_client


def _parse_table_html(html: str) -> dict:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "lxml")
    data = {}
    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            cells = row.find_all(["td", "th"])
            if len(cells) >= 2:
                key = cells[0].get_text(strip=True).lower().replace(" ", "_").replace(":", "")
                val = cells[1].get_text(strip=True)
                data[key] = val
    for p in soup.find_all("p"):
        t = p.get_text(strip=True)
        if ":" in t:
            k, v = t.split(":", 1)
            data[k.strip().lower().replace(" ", "_")] = v.strip()
    return data


def _parse_receipt_html(html: str) -> Optional[dict]:
    raw = _parse_table_html(html)

    def g(*keys):
        for k in keys:
            v = raw.get(k)
            if v:
                return v
        return None

    result = {}

    bank_map = {
        "cbe": ["cbe", "commercial bank of ethiopia", "commercial_bank_of_ethiopia"],
        "dashen": ["dashen", "dashen bank", "dashen_bank"],
        "awash": ["awash", "awash bank", "awash_bank"],
        "boa": ["boa", "bank of abyssinia", "bank_of_abyssinia"],
        "zemen": ["zemen", "zemen bank", "zemen_bank"],
        "telebirr": ["telebirr", "ethio telecom", "ethio_telecom"],
    }
    page_text = html.lower()
    for short, names in bank_map.items():
        if any(n in page_text for n in names):
            result["bank_name"] = short
            break

    ref = g("ft_reference", "ft_ref", "transaction_reference", "reference", "transaction_id", "trx", "id")
    if ref:
        m = re.search(r"(FT[a-zA-Z0-9]+)", ref)
        if m:
            ref = m.group(1)
        result["transaction_reference"] = ref

    amt_str = g("amount", "trx_amt", "transaction_amount", "total", "amount_etb", "amount_etb ")
    if amt_str:
        m = re.search(r"([\d,]+\.?\d*)", amt_str.replace(",", ""))
        if m:
            result["amount"] = float(m.group(1))

    result["currency"] = g("currency") or "ETB"
    payer = g("from_account_name", "sender_name", "payer_name", "from", "sender", "debit_account_name")
    if payer:
        result["payer_name"] = payer
    payer_acct = g("from_account", "sender_account", "payer_account", "debit_account", "from_account_no")
    if payer_acct:
        result["payer_account"] = payer_acct
    receiver = g("to_account_name", "receiver_name", "beneficiary_name", "to", "credit_account_name")
    if receiver:
        result["receiver_name"] = receiver
    receiver_acct = g("to_account", "receiver_account", "beneficiary_account", "credit_account", "to_account_no")
    if receiver_acct:
        result["receiver_account"] = receiver_acct
    date_str = g("date", "transaction_date", "trx_date", "value_date", "posting_date")
    if date_str:
        result["date"] = date_str

    if not result.get("receiver_account") and not result.get("amount"):
        return None
    return result


async def extract_from_url(url: str) -> Optional[dict]:
    if url in _receipt_cache:
        return _receipt_cache[url]
    try:
        client = _get_client()
        resp = await client.get(url, follow_redirects=True)
        if resp.status_code != 200:
            return None
        html = resp.text
        parsed = _parse_receipt_html(html)
        if parsed:
            _receipt_cache[url] = parsed
            return parsed
        return None
    except Exception:
        return None


GEMINI_PROMPT = """Extract these fields as JSON from the receipt content. Return ONLY valid JSON.
- bank_name: "cbe", "dashen", "awash", "boa", "zemen", or "telebirr"
- transaction_reference: the FT number
- amount: number
- currency: "ETB"
- payer_name: sender name
- payer_account: sender account
- receiver_name: recipient name
- receiver_account: recipient account
- date: transaction date

{"bank_name": "cbe", "transaction_reference": "FT25211G11JQ", "amount": 1250.75, "currency": "ETB", "payer_name": "John Doe", "payer_account": "1000223344", "receiver_name": "Sunshine Cafe PLC", "receiver_account": "1000135792", "date": "2024-01-15"}"""


async def _gemini_parse(content: str) -> Optional[dict]:
    if not settings.GEMINI_API_KEY:
        return None
    from google import genai
    from google.genai import errors
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    for attempt in range(5):
        try:
            resp = client.models.generate_content(model=GEMINI_MODEL, contents=[GEMINI_PROMPT + "\n\n" + content[:15000]])
            text = resp.text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[-1]
                text = text.rsplit("```", 1)[0]
            import json
            d = json.loads(text.strip())
            return d if isinstance(d, dict) else None
        except errors.ClientError as e:
            if e.code == 429:
                import asyncio
                await asyncio.sleep(2 ** attempt)
                continue
            return None
        except Exception:
            return None
    return None


async def extract_with_gemini(image_path: str) -> Optional[dict]:
    qr_data = await extract_qr_from_image(image_path)

    if qr_data and qr_data.startswith("http"):
        result = await extract_from_url(qr_data)
        if result:
            return result
        html = await _fetch_url(qr_data)
        if html:
            result = await _gemini_parse(html)
            if result:
                return result

    mime_type, _ = mimetypes.guess_type(image_path)
    if not mime_type or not mime_type.startswith("image/"):
        mime_type = "image/png"
    with open(image_path, "rb") as f:
        img = f.read()
    if not settings.GEMINI_API_KEY:
        return None
    from google import genai
    from google.genai import errors
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    for attempt in range(5):
        try:
            resp = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=[GEMINI_PROMPT, {"inline_data": {"mime_type": mime_type, "data": img}}],
            )
            text = resp.text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[-1]
                text = text.rsplit("```", 1)[0]
            import json
            d = json.loads(text.strip())
            return d if isinstance(d, dict) else None
        except errors.ClientError as e:
            if e.code == 429:
                import asyncio
                await asyncio.sleep(2 ** attempt)
                continue
            return None
        except Exception:
            return None
    return None


async def _fetch_url(url: str) -> Optional[str]:
    try:
        client = _get_client()
        resp = await client.get(url, follow_redirects=True)
        return resp.text if resp.status_code == 200 else None
    except Exception:
        return None
