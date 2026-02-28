def test_history_endpoint_respects_limit_and_validation(client):
    # Empty DB returns empty list.
    res = client.get("/history?limit=10")
    assert res.status_code == 200
    assert res.json() == []

    # Invalid limits.
    assert client.get("/history?limit=0").status_code == 422
    assert client.get("/history?limit=999").status_code == 422


def test_history_endpoint_returns_newest_first(client):
    # Insert two scores via the API.
    base = {
        "focusIntent": None,
        "signals": {
            "sessionMinutes": 20,
            "distractingMinutes": 10,
            "productiveMinutes": 10,
            "appSwitchesLast5Min": 10,
            "idleSecondsLast5Min": 0,
            "timeOfDayLocal": "14:30",
            "snoozesLast60Min": 0,
        },
        "categories": {
            "activeApp": "VS Code",
            "activeCategory": "productive",
        },
    }

    client.post("/score", json={**base, "timestamp": "2026-02-23T12:00:00.000Z"})
    client.post("/score", json={**base, "timestamp": "2026-02-23T12:01:00.000Z"})

    res = client.get("/history?limit=2")
    assert res.status_code == 200
    rows = res.json()
    assert len(rows) == 2
    assert rows[0]["timestamp"] == "2026-02-23T12:01:00.000Z"
    assert rows[1]["timestamp"] == "2026-02-23T12:00:00.000Z"
