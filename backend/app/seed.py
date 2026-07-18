import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from datetime import datetime, timezone, timedelta
from app.database import async_session_factory, engine, Base
from app.models.business import Business, SubscriptionStatus, PlanType
from app.models.user import User
from app.models.staff import StaffUser
from app.models.bank import BankAccount, BankName
from app.models.verification import Verification, VerificationStatus
from uuid import UUID


DEMO_BUSINESS_ID = UUID("00000000-0000-0000-0000-000000000001")
DEMO_OWNER_ID = UUID("00000000-0000-0000-0000-000000000002")
DEMO_STAFF_ID = UUID("00000000-0000-0000-0000-000000000003")
DEMO_CBE_ACCOUNT_ID = UUID("00000000-0000-0000-0000-000000000004")
DEMO_DASHEN_ACCOUNT_ID = UUID("00000000-0000-0000-0000-000000000005")


async def seed(force: bool = False):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_migrate_business_columns)
        await conn.run_sync(_create_payments_table)


def _migrate_business_columns(conn):
    from sqlalchemy import text
    import sqlalchemy as sa
    inspector = sa.inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("businesses")]
    if "subscription_plan" not in columns:
        conn.execute(text("ALTER TABLE businesses ADD COLUMN subscription_plan VARCHAR(50) DEFAULT 'none'"))
    if "subscription_start_date" not in columns:
        conn.execute(text("ALTER TABLE businesses ADD COLUMN subscription_start_date TIMESTAMPTZ"))
    if "subscription_end_date" not in columns:
        conn.execute(text("ALTER TABLE businesses ADD COLUMN subscription_end_date TIMESTAMPTZ"))


