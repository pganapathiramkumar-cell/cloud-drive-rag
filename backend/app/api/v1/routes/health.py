"""GET /v1/health — liveness + dependency checks."""
from fastapi import APIRouter

from app.api.v1.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health():
    chroma_status = "ok"
    redis_status = "ok"

    try:
        from app.services.vectorstore import get_collection
        get_collection().count()
    except Exception:
        chroma_status = "unavailable"

    try:
        from app.services.memory import _get_redis
        await _get_redis().ping()
    except Exception:
        redis_status = "unavailable"

    overall = "ok" if chroma_status == "ok" and redis_status == "ok" else "degraded"

    return HealthResponse(
        status=overall,
        chromadb=chroma_status,
        redis=redis_status,
    )
