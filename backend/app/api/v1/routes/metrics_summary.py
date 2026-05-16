"""GET /v1/metrics/summary — aggregated app metrics for the dashboard."""
from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.services.metrics_tracker import get_summary
from app.services.vectorstore import _get_client
from app.config import settings

router = APIRouter(prefix="/metrics")


@router.get("/summary")
async def metrics_summary(user: dict = Depends(get_current_user)):
    summary = get_summary()

    # Enrich with live Qdrant vector count
    try:
        client = _get_client()
        info = client.get_collection(settings.qdrant_collection)
        summary["ingestion"]["qdrant_vectors"] = info.vectors_count
        summary["ingestion"]["qdrant_status"] = info.status.value
    except Exception:
        summary["ingestion"]["qdrant_vectors"] = None
        summary["ingestion"]["qdrant_status"] = "unavailable"

    return summary
