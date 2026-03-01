"""POST /score - Compute procrastination score from a usage snapshot."""

from fastapi import APIRouter, Query

from ..models import (
    Recommendation,
    ScoreResponse,
    TTSSettings,
    UsageSnapshot,
)
from ..services.scoring import compute_score, compute_reasons
from ..services.escalation import (
    score_to_severity,
    apply_snooze_escalation,
    get_mode,
)
from ..services.scripts import get_intervention_text, get_tts_settings, get_cooldown
from .. import db

router = APIRouter()

# Default persona (can be overridden by client preference later)
DEFAULT_PERSONA = "calm_friend"


@router.post("/score", response_model=ScoreResponse)
async def score_snapshot(
    snapshot: UsageSnapshot,
    snooze_pressure: float = Query(0.0, ge=0.0, le=15.0, alias="snoozePressure"),
    persona: str = Query(DEFAULT_PERSONA),
):
    """Accept a UsageSnapshot and return a ScoreResponse.

    Query params:
        snoozePressure: extra additive snooze pressure points (0-15), default 0.
        persona: which voice persona to use (calm_friend | coach | tough_love).
    """
    # 1. Compute the raw score
    proc_score = compute_score(snapshot, snooze_pressure)

    # 2. Map score to severity, then apply snooze escalation
    severity = score_to_severity(proc_score)
    severity = apply_snooze_escalation(severity, snapshot.signals.snoozes_last_60_min)

    # 3. Build the recommendation
    mode = get_mode(severity)
    text = get_intervention_text(persona, severity)
    tts_raw = get_tts_settings(persona, severity)
    tts = TTSSettings(
        model=tts_raw["model"], stability=tts_raw["stability"], speed=tts_raw["speed"]
    )
    cooldown = get_cooldown(severity)

    recommendation = Recommendation(
        mode=mode,
        persona=persona,
        text=text,
        tts=tts,
        cooldown_seconds=cooldown,
    )

    # 4. Gather human-readable reasons
    reasons = compute_reasons(snapshot, proc_score)

    # 5. Persist to history
    db.insert_score(
        timestamp=snapshot.timestamp,
        score=proc_score,
        severity=severity,
        persona=persona,
        mode=mode,
        text=text,
    )

    return ScoreResponse(
        procrastination_score=round(proc_score, 2),
        severity=severity,
        reasons=reasons,
        recommendation=recommendation,
    )
