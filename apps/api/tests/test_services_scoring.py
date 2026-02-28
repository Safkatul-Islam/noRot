from app.models import UsageSnapshot
from app.services.scoring import compute_reasons, compute_score


def _snapshot_dict(
    *,
    timestamp="2026-01-01T00:00:00.000Z",
    session_minutes=20,
    distracting_minutes=10,
    productive_minutes=10,
    app_switches_last_5_min=10,
    idle_seconds_last_5_min=5,
    time_of_day_local="14:30",
    snoozes_last_60_min=0,
    active_app="VS Code",
    active_category="productive",
    focus_intent=True,
):
    return {
        "timestamp": timestamp,
        "focusIntent": (
            {"label": "Write report", "minutesRemaining": 30} if focus_intent else None
        ),
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


def test_compute_score_increases_late_night_multiplier():
    day = UsageSnapshot.model_validate(
        _snapshot_dict(
            time_of_day_local="14:30", distracting_minutes=8, session_minutes=20
        )
    )
    night = UsageSnapshot.model_validate(
        _snapshot_dict(
            time_of_day_local="23:30", distracting_minutes=8, session_minutes=20
        )
    )

    s_day = compute_score(day, 0.0)
    s_night = compute_score(night, 0.0)
    assert s_night > s_day


def test_compute_reasons_focused_default_message():
    snap = UsageSnapshot.model_validate(
        _snapshot_dict(
            distracting_minutes=0,
            productive_minutes=20,
            app_switches_last_5_min=0,
            active_category="productive",
            focus_intent=False,
            snoozes_last_60_min=0,
            time_of_day_local="10:00",
        )
    )
    reasons = compute_reasons(snap)
    assert isinstance(reasons, list)
    assert reasons
    assert any("You're focused" in r for r in reasons)


def test_compute_score_distracting_category_is_immediate():
    snap = UsageSnapshot.model_validate(
        _snapshot_dict(
            # Simulate "just got distracted" in a long session: ratio is still low,
            # but the current app/category is distracting.
            session_minutes=60,
            distracting_minutes=1,
            productive_minutes=59,
            app_switches_last_5_min=0,
            active_app="Chrome",
            active_category="social",
            focus_intent=False,
        )
    )

    score = compute_score(snap, 0.0)
    assert score >= 45.0


def test_compute_reasons_high_distract_ratio():
    snap = UsageSnapshot.model_validate(
        _snapshot_dict(
            session_minutes=20,
            distracting_minutes=15,
            productive_minutes=5,
            app_switches_last_5_min=0,
            active_category="productive",
            focus_intent=False,
        )
    )
    reasons = compute_reasons(snap, 50.0)
    assert any("most of your time" in r for r in reasons)


def test_compute_reasons_moderate_distract_ratio():
    snap = UsageSnapshot.model_validate(
        _snapshot_dict(
            session_minutes=20,
            distracting_minutes=7,
            productive_minutes=13,
            app_switches_last_5_min=0,
            active_category="productive",
            focus_intent=False,
        )
    )
    reasons = compute_reasons(snap, 30.0)
    assert any("Some time spent" in r for r in reasons)


def test_compute_reasons_rapid_switching():
    snap = UsageSnapshot.model_validate(
        _snapshot_dict(
            app_switches_last_5_min=60,  # 12/min
            active_category="productive",
            focus_intent=False,
        )
    )
    reasons = compute_reasons(snap, 40.0)
    assert any("Rapidly switching" in r for r in reasons)


def test_compute_reasons_frequent_switching():
    snap = UsageSnapshot.model_validate(
        _snapshot_dict(
            app_switches_last_5_min=30,  # 6/min
            active_category="productive",
            focus_intent=False,
        )
    )
    reasons = compute_reasons(snap, 40.0)
    assert any("frequently" in r for r in reasons)


def test_compute_reasons_intent_gap_with_domain():
    d = _snapshot_dict(
        active_app="Chrome",
        active_category="social",
        focus_intent=True,
    )
    d["categories"]["activeDomain"] = "twitter.com"
    snap = UsageSnapshot.model_validate(d)
    reasons = compute_reasons(snap, 60.0)
    assert any(
        "Chrome on twitter.com" in r and "Write report" in r for r in reasons
    )


def test_compute_reasons_distracting_app_no_intent():
    d = _snapshot_dict(
        active_app="Chrome",
        active_category="entertainment",
        focus_intent=False,
    )
    d["categories"]["activeDomain"] = "youtube.com"
    snap = UsageSnapshot.model_validate(d)
    reasons = compute_reasons(snap, 50.0)
    assert any("Chrome on youtube.com (entertainment)" in r for r in reasons)


def test_compute_reasons_late_night():
    snap = UsageSnapshot.model_validate(
        _snapshot_dict(
            time_of_day_local="02:00",
            active_category="productive",
            focus_intent=False,
        )
    )
    reasons = compute_reasons(snap, 30.0)
    assert any("late at night" in r for r in reasons)


def test_compute_reasons_mild_distraction_fallback():
    snap = UsageSnapshot.model_validate(
        _snapshot_dict(
            session_minutes=10,
            distracting_minutes=1,  # ratio 0.1, below 0.25
            productive_minutes=9,
            app_switches_last_5_min=2,  # 0.4/min, below 5
            active_category="productive",
            focus_intent=False,
            snoozes_last_60_min=0,
            time_of_day_local="14:00",
        )
    )
    reasons = compute_reasons(snap, 5.0)
    assert reasons == ["Mild distraction detected"]
