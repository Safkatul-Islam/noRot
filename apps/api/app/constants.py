"""Shared constants for the FastAPI service.

Keep these in sync with packages/shared/src/constants.ts.
"""

# Scoring weights (see packages/shared/src/constants.ts -> SCORING_WEIGHTS)
WEIGHT_DISTRACT_RATIO = 0.55
WEIGHT_SWITCH_RATE = 0.30
WEIGHT_INTENT_GAP = 0.00
WEIGHT_SNOOZE_PRESSURE = 0.15

# Late night multiplier (see packages/shared/src/constants.ts -> LATE_NIGHT_MULTIPLIER)
LATE_NIGHT_MULTIPLIER = 1.25
