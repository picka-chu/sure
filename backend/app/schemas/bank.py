from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class BankAccountCreate(BaseModel):
    bank_name: str
    account_holder_name: str
    account_number: str
    initial_balance: float = 0.0


class BankAccountUpdate(BaseModel):
    account_holder_name: Optional[str] = None
    account_number: Optional[str] = None
    initial_balance: Optional[float] = None
    is_active: Optional[bool] = None


class BankAccountResponse(BaseModel):
    id: UUID
    business_id: UUID
    bank_name: str
    account_holder_name: str
    account_number: str
    initial_balance: float
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
