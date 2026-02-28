from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _run_ts_oracle(snapshot: dict, *, snooze_pressure: float = 0.0) -> dict:
    script = Path(__file__).parent / "ts_oracle.cjs"
    payload = json.dumps({"snapshot": snapshot, "snoozePressure": snooze_pressure})
    proc = subprocess.run(
        ["node", str(script)],
        input=payload.encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=str(_repo_root()),
        check=True,
    )
    return json.loads(proc.stdout.decode("utf-8"))


@pytest.mark.anyio
async def test_root_ok(tmp_path, monkeypatch):
    monkeypatch.setenv("NOROT_DB_PATH", str(tmp_path / "norot.db"))

    from app.main import create_app
    from app.db import init_db

    api = create_app()
    init_db()
    async with AsyncClient(
        transport=ASGITransport(app=api),
        base_url="http://test",
    ) as client:
        resp = await client.get("/")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok", "service": "noRot Scoring API"}


@pytest.mark.anyio
async def test_score_parity_with_shared(tmp_path, monkeypatch):
    monkeypatch.setenv("NOROT_DB_PATH", str(tmp_path / "norot.db"))

    from app.main import create_app
    from app.db import init_db
    from app.services.scoring import compute_reasons, compute_score
    from app.services.escalation import score_to_severity
    from app.constants import LATE_NIGHT_MULTIPLIER, SCORING_WEIGHTS
    from app.models import UsageSnapshot

    api = create_app()
    init_db()

    snapshot_dict = {
        "timestamp": 1730000000000,
        "focusIntent": {"label": "Write", "minutesRemaining": 25},
        "signals": {
            "sessionMinutes": 10,
            "distractingMinutes": 1,
            "productiveMinutes": 9,
            "appSwitchesLast5Min": 12,
            "idleSecondsLast5Min": 0,
            "timeOfDayLocal": 23,
            "snoozesLast60Min": 2,
        },
        "categories": {
            "activeApp": "Chrome",
            "activeCategory": "social",
            "activeDomain": "reddit.com",
        },
    }

    ts = _run_ts_oracle(snapshot_dict, snooze_pressure=5)
    py_snapshot = UsageSnapshot.model_validate(snapshot_dict)
    py_score = compute_score(py_snapshot, snooze_pressure=5)
    py_severity = score_to_severity(py_score)
    py_reasons = compute_reasons(py_snapshot, score=py_score)

    assert ts["procrastinationScore"] == py_score
    assert ts["severity"] == py_severity
    assert ts["reasons"] == py_reasons

    assert ts["constants"]["LATE_NIGHT_MULTIPLIER"] == LATE_NIGHT_MULTIPLIER
    assert ts["constants"]["SCORING_WEIGHTS"] == SCORING_WEIGHTS

    async with AsyncClient(
        transport=ASGITransport(app=api),
        base_url="http://test",
    ) as client:
        resp = await client.post("/score?snoozePressure=5&persona=calm_friend", json=snapshot_dict)
        assert resp.status_code == 200
        body = resp.json()
        assert body["procrastinationScore"] == pytest.approx(py_score, abs=0.01)
        assert body["severity"] == py_severity
        assert body["reasons"] == py_reasons
