"""POST /intervention, PATCH /intervention/{id}, GET /interventions."""

from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict, Field

from ..models import InterventionEvent
from .. import db

router = APIRouter()


class InterventionUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_response: Literal["snoozed", "dismissed", "working"] = Field(
        alias="userResponse"
    )


@router.post("/intervention", status_code=201, response_model=InterventionEvent)
async def create_intervention(event: InterventionEvent):
    """Log a new intervention event from the desktop client."""
    db.insert_intervention(
        id=event.id,
        timestamp=event.timestamp,
        score=event.score,
        severity=event.severity,
        persona=event.persona,
        text=event.text,
    )
    return event


@router.patch("/intervention/{intervention_id}")
async def update_intervention(intervention_id: str, body: InterventionUpdate):
    """Update the user's response to an intervention."""
    db.update_intervention_response(intervention_id, body.user_response)
    return {"id": intervention_id, "userResponse": body.user_response}


@router.get("/interventions")
async def list_interventions(limit: int = Query(50, ge=1, le=500)):
    """Return recent interventions, newest first."""
    rows = db.get_interventions(limit=limit)
    return [
        {
            "id": row["id"],
            "timestamp": row["timestamp"],
            "score": row["score"],
            "severity": row["severity"],
            "persona": row["persona"],
            "text": row["text"],
            "userResponse": row["user_response"],
            "audioPlayed": bool(row["audio_played"]),
        }
        for row in rows
    ]
