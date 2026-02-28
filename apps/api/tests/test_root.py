def test_root_health(client):
    res = client.get("/")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "service": "noRot Scoring API"}
