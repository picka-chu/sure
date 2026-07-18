import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Float, ForeignKey, JSON, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class VerificationStatus(str, enum.Enum):
    VERIFIED = "verified"
    SCAM = "scam"
    PENDING = "pending"
    FAILED = "failed"


class Verification(Base):
    __tablename__ = "verifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False, index=True
    )
    staff_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("staff_users.id"), nullable=True
    )
    bank_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bank_accounts.id"), nullable=True
    )
    bank_name: Mapped[str] = mapped_column(String(50), nullable=True)
    transaction_reference: Mapped[str] = mapped_column(String(255), nullable=True, index=True)
    payer_name: Mapped[str] = mapped_column(String(255), nullable=True)
    payer_account: Mapped[str] = mapped_column(String(100), nullable=True)
    receiver_name: Mapped[str] = mapped_column(String(255), nullable=True)
    receiver_account: Mapped[str] = mapped_column(String(100), nullable=True)
    amount: Mapped[float] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="ETB")
    status: Mapped[VerificationStatus] = mapped_column(
        SAEnum(VerificationStatus), default=VerificationStatus.PENDING
    )
    screenshot_path: Mapped[str] = mapped_column(String(500), nullable=True)
    receipt_url: Mapped[str] = mapped_column(String(1000), nullable=True)
    verification_data: Mapped[dict] = mapped_column(JSON, nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=True)
    error_message: Mapped[str] = mapped_column(String(1000), nullable=True)
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    business = relationship("Business", back_populates="verifications")
    staff_user = relationship("StaffUser", back_populates="verifications")
    bank_account = relationship("BankAccount", back_populates="verifications")
