"""GET /wins - Motivation metrics (refocus count, focused minutes)."""

from fastapi import APIRouter

from ..models import WinsData
from .. import db

router = APIRouter()


@router.get("/wins", response_model=WinsData)
async def get_wins():
    """Return today's wins: refocus count and total focused minutes."""
    data = db.get_wins_data()
    return WinsData(
        refocus_count=data["refocus_count"],
        total_focused_minutes=data["total_focused_minutes"],
    )
