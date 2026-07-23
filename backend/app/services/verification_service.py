import httpx
import re
import json
import logging
import os
import tempfile
from typing import Optional
from urllib.parse import urlparse, parse_qs
from app.config import settings

logger = logging.getLogger("surepay.verify.service")
HTTP_TIMEOUT = 20.0

BANK_INFO = {
    "cbe": {
        "name": "Commercial Bank of Ethiopia",
        "url_template": "https://apps.cbe.com.et:100/?id={ref}",
        "url_regex": r"https://apps\.cbe\.com\.et:100/\?id=(FT[a-zA-Z0-9]+)",
        "ref_patterns": [
            r"FT[a-zA-Z0-9]{8,}",
            r"(?:Transaction|Reference|Ref)\s*(?:No|Number|#|ID)?[:\s]*([A-Z0-9]{8,})",
        ],
        "ref_example": "FT25211G11JQ",
    },
    "dashen": {
        "name": "Dashen Bank",
        "url_template": "https://receipt.dashensuperapp.com/receipt/{ref}",
        "url_regex": r"https://receipt\.dashensuperapp\.com/receipt/([a-zA-Z0-9]+)",
        "ref_patterns": [
            r"(?:Transfer|Transaction)\s*(?:Ref|Reference)[:\s]*([A-Z0-9]{6,})",
            r"(?:Receipt|Ref)\s*(?:No|#)[:\s]*([A-Z0-9]{6,})",
        ],
        "ref_example": "387ETAP2522000WK",
    },
    "awash": {
        "name": "Awash Bank",
        "url_template": "https://awashpay.awashbank.com:8225/{ref}",
        "url_regex": r"https://awashpay\.awashbank\.com:8225/([a-zA-Z0-9\-]+)",
        "ref_patterns": [
            r"(?:Transaction|Trx)\s*(?:ID|Ref|Reference)[:\s]*([A-Z0-9\-]{6,})",
        ],
        "ref_example": "-E41AE0D86FFA-21XYYW",
    },
    "boa": {
        "name": "Bank of Abyssinia",
        "url_template": "https://cs.bankofabyssinia.com/slip/?trx={ref}",
        "url_regex": r"https://cs\.bankofabyssinia\.com/slip/\?trx=([a-zA-Z0-9]+)",
        "ref_patterns": [
            r"(?:Transaction|Trx)\s*(?:Ref|Reference)[:\s]*([A-Z0-9]{5,})",
            r"BOA[A-Z0-9]{5,}",
        ],
        "ref_example": "BOA123456789",
    },
    "zemen": {
        "name": "Zemen Bank",
        "url_template": "https://share.zemenbank.com/rt/{ref}/pdf",
        "url_regex": r"https://share\.zemenbank\.com/rt/([a-zA-Z0-9]+)/pdf",
        "ref_patterns": [
            r"(?:Reference|Ref)\s*(?:No|#)[:\s]*([A-Z0-9]{10,})",
        ],
        "ref_example": "94497018108ATWR2520600HM",
    },
    "telebirr": {
        "name": "Telebirr (Ethio telecom)",
        "url_template": "https://transactioninfo.ethiotelecom.et/receipt/{ref}",
        "url_regex": r"https://transactioninfo\.ethiotelecom\.et/receipt/([a-zA-Z0-9]+)",
        "ref_patterns": [
            r"(?:Receipt|Transaction|Ref)\s*(?:No|ID|#)[:\s]*([A-Z0-9]{5,})",
            r"CHQ[A-Z0-9]{4,}",
        ],
        "ref_example": "CHQ0FJ403O",
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
    info = BANK_INFO.get(bank)
    if not info:
        return None
    match = re.search(info["url_regex"], url)
    if match:
        return match.group(1)
    if bank == "cbe":
        params = parse_qs(urlparse(url).query)
        ref = params.get("id", [None])[0]
        if ref:
            return ref
    return None


def extract_reference(text: str, bank_hint: Optional[str] = None) -> Optional[str]:
    if not text:
        return None
    text_upper = text.upper()

    if bank_hint and bank_hint in BANK_INFO:
        for pat in BANK_INFO[bank_hint]["ref_patterns"]:
            m = re.search(pat, text_upper)
            if m:
                ref = m.group(1) if m.lastindex else m.group(0)
                if len(ref) >= 4:
                    logger.info(f"[extract_ref] Bank={bank_hint}, matched pattern, ref={ref[:30]}")
                    return ref

    for bank_key, info in BANK_INFO.items():
        if bank_hint and bank_key != bank_hint:
            continue
        for pat in info["ref_patterns"]:
            m = re.search(pat, text_upper)
            if m:
                ref = m.group(1) if m.lastindex else m.group(0)
                if len(ref) >= 4:
                    logger.info(f"[extract_ref] Matched bank={bank_key} pattern, ref={ref[:30]}")
                    return ref

    logger.info(f"[extract_ref] No reference pattern matched in text")
    return None


def build_receipt_url(bank: str, reference: str) -> str:
    info = BANK_INFO.get(bank)
    return info["url_template"].format(ref=reference) if info else reference


def is_url(s: str) -> bool:
    return s.startswith("http://") or s.startswith("https://")


# ─── Normalization: map every bank's dict keys to our standard schema ───

def _clean_amount(val):
    if val:
        val = str(val).replace("ETB", "").replace(" ", "").strip()
    return val

def normalize_receipt(bank: str, raw: dict, ref_fallback: Optional[str] = None) -> dict:
    mapper = _get_normalizer(bank)
    result = {"status": "SUCCESS", "currency": "ETB", "bank_name": BANK_INFO.get(bank, {}).get("name", bank)}
    for our_key, extractor_key in mapper.items():
        if isinstance(extractor_key, str):
            val = raw.get(extractor_key)
        else:
            val = extractor_key(raw)
        if val is not None:
            if our_key == "amount":
                val = _clean_amount(val)
            result[our_key] = val.strip() if isinstance(val, str) else val
    if not result.get("reference") and ref_fallback:
        result["reference"] = ref_fallback
    return result


def _get_normalizer(bank: str) -> dict:
    if bank == "cbe":
        return {
            "reference": "reference_no",
            "payer_name": "payer",
            "payer_account": "payer_account",
            "receiver_name": "receiver",
            "receiver_account": "receiver_account",
            "amount": "transferred_amount",
        }
    if bank == "dashen":
        return {
            "reference": "transfer_reference",
            "payer_name": "sender_name",
            "receiver_name": "beneficiary_name",
            "receiver_account": "beneficiary_account",
            "amount": "amount",
        }
    if bank == "awash":
        return {
            "reference": "Transaction ID",
            "payer_name": "Sender Name",
            "payer_account": "Sender Account",
            "receiver_name": "Beneficiary name",
            "receiver_account": "Beneficiary Account",
            "amount": "Amount",
        }
    if bank == "boa":
        return {
            "reference": "Transaction Reference",
            "payer_name": "Source Account Name",
            "payer_account": "Source Account",
            "receiver_name": "Receiver's Name",
            "receiver_account": "Receiver's Account",
            "amount": "Transferred Amount",
        }
    if bank == "zemen":
        return {
            "reference": "Reference No",
            "payer_name": "Payer Name",
            "payer_account": "Payer Account No",
            "receiver_name": "Recipient Name",
            "receiver_account": "Recipient Account No",
            "amount": "Settled Amount",
        }
    if bank == "telebirr":
        return {
            "payer_name": "payer_name",
            "payer_account": "payer_number",
            "receiver_name": "credited_party",
            "receiver_account": "credited_party_number",
            "amount": "total_paid",
            "status": lambda r: "SUCCESS" if "success" in str(r.get("status", "")).lower() else (r.get("status") or "SUCCESS"),
        }
    return {}


# ─── Bank-specific extractors ───

def _download_pdf(url: str) -> str:
    import requests
    resp = requests.get(url, verify=False, timeout=HTTP_TIMEOUT)
    resp.raise_for_status()
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp.write(resp.content)
    tmp.close()
    return tmp.name


async def _extract_cbe(url: str) -> dict:
    logger.info(f"[cbe] Extracting CBE receipt")
    import pdfplumber
    from concurrent.futures import ThreadPoolExecutor

    pdf_path = _download_pdf(url)
    try:
        with pdfplumber.open(pdf_path) as pdf:
            with ThreadPoolExecutor() as executor:
                texts = list(executor.map(lambda p: p.extract_text(), pdf.pages))
        full = "\n".join(t for t in texts if t)
        patterns = {
            "customer_name": r"Customer Name:\s*(.+)",
            "branch": r"Branch:\s*(.+)",
            "region_city": r"Region:\s*(.*?)\n",
            "payment_date": r"Payment Date & Time\s*([\d/:,\sAPMapm]+)",
            "reference_no": r"Reference No.*?([A-Z0-9]+)",
            "payer": r"Payer\s+([A-Z\s]+)",
            "payer_account": r"Payer\s+[A-Z\s]+\nAccount\s+([\d\*]+)",
            "receiver": r"Receiver\s+([A-Z\s]+)",
            "receiver_account": r"Receiver\s+[A-Z\s]+\nAccount\s+([\d\*]+)",
            "service": r"Reason / Type of service\s+(.+)",
            "transferred_amount": r"Transferred Amount\s+([\d,.]+) ETB",
            "commission": r"Commission or Service Charge\s+([\d,.]+) ETB",
            "vat_on_commission": r"15% VAT on Commission\s+([\d,.]+) ETB",
            "total_debited": r"Total amount debited from customers account\s+([\d,.]+) ETB",
            "amount_in_words": r"Amount in Word ETB\s+(.+)",
        }
        data = {}
        for key, pat in patterns.items():
            m = re.search(pat, full)
            if m:
                data[key] = m.group(1).strip()
        logger.info(f"[cbe] Extracted — receiver={data.get('receiver')}, amount={data.get('transferred_amount')}")
        return data
    finally:
        try:
            os.unlink(pdf_path)
        except Exception:
            pass


async def _extract_cbe_from_ft(ft_number: str, account_last8_or_full: str) -> dict:
    ft = ft_number.strip().upper().replace(" ", "")
    digits = re.sub(r"\D", "", account_last8_or_full)
    if len(digits) < 8:
        raise ValueError(f"Account number must contain at least 8 digits, got {len(digits)}")
    last8 = digits[-8:]
    url = f"https://apps.cbe.com.et:100/?id={ft}{last8}"
    logger.info(f"[cbe] Built CBE URL from FT: {ft}, last8={last8}")
    return await _extract_cbe(url)


async def _extract_dashen(url: str) -> dict:
    logger.info(f"[dashen] Extracting Dashen receipt")
    import pdfplumber
    from concurrent.futures import ThreadPoolExecutor

    pdf_path = _download_pdf(url)
    try:
        with pdfplumber.open(pdf_path) as pdf:
            with ThreadPoolExecutor() as executor:
                texts = list(executor.map(lambda p: p.extract_text(), pdf.pages))
        full = "\n".join(t for t in texts if t)
        patterns = {
            "sender_name": r"Account Holder Name:\s*(.+?)\n",
            "channel": r"Transaction Channel:\s*(.+?)\n",
            "service_type": r"Service Type:\s*(.+?)\n",
            "narrative": r"Narrative:\s*(.+?)\n",
            "beneficiary_name": r"Account Holder Name:\s*(.+?)\n",
            "beneficiary_account": r"Account Number:\s*(.+?)\n",
            "beneficiary_bank": r"Institution Name:\s*(.+?)\n",
            "transfer_reference": r"Transfer Reference:\s*(.+?)\n",
            "transaction_reference": r"Transaction Ref:\s*(.+?)\n",
            "transaction_date": r"Transaction Date:\s*(.+?)\n",
            "amount": r"Transaction Amount\s*([\d,.]+) ETB",
            "total": r"Total\s*([\d,.]+) ETB",
            "amount_in_words": r"Amount in words:\s*(.+?)\n",
        }
        data = {}
        for key, pat in patterns.items():
            m = re.search(pat, full)
            if m:
                data[key] = m.group(1).strip()
        logger.info(f"[dashen] Extracted — beneficiary={data.get('beneficiary_name')}, amount={data.get('amount')}")
        return data
    finally:
        try:
            os.unlink(pdf_path)
        except Exception:
            pass


async def _extract_awash(url: str) -> dict:
    logger.info(f"[awash] Fetching Awash receipt page")
    async with httpx.AsyncClient(verify=False, timeout=15, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(resp.text, "html.parser")
    data = {}
    for row in soup.select("table.info-table tr"):
        cells = row.find_all("td")
        if len(cells) == 3:
            key = cells[0].text.strip().rstrip(":")
            value = cells[2].text.strip()
            data[key] = value
    logger.info(f"[awash] Extracted — beneficiary={data.get('Beneficiary name')}, amount={data.get('Amount')}")
    return data


async def _extract_boa(url: str) -> dict:
    logger.info(f"[boa] Fetching BOA receipt page (HTTP, no Selenium)")
    async with httpx.AsyncClient(verify=False, timeout=15, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(resp.text, "html.parser")
    data = {}
    for row in soup.select("table tr"):
        cells = row.find_all("td")
        if len(cells) == 2:
            key = cells[0].text.strip().rstrip(":")
            value = cells[1].text.strip()
            data[key] = value
    result = {
        "Source Account": data.get("Source Account"),
        "Source Account Name": data.get("Source Account Name"),
        "Receiver's Account": data.get("Receiver's Account"),
        "Receiver's Name": data.get("Receiver's Name"),
        "Transferred Amount": data.get("Transferred amount"),
        "Service Charge": data.get("Service Charge"),
        "VAT": data.get("VAT (15%)"),
        "Total Amount": data.get("Total Amount"),
        "Transaction Type": data.get("Transaction Type"),
        "Transaction Date": data.get("Transaction Date"),
        "Transaction Reference": data.get("Transaction Reference"),
        "Narrative": data.get("Narrative"),
    }
    logger.info(f"[boa] Extracted — receiver={result.get('Receiver\'s Name')}, amount={result.get('Transferred Amount')}")
    return result


async def _extract_zemen(url: str) -> dict:
    logger.info(f"[zemen] Extracting Zemen receipt PDF")
    import pdfplumber
    from concurrent.futures import ThreadPoolExecutor

    pdf_path = _download_pdf(url)
    try:
        with pdfplumber.open(pdf_path) as pdf:
            with ThreadPoolExecutor() as executor:
                texts = list(executor.map(lambda p: p.extract_text(), pdf.pages))
        full = " ".join(t.replace("\n", " ") for t in texts if t)
        patterns = {
            "Invoice No": r"Invoice\s*No\s*[:\-]?\s*(\S+)",
            "Date": r"Date\s*[:\-]?\s*(.+?)\s+(?=Payer|Recipient|Reference|Transaction|Settled|Service|VAT|Total|Amount)",
            "Payer Name": r"Payer\s+Name\s*[:\-]?\s*(.+)",
            "Payer Account No": r"Payer\s+Account\s+No\s*[:\-]?\s*(\S+)",
            "Recipient Name": r"Recipient\s+Name\s*[:\-]?\s*(.+)",
            "Recipient Account No": r"Recipient\s+Account\s+No\s*[:\-]?\s*(\S+)",
            "Reference No": r"Reference\s+No\s*[:\-]?\s*(\S+)",
            "Transaction Status": r"Transaction\s+Status\s*[:\-]?\s*(.+)",
            "Transaction Detail": r"Transaction\s+Detail\s*[:\-]?\s*(.+)",
            "Settled Amount": r"Settled\s+Amount\s*[:\-]?\s*([\d,]+\.?\d*)",
            "Service Charge": r"Service\s+Charge\s*[:\-]?\s*([\d,]+\.?\d*)",
            "VAT": r"VAT\s*[:\-]?\s*([\d,]+\.?\d*)",
            "Total Amount Paid": r"Total\s+Amount\s+Paid\s*[:\-]?\s*([\d,]+\.?\d*)",
            "Amount in Words": r"Amount\s+in\s+Words\s*[:\-]?\s*(.+)",
        }
        data = {}
        for key, pat in patterns.items():
            m = re.search(pat, full)
            if m:
                val = m.group(1).strip()
                if any(x in key for x in ["Amount", "Charge", "VAT"]) and val:
                    val = f"ETB {val}"
                data[key] = val
        logger.info(f"[zemen] Extracted — recipient={data.get('Recipient Name')}, amount={data.get('Settled Amount')}")
        return data
    finally:
        try:
            os.unlink(pdf_path)
        except Exception:
            pass


async def _extract_telebirr(url_or_id: str) -> dict:
    logger.info(f"[telebirr] Extracting Telebirr receipt")
    import requests

    url = url_or_id if is_url(url_or_id) else f"https://transactioninfo.ethiotelecom.et/receipt/{url_or_id}"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    resp = requests.get(url, headers=headers, timeout=HTTP_TIMEOUT)
    resp.raise_for_status()

    from bs4 import BeautifulSoup
    soup = BeautifulSoup(resp.text, "html.parser")

    def pick(label_regex, key):
        for node in soup.find_all(string=re.compile(label_regex, re.IGNORECASE)):
            td = node.find_next("td")
            if td:
                return td.get_text(strip=True)
        return None

    data = {
        "payer_name": pick(r"Payer\s*Name", "payer_name"),
        "payer_number": pick(r"Payer\s*telebirr", "payer_number"),
        "credited_party": pick(r"Credited\s*Party\s*name", "credited_party"),
        "credited_party_number": pick(r"Credited\s*party\s*account\s*no", "credited_party_number"),
        "status": pick(r"transaction\s*status", "status"),
        "total_paid": pick(r"Total\s*Paid\s*Amount", "total_paid"),
    }
    logger.info(f"[telebirr] Extracted — credited={data.get('credited_party')}, amount={data.get('total_paid')}")
    return data


# ─── Public API ───

EXTRACTORS = {
    "cbe": _extract_cbe,
    "dashen": _extract_dashen,
    "awash": _extract_awash,
    "boa": _extract_boa,
    "zemen": _extract_zemen,
    "telebirr": _extract_telebirr,
}


async def verify_receipt(bank: str, reference: str, account_number: Optional[str] = None) -> dict:
    logger.info(f"[verify_receipt] bank={bank}, ref={reference[:30] if reference else 'none'}, is_url={is_url(reference) if reference else False}")

    try:
        url = reference if is_url(reference) else build_receipt_url(bank, reference)

        if bank == "cbe" and not is_url(reference) and reference.upper().startswith("FT"):
            if account_number:
                last_8 = account_number[-8:] if len(account_number) >= 8 else account_number
                raw = await _extract_cbe_from_ft(reference, last_8)
            else:
                raw = await _extract_cbe(url)
        else:
            extractor = EXTRACTORS.get(bank)
            if not extractor:
                return {"success": False, "error": f"Unsupported bank: {bank}"}
            raw = await extractor(url)

        if not raw:
            return {"success": False, "error": "No data extracted from receipt"}

        data = normalize_receipt(bank, raw, ref_fallback=reference if not is_url(reference) else None)
        logger.info(f"[verify_receipt] Normalized — receiver={data.get('receiver_name', 'N/A')}({data.get('receiver_account', 'N/A')}), amount={data.get('amount', 'N/A')}")
        return {"success": True, "data": data}

    except ImportError as e:
        logger.error(f"[verify_receipt] Missing dependency: {e}")
        return {"success": False, "error": f"Missing dependency: {e}"}
    except Exception as e:
        logger.error(f"[verify_receipt] Failed: {e}")
        return {"success": False, "error": str(e)}


async def fetch_receipt_from_url(url: str) -> Optional[dict]:
    bank = detect_bank_from_url(url)
    logger.info(f"[fetch_receipt_from_url] URL={url[:100]}, bank={bank}")
    if not bank:
        return None
    try:
        extractor = EXTRACTORS.get(bank)
        if not extractor:
            return None
        raw = await extractor(url)
        if not raw:
            return None
        ref = extract_reference_from_url(url, bank)
        data = normalize_receipt(bank, raw, ref_fallback=ref or url)
        logger.info(f"[fetch_receipt_from_url] Normalized — receiver={data.get('receiver_name', 'N/A')}, amount={data.get('amount', 'N/A')}")
        return data
    except Exception as e:
        logger.error(f"[fetch_receipt_from_url] Failed: {e}")
        return None


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
        logger.info("[extract_qr] No QR code found")
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
            logger.info(f"[extract_text] OCR extracted: {text.strip()[:150]}")
            return text.strip()
        return None
    except ImportError:
        logger.warning("[extract_text] pytesseract not installed")
        return None
    except Exception as e:
        logger.warning(f"[extract_text] Failed: {e}")
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
        logger.info("[extract_with_gemini] No GEMINI_API_KEY configured — skipping")
        return None
    logger.info("[extract_with_gemini] Sending image to Gemini")
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
                logger.info(f"[extract_with_gemini] Success — bank={data.get('bank_name')}, ref={data.get('transaction_reference')}")
                return data
            logger.warning(f"[extract_with_gemini] No transaction_reference in response: {data}")
            return None
        except Exception as e:
            err = str(e)
            if "429" in err or "RESOURCE_EXHAUSTED" in err:
                import asyncio
                delay_match = re.search(r"retry in (\d+\.?\d*)s", err)
                delay = float(delay_match.group(1)) if delay_match else min(15 * attempt, 60)
                if attempt < max_retries:
                    logger.warning(f"[extract_with_gemini] Rate limited (attempt {attempt}/{max_retries}), retrying in {delay:.0f}s")
                    await asyncio.sleep(delay)
                    continue
            logger.error(f"[extract_with_gemini] Failed: {e}")
            return None
    return None
