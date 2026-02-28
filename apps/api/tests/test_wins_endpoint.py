"""Tests for GET /wins endpoint."""

import json

from app import db


def test_wins_returns_zeros_with_no_data(client):
    res = client.get("/wins")
    assert res.status_code == 200
    data = res.json()
    assert data["refocusCount"] == 0
    assert data["totalFocusedMinutes"] == 0


def test_wins_counts_refocuses(client):
    db.insert_intervention(
        id="w1",
        timestamp="2026-02-27T10:00:00.000Z",
        score=60.0,
        severity=2,
        persona="coach",
        text="Focus up.",
    )
    db.update_intervention_response("w1", "working")

    db.insert_intervention(
        id="w2",
        timestamp="2026-02-27T10:05:00.000Z",
        score=55.0,
        severity=2,
        persona="coach",
        text="Come on.",
    )
    db.update_intervention_response("w2", "snoozed")  # not a refocus

    res = client.get("/wins")
    data = res.json()
    assert data["refocusCount"] == 1


def test_wins_includes_focused_minutes(client):
    db.insert_snapshot(
        "2026-02-27T10:00:00.000Z",
        json.dumps({"activeApp": "VS Code", "activeCategory": "productive", "productiveMinutes": 42}),
    )

    res = client.get("/wins")
    data = res.json()
    assert data["totalFocusedMinutes"] == 42
