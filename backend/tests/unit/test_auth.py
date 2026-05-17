"""Unit tests for auth middleware — SKIP_AUTH and dev-token behaviour."""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

os.environ["SKIP_AUTH"] = "true"
os.environ.setdefault("OTEL_ENABLED", "false")

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_dev_token_accepted_when_skip_auth_true():
    resp = client.get(
        "/v1/metrics",
        headers={"Authorization": "Bearer dev-token"},
    )
    assert resp.status_code == 200


def test_no_token_accepted_when_skip_auth_true():
    # SKIP_AUTH=true allows requests with no credentials
    resp = client.get("/v1/health")
    assert resp.status_code == 200


def test_skip_auth_returns_admin_role():
    # With SKIP_AUTH=true, dev user has admin role — admin endpoints should work
    resp = client.get(
        "/v1/metrics",
        headers={"Authorization": "Bearer dev-token"},
    )
    assert resp.status_code == 200  # would be 403 if roles were missing


def test_invalid_token_without_skip_auth(monkeypatch):
    monkeypatch.setenv("SKIP_AUTH", "false")
    # Re-import to pick up new env var
    import importlib
    import app.core.auth as auth_module
    importlib.reload(auth_module)

    resp = client.get(
        "/v1/metrics",
        headers={"Authorization": "Bearer not-a-real-jwt"},
    )
    # Should be 401 or 503 (Keycloak unreachable) — not 200
    assert resp.status_code in (401, 503)

    # Restore
    monkeypatch.setenv("SKIP_AUTH", "true")
    importlib.reload(auth_module)
