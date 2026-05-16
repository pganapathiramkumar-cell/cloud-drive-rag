"""GET /v1/analytics — deep analytics: node latency, tokens, score distribution, coverage."""
from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.services.analytics_tracker import get_analytics
from app.services.vectorstore import _get_client
from app.config import settings

router = APIRouter(prefix="/analytics")


@router.get("/summary")
async def analytics_summary(user: dict = Depends(get_current_user)):
    qdrant_total = 0
    try:
        info = _get_client().get_collection(settings.qdrant_collection)
        qdrant_total = info.points_count or 0
    except Exception:
        pass

    return get_analytics(qdrant_total=qdrant_total)
