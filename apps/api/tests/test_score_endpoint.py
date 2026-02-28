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


def test_score_endpoint_returns_expected_shape_and_persists_history(client):
    payload = _snapshot_dict(
        timestamp="2026-02-23T12:00:00.000Z",
        session_minutes=20,
        distracting_minutes=10,
        productive_minutes=10,
        app_switches_last_5_min=10,
        active_category="productive",
        focus_intent=False,
    )

    res = client.post("/score?persona=coach&snoozePressure=0", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert "procrastinationScore" in data
    assert "severity" in data
    assert "reasons" in data
    assert "recommendation" in data
    assert data["recommendation"]["persona"] == "coach"
    assert data["recommendation"]["mode"] in (
        "none",
        "nudge",
        "remind",
        "interrupt",
        "crisis",
    )

    # History should have at least this entry.
    hist = client.get("/history?limit=1")
    assert hist.status_code == 200
    rows = hist.json()
    assert len(rows) == 1
    assert rows[0]["timestamp"] == "2026-02-23T12:00:00.000Z"


def test_score_endpoint_rejects_invalid_snooze_pressure(client):
    payload = _snapshot_dict()
    res = client.post("/score?snoozePressure=16", json=payload)
    assert res.status_code == 422


def test_score_endpoint_accepts_context_todo_and_override(client):
    """contextTodo and contextOverride are optional fields in UsageCategories.

    The desktop sends these when a matched todo provides context. The API
    must accept and parse them (not silently drop them).
    """
    payload = _snapshot_dict()
    payload["categories"]["contextTodo"] = "Write report"
    payload["categories"]["contextOverride"] = True
    res = client.post("/score?persona=calm_friend", json=payload)
    assert res.status_code == 200


def test_usage_categories_model_parses_context_fields():
    """UsageCategories must expose contextTodo and contextOverride as attributes."""
    from app.models import UsageCategories

    cat = UsageCategories(
        activeApp="Chrome",
        activeCategory="social",
        contextTodo="Write report",
        contextOverride=True,
    )
    assert cat.context_todo == "Write report"
    assert cat.context_override is True


def test_usage_categories_model_defaults_context_fields_to_none():
    """contextTodo and contextOverride should default to None when absent."""
    from app.models import UsageCategories

    cat = UsageCategories(activeApp="Chrome", activeCategory="productive")
    assert cat.context_todo is None
    assert cat.context_override is None
