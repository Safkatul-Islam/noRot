from fastapi import APIRouter
from db import get_db

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/apps")
async def app_usage_breakdown():
    """Get per-app usage breakdown with total seconds, percentage, and category."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Total time across all apps
        cursor.execute("SELECT COALESCE(SUM(duration), 0) FROM activity_log")
        total_seconds = cursor.fetchone()[0]

        # Per-app breakdown
        cursor.execute(
            """
            SELECT app, category, SUM(duration) as total_seconds
            FROM activity_log
            GROUP BY app
            ORDER BY total_seconds DESC
            """
        )
        rows = cursor.fetchall()

    return [
        {
            "app": row["app"],
            "category": row["category"],
            "total_seconds": row["total_seconds"],
            "percentage": round(
                (row["total_seconds"] / total_seconds * 100) if total_seconds > 0 else 0,
                2,
            ),
        }
        for row in rows
    ]


@router.get("/daily")
async def daily_summary():
    """Get daily summary: total time, distraction time, avg score, intervention count."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Aggregate activity by day
        cursor.execute(
            """
            SELECT
                date(timestamp, 'unixepoch') as day,
                SUM(duration) as total_time,
                SUM(CASE WHEN category = 'distraction' THEN duration ELSE 0 END) as distraction_time
            FROM activity_log
            GROUP BY day
            ORDER BY day DESC
            """
        )
        activity_rows = cursor.fetchall()

        # Aggregate interventions by day
        cursor.execute(
            """
            SELECT
                date(timestamp, 'unixepoch') as day,
                COUNT(*) as interventions_count,
                AVG(score) as avg_score
            FROM interventions
            GROUP BY day
            """
        )
        intervention_rows = cursor.fetchall()

    # Build a lookup for intervention data keyed by day
    intervention_map: dict[str, dict] = {}
    for row in intervention_rows:
        intervention_map[row["day"]] = {
            "interventions_count": row["interventions_count"],
            "avg_score": round(row["avg_score"], 1) if row["avg_score"] is not None else None,
        }

    results = []
    for row in activity_rows:
        day = row["day"]
        intervention_data = intervention_map.get(day, {})
        results.append(
            {
                "date": day,
                "total_time": row["total_time"],
                "distraction_time": row["distraction_time"],
                "avg_score": intervention_data.get("avg_score"),
                "interventions_count": intervention_data.get("interventions_count", 0),
            }
        )

    return results
