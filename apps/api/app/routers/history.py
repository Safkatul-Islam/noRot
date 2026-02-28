"""GET /history - Retrieve recent score history."""

from fastapi import APIRouter, Query

from ..models import HistoryEntry
from .. import db

router = APIRouter()


@router.get("/history", response_model=list[HistoryEntry])
async def get_history(limit: int = Query(50, ge=1, le=500)):
    """Return the last N score results from the database.

    Query params:
        limit: number of entries to return (default 50, max 500).
    """
    rows = db.get_history(limit=limit)

    return [
        HistoryEntry(
            id=row["id"],
            timestamp=row["timestamp"],
            procrastination_score=row["score"],
            severity=row["severity"],
            persona=row["persona"],
            mode=row["mode"],
            text=row["text"],
        )
        for row in rows
    ]
