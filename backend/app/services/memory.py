"""Redis session memory — store and retrieve conversation turns per session."""
import json

import redis.asyncio as aioredis

from app.config import settings
from app.workflow.tracer import traced, add_current_span_metadata

_pool: aioredis.Redis | None = None


def _get_redis() -> aioredis.Redis:
    global _pool
    if _pool is None:
        _pool = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _pool


def _key(session_id: str) -> str:
    return f"session:{session_id}:turns"


@traced(
    "redis.get_history",
    file="services/memory.py",
    library="redis",
    version="5.0.6",
    redis_key_pattern="session:{session_id}:turns",
    ttl_seconds=3600,
    max_turns=20,
)
async def get_history(session_id: str) -> list[dict]:
    try:
        r   = _get_redis()
        raw = await r.lrange(_key(session_id), 0, settings.session_max_turns - 1)
        turns = [json.loads(t) for t in raw]

        add_current_span_metadata("session_id",   session_id)
        add_current_span_metadata("turns_found",  len(turns))
        add_current_span_metadata("redis_key",    _key(session_id))
        return turns
    except Exception:
        add_current_span_metadata("redis_available", False)
        return []


@traced(
    "redis.append_turn",
    file="services/memory.py",
    library="redis",
    version="5.0.6",
)
async def append_turn(session_id: str, query: str, response: str) -> None:
    try:
        r   = _get_redis()
        key = _key(session_id)
        turn = json.dumps({"query": query, "response": response})
        pipe = r.pipeline()
        pipe.lpush(key, turn)
        pipe.ltrim(key, 0, settings.session_max_turns - 1)
        pipe.expire(key, settings.session_ttl)
        await pipe.execute()

        add_current_span_metadata("session_id",    session_id)
        add_current_span_metadata("query_chars",   len(query))
        add_current_span_metadata("response_chars", len(response))
    except Exception:
        add_current_span_metadata("redis_available", False)


async def clear_session(session_id: str) -> None:
    r = _get_redis()
    await r.delete(_key(session_id))
