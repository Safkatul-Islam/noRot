import time
from fastapi import APIRouter, Query
from models import WinCreate, WinResponse
from db import get_db

router = APIRouter(tags=["wins"])


@router.post("/wins", response_model=WinResponse)
async def create_win(win: WinCreate):
    """Record a productivity win."""
    ts = int(time.time())

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO wins (timestamp, description, score, type)
            VALUES (?, ?, ?, ?)
            """,
            (ts, win.description, win.score, win.type),
        )
        conn.commit()
        win_id = cursor.lastrowid

    return WinResponse(
        id=win_id,
        timestamp=ts,
        description=win.description,
        score=win.score,
        type=win.type,
    )


@router.get("/wins", response_model=list[WinResponse])
async def list_wins(limit: int = Query(20, ge=1, le=200)):
    """List recorded wins, most recent first."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, timestamp, description, score, type
            FROM wins
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = cursor.fetchall()

    return [
        WinResponse(
            id=row["id"],
            timestamp=row["timestamp"],
            description=row["description"],
            score=row["score"],
            type=row["type"],
        )
        for row in rows
    ]
