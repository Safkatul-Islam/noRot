"""Score-to-severity mapping and escalation logic."""

from typing import Literal


# Mode names that correspond to each severity level
SEVERITY_MODES: dict[int, str] = {
    0: "none",
    1: "nudge",
    2: "remind",
    3: "interrupt",
    4: "crisis",
}


def score_to_severity(score: float) -> int:
    """Map a procrastination score (0-100) to a severity level (0-4).

    0-24   -> 0 (focused, no intervention)
    25-49  -> 1 (drifting, nudge)
    50-69  -> 2 (distracted, remind)
    70-89  -> 3 (procrastinating, interrupt)
    90-100 -> 4 (crisis)
    """
    if score < 25:
        return 0
    elif score < 50:
        return 1
    elif score < 70:
        return 2
    elif score < 90:
        return 3
    else:
        return 4


def apply_snooze_escalation(severity: int, snoozes_last_60_min: int) -> int:
    """Escalate severity if the user has been snoozing interventions.

    Each 2 snoozes bumps severity up by 1, capped at 4.
    """
    bump = snoozes_last_60_min // 2
    return min(severity + bump, 4)


def get_mode(severity: int) -> str:
    """Return the intervention mode string for a severity level."""
    return SEVERITY_MODES.get(severity, "none")
