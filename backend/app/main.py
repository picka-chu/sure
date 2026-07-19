import logging
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.config import settings
from app.limiter import limiter
from app.api import auth, businesses, banks, staff, verifications, analytics, subscription, admin

logging.basicConfig(
    level=logging.INFO,
    format='%(message)s',
)
log_handler = logging.StreamHandler()
log_handler.setFormatter(logging.Formatter(
    fmt='%(message)s'
))
logging.getLogger().handlers = [log_handler]


class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info and record.exc_info[0]:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


json_handler = logging.StreamHandler()
json_handler.setFormatter(JsonFormatter())
logging.getLogger().handlers = [json_handler]
logging.getLogger().setLevel(logging.INFO)

logger = logging.getLogger("surepay")

app = FastAPI(
    title="Surepay - Bank Transfer Verifier",
    description="SaaS platform for Ethiopian businesses to verify bank transfer receipts",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
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
app.include_router(admin.router)


@app.api_route("/api/health", methods=["GET", "HEAD"])
async def health():
    return {"status": "ok", "service": "Surepay API"}


@app.api_route("/{path:path}", methods=["HEAD"])
async def head_catch_all():
    return ""
