import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Float, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class PaymentMethod(str, enum.Enum):
    CBE = "cbe"
    TELEBIRR = "telebirr"


class PlanType(str, enum.Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False, index=True
    )
    plan_type: Mapped[PlanType] = mapped_column(SAEnum(PlanType, native_enum=False), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="ETB")
    payment_method: Mapped[PaymentMethod] = mapped_column(SAEnum(PaymentMethod, native_enum=False), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(SAEnum(PaymentStatus, native_enum=False), default=PaymentStatus.PENDING)
    screenshot_path: Mapped[str] = mapped_column(String(500), nullable=True)
    sender_name: Mapped[str] = mapped_column(String(255), nullable=True)
    sender_account: Mapped[str] = mapped_column(String(100), nullable=True)
    transaction_reference: Mapped[str] = mapped_column(String(255), nullable=True)
    admin_notes: Mapped[str] = mapped_column(Text, nullable=True)
    verified_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=True)
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
