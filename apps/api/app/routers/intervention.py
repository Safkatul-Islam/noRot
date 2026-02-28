from __future__ import annotations

from fastapi import APIRouter, Query, status

from app.db import get_intervention, get_interventions, insert_intervention, update_intervention_response
from app.models import InterventionEvent, InterventionUpdateRequest

router = APIRouter(tags=["intervention"])


@router.post("/intervention", response_model=InterventionEvent, status_code=status.HTTP_201_CREATED)
def create_intervention(event: InterventionEvent) -> InterventionEvent:
    insert_intervention(
        id=event.id,
        timestamp=event.timestamp,
        score=event.score,
        severity=int(event.severity),
        persona=event.persona,
        text=event.text,
        user_response=event.user_response,
        audio_played=event.audio_played,
    )
    return event


@router.patch("/intervention/{intervention_id}", response_model=InterventionEvent)
def update_intervention(intervention_id: str, body: InterventionUpdateRequest) -> InterventionEvent:
    update_intervention_response(intervention_id, body.user_response)
    row = get_intervention(intervention_id)
    if row:
        return InterventionEvent(**row)
    return InterventionEvent(
        id=intervention_id,
        timestamp=0,
        score=0.0,
        severity=0,
        persona="calm_friend",
        text="",
        user_response=body.user_response,
        audio_played=False,
    )


@router.get("/interventions", response_model=list[InterventionEvent])
def interventions(limit: int = Query(100, ge=1, le=1000)) -> list[InterventionEvent]:
    rows = get_interventions(limit=limit)
    return [InterventionEvent(**r) for r in rows]
