"""Procrastination scoring formula.

Matches the scoring algorithm from the noRot architecture doc.
"""

from ..models import UsageSnapshot
from ..constants import (
    WEIGHT_DISTRACT_RATIO,
    WEIGHT_SWITCH_RATE,
    WEIGHT_INTENT_GAP,
    WEIGHT_SNOOZE_PRESSURE,
    LATE_NIGHT_MULTIPLIER,
)


def _parse_hour(time_of_day_local: str) -> int:
    """Extract the hour from a 'HH:MM' string."""
    try:
        return int(time_of_day_local.split(":")[0])
    except (ValueError, IndexError):
        return 12  # safe default (noon)


def _normalize_switch_rate(switches_per_min: float) -> float:
    """Normalize app switches per minute to a 0-1 scale.

    Matches packages/shared/src/scoring.ts.

    0-4 switches/min  -> low   (linear 0.0 - 0.4)
    5-10 switches/min -> medium (linear 0.4 - 0.8)
    11+ switches/min  -> high  (linear 0.8 - 1.0, capped at 1.0)
    """
    s = switches_per_min
    if s <= 4:
        return s / 10
    if s <= 10:
        return 0.4 + (s - 4) * (0.4 / 6)
    return 0.8 + min(s - 10, 5) * (0.2 / 5)


def compute_score(snapshot: UsageSnapshot, snooze_pressure: float = 0.0) -> float:
    """Compute the procrastination score (0-100) from a usage snapshot.

    Parameters
    ----------
    snapshot : UsageSnapshot
        Current usage data sent by the Electron client.
    snooze_pressure : float
        Extra additive pressure points from recent snoozes (default 0).

    Returns
    -------
    float
        A score between 0 and 100, where higher = more procrastination.
    """
    signals = snapshot.signals

    # Prefer client-computed focus score when available.
    # `focusScore` is 0-100 where higher = more focused; invert to procrastination score.
    if signals.focus_score is not None:
        score = (100.0 - signals.focus_score) + snooze_pressure
        return max(0.0, min(score, 100.0))

    # --- distract ratio ---
    if signals.session_minutes <= 0:
        distract_ratio = 0.0
    else:
        distract_ratio = min(signals.distracting_minutes / signals.session_minutes, 1.0)

    # Prefer the rolling 10-min window ratio when available
    if signals.recent_distract_ratio is not None:
        distract_ratio = signals.recent_distract_ratio

    # Make the score respond quickly when the user is *currently* in a distracting category.
    # Without this, ratio-based scoring can lag by minutes in long sessions.
    is_distracting_now = snapshot.categories.active_category in (
        "social",
        "entertainment",
    )
    if is_distracting_now:
        distract_ratio = max(distract_ratio, 0.9)

    # --- normalized switch rate ---
    # The client sends a raw count of switches in the last 5 minutes.
    switches_per_min = signals.app_switches_last_5_min / 5.0
    norm_switch_rate = _normalize_switch_rate(switches_per_min)
    switch_penalty_eligible = (
        is_distracting_now or max(0.0, min(distract_ratio, 1.0)) >= 0.2
    )
    norm_switch_rate_effective = norm_switch_rate if switch_penalty_eligible else 0.0

    # --- intent gap ---
    intent_gap = 0.0
    if snapshot.focus_intent is not None and snapshot.categories.active_category in (
        "social",
        "entertainment",
    ):
        intent_gap = 1.0

    # --- snooze pressure ---
    snooze_p = min(signals.snoozes_last_60_min, 3) / 3.0

    # --- base score ---
    base = 100.0 * (
        WEIGHT_DISTRACT_RATIO * distract_ratio
        + WEIGHT_SWITCH_RATE * norm_switch_rate_effective
        + WEIGHT_INTENT_GAP * intent_gap
        + WEIGHT_SNOOZE_PRESSURE * snooze_p
    )

    # --- late-night multiplier ---
    hour = _parse_hour(signals.time_of_day_local)
    late_night_multiplier = (
        LATE_NIGHT_MULTIPLIER if hour in (23, 0, 1, 2, 3, 4) else 1.0
    )

    # --- final score ---
    score = (base + snooze_pressure) * late_night_multiplier
    return max(0.0, min(score, 100.0))


def compute_reasons(snapshot: UsageSnapshot, score: float = 0.0) -> list[str]:
    """Generate human-readable reasons that explain the score.

    Mirrors packages/shared/src/scoring.ts:generateReasons — keep in sync.
    """
    reasons: list[str] = []
    signals = snapshot.signals
    categories = snapshot.categories

    # Distraction ratio (two tiers)
    if signals.session_minutes > 0:
        ratio = signals.distracting_minutes / signals.session_minutes
        if ratio > 0.5:
            reasons.append("Spending most of your time on distracting apps")
        elif ratio > 0.25:
            reasons.append("Some time spent on distracting apps")

    # Switch rate (per-minute, two tiers)
    switches_per_min = signals.app_switches_last_5_min / 5.0
    if switches_per_min >= 11:
        reasons.append("Rapidly switching between apps")
    elif switches_per_min >= 5:
        reasons.append("Switching between apps frequently")

    # Intent gap: using distracting app when focus intent is set
    is_distracting = categories.active_category in ("social", "entertainment")
    domain_info = (
        f" on {categories.active_domain}" if categories.active_domain else ""
    )

    if snapshot.focus_intent is not None and is_distracting:
        reasons.append(
            f"Using {categories.active_app}{domain_info} instead of working on "
            f"'{snapshot.focus_intent.label}'"
        )
    elif is_distracting:
        # No focus intent set — still note the distracting app
        reasons.append(
            f"Using {categories.active_app}{domain_info} ({categories.active_category})"
        )

    # Snooze pressure
    if signals.snoozes_last_60_min >= 2:
        reasons.append(
            f"Dismissed reminders {signals.snoozes_last_60_min} times recently"
        )

    # Late night
    hour = _parse_hour(signals.time_of_day_local)
    if hour in (23, 0, 1, 2, 3, 4):
        reasons.append("Working late at night (scores are stricter after 11 PM)")

    # Fallbacks
    if not reasons and score > 0:
        reasons.append("Mild distraction detected")
    if not reasons:
        reasons.append("You're focused — keep it up!")

    return reasons
