import pytest
from fastapi.testclient import TestClient

from app import config
from app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA_DIR", tmp_path)
    return TestClient(app)
