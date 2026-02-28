import time
from fastapi import APIRouter, Query
from models import InterventionRequest, InterventionResponse
from db import get_db
from gemini_service import generate_intervention_script

router = APIRouter(tags=["interventions"])


@router.post("/intervention", response_model=InterventionResponse)
async def create_intervention(request: InterventionRequest):
    """Generate an AI intervention script and persist it."""
    script = generate_intervention_script(request)

    # Store in database
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO interventions (timestamp, score, severity, persona, script, top_distraction)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                int(time.time()),
                request.score,
                request.severity,
                request.persona,
                script,
                request.top_distraction,
            ),
        )
        conn.commit()

    return InterventionResponse(
        script=script,
        persona=request.persona,
        severity=request.severity,
    )


@router.get("/interventions")
async def list_interventions(limit: int = Query(20, ge=1, le=200)):
    """List past interventions, most recent first."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, timestamp, score, severity, persona, script, top_distraction
            FROM interventions
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = cursor.fetchall()

    return [
        {
            "id": row["id"],
            "timestamp": row["timestamp"],
            "score": row["score"],
            "severity": row["severity"],
            "persona": row["persona"],
            "script": row["script"],
            "top_distraction": row["top_distraction"],
        }
        for row in rows
    ]
