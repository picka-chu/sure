from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    StaffEmailLoginRequest,
    ChangePasswordRequest,
    TokenResponse,
    StaffTokenResponse,
)
from app.services.auth_service import (
    register_business,
    login_owner,
    login_staff_by_email,
    change_owner_password,
)
from app.limiter import limiter

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
@limiter.limit("5/hour")
async def register(request: Request, req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        result = await register_business(
            db, req.business_name, req.email, req.password, req.full_name, req.phone
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, req: LoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        result = await login_owner(db, req.email, req.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/staff/login", response_model=StaffTokenResponse)
@limiter.limit("10/minute")
async def staff_login(request: Request, req: StaffEmailLoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        result = await login_staff_by_email(db, req.email, req.pin)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/change-password")
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await change_owner_password(db, current_user, req.current_password, req.new_password)
        return {"message": "Password changed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
