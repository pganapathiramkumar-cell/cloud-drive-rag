"""Aggregates all v1 route modules into a single router."""
from fastapi import APIRouter

from app.api.v1.routes import health, ingest, query, drive, upload, metrics_summary, analytics, workflow

v1_router = APIRouter()

v1_router.include_router(health.router, tags=["health"])
v1_router.include_router(query.router, tags=["query"])
v1_router.include_router(workflow.router, tags=["workflow"])
v1_router.include_router(ingest.router, tags=["ingest"])
v1_router.include_router(drive.router, tags=["drive"])
v1_router.include_router(upload.router, tags=["upload"])
v1_router.include_router(metrics_summary.router, tags=["metrics"])
v1_router.include_router(analytics.router, tags=["analytics"])
