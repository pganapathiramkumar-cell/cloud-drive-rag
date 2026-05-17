"""Unit tests for the health endpoint — uses FastAPI TestClient, no real services."""
import pytest
import sys
import os
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

os.environ.setdefault("SKIP_AUTH", "true")
os.environ.setdefault("OTEL_ENABLED", "false")

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_returns_200():
    with patch("app.api.v1.routes.health.qdrant_status", "ok", create=True), \
         patch("app.services.vectorstore._get_client") as mock_qdrant, \
         patch("app.services.memory._get_redis") as mock_redis:
        # Simulate both services available
        mock_qdrant.return_value.get_collections.return_value = []
        import asyncio
        mock_redis.return_value.ping = asyncio.coroutine(lambda: True)
        resp = client.get("/v1/health")
    assert resp.status_code == 200


def test_health_response_shape():
    resp = client.get("/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert "status" in body
    assert "qdrant" in body
    assert "redis" in body
    assert "version" in body
    assert body["version"] == "1.0.0"


def test_health_status_is_ok_or_degraded():
    resp = client.get("/v1/health")
    body = resp.json()
    assert body["status"] in ("ok", "degraded")


def test_health_no_auth_required():
    # Health must be accessible without a token
    resp = client.get("/v1/health")
    assert resp.status_code != 401
    assert resp.status_code != 403


def test_metrics_requires_auth_or_skip_auth():
    # With SKIP_AUTH=true, metrics should be accessible with dev-token
    resp = client.get(
        "/v1/metrics",
        headers={"Authorization": "Bearer dev-token"},
    )
    assert resp.status_code == 200


def test_metrics_response_shape():
    resp = client.get(
        "/v1/metrics",
        headers={"Authorization": "Bearer dev-token"},
    )
    body = resp.json()
    for field in ("queries", "ingestion", "latency", "retrieval", "rag_quality"):
        assert field in body, f"missing field '{field}' in /v1/metrics response"


def test_analytics_response_shape():
    resp = client.get(
        "/v1/analytics",
        headers={"Authorization": "Bearer dev-token"},
    )
    assert resp.status_code == 200
    body = resp.json()
    for field in ("node_latency", "tokens", "score_distribution", "query_categories", "sessions"):
        assert field in body, f"missing field '{field}' in /v1/analytics response"
