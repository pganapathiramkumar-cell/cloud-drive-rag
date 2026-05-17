"""Cohere embedding API — replaces local SBERT to keep deployment under 512 MB."""
import time
from functools import lru_cache

import cohere

from app.config import settings
from app.workflow.tracer import traced, add_current_span_metadata

_MODEL      = "embed-english-v3.0"   # 1024-dim, higher quality than light variant
_BATCH_SIZE = 20                     # chunks per Cohere request
VECTOR_SIZE = 1024


@lru_cache(maxsize=1)
def _get_client() -> cohere.Client:
    return cohere.Client(api_key=settings.cohere_api_key)


def _embed_with_retry(texts: list[str], input_type: str) -> list[list[float]]:
    """Single batch embed — waits 65 s on 429 (Cohere quota resets every minute)."""
    client = _get_client()
    for attempt in range(3):
        try:
            response = client.embed(texts=texts, model=_MODEL, input_type=input_type)
            return [list(e) for e in response.embeddings]
        except Exception as exc:
            if "429" in str(exc) or "rate limit" in str(exc).lower():
                time.sleep(65)
            else:
                raise
    raise RuntimeError("Cohere rate limit still exceeded after 3 retries (65s waits)")


@traced(
    "embed_batch",
    file="services/embedder.py",
    library="cohere",
    version="5.5.8",
    model=_MODEL,
    embedding_dims=VECTOR_SIZE,
)
def encode(texts: list[str], input_type: str = "search_document") -> list[list[float]]:
    """Embed texts in small batches to stay within Cohere trial rate limits."""
    from app.services.analytics_tracker import record_embed
    results: list[list[float]] = []
    for i in range(0, len(texts), _BATCH_SIZE):
        batch = texts[i: i + _BATCH_SIZE]
        results.extend(_embed_with_retry(batch, input_type))
        record_embed(len(batch))
        if i + _BATCH_SIZE < len(texts):
            time.sleep(0.5)

    add_current_span_metadata("texts_count",    len(texts))
    add_current_span_metadata("batch_count",    max(1, (len(texts) + _BATCH_SIZE - 1) // _BATCH_SIZE))
    add_current_span_metadata("embedding_dims", VECTOR_SIZE)
    add_current_span_metadata("input_type",     input_type)
    return results


@traced(
    "generate_query_embedding",
    file="services/embedder.py",
    library="cohere",
    version="5.5.8",
    model=_MODEL,
    embedding_dims=VECTOR_SIZE,
)
def encode_one(text: str, input_type: str = "search_query") -> list[float]:
    result = encode([text], input_type=input_type)[0]
    add_current_span_metadata("input_chars",    len(text))
    add_current_span_metadata("embedding_dims", VECTOR_SIZE)
    add_current_span_metadata("input_type",     input_type)
    add_current_span_metadata("model",          _MODEL)
    return result
