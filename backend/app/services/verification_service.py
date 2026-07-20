import httpx
import re
import json
import logging
from typing import Optional
from urllib.parse import urlparse, parse_qs
from app.config import settings

logger = logging.getLogger("surepay.verify.service")

BANK_RECEIPT_URLS = {
    "cbe": {
        "name": "Commercial Bank of Ethiopia",
        "url_template": "https://apps.cbe.com.et:100/?id={ref}",
        "url_regex": r"https://apps\.cbe\.com\.et:100/\?id=(FT[a-zA-Z0-9]+)",
    },
    "dashen": {
        "name": "Dashen Bank",
        "url_template": "https://receipt.dashensuperapp.com/receipt/{ref}",
        "url_regex": r"https://receipt\.dashensuperapp\.com/receipt/([a-zA-Z0-9]+)",
    },
    "awash": {
        "name": "Awash Bank",
        "url_template": "https://awashpay.awashbank.com:8225/{ref}",
        "url_regex": r"https://awashpay\.awashbank\.com:8225/([a-zA-Z0-9\-]+)",
    },
    "boa": {
        "name": "Bank of Abyssinia",
        "url_template": "https://cs.bankofabyssinia.com/slip/?trx={ref}",
        "url_regex": r"https://cs\.bankofabyssinia\.com/slip/\?trx=([a-zA-Z0-9]+)",
    },
    "zemen": {
        "name": "Zemen Bank",
        "url_template": "https://share.zemenbank.com/rt/{ref}/pdf",
        "url_regex": r"https://share\.zemenbank\.com/rt/([a-zA-Z0-9]+)/pdf",
    },
    "telebirr": {
        "name": "Telebirr (Ethio telecom)",
        "url_template": "https://transactioninfo.ethiotelecom.et/receipt/{ref}",
        "url_regex": r"https://transactioninfo\.ethiotelecom\.et/receipt/([a-zA-Z0-9]+)",
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

BANK_URL_PATTERNS = [
    (r"apps\.cbe\.com\.et", "cbe"),
    (r"receipt\.dashensuperapp\.com", "dashen"),
    (r"awashpay\.awashbank\.com", "awash"),
    (r"cs\.bankofabyssinia\.com", "boa"),
    (r"share\.zemenbank\.com", "zemen"),
    (r"transactioninfo\.ethiotelecom\.et", "telebirr"),
]


def detect_bank_from_url(url: str) -> Optional[str]:
    for pattern, bank in BANK_URL_PATTERNS:
        if re.search(pattern, url):
            return bank
    return None


def detect_bank_from_text(text: str) -> Optional[str]:
    text_lower = text.lower()
    for name, short in BANK_SHORT_NAMES.items():
        if name in text_lower:
            return short
    return None


def extract_reference_from_url(url: str, bank: str) -> Optional[str]:
    config = BANK_RECEIPT_URLS.get(bank)
    if not config:
        return None
    match = re.search(config["url_regex"], url)
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
    match = re.search(r"FT[a-zA-Z0-9]+", text, re.IGNORECASE)
    return match.group(0).upper() if match else None


def build_receipt_url(bank: str, reference: str) -> str:
    config = BANK_RECEIPT_URLS.get(bank)
    if not config:
        return reference
    return config["url_template"].format(ref=reference)


def is_url(s: str) -> bool:
    return s.startswith("http://") or s.startswith("https://")


async def _extract_boa_receipt(url: str) -> dict:
    logger.info(f"[_extract_boa_receipt] Fetching BOA receipt: {url}")
    try:
        from bs4 import BeautifulSoup
        async with httpx.AsyncClient(verify=False, timeout=15, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
        logger.info(f"[_extract_boa_receipt] HTTP {resp.status_code}, size={len(resp.text)}")
        soup = BeautifulSoup(resp.text, "html.parser")
        data = {}
        for row in soup.select("table tr"):
            cells = row.find_all("td")
            if len(cells) == 2:
                key = cells[0].text.strip().rstrip(":")
                value = cells[1].text.strip()
                data[key] = value
        result = {
            "status": "SUCCESS",
            "bank_name": "Bank of Abyssinia",
            "payer_name": data.get("Source Account Name"),
            "payer_account": data.get("Source Account"),
            "receiver_name": data.get("Receiver's Name"),
            "receiver_account": data.get("Receiver's Account"),
            "amount": data.get("Transferred Amount"),
            "reference": data.get("Transaction Reference"),
            "raw": data,
        }
        logger.info(f"[_extract_boa_receipt] Parsed — receiver={result['receiver_name']}({result['receiver_account']}), amount={result['amount']}")
        return result
    except Exception as e:
        logger.error(f"[_extract_boa_receipt] Failed: {e}")
        return {"status": "ERROR", "error": str(e)}


async def verify_receipt(bank: str, reference: str, account_number: Optional[str] = None) -> dict:
    logger.info(f"[verify_receipt] Starting — bank={bank}, ref={reference[:30] if reference else 'none'}, is_url={is_url(reference) if reference else False}")

    if is_url(reference) and bank == "boa":
        logger.info(f"[verify_receipt] Using direct BOA HTTP extractor (no Selenium)")
        data = await _extract_boa_receipt(reference)
        if data.get("status") == "ERROR":
            logger.error(f"[verify_receipt] BOA extraction failed: {data.get('error')}")
            return {"success": False, "error": data.get("error", "BOA extraction failed")}
        logger.info(f"[verify_receipt] BOA extractor succeeded — receiver={data.get('receiver_name')}, amount={data.get('amount')}")
        return {"success": True, "data": data}

    try:
        from ethiobank_receipts import extract_receipt

        if is_url(reference):
            logger.info(f"[verify_receipt] Calling ethiobank_receipts.extract_receipt(bank={bank}, url=...)")
            data = extract_receipt(bank, reference)
        elif bank == "cbe" and reference.upper().startswith("FT"):
            from ethiobank_receipts.extractors.cbe import extract_cbe_receipt_info_from_ft
            last_8 = account_number[-8:] if account_number and len(account_number) >= 8 else account_number or ""
            logger.info(f"[verify_receipt] CBE FT extraction — ft={reference}, account_last8={last_8}")
            data = extract_cbe_receipt_info_from_ft(reference, last_8)
        else:
            url = build_receipt_url(bank, reference)
            logger.info(f"[verify_receipt] Constructed receipt URL: {url}")
            if bank == "boa":
                data = await _extract_boa_receipt(url)
                if data.get("status") == "ERROR":
                    return {"success": False, "error": data.get("error", "BOA extraction failed")}
                return {"success": True, "data": data}
            logger.info(f"[verify_receipt] Calling ethiobank_receipts.extract_receipt(bank={bank}, url=...)")
            data = extract_receipt(bank, url)

        if not data or not isinstance(data, dict):
            logger.warning(f"[verify_receipt] Library returned empty/invalid data: {data}")
            return {"success": False, "error": "No data extracted from receipt"}
        logger.info(f"[verify_receipt] Success — receiver={data.get('receiver_name', 'N/A')}({data.get('receiver_account', 'N/A')}), amount={data.get('amount', 'N/A')}, status={data.get('status', 'N/A')}")
        return {"success": True, "data": data}

    except ImportError:
        logger.error("[verify_receipt] ethiobank_receipts library not installed")
        return {"success": False, "error": "ethiobank_receipts library not installed"}
    except Exception as e:
        logger.error(f"[verify_receipt] Exception: {e}")
        return {"success": False, "error": str(e)}


async def extract_qr_from_image(image_path: str) -> Optional[str]:
    try:
        from PIL import Image
        from pyzbar.pyzbar import decode
        img = Image.open(image_path)
        decoded_objects = decode(img)
        for obj in decoded_objects:
            data = obj.data.decode("utf-8")
            if data and len(data) > 5:
                logger.info(f"[extract_qr] Found QR: {data[:120]}")
                return data
        logger.info(f"[extract_qr] No QR code found in image")
        return None
    except Exception as e:
        logger.warning(f"[extract_qr] Failed: {e}")
        return None


async def extract_text_from_image(image_path: str) -> Optional[str]:
    try:
        import pytesseract
        from PIL import Image
        text = pytesseract.image_to_string(Image.open(image_path))
        if text.strip():
            logger.info(f"[extract_text] OCR extracted {len(text.strip())} chars: {text.strip()[:150]}")
            return text.strip()
        logger.info(f"[extract_text] OCR returned empty text")
        return None
    except ImportError:
        logger.warning(f"[extract_text] pytesseract not installed")
        return None
    except Exception as e:
        logger.warning(f"[extract_text] Failed: {e}")
        return None


async def fetch_receipt_from_url(url: str) -> Optional[dict]:
    bank = detect_bank_from_url(url)
    logger.info(f"[fetch_receipt_from_url] URL={url[:100]}, detected_bank={bank}")
    if not bank:
        logger.warning(f"[fetch_receipt_from_url] No bank detected from URL")
        return None
    try:
        if bank == "boa":
            data = await _extract_boa_receipt(url)
        else:
            from ethiobank_receipts import extract_receipt
            data = extract_receipt(bank, url)
        if data and isinstance(data, dict):
            logger.info(f"[fetch_receipt_from_url] Success — receiver={data.get('receiver_name', 'N/A')}, amount={data.get('amount', 'N/A')}")
            return data
        logger.warning(f"[fetch_receipt_from_url] No data returned")
        return None
    except Exception as e:
        logger.error(f"[fetch_receipt_from_url] Exception: {e}")
        return None


GEMINI_EXTRACTION_PROMPT = """You are a receipt data extraction assistant. Extract the following fields from this Ethiopian bank transfer receipt image. Return ONLY valid JSON with these exact keys:
{
  "bank_name": "full bank name or null",
  "transaction_reference": "reference/FT number or null",
  "payer_name": "sender name or null",
  "payer_account": "sender account number or null",
  "receiver_name": "recipient name or null",
  "receiver_account": "recipient account number or null",
  "amount": "numeric amount or null",
  "currency": "ETB",
  "status": "SUCCESS"
}
If the receipt shows a successful transfer, status is "SUCCESS". If it shows failed/pending, use "FAILED" or "PENDING".
Only output the JSON object, no markdown, no explanation."""


async def extract_with_gemini(image_path: str) -> Optional[dict]:
    if not settings.GEMINI_API_KEY:
        logger.info(f"[extract_with_gemini] No GEMINI_API_KEY configured — skipping")
        return None
    logger.info(f"[extract_with_gemini] Sending image to Gemini for extraction")
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            from PIL import Image
            img = Image.open(image_path)
            response = client.models.generate_content(
                model="gemini-3.5-flash",
                contents=[GEMINI_EXTRACTION_PROMPT, img],
            )
            text = response.text.strip()
            text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            data = json.loads(text)
            if isinstance(data, dict) and data.get("transaction_reference"):
                logger.info(f"[extract_with_gemini] Success — bank={data.get('bank_name')}, ref={data.get('transaction_reference')}, receiver={data.get('receiver_name')}({data.get('receiver_account')}), amount={data.get('amount')}")
                return data
            logger.warning(f"[extract_with_gemini] Gemini returned no transaction_reference: {data}")
            return None
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                import asyncio
                delay_match = re.search(r"retry in (\d+\.?\d*)s", err_str)
                delay = float(delay_match.group(1)) if delay_match else min(15 * attempt, 60)
                if attempt < max_retries:
                    logger.warning(f"[extract_with_gemini] Rate limited (attempt {attempt}/{max_retries}), retrying in {delay:.0f}s")
                    await asyncio.sleep(delay)
                    continue
            logger.error(f"[extract_with_gemini] Exception: {e}")
            return None
    return None
