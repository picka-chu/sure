from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.bank import BankAccount, BankName
from app.schemas.bank import BankAccountCreate, BankAccountUpdate, BankAccountResponse
from typing import List

router = APIRouter(prefix="/api/banks", tags=["Bank Accounts"])


@router.get("", response_model=List[BankAccountResponse])
async def list_bank_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BankAccount).where(
            BankAccount.business_id == current_user.business_id,
            BankAccount.is_active == True,
        )
    )
    return result.scalars().all()


@router.post("", response_model=BankAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_bank_account(
    req: BankAccountCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.bank_name not in [b.value for b in BankName]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid bank. Supported: {', '.join([b.value for b in BankName])}",
        )

    account = BankAccount(
        business_id=current_user.business_id,
        bank_name=BankName(req.bank_name),
        account_holder_name=req.account_holder_name,
        account_number=req.account_number,
        initial_balance=req.initial_balance,
    )
    db.add(account)
    await db.flush()
    await db.refresh(account)
    return account


@router.get("/{account_id}", response_model=BankAccountResponse)
async def get_bank_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BankAccount).where(
            BankAccount.id == account_id,
            BankAccount.business_id == current_user.business_id,
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank account not found")
    return account


@router.patch("/{account_id}", response_model=BankAccountResponse)
async def update_bank_account(
    account_id: str,
    req: BankAccountUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BankAccount).where(
            BankAccount.id == account_id,
            BankAccount.business_id == current_user.business_id,
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank account not found")

    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "is_active" and not value:
            pass
        setattr(account, key, value)
    await db.flush()
    await db.refresh(account)
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bank_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BankAccount).where(
            BankAccount.id == account_id,
            BankAccount.business_id == current_user.business_id,
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank account not found")
    account.is_active = False
    await db.flush()


@router.get("/supported/list")
async def list_supported_banks():
    return {
        "banks": [
            {"id": "cbe", "name": "Commercial Bank of Ethiopia (CBE)"},
            {"id": "dashen", "name": "Dashen Bank"},
            {"id": "awash", "name": "Awash Bank"},
            {"id": "boa", "name": "Bank of Abyssinia (BOA)"},
            {"id": "zemen", "name": "Zemen Bank"},
            {"id": "telebirr", "name": "Telebirr (Ethio telecom)"},
        ]
    }
