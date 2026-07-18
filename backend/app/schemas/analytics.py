from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date


class DailyStats(BaseModel):
    date: date
    total: int
    verified: int
    scam: int
    pending: int


class DashboardResponse(BaseModel):
    total_verifications: int
    verified_today: int
    scam_today: int
    scam_rate: float
    total_scans_today: int
    recent_verifications: list
    daily_stats: List[DailyStats]
    bank_breakdown: dict
