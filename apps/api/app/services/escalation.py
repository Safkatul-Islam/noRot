from __future__ import annotations

import math

from app.models import RecommendationMode, Severity


def score_to_severity(score: float) -> Severity:
    s = max(0, min(100, int(math.floor(float(score) + 0.5))))
    if s <= 24:
        return 0
    if s <= 49:
        return 1
    if s <= 69:
        return 2
    if s <= 89:
        return 3
    return 4


def apply_snooze_escalation(severity: Severity, snoozes_last60min: int) -> Severity:
    bump = max(0, int(snoozes_last60min)) // 2
    return min(4, int(severity) + bump)  # type: ignore[return-value]


def get_mode(severity: Severity) -> RecommendationMode:
    if severity == 0:
        return "none"
    if severity == 1:
        return "nudge"
    if severity == 2:
        return "remind"
    if severity == 3:
        return "interrupt"
    return "crisis"

