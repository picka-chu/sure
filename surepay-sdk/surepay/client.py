"""
Surepay Python SDK — verify Ethiopian bank transfer receipts programmatically.

Usage:
    from surepay import Surepay

    client = Surepay(api_key="sk-...", base_url="https://api.surepay.et")

    # Verify a receipt image
    result = client.verify("receipt.jpg", bank_name="cbe")
    print(result.is_verified, result.reason)

    # Verify by reference number (no image)
    result = client.verify_link(bank_name="cbe", reference="FT25211G11JQ")

    # Get previous verification
    result = client.get_verification("verification-uuid")

    # List all verifications
    results = client.list_verifications(limit=50)
"""

import os
from dataclasses import dataclass
from typing import Optional, List
from datetime import datetime

import httpx


@dataclass
class VerificationResult:
    id: str
    status: str
    bank_name: Optional[str] = None
    transaction_reference: Optional[str] = None
    payer_name: Optional[str] = None
    payer_account: Optional[str] = None
    receiver_name: Optional[str] = None
    receiver_account: Optional[str] = None
    amount: Optional[str] = None
    currency: str = "ETB"
    is_verified: bool = False
    reason: Optional[str] = None
    created_at: Optional[str] = None


@dataclass
class VerificationListResult:
    verifications: List[VerificationResult]
    total: int


@dataclass
class ApiKeyInfo:
    id: str
    name: str
    key_prefix: str
    rate_limit: int
    is_active: bool
    last_used_at: Optional[str] = None
    created_at: Optional[str] = None


@dataclass
class CreatedApiKey:
    id: str
    name: str
    key_prefix: str
    key: str
    rate_limit: int
    is_active: bool
    created_at: str


class SurepayError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None, response: Optional[dict] = None):
        self.status_code = status_code
        self.response = response
        super().__init__(message)


class Surepay:
    def __init__(self, api_key: str, base_url: str = "https://api.surepay.et"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self._client = httpx.Client(
            headers={
                "X-API-Key": api_key,
                "User-Agent": "SurepaySDK/1.0",
            },
            timeout=30,
        )

    def verify(self, file_path: str, bank_name: Optional[str] = None, reference: Optional[str] = None) -> VerificationResult:
        with open(file_path, "rb") as f:
            files = {"file": (os.path.basename(file_path), f, self._detect_mime(file_path))}
            data = {}
            if bank_name:
                data["bank_name"] = bank_name
            if reference:
                data["reference"] = reference
            resp = self._client.post(f"{self.base_url}/api/v1/verify", files=files, data=data)
        return self._handle_response(resp)

    def verify_link(self, bank_name: str, reference: str) -> VerificationResult:
        resp = self._client.post(
            f"{self.base_url}/api/v1/verify-link",
            data={"bank_name": bank_name, "reference": reference},
        )
        return self._handle_response(resp)

    def get_verification(self, verification_id: str) -> VerificationResult:
        resp = self._client.get(f"{self.base_url}/api/v1/verifications/{verification_id}")
        return self._handle_response(resp)

    def list_verifications(self, limit: int = 20, offset: int = 0) -> VerificationListResult:
        resp = self._client.get(
            f"{self.base_url}/api/v1/verifications",
            params={"limit": limit, "offset": offset},
        )
        if resp.status_code != 200:
            raise SurepayError(
                resp.json().get("detail", resp.text()),
                status_code=resp.status_code,
                response=resp.json() if resp.headers.get("content-type", "").startswith("application/json") else None,
            )
        body = resp.json()
        items = [VerificationResult(**v) for v in body.get("verifications", [])]
        return VerificationListResult(verifications=items, total=body.get("total", 0))

    def create_api_key(self, name: str) -> CreatedApiKey:
        resp = self._client.post(
            f"{self.base_url}/api/v1/keys",
            json={"name": name},
        )
        if resp.status_code != 200:
            raise SurepayError(
                resp.json().get("detail", resp.text()),
                status_code=resp.status_code,
                response=resp.json(),
            )
        return CreatedApiKey(**resp.json())

    def list_api_keys(self) -> List[ApiKeyInfo]:
        resp = self._client.get(f"{self.base_url}/api/v1/keys")
        if resp.status_code != 200:
            raise SurepayError(
                resp.json().get("detail", resp.text()),
                status_code=resp.status_code,
                response=resp.json(),
            )
        return [ApiKeyInfo(**k) for k in resp.json()]

    def revoke_api_key(self, key_id: str) -> None:
        resp = self._client.delete(f"{self.base_url}/api/v1/keys/{key_id}")
        if resp.status_code != 204:
            raise SurepayError(
                resp.json().get("detail", resp.text()),
                status_code=resp.status_code,
                response=resp.json(),
            )

    def _handle_response(self, resp: httpx.Response) -> VerificationResult:
        if resp.status_code not in (200, 201):
            detail = "Unknown error"
            try:
                body = resp.json()
                detail = body.get("detail") or body.get("error") or str(body)
            except Exception:
                detail = resp.text
            raise SurepayError(detail, status_code=resp.status_code)
        body = resp.json()
        v = body.get("verification", body)
        return VerificationResult(**v)

    def close(self):
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    @staticmethod
    def _detect_mime(path: str) -> str:
        ext = os.path.splitext(path)[1].lower()
        return {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".bmp": "image/bmp",
            ".webp": "image/webp",
        }.get(ext, "application/octet-stream")
