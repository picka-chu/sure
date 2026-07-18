from pydantic import BaseModel
from typing import Optional, Any
from uuid import UUID
from datetime import datetime


class VerificationResponse(BaseModel):
    id: UUID
    business_id: UUID
    staff_id: Optional[UUID] = None
    bank_account_id: Optional[UUID] = None
    bank_name: Optional[str] = None
    transaction_reference: Optional[str] = None
    payer_name: Optional[str] = None
    payer_account: Optional[str] = None
    receiver_name: Optional[str] = None
    receiver_account: Optional[str] = None
    amount: Optional[float] = None
    currency: str = "ETB"
    status: str
    receipt_url: Optional[str] = None
    verification_data: Optional[Any] = None
    confidence_score: Optional[float] = None
    error_message: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class VerifyRequest(BaseModel):
    bank_name: str
    reference: str
    account_number: Optional[str] = None


class VerifyCaptureResponse(BaseModel):
    verification: VerificationResponse
    is_verified: bool
    matches_business_account: bool
