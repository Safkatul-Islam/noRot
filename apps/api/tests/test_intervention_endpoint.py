"""Tests for POST /intervention and PATCH /intervention/{id} endpoints."""

from app import db


def test_post_intervention_creates_record(client):
    payload = {
        "id": "int-100",
        "timestamp": "2026-02-27T10:00:00.000Z",
        "score": 72.5,
        "severity": 3,
        "persona": "coach",
        "text": "Stop scrolling and get back to work.",
        "userResponse": "pending",
        "audioPlayed": False,
    }
    res = client.post("/intervention", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["id"] == "int-100"

    # Verify it was persisted
    rows = db.get_interventions(limit=5)
    assert len(rows) == 1
    assert rows[0]["id"] == "int-100"
    assert rows[0]["severity"] == 3


def test_patch_intervention_updates_response(client):
    payload = {
        "id": "int-200",
        "timestamp": "2026-02-27T10:05:00.000Z",
        "score": 55.0,
        "severity": 2,
        "persona": "calm_friend",
        "text": "Hey, refocus.",
        "userResponse": "pending",
        "audioPlayed": False,
    }
    client.post("/intervention", json=payload)

    res = client.patch("/intervention/int-200", json={"userResponse": "snoozed"})
    assert res.status_code == 200

    rows = db.get_interventions(limit=5)
    assert rows[0]["user_response"] == "snoozed"


def test_patch_intervention_rejects_invalid_response(client):
    payload = {
        "id": "int-300",
        "timestamp": "2026-02-27T10:10:00.000Z",
        "score": 40.0,
        "severity": 1,
        "persona": "tough_love",
        "text": "Bruh.",
        "userResponse": "pending",
        "audioPlayed": False,
    }
    client.post("/intervention", json=payload)

    res = client.patch("/intervention/int-300", json={"userResponse": "invalid_value"})
    assert res.status_code == 422


def test_get_interventions_list(client):
    for i in range(3):
        payload = {
            "id": f"int-list-{i}",
            "timestamp": f"2026-02-27T10:0{i}:00.000Z",
            "score": 50.0 + i * 10,
            "severity": 2,
            "persona": "coach",
            "text": f"Message {i}",
            "userResponse": "pending",
            "audioPlayed": False,
        }
        client.post("/intervention", json=payload)

    res = client.get("/interventions?limit=2")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
