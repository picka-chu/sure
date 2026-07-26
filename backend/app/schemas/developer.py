from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, Any, List
from uuid import UUID
from datetime import datetime


class ApiKeyCreateRequest(BaseModel):
    name: str


class ApiKeyCreateResponse(BaseModel):
    id: UUID
    name: str
    key_prefix: str
    key: str
    rate_limit: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ApiKeyListResponse(BaseModel):
    id: UUID
    name: str
    key_prefix: str
    rate_limit: int
    is_active: bool
    last_used_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DeveloperVerificationResponse(BaseModel):
    id: UUID
    status: str
    bank_name: Optional[str] = None
    transaction_reference: Optional[str] = None
    payer_name: Optional[str] = None
    payer_account: Optional[str] = None
    receiver_name: Optional[str] = None
    receiver_account: Optional[str] = None
    amount: Optional[str] = None
    currency: Optional[str] = None
    is_verified: bool
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DeveloperVerifyResponse(BaseModel):
    verification: DeveloperVerificationResponse


class DeveloperVerificationListResponse(BaseModel):
    verifications: List[DeveloperVerificationResponse]
    total: int


class DeveloperRegisterRequest(BaseModel):
    business_name: str = Field(..., min_length=1)
    full_name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain an uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain a lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain a digit")
        return v


class DeveloperRegisterResponse(BaseModel):
    message: str
    api_key: str
    api_key_id: UUID
    business_id: UUID
    business_name: str


class ErrorResponse(BaseModel):
    error: str
