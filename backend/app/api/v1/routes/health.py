"""GET /v1/health — liveness + dependency checks."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health():
    qdrant_status = "ok"
    redis_status  = "ok"

    try:
        from app.services.vectorstore import _get_client
        _get_client().get_collections()
    except Exception:
        qdrant_status = "unavailable"

    try:
        from app.services.memory import _get_redis
        await _get_redis().ping()
    except Exception:
        redis_status = "unavailable"

    overall = "ok" if qdrant_status == "ok" and redis_status == "ok" else "degraded"

    return {
        "status":  overall,
        "qdrant":  qdrant_status,
        "redis":   redis_status,
        "version": "1.0.0",
    }