def _create_payments_table(conn):
    from sqlalchemy import text
    import sqlalchemy as sa
    if not sa.inspect(conn).has_table("payments"):
        conn.execute(text("""
            CREATE TABLE payments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                business_id UUID NOT NULL REFERENCES businesses(id),
                plan_type VARCHAR(50) NOT NULL,
                amount FLOAT NOT NULL,
                currency VARCHAR(10) DEFAULT 'ETB',
                payment_method VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                screenshot_path VARCHAR(500),
                sender_name VARCHAR(255),
                sender_account VARCHAR(100),
                transaction_reference VARCHAR(255),
                admin_notes TEXT,
                verified_by UUID,
                verified_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))

    async with async_session_factory() as db:
        from sqlalchemy import select, delete

        existing = await db.execute(
            select(Business).where(Business.id == DEMO_BUSINESS_ID)
        )
        if existing.scalar_one_or_none():
            if not force:
                print("Demo data already exists. Use --force to re-seed.")
                return
            await db.execute(delete(Verification))
            await db.execute(delete(BankAccount))
            await db.execute(delete(StaffUser))
            await db.execute(delete(User))
            await db.execute(delete(Business))
            await db.commit()
            print("Existing demo data cleared. Re-seeding...")

        print("Creating demo data...")

        business = Business(
            id=DEMO_BUSINESS_ID,
            name="Sunshine Cafe",
            email="owner@sunshinecafe.et",
            phone="+251 91 123 4567",
            address="Bole Road, Addis Ababa, Ethiopia",
            subscription_status=SubscriptionStatus.TRIAL,
            subscription_plan=PlanType.NONE,
            trial_end_date=datetime.now(timezone.utc) + timedelta(days=7),
            subscription_start_date=None,
            subscription_end_date=None,
            is_active=True,
        )
        db.add(business)

        owner = User(
            id=DEMO_OWNER_ID,
            business_id=DEMO_BUSINESS_ID,
            email="owner@sunshinecafe.et",
            full_name="Abebe Kebede",
            role="owner",
        )
        owner.set_password("demo1234")
        db.add(owner)

        staff1 = StaffUser(
            id=DEMO_STAFF_ID,
            business_id=DEMO_BUSINESS_ID,
            full_name="Meron Alemu",
            email="meron.alemu@00000000.staff",
        )
        staff1.set_pin("1234")
        db.add(staff1)

        staff2 = StaffUser(
            business_id=DEMO_BUSINESS_ID,
            full_name="Yonas Tadesse",
            email="yonas.tadesse@00000000.staff",
        )
        staff2.set_pin("5678")
        db.add(staff2)

        cbe_account = BankAccount(
            id=DEMO_CBE_ACCOUNT_ID,
            business_id=DEMO_BUSINESS_ID,
            bank_name=BankName.CBE,
            account_holder_name="Sunshine Cafe PLC",
            account_number="1000135792",
            initial_balance=50000.00,
            is_active=True,
        )
        db.add(cbe_account)

        dashen_account = BankAccount(
            id=DEMO_DASHEN_ACCOUNT_ID,
            business_id=DEMO_BUSINESS_ID,
            bank_name=BankName.DASHEN,
            account_holder_name="Sunshine Cafe PLC",
            account_number="2000246801",
            initial_balance=25000.00,
            is_active=True,
        )
        db.add(dashen_account)

        sample_verifications = [
            Verification(
                business_id=DEMO_BUSINESS_ID,
                staff_id=DEMO_STAFF_ID,
                bank_account_id=DEMO_CBE_ACCOUNT_ID,
                bank_name="cbe",
                transaction_reference="FT25211G11JQ",
                payer_name="John Doe",
                payer_account="1000223344",
                receiver_name="Sunshine Cafe PLC",
                receiver_account="1000135792",
                amount=1250.75,
                currency="ETB",
                status=VerificationStatus.VERIFIED,
                verified_at=datetime.now(timezone.utc) - timedelta(hours=2),
                created_at=datetime.now(timezone.utc) - timedelta(hours=2),
            ),
            Verification(
                business_id=DEMO_BUSINESS_ID,
                staff_id=DEMO_STAFF_ID,
                bank_account_id=DEMO_CBE_ACCOUNT_ID,
                bank_name="cbe",
                transaction_reference="FT25211G11JR",
                payer_name="Sara Hailu",
                payer_account="1000334455",
                receiver_name="Sunshine Cafe PLC",
                receiver_account="1000135792",
                amount=850.00,
                currency="ETB",
                status=VerificationStatus.VERIFIED,
                verified_at=datetime.now(timezone.utc) - timedelta(hours=5),
                created_at=datetime.now(timezone.utc) - timedelta(hours=5),
            ),
            Verification(
                business_id=DEMO_BUSINESS_ID,
                staff_id=DEMO_STAFF_ID,
                bank_account_id=DEMO_DASHEN_ACCOUNT_ID,
                bank_name="dashen",
                transaction_reference="387ETAP2522000WK",
                payer_name="Mike Johnson",
                payer_account="2000556677",
                receiver_name="Sunshine Cafe PLC",
                receiver_account="2000246801",
                amount=2300.00,
                currency="ETB",
                status=VerificationStatus.VERIFIED,
                verified_at=datetime.now(timezone.utc) - timedelta(hours=1),
                created_at=datetime.now(timezone.utc) - timedelta(hours=1),
            ),
            Verification(
                business_id=DEMO_BUSINESS_ID,
                staff_id=DEMO_STAFF_ID,
                bank_name="awash",
                transaction_reference="AW25220099888",
                payer_name="Fake Payer",
                payer_account="9999999999",
                receiver_name="Different Business",
                receiver_account="8888888888",
                amount=5000.00,
                currency="ETB",
                status=VerificationStatus.SCAM,
                error_message="Receiver account does not match business records",
                verified_at=datetime.now(timezone.utc) - timedelta(hours=3),
                created_at=datetime.now(timezone.utc) - timedelta(hours=3),
            ),
        ]
        for v in sample_verifications:
            db.add(v)

        await db.commit()
        print("Demo data created successfully!")
        print()
        print("=" * 50)
        print("DEMO CREDENTIALS")
        print("=" * 50)
        print()
        print("Business Owner Login:")
        print("  Email:    owner@sunshinecafe.et")
        print("  Password: demo1234")
        print()
        print("Staff Login (email + PIN):")
        print("  Staff 1:  meron.alemu@00000000.staff / PIN 1234 (Meron Alemu)")
        print("  Staff 2:  yonas.tadesse@00000000.staff / PIN 5678 (Yonas Tadesse)")
        print()
        print("Bank Accounts Registered:")
        print("  - CBE:    1000135792 (Sunshine Cafe PLC)")
        print("  - Dashen: 2000246801 (Sunshine Cafe PLC)")
        print("=" * 50)


if __name__ == "__main__":
    force = "--force" in sys.argv or "-f" in sys.argv
    asyncio.run(seed(force=force))
