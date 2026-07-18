from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime


class RegisterRequest(BaseModel):
    business_name: str
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class StaffPinLoginRequest(BaseModel):
    pin: str
    business_code: str


class StaffEmailLoginRequest(BaseModel):
    email: str
    pin: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class StaffTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    staff: dict
