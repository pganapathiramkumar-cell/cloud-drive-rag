"""Redis session memory — store and retrieve conversation turns per session."""
import json

import redis.asyncio as aioredis

from app.config import settings

_pool: aioredis.Redis | None = None


def _get_redis() -> aioredis.Redis:
    global _pool
    if _pool is None:
        _pool = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _pool


def _key(session_id: str) -> str:
    return f"session:{session_id}:turns"


async def get_history(session_id: str) -> list[dict]:
    try:
        r = _get_redis()
        raw = await r.lrange(_key(session_id), 0, settings.session_max_turns - 1)
        return [json.loads(t) for t in raw]
    except Exception:
        return []  # Redis unavailable — start with empty history


async def append_turn(session_id: str, query: str, response: str) -> None:
    try:
        r = _get_redis()
        key = _key(session_id)
        turn = json.dumps({"query": query, "response": response})
        pipe = r.pipeline()
        pipe.lpush(key, turn)
        pipe.ltrim(key, 0, settings.session_max_turns - 1)
        pipe.expire(key, settings.session_ttl)
        await pipe.execute()
    except Exception:
        pass  # Redis unavailable — skip persisting the turn


async def clear_session(session_id: str) -> None:
    r = _get_redis()
    await r.delete(_key(session_id))
