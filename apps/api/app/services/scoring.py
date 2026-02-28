from __future__ import annotations

import math

from app.constants import LATE_NIGHT_MULTIPLIER, SCORING_WEIGHTS
from app.models import UsageSnapshot


def _clamp(value: float, min_value: float, max_value: float) -> float:
    if not math.isfinite(value):
        return min_value
    return max(min_value, min(max_value, value))


def _js_round(value: float) -> int:
    # Match JS Math.round for non-negative values.
    if value >= 0:
        return int(math.floor(value + 0.5))
    return int(math.ceil(value - 0.5))


def _is_distracting_now(snapshot: UsageSnapshot) -> bool:
    return snapshot.categories.active_category in ("social", "entertainment")


def _normalize_switch_rate(switches_per_min: float) -> float:
    s = max(0.0, float(switches_per_min))
    if s <= 4:
        return s / 10
    if s <= 10:
        return 0.4 + (s - 4) * (0.4 / 6)
    return 0.8 + min(s - 10, 5) * (0.2 / 5)


def _is_late_night_hour(hour: int) -> bool:
    return hour >= 23 or hour < 5


def compute_score(snapshot: UsageSnapshot, snooze_pressure: float = 0.0) -> float:
    focus_score = snapshot.signals.focus_score
    if focus_score is not None and math.isfinite(float(focus_score)):
        raw = (100 - float(focus_score)) + float(snooze_pressure)
        return _clamp(_js_round(raw), 0, 100)

    is_distracting_now = _is_distracting_now(snapshot)

    if snapshot.signals.recent_distract_ratio is not None:
        distract_ratio_raw = float(snapshot.signals.recent_distract_ratio)
    else:
        distract_ratio_raw = (
            float(snapshot.signals.distracting_minutes) / float(snapshot.signals.session_minutes)
            if snapshot.signals.session_minutes > 0
            else 0.0
        )

    distract_ratio = _clamp(distract_ratio_raw, 0, 1)
    effective_distract_ratio = max(distract_ratio, 0.9) if is_distracting_now else distract_ratio

    switches_per_min = float(snapshot.signals.app_switches_last5min) / 5
    norm_switch_rate = _clamp(_normalize_switch_rate(switches_per_min), 0, 1)
    norm_switch_rate_effective = norm_switch_rate if (is_distracting_now or effective_distract_ratio >= 0.2) else 0.0

    intent_gap = 1.0 if snapshot.focus_intent is not None and is_distracting_now else 0.0
    snooze_pressure_norm = _clamp(float(snapshot.signals.snoozes_last60min), 0, 3) / 3

    base = 100 * (
        SCORING_WEIGHTS["distractRatio"] * effective_distract_ratio
        + SCORING_WEIGHTS["switchRate"] * norm_switch_rate_effective
        + SCORING_WEIGHTS["intentGap"] * intent_gap
        + SCORING_WEIGHTS["snoozePressure"] * snooze_pressure_norm
    )

    hour = int(snapshot.signals.time_of_day_local)
    mult = LATE_NIGHT_MULTIPLIER if _is_late_night_hour(hour) else 1.0
    score = _js_round((base + float(snooze_pressure)) * mult)
    return _clamp(score, 0, 100)


def compute_reasons(snapshot: UsageSnapshot, score: float = 0.0) -> list[str]:
    reasons: list[str] = []

    is_distracting_now = _is_distracting_now(snapshot)

    if snapshot.signals.recent_distract_ratio is not None:
        distract_ratio_raw = float(snapshot.signals.recent_distract_ratio)
    else:
        distract_ratio_raw = (
            float(snapshot.signals.distracting_minutes) / float(snapshot.signals.session_minutes)
            if snapshot.signals.session_minutes > 0
            else 0.0
        )

    distract_ratio = _clamp(distract_ratio_raw, 0, 1)
    effective_distract_ratio = max(distract_ratio, 0.9) if is_distracting_now else distract_ratio

    if effective_distract_ratio >= 0.7:
        reasons.append("High distracting time recently")
    elif effective_distract_ratio >= 0.4:
        reasons.append("A lot of recent time is distracting")
    elif effective_distract_ratio >= 0.2:
        reasons.append("Some recent time is distracting")

    switches_per_min = float(snapshot.signals.app_switches_last5min) / 5
    if is_distracting_now or effective_distract_ratio >= 0.2:
        if switches_per_min >= 8:
            reasons.append("Very frequent app switching")
        elif switches_per_min >= 4:
            reasons.append("Frequent app switching")
        elif switches_per_min >= 2:
            reasons.append("Some app switching")

    if snapshot.focus_intent is not None and is_distracting_now:
        where = snapshot.categories.active_domain or snapshot.categories.active_app
        reasons.append(f'Focus intent "{snapshot.focus_intent.label}" — but you\'re on {where}')

    if snapshot.signals.snoozes_last60min >= 2:
        reasons.append(f"Snoozed {snapshot.signals.snoozes_last60min} times in the last hour")

    hour = int(snapshot.signals.time_of_day_local)
    if _is_late_night_hour(hour):
        reasons.append("Late-night hours increase distraction")

    if len(reasons) == 0 and float(score) > 0:
        reasons.append("Mild distraction detected")

    if len(reasons) == 0:
        reasons.append("You're focused — keep it up!")

    return reasons

