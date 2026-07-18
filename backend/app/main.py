from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import auth, businesses, banks, staff, verifications, analytics, subscription

app = FastAPI(
    title="Sure - Bank Transfer Verifier",
    description="SaaS platform for Ethiopian businesses to verify bank transfer receipts",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(businesses.router)
app.include_router(banks.router)
app.include_router(staff.router)
app.include_router(verifications.router)
app.include_router(analytics.router)
app.include_router(subscription.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "Sure API"}
