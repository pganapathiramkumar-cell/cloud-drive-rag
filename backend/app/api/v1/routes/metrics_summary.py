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

    # Enrich with live Qdrant stats — points_count is the correct attribute
    try:
        client = _get_client()
        info = client.get_collection(settings.qdrant_collection)
        points = info.points_count or 0
        summary["ingestion"]["qdrant_vectors"] = points
        summary["ingestion"]["qdrant_status"] = str(info.status.value) if info.status else "ok"
        # Use Qdrant count as total_chunks if tracker shows 0 (synced before tracker was added)
        if summary["ingestion"]["total_chunks"] == 0 and points > 0:
            summary["ingestion"]["total_chunks"] = points
    except Exception as exc:
        summary["ingestion"]["qdrant_vectors"] = None
        summary["ingestion"]["qdrant_status"] = f"unavailable: {exc}"

    return summary
