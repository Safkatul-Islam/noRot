from __future__ import annotations

import json
import os
import sqlite3
import time
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any


def _default_db_path() -> Path:
    return Path(__file__).resolve().parents[1] / "norot.db"


def _db_path() -> Path:
    override = os.environ.get("NOROT_DB_PATH")
    return Path(override).expanduser().resolve() if override else _default_db_path()


@contextmanager
def _get_db() -> sqlite3.Connection:
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    with _get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS score_history(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                score REAL NOT NULL,
                severity INTEGER NOT NULL,
                persona TEXT NOT NULL,
                mode TEXT NOT NULL,
                text TEXT NOT NULL
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS snapshots(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                data TEXT NOT NULL
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS interventions(
                id TEXT PRIMARY KEY,
                timestamp INTEGER NOT NULL,
                score REAL NOT NULL,
                severity INTEGER NOT NULL,
                persona TEXT NOT NULL,
                text TEXT NOT NULL,
                user_response TEXT NOT NULL DEFAULT 'pending',
                audio_played INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        cur.execute("CREATE INDEX IF NOT EXISTS idx_score_history_ts ON score_history(timestamp)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_snapshots_ts ON snapshots(timestamp)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_interventions_ts ON interventions(timestamp)")
        conn.commit()


def insert_score(timestamp: int, score: float, severity: int, persona: str, mode: str, text: str) -> int:
    with _get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO score_history(timestamp, score, severity, persona, mode, text)
            VALUES(?,?,?,?,?,?)
            """,
            (int(timestamp), float(score), int(severity), str(persona), str(mode), str(text)),
        )
        conn.commit()
        return int(cur.lastrowid)


def get_history(limit: int = 100) -> list[dict[str, Any]]:
    with _get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, timestamp, score, severity, persona, mode, text
            FROM score_history
            ORDER BY timestamp DESC, id DESC
            LIMIT ?
            """,
            (int(limit),),
        )
        return [dict(row) for row in cur.fetchall()]


def insert_snapshot(timestamp: int, data: dict[str, Any]) -> int:
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    with _get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO snapshots(timestamp, data) VALUES(?,?)",
            (int(timestamp), payload),
        )
        conn.commit()
        return int(cur.lastrowid)


def get_snapshots(limit: int = 100) -> list[dict[str, Any]]:
    with _get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, timestamp, data FROM snapshots ORDER BY timestamp DESC, id DESC LIMIT ?",
            (int(limit),),
        )
        rows = cur.fetchall()
        out: list[dict[str, Any]] = []
        for r in rows:
            item = dict(r)
            try:
                item["data"] = json.loads(item["data"])
            except Exception:
                pass
            out.append(item)
        return out


def insert_intervention(
    *,
    id: str,
    timestamp: int,
    score: float,
    severity: int,
    persona: str,
    text: str,
    user_response: str = "pending",
    audio_played: bool = False,
) -> None:
    with _get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT OR REPLACE INTO interventions(id, timestamp, score, severity, persona, text, user_response, audio_played)
            VALUES(?,?,?,?,?,?,?,?)
            """,
            (
                str(id),
                int(timestamp),
                float(score),
                int(severity),
                str(persona),
                str(text),
                str(user_response),
                1 if audio_played else 0,
            ),
        )
        conn.commit()


def update_intervention_response(intervention_id: str, user_response: str) -> None:
    with _get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE interventions SET user_response=? WHERE id=?",
            (str(user_response), str(intervention_id)),
        )
        conn.commit()


def get_interventions(limit: int = 100) -> list[dict[str, Any]]:
    with _get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, timestamp, score, severity, persona, text, user_response, audio_played
            FROM interventions
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (int(limit),),
        )
        rows = cur.fetchall()
        out: list[dict[str, Any]] = []
        for r in rows:
            d = dict(r)
            d["audio_played"] = bool(d.get("audio_played"))
            out.append(d)
        return out


def get_intervention(intervention_id: str) -> dict[str, Any] | None:
    with _get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, timestamp, score, severity, persona, text, user_response, audio_played
            FROM interventions
            WHERE id = ?
            """,
            (str(intervention_id),),
        )
        row = cur.fetchone()
        if not row:
            return None
        d = dict(row)
        d["audio_played"] = bool(d.get("audio_played"))
        return d


def get_app_stats(minutes: int = 60) -> list[dict[str, Any]]:
    since = int(time.time() * 1000) - int(minutes) * 60 * 1000
    with _get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT data FROM snapshots WHERE timestamp >= ?", (since,))
        rows = cur.fetchall()

    counts: dict[tuple[str, str | None, str], int] = {}
    for r in rows:
        try:
            data = json.loads(r["data"])
            categories = data.get("categories", {})
            app_name = categories.get("activeApp")
            category = categories.get("activeCategory")
            domain = categories.get("activeDomain")
            if not app_name or not category:
                continue
            key = (str(app_name), str(domain) if domain else None, str(category))
            counts[key] = counts.get(key, 0) + 1
        except Exception:
            continue

    out = [
        {"app_name": app, "domain": domain, "category": category, "count": count}
        for (app, domain, category), count in counts.items()
    ]
    out.sort(key=lambda x: x["count"], reverse=True)
    return out


def get_wins_data() -> dict[str, Any]:
    now = datetime.now()
    start_of_day = datetime(now.year, now.month, now.day)
    start_ts = int(start_of_day.timestamp() * 1000)

    with _get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT COUNT(*) AS c FROM interventions WHERE user_response='working' AND timestamp >= ?",
            (start_ts,),
        )
        refocus_count = int(cur.fetchone()["c"])

        cur.execute("SELECT data FROM snapshots ORDER BY timestamp DESC, id DESC LIMIT 1")
        row = cur.fetchone()

    total_focused_minutes = 0.0
    if row:
        try:
            data = json.loads(row["data"])
            signals = data.get("signals", {})
            total_focused_minutes = float(signals.get("productiveMinutes", 0.0))
        except Exception:
            total_focused_minutes = 0.0

    return {"refocus_count": refocus_count, "total_focused_minutes": total_focused_minutes}
