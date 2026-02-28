from __future__ import annotations

from fastapi import APIRouter

from app.db import get_wins_data
from app.models import WinsData

router = APIRouter(tags=["wins"])


@router.get("/wins", response_model=WinsData)
def wins() -> WinsData:
    data = get_wins_data()
    return WinsData(**data)

