from __future__ import annotations

from fastapi import APIRouter, Query

from app.db import insert_score, insert_snapshot
from app.models import PersonaId, Recommendation, ScoreResponse, UsageSnapshot
from app.services.escalation import apply_snooze_escalation, get_mode, score_to_severity
from app.services.scoring import compute_reasons, compute_score
from app.services.scripts import get_cooldown, get_script, get_tts_settings

router = APIRouter(tags=["score"])


@router.post("/score", response_model=ScoreResponse)
def score(
    snapshot: UsageSnapshot,
    snooze_pressure: float = Query(0.0, alias="snoozePressure", ge=0.0, le=15.0),
    persona: PersonaId = Query("calm_friend"),
) -> ScoreResponse:
    raw_score = float(compute_score(snapshot, snooze_pressure=snooze_pressure))
    base_severity = score_to_severity(raw_score)
    severity = apply_snooze_escalation(base_severity, snapshot.signals.snoozes_last60min)
    mode = get_mode(severity)

    reasons = compute_reasons(snapshot, score=raw_score)
    text = get_script(persona, severity)

    recommendation = Recommendation(
        mode=mode,
        persona=persona,
        text=text,
        tts=get_tts_settings(severity),
        cooldownSeconds=get_cooldown(severity),
    )

    score_rounded = round(raw_score, 2)

    insert_snapshot(snapshot.timestamp, snapshot.model_dump(by_alias=True))
    insert_score(snapshot.timestamp, score_rounded, int(severity), persona, mode, text)

    return ScoreResponse(
        procrastinationScore=score_rounded,
        severity=severity,
        reasons=reasons,
        recommendation=recommendation,
    )

