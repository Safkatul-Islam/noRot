import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), "norot_api.db")


def init_db():
    """Create all tables if they don't already exist."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                app TEXT NOT NULL,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                duration INTEGER NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS interventions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                score INTEGER NOT NULL,
                severity TEXT NOT NULL,
                persona TEXT NOT NULL,
                script TEXT NOT NULL,
                top_distraction TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS wins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                description TEXT NOT NULL,
                score INTEGER NOT NULL,
                type TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS stats_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cache_key TEXT NOT NULL UNIQUE,
                data TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )
        """)

        conn.commit()


@contextmanager
def get_db():
    """Context manager that yields a sqlite3 connection and closes it on exit."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
