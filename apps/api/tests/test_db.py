import json

from app import db


def test_db_insert_and_history_round_trip(client):
    # Uses the patched DB via the client fixture.
    row_id = db.insert_score(
        timestamp="2026-01-01T00:00:00.000Z",
        score=12.34,
        severity=1,
        persona="calm_friend",
        mode="nudge",
        text="hello",
    )
    assert isinstance(row_id, int)
    assert row_id >= 1

    rows = db.get_history(limit=10)
    assert len(rows) == 1
    assert rows[0]["id"] == row_id
    assert rows[0]["score"] == 12.34
    assert rows[0]["severity"] == 1


# --- Snapshots ---

def test_insert_and_get_snapshots(client):
    data = json.dumps({"activeApp": "Chrome", "activeCategory": "social"})
    db.insert_snapshot("2026-02-27T10:00:00.000Z", data)
    db.insert_snapshot("2026-02-27T10:01:00.000Z", data)

    rows = db.get_snapshots(limit=5)
    assert len(rows) == 2
    assert rows[0]["timestamp"] == "2026-02-27T10:01:00.000Z"  # newest first


# --- Interventions ---

def test_insert_and_get_interventions(client):
    db.insert_intervention(
        id="int-001",
        timestamp="2026-02-27T10:05:00.000Z",
        score=72.0,
        severity=3,
        persona="coach",
        text="Stop scrolling.",
    )
    rows = db.get_interventions(limit=5)
    assert len(rows) == 1
    assert rows[0]["id"] == "int-001"
    assert rows[0]["user_response"] == "pending"
    assert rows[0]["audio_played"] == 0


def test_update_intervention_response(client):
    db.insert_intervention(
        id="int-002",
        timestamp="2026-02-27T10:06:00.000Z",
        score=55.0,
        severity=2,
        persona="calm_friend",
        text="Hey, refocus.",
    )
    db.update_intervention_response("int-002", "snoozed")

    rows = db.get_interventions(limit=5)
    assert rows[0]["user_response"] == "snoozed"


# --- App Stats ---

def test_get_app_stats(client):
    # Insert snapshots with different apps over time
    for i in range(3):
        data = json.dumps({
            "activeApp": "Chrome",
            "activeCategory": "social",
            "activeDomain": "twitter.com",
        })
        db.insert_snapshot(f"2026-02-27T10:0{i}:00.000Z", data)

    data = json.dumps({
        "activeApp": "VS Code",
        "activeCategory": "productive",
    })
    db.insert_snapshot("2026-02-27T10:03:00.000Z", data)

    stats = db.get_app_stats()
    assert len(stats) >= 2
    # Chrome should appear with its domain and category
    chrome = next((s for s in stats if s["app_name"] == "Chrome"), None)
    assert chrome is not None
    assert chrome["category"] == "social"


# --- Wins ---

def test_get_wins_data(client):
    # Insert an intervention with user_response 'working'
    db.insert_intervention(
        id="int-w1",
        timestamp="2026-02-27T08:00:00.000Z",
        score=60.0,
        severity=2,
        persona="coach",
        text="Focus up.",
    )
    db.update_intervention_response("int-w1", "working")

    # Insert a snapshot with productive minutes
    data = json.dumps({
        "activeApp": "VS Code",
        "activeCategory": "productive",
        "productiveMinutes": 42,
    })
    db.insert_snapshot("2026-02-27T10:00:00.000Z", data)

    wins = db.get_wins_data()
    assert wins["refocus_count"] >= 1
    assert wins["total_focused_minutes"] >= 0


