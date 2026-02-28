import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


# Ensure `apps/api` is on sys.path so `import app.*` works when
# running pytest from the repo root.
API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))


@pytest.fixture()
def client(tmp_path, monkeypatch):
    from app.main import app
    from app import db as db_module

    db_path = tmp_path / "norot-test.db"
    monkeypatch.setattr(db_module, "DB_PATH", str(db_path))
    db_module.init_db()

    with TestClient(app) as test_client:
        yield test_client
