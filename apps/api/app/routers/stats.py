from __future__ import annotations

from fastapi import APIRouter, Query

from app.db import get_app_stats
from app.models import AppStatEntry

router = APIRouter(tags=["stats"])


@router.get("/stats/apps", response_model=list[AppStatEntry])
def app_stats(minutes: int = Query(60, ge=1, le=24 * 60)) -> list[AppStatEntry]:
    rows = get_app_stats(minutes=minutes)
    return [AppStatEntry(**r) for r in rows]

