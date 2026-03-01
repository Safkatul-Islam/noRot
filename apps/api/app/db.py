"""SQLite database setup and helper functions."""

import json
import os
import sqlite3

# Database file lives next to the app package inside apps/api/
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "norot.db")


def get_connection() -> sqlite3.Connection:
    """Return a new SQLite connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create tables if they don't already exist."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS score_history (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp   TEXT NOT NULL,
            score       REAL NOT NULL,
            severity    INTEGER NOT NULL,
            persona     TEXT NOT NULL,
            mode        TEXT NOT NULL,
            text        TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS snapshots (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp   TEXT NOT NULL,
            data        TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS interventions (
            id              TEXT PRIMARY KEY,
            timestamp       TEXT NOT NULL,
            score           REAL NOT NULL,
            severity        INTEGER NOT NULL,
            persona         TEXT NOT NULL,
            text            TEXT NOT NULL,
            user_response   TEXT NOT NULL DEFAULT 'pending',
            audio_played    INTEGER NOT NULL DEFAULT 0
        )
    """)

    conn.commit()
    conn.close()


# --- Score history ---


def insert_score(
    timestamp: str,
    score: float,
    severity: int,
    persona: str,
    mode: str,
    text: str,
) -> int:
    """Insert a score record and return the new row id."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO score_history (timestamp, score, severity, persona, mode, text) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (timestamp, score, severity, persona, mode, text),
    )
    conn.commit()
    row_id = cursor.lastrowid
    conn.close()
    return row_id  # type: ignore[return-value]


def get_history(limit: int = 50) -> list[dict]:
    """Return the most recent score_history entries."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, timestamp, score, severity, persona, mode, text "
        "FROM score_history ORDER BY id DESC LIMIT ?",
        (limit,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


# --- Snapshots ---


def insert_snapshot(timestamp: str, data: str) -> int:
    """Insert a telemetry snapshot (data is a JSON string) and return the row id."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO snapshots (timestamp, data) VALUES (?, ?)",
        (timestamp, data),
    )
    conn.commit()
    row_id = cursor.lastrowid
    conn.close()
    return row_id  # type: ignore[return-value]


def get_snapshots(limit: int = 50) -> list[dict]:
    """Return the most recent snapshots, newest first."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, timestamp, data FROM snapshots ORDER BY id DESC LIMIT ?",
        (limit,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


# --- Interventions ---


def insert_intervention(
    id: str,
    timestamp: str,
    score: float,
    severity: int,
    persona: str,
    text: str,
) -> None:
    """Insert a new intervention event."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO interventions (id, timestamp, score, severity, persona, text) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (id, timestamp, score, severity, persona, text),
    )
    conn.commit()
    conn.close()


def update_intervention_response(intervention_id: str, response: str) -> None:
    """Update the user_response column for an intervention."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE interventions SET user_response = ? WHERE id = ?",
        (response, intervention_id),
    )
    conn.commit()
    conn.close()


def get_interventions(limit: int = 50) -> list[dict]:
    """Return the most recent interventions, newest first."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, timestamp, score, severity, persona, text, user_response, audio_played "
        "FROM interventions ORDER BY rowid DESC LIMIT ?",
        (limit,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


# --- App stats (derived from snapshots) ---


def get_app_stats(minutes: int | None = None) -> list[dict]:
    """Aggregate app usage from stored snapshots.

    Each snapshot contains a JSON 'data' field with activeApp, activeCategory,
    and optionally activeDomain. We count occurrences as a proxy for time
    (each snapshot represents ~5 seconds of activity).

    Returns rows sorted by count descending.
    """
    conn = get_connection()
    cursor = conn.cursor()

    if minutes is not None:
        cursor.execute(
            "SELECT data FROM snapshots "
            "WHERE timestamp >= datetime('now', ? || ' minutes') "
            "ORDER BY id DESC",
            (f"-{minutes}",),
        )
    else:
        cursor.execute("SELECT data FROM snapshots ORDER BY id DESC")

    rows = cursor.fetchall()
    conn.close()

    # Aggregate in Python since the JSON is opaque to SQLite
    stats: dict[str, dict] = {}
    for row in rows:
        try:
            parsed = json.loads(row["data"])
        except (json.JSONDecodeError, TypeError):
            continue

        app_name = parsed.get("activeApp", "Unknown")
        domain = parsed.get("activeDomain")
        category = parsed.get("activeCategory", "unknown")
        key = f"{app_name}|{domain or ''}"

        if key not in stats:
            stats[key] = {
                "app_name": app_name,
                "domain": domain,
                "category": category,
                "count": 0,
            }
        stats[key]["count"] += 1

    return sorted(stats.values(), key=lambda s: s["count"], reverse=True)


# --- Wins (derived from interventions + snapshots) ---


def get_wins_data() -> dict:
    """Compute wins metrics from today's data.

    - refocus_count: interventions where user responded 'working' today
    - total_focused_minutes: latest snapshot's productiveMinutes (cumulative)
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Count refocuses today (user responded 'working')
    cursor.execute(
        "SELECT COUNT(*) FROM interventions "
        "WHERE user_response = 'working' "
        "AND timestamp >= date('now')"
    )
    refocus_count = cursor.fetchone()[0]

    # Get latest snapshot's productive minutes
    cursor.execute(
        "SELECT data FROM snapshots ORDER BY id DESC LIMIT 1"
    )
    row = cursor.fetchone()
    conn.close()

    total_focused_minutes = 0
    if row:
        try:
            parsed = json.loads(row["data"])
            total_focused_minutes = int(parsed.get("productiveMinutes", 0))
        except (json.JSONDecodeError, TypeError, ValueError):
            pass

    return {
        "refocus_count": refocus_count,
        "total_focused_minutes": total_focused_minutes,
    }
