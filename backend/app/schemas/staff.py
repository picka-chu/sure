from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class StaffCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    pin: str


class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None


class StaffResponse(BaseModel):
    id: UUID
    business_id: UUID
    full_name: str
    email: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True
