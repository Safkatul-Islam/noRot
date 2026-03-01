"""GET /stats/apps - Aggregated app usage statistics."""

from fastapi import APIRouter, Query

from .. import db

router = APIRouter()


@router.get("/stats/apps")
async def get_app_stats(minutes: int | None = Query(default=None, ge=1)):
    """Return aggregated app usage from stored snapshots.

    Query params:
        minutes: optional time window in minutes (e.g. 60 for last hour).
    """
    rows = db.get_app_stats(minutes=minutes)

    return [
        {
            "appName": row["app_name"],
            "domain": row.get("domain"),
            "category": row["category"],
            "count": row["count"],
        }
        for row in rows
    ]
