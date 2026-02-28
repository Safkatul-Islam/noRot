from __future__ import annotations

from fastapi import APIRouter, Query

from app.db import get_history
from app.models import HistoryEntry

router = APIRouter(tags=["history"])


@router.get("/history", response_model=list[HistoryEntry])
def history(limit: int = Query(100, ge=1, le=1000)) -> list[HistoryEntry]:
    rows = get_history(limit=limit)
    return [HistoryEntry(**r) for r in rows]

