from datetime import datetime
from fastapi import APIRouter
from models import ScoreRequest, ScoreResponse

router = APIRouter(tags=["score"])


@router.post("/score", response_model=ScoreResponse)
async def compute_score(request: ScoreRequest):
    """Compute a procrastination score from recent activity data."""
    activities = request.activities

    if not activities:
        return ScoreResponse(
            score=100,
            severity="none",
            distraction_ratio=0.0,
            switch_rate=0.0,
            snooze_pressure=0.0,
            top_distraction=None,
            minutes_monitored=0.0,
        )

    total_duration = sum(a.duration for a in activities)
    minutes_monitored = total_duration / 60.0

    # --- Distraction ratio ---
    distraction_seconds = sum(
        a.duration for a in activities if a.category == "distraction"
    )
    distraction_ratio = distraction_seconds / total_duration if total_duration > 0 else 0.0

    # --- Switch rate (unique app switches per minute) ---
    app_switches = 0
    for i in range(1, len(activities)):
        if activities[i].app != activities[i - 1].app:
            app_switches += 1
    switch_rate = app_switches / minutes_monitored if minutes_monitored > 0 else 0.0
    # Normalize: cap at 1.0 (10+ switches/min is max chaos)
    normalized_switch_rate = min(switch_rate / 10.0, 1.0)

    # --- Snooze pressure ---
    snooze_pressure = min(request.snooze_count / 5.0, 1.0)

    # --- Weighted raw score (0 = perfect, 1 = worst) ---
    raw = (
        distraction_ratio * 0.55
        + normalized_switch_rate * 0.30
        + snooze_pressure * 0.15
    )

    # --- Late night multiplier (23:00 - 05:00) ---
    latest_ts = max(a.timestamp for a in activities)
    hour = datetime.fromtimestamp(latest_ts).hour
    if hour >= 23 or hour < 5:
        raw = min(raw * 1.25, 1.0)

    # Convert to 0-100 score (100 = best)
    score = max(0, min(100, int((1.0 - raw) * 100)))

    # --- Severity classification ---
    if score >= 80:
        severity = "none"
    elif score >= 60:
        severity = "mild"
    elif score >= 40:
        severity = "moderate"
    elif score >= 20:
        severity = "high"
    else:
        severity = "critical"

    # --- Top distraction app ---
    distraction_apps: dict[str, int] = {}
    for a in activities:
        if a.category == "distraction":
            distraction_apps[a.app] = distraction_apps.get(a.app, 0) + a.duration
    top_distraction = (
        max(distraction_apps, key=distraction_apps.get) if distraction_apps else None
    )

    return ScoreResponse(
        score=score,
        severity=severity,
        distraction_ratio=round(distraction_ratio, 4),
        switch_rate=round(switch_rate, 4),
        snooze_pressure=round(snooze_pressure, 4),
        top_distraction=top_distraction,
        minutes_monitored=round(minutes_monitored, 2),
    )
