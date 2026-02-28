"""Cross-stack consistency tests.

These tests define canonical input scenarios and assert that the Python
scoring / reasons / escalation code produces the EXACT same outputs as
the TypeScript implementation in packages/shared/src/scoring.ts.

If a test here fails, one of the two implementations has drifted — fix
whichever was changed last to restore parity.
"""

import math

import pytest

from app.models import UsageSnapshot
from app.services.escalation import apply_snooze_escalation, score_to_severity
from app.services.scoring import compute_reasons, compute_score
from app.constants import (
    WEIGHT_DISTRACT_RATIO,
    WEIGHT_SWITCH_RATE,
    WEIGHT_INTENT_GAP,
    WEIGHT_SNOOZE_PRESSURE,
    LATE_NIGHT_MULTIPLIER,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_snapshot(
    *,
    timestamp="2026-01-01T14:00:00.000Z",
    session_minutes=10,
    distracting_minutes=0,
    productive_minutes=10,
    app_switches_last_5_min=0,
    idle_seconds_last_5_min=0,
    time_of_day_local="14:00",
    snoozes_last_60_min=0,
    recent_distract_ratio=None,
    active_app="VSCode",
    active_category="productive",
    active_domain=None,
    focus_intent=None,
) -> UsageSnapshot:
    """Build a UsageSnapshot matching the TS makeSnapshot helper."""
    data = {
        "timestamp": timestamp,
        "focusIntent": focus_intent,
        "signals": {
            "sessionMinutes": session_minutes,
            "distractingMinutes": distracting_minutes,
            "productiveMinutes": productive_minutes,
            "appSwitchesLast5Min": app_switches_last_5_min,
            "idleSecondsLast5Min": idle_seconds_last_5_min,
            "timeOfDayLocal": time_of_day_local,
            "snoozesLast60Min": snoozes_last_60_min,
        },
        "categories": {
            "activeApp": active_app,
            "activeCategory": active_category,
        },
    }
    if recent_distract_ratio is not None:
        data["signals"]["recentDistractRatio"] = recent_distract_ratio
    if active_domain is not None:
        data["categories"]["activeDomain"] = active_domain
    return UsageSnapshot.model_validate(data)


# ---------------------------------------------------------------------------
# Constants parity
# ---------------------------------------------------------------------------


class TestConstantsParity:
    """Verify Python constants match packages/shared/src/constants.ts."""

    def test_scoring_weights(self):
        assert WEIGHT_DISTRACT_RATIO == 0.55
        assert WEIGHT_SWITCH_RATE == 0.30
        assert WEIGHT_INTENT_GAP == 0.00
        assert WEIGHT_SNOOZE_PRESSURE == 0.15

    def test_late_night_multiplier(self):
        assert LATE_NIGHT_MULTIPLIER == 1.25


# ---------------------------------------------------------------------------
# Severity mapping parity (TS SEVERITY_BANDS)
# ---------------------------------------------------------------------------


class TestSeverityParity:
    """score_to_severity must match TS SEVERITY_BANDS boundaries exactly."""

    @pytest.mark.parametrize(
        "score,expected",
        [
            (0, 0),
            (24, 0),
            (25, 1),
            (49, 1),
            (50, 2),
            (69, 2),
            (70, 3),
            (89, 3),
            (90, 4),
            (100, 4),
        ],
    )
    def test_severity_band_boundaries(self, score, expected):
        assert score_to_severity(score) == expected


# ---------------------------------------------------------------------------
# Snooze escalation parity (TS applySnoozeEscalation)
# ---------------------------------------------------------------------------


class TestSnoozeEscalationParity:
    """apply_snooze_escalation must match TS applySnoozeEscalation."""

    @pytest.mark.parametrize(
        "severity,snoozes,expected",
        [
            (1, 0, 1),
            (1, 1, 1),
            (1, 2, 2),
            (1, 4, 3),
            (0, 6, 3),
            (3, 10, 4),
            (4, 2, 4),  # already at max
        ],
    )
    def test_escalation_values(self, severity, snoozes, expected):
        assert apply_snooze_escalation(severity, snoozes) == expected


# ---------------------------------------------------------------------------
# Score computation parity (TS calculateScore)
# ---------------------------------------------------------------------------


class TestScoreParity:
    """compute_score must produce the same numeric results as TS calculateScore."""

    def test_fully_productive_scores_zero(self):
        """TS test: 'fully productive session scores 0'."""
        snap = _make_snapshot(
            session_minutes=10,
            distracting_minutes=0,
            productive_minutes=10,
            app_switches_last_5_min=0,
            snoozes_last_60_min=0,
            time_of_day_local="14:00",
        )
        score = compute_score(snap)
        assert score == 0

    def test_distracting_category_immediate_boost(self):
        """TS test: 'distracting category causes immediate score increase' -> >= 45."""
        snap = _make_snapshot(
            recent_distract_ratio=0.0,
            session_minutes=60,
            distracting_minutes=1,
            productive_minutes=59,
            app_switches_last_5_min=0,
            snoozes_last_60_min=0,
            active_app="Chrome",
            active_category="social",
        )
        score = compute_score(snap, 0.0)
        assert score >= 45

    def test_late_night_multiplier_increases_score(self):
        """TS test: 'late-night multiplier increases score'."""
        base = dict(
            recent_distract_ratio=0.6,
            app_switches_last_5_min=5,
            session_minutes=10,
            distracting_minutes=6,
            productive_minutes=4,
            snoozes_last_60_min=1,
            active_app="Chrome",
            active_category="entertainment",
        )
        day = _make_snapshot(**base, time_of_day_local="14:00")
        night = _make_snapshot(**base, time_of_day_local="23:30")

        day_score = compute_score(day)
        night_score = compute_score(night)
        assert night_score > day_score

    def test_score_caps_at_100(self):
        """TS test: 'score caps at 100'."""
        snap = _make_snapshot(
            recent_distract_ratio=1.0,
            app_switches_last_5_min=20,
            session_minutes=10,
            distracting_minutes=10,
            productive_minutes=0,
            snoozes_last_60_min=3,
            time_of_day_local="01:00",
            active_app="Chrome",
            active_category="entertainment",
        )
        score = compute_score(snap, 15)
        assert score == 100

    def test_recent_distract_ratio_overrides_session(self):
        """TS test: 'recentDistractRatio overrides session lifetime'."""
        base = dict(
            session_minutes=100,
            distracting_minutes=1,
            productive_minutes=99,
            app_switches_last_5_min=0,
            snoozes_last_60_min=0,
            time_of_day_local="14:00",
            active_app="Chrome",
            active_category="productive",
        )

        without = _make_snapshot(**base)
        with_recent = _make_snapshot(**base, recent_distract_ratio=0.8)

        session_score = compute_score(without)
        recent_score = compute_score(with_recent)

        assert recent_score > session_score + 20
        assert recent_score >= 36

    def test_switch_count_not_penalized_when_productive(self):
        """TS test: 'appSwitchesLast5Min is treated as a 5-minute count'.

        10 switches in 5 min = 2/min, well below penalty threshold.
        With productive category, switch penalty should be zero.
        """
        snap = _make_snapshot(
            recent_distract_ratio=0,
            app_switches_last_5_min=10,
            session_minutes=10,
            distracting_minutes=0,
            productive_minutes=10,
            snoozes_last_60_min=0,
            time_of_day_local="14:00",
            active_app="VSCode",
            active_category="productive",
        )
        score = compute_score(snap)
        assert score == 0


# ---------------------------------------------------------------------------
# Reasons parity (TS generateReasons)
# ---------------------------------------------------------------------------


class TestReasonsParity:
    """compute_reasons must produce the same messages as TS generateReasons."""

    def test_focused_message(self):
        snap = _make_snapshot()
        reasons = compute_reasons(snap, 0)
        assert reasons == ["You're focused — keep it up!"]

    def test_high_distract_ratio(self):
        snap = _make_snapshot(
            session_minutes=20,
            distracting_minutes=15,
            productive_minutes=5,
        )
        reasons = compute_reasons(snap, 50)
        assert any("most of your time" in r for r in reasons)

    def test_moderate_distract_ratio(self):
        snap = _make_snapshot(
            session_minutes=20,
            distracting_minutes=7,
            productive_minutes=13,
        )
        reasons = compute_reasons(snap, 30)
        assert any("Some time spent" in r for r in reasons)

    def test_rapid_switching(self):
        snap = _make_snapshot(app_switches_last_5_min=60)
        reasons = compute_reasons(snap, 50)
        assert any("Rapidly switching" in r for r in reasons)

    def test_frequent_switching(self):
        snap = _make_snapshot(app_switches_last_5_min=30)
        reasons = compute_reasons(snap, 40)
        assert any("frequently" in r for r in reasons)

    def test_intent_gap_with_domain(self):
        snap = _make_snapshot(
            active_app="Twitter",
            active_category="social",
            active_domain="twitter.com",
            focus_intent={"label": "Write essay", "minutesRemaining": 30},
        )
        reasons = compute_reasons(snap, 60)
        assert any(
            "Twitter on twitter.com" in r and "Write essay" in r for r in reasons
        )

    def test_distracting_app_no_intent_with_domain(self):
        snap = _make_snapshot(
            active_app="Chrome",
            active_category="entertainment",
            active_domain="youtube.com",
        )
        reasons = compute_reasons(snap, 50)
        assert any("Chrome on youtube.com (entertainment)" in r for r in reasons)

    def test_snooze_pressure_message(self):
        snap = _make_snapshot(snoozes_last_60_min=3)
        reasons = compute_reasons(snap, 40)
        assert any("Dismissed reminders 3 times" in r for r in reasons)

    def test_late_night_message(self):
        snap = _make_snapshot(time_of_day_local="02:00")
        reasons = compute_reasons(snap, 30)
        assert any("late at night" in r for r in reasons)

    def test_mild_distraction_fallback(self):
        snap = _make_snapshot(
            session_minutes=10,
            distracting_minutes=1,
            productive_minutes=9,
            app_switches_last_5_min=2,
            snoozes_last_60_min=0,
            time_of_day_local="14:00",
        )
        reasons = compute_reasons(snap, 5)
        assert reasons == ["Mild distraction detected"]


# ---------------------------------------------------------------------------
# Full pipeline parity: score -> severity -> reasons
# ---------------------------------------------------------------------------


class TestFullPipelineParity:
    """End-to-end scenarios that verify score+severity+reasons together."""

    def test_crisis_scenario(self):
        """Max distraction + late night + snoozes = severity 4, crisis reasons."""
        snap = _make_snapshot(
            recent_distract_ratio=1.0,
            app_switches_last_5_min=60,
            session_minutes=30,
            distracting_minutes=28,
            productive_minutes=2,
            snoozes_last_60_min=4,
            time_of_day_local="01:00",
            active_app="Reddit",
            active_category="social",
            active_domain="reddit.com",
            focus_intent={"label": "Study for exam", "minutesRemaining": 60},
        )
        score = compute_score(snap, 0.0)
        severity = score_to_severity(score)
        final_severity = apply_snooze_escalation(severity, 4)
        reasons = compute_reasons(snap, score)

        assert score >= 90, f"Crisis scenario should score >= 90, got {score}"
        assert final_severity == 4
        # Should mention: high distraction, rapid switching, intent gap, snoozes, late night
        assert any("most of your time" in r for r in reasons)
        assert any("Rapidly switching" in r for r in reasons)
        assert any("Study for exam" in r for r in reasons)
        assert any("Dismissed reminders" in r for r in reasons)
        assert any("late at night" in r for r in reasons)

    def test_focused_scenario(self):
        """Fully productive, daytime, no snoozes = severity 0, positive message."""
        snap = _make_snapshot(
            session_minutes=60,
            distracting_minutes=0,
            productive_minutes=60,
            app_switches_last_5_min=2,
            snoozes_last_60_min=0,
            time_of_day_local="10:00",
            active_app="VSCode",
            active_category="productive",
        )
        score = compute_score(snap)
        severity = score_to_severity(score)
        reasons = compute_reasons(snap, score)

        assert score == 0
        assert severity == 0
        assert reasons == ["You're focused — keep it up!"]

    def test_drifting_scenario(self):
        """Moderate distraction, some switching = severity 1-2."""
        snap = _make_snapshot(
            recent_distract_ratio=0.35,
            app_switches_last_5_min=15,
            session_minutes=30,
            distracting_minutes=10,
            productive_minutes=20,
            snoozes_last_60_min=0,
            time_of_day_local="15:00",
            active_app="Chrome",
            active_category="entertainment",
            active_domain="news.ycombinator.com",
        )
        score = compute_score(snap)
        severity = score_to_severity(score)
        reasons = compute_reasons(snap, score)

        assert 25 <= score < 90
        assert severity in (1, 2, 3)
        assert any("Some time spent" in r for r in reasons)
