from fastapi import APIRouter, Query
from models import HistoryEntry
from db import get_db

router = APIRouter(tags=["history"])


@router.post("/history")
async def bulk_insert_history(entries: list[HistoryEntry]):
    """Bulk insert activity entries into the activity_log table."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.executemany(
            """
            INSERT INTO activity_log (timestamp, app, title, category, duration)
            VALUES (?, ?, ?, ?, ?)
            """,
            [(e.timestamp, e.app, e.title, e.category, e.duration) for e in entries],
        )
        conn.commit()
    return {"inserted": len(entries)}


@router.get("/history", response_model=list[HistoryEntry])
async def get_history(
    start: int = Query(0, description="Start timestamp (inclusive)"),
    end: int = Query(0, description="End timestamp (inclusive, 0 = no upper bound)"),
):
    """Query activity log with optional date range filtering."""
    with get_db() as conn:
        cursor = conn.cursor()
        if end > 0:
            cursor.execute(
                """
                SELECT timestamp, app, title, category, duration
                FROM activity_log
                WHERE timestamp >= ? AND timestamp <= ?
                ORDER BY timestamp ASC
                """,
                (start, end),
            )
        else:
            cursor.execute(
                """
                SELECT timestamp, app, title, category, duration
                FROM activity_log
                WHERE timestamp >= ?
                ORDER BY timestamp ASC
                """,
                (start,),
            )
        rows = cursor.fetchall()

    return [
        HistoryEntry(
            timestamp=row["timestamp"],
            app=row["app"],
            title=row["title"],
            category=row["category"],
            duration=row["duration"],
        )
        for row in rows
    ]
