import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import bcrypt as _bcrypt


class StaffUser(Base):
    __tablename__ = "staff_users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    pin_code: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    last_login_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    business = relationship("Business", back_populates="staff_users")
    verifications = relationship("Verification", back_populates="staff_user")

    def set_pin(self, pin: str):
        self.pin_code = _bcrypt.hashpw(
            pin.encode("utf-8"), _bcrypt.gensalt()
        ).decode("utf-8")

    def verify_pin(self, pin: str) -> bool:
        return _bcrypt.checkpw(
            pin.encode("utf-8"), self.pin_code.encode("utf-8")
        )
