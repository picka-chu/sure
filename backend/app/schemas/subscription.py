from pydantic import BaseModel, Field
from typing import Optional, Any
from uuid import UUID
from datetime import datetime


PRICING = {
    "monthly": {"amount": 750.0, "currency": "ETB", "label": "Monthly"},
    "yearly": {"amount": 7500.0, "currency": "ETB", "label": "Yearly", "discount_note": "2 months free"},
}

PAYMENT_ACCOUNTS = {
    "cbe": {
        "bank_name": "Commercial Bank of Ethiopia (CBE)",
        "account_holder": "Bereket Tesfalem",
        "account_number": "1000602869893",
    },
    "telebirr": {
        "bank_name": "Telebirr (Ethio telecom)",
        "account_holder": "Bereket Tesfalem",
        "account_number": "0930529985",
    },
}


class PricingInfo(BaseModel):
    plan: str
    amount: float
    currency: str
    label: str
    discount_note: Optional[str] = None


class PaymentAccountInfo(BaseModel):
    bank_name: str
    account_holder: str
    account_number: str


class SubscriptionStatusResponse(BaseModel):
    status: str
    plan: str
    trial_end_date: Optional[datetime] = None
    subscription_start_date: Optional[datetime] = None
    subscription_end_date: Optional[datetime] = None
    days_remaining: int
    is_active: bool


class PaymentSubmitRequest(BaseModel):
    plan_type: str = Field(..., pattern="^(monthly|yearly)$")
    payment_method: str = Field(..., pattern="^(cbe|telebirr)$")
    sender_name: Optional[str] = None
    sender_account: Optional[str] = None
    transaction_reference: Optional[str] = None


class PaymentResponse(BaseModel):
    id: UUID
    business_id: UUID
    plan_type: str
    amount: float
    currency: str
    payment_method: str
    status: str
    sender_name: Optional[str] = None
    sender_account: Optional[str] = None
    transaction_reference: Optional[str] = None
    screenshot_path: Optional[str] = None
    admin_notes: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AdminVerifyPaymentRequest(BaseModel):
    status: str = Field(..., pattern="^(verified|rejected)$")
    admin_notes: Optional[str] = None
