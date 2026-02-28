"""Tests for GET /stats/apps endpoint."""

import json

from app import db


def test_stats_apps_returns_aggregated_app_usage(client):
    # Insert some snapshots
    for _ in range(3):
        db.insert_snapshot(
            "2026-02-27T10:00:00.000Z",
            json.dumps({"activeApp": "Chrome", "activeCategory": "social", "activeDomain": "twitter.com"}),
        )
    db.insert_snapshot(
        "2026-02-27T10:01:00.000Z",
        json.dumps({"activeApp": "VS Code", "activeCategory": "productive"}),
    )

    res = client.get("/stats/apps")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 2

    # Chrome should be first (3 snapshots vs 1)
    assert data[0]["appName"] == "Chrome"
    assert data[0]["count"] == 3
    assert data[0]["category"] == "social"
    assert data[0]["domain"] == "twitter.com"


def test_stats_apps_with_minutes_filter(client):
    # This test just verifies the endpoint accepts the query param
    res = client.get("/stats/apps?minutes=60")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_stats_apps_empty_db(client):
    res = client.get("/stats/apps")
    assert res.status_code == 200
    assert res.json() == []
