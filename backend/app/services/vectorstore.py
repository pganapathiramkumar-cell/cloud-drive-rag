"""Qdrant Cloud vector store — replaces local ChromaDB for production deployment."""
import uuid
from functools import lru_cache

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.config import settings
from app.services.embedder import VECTOR_SIZE
from app.workflow.tracer import traced, add_current_span_metadata


@lru_cache(maxsize=1)
def _get_client() -> QdrantClient:
    return QdrantClient(
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key or None,
    )


def _ensure_collection() -> None:
    client = _get_client()
    existing = {c.name for c in client.get_collections().collections}
    if settings.qdrant_collection not in existing:
        client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )


@traced(
    "qdrant_client.upsert",
    file="services/vectorstore.py",
    library="qdrant-client",
    version="1.9.1",
    collection="enterprise_rag",
    distance="cosine",
)
def add_chunks(chunks: list[dict], embeddings: list[list[float]]) -> int:
    """Upsert chunks with embeddings. Returns count stored."""
    client = _get_client()
    _ensure_collection()
    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=emb,
            payload={"text": chunk["text"], **chunk.get("metadata", {})},
        )
        for chunk, emb in zip(chunks, embeddings)
    ]
    client.upsert(collection_name=settings.qdrant_collection, points=points)

    add_current_span_metadata("chunks_upserted", len(points))
    add_current_span_metadata("vector_dims",     VECTOR_SIZE)
    add_current_span_metadata("collection",      settings.qdrant_collection)
    return len(points)


@traced(
    "qdrant_client.search",
    file="services/vectorstore.py",
    library="qdrant-client",
    version="1.9.1",
    distance_metric="cosine",
    embedding_dims=VECTOR_SIZE,
)
def query(embedding: list[float], n_results: int = 5) -> list[dict]:
    """Return top-N closest chunks with score and metadata."""
    client = _get_client()
    _ensure_collection()
    results = client.search(
        collection_name=settings.qdrant_collection,
        query_vector=embedding,
        limit=n_results,
        with_payload=True,
    )
    docs = [
        {
            "text":     r.payload.get("text", ""),
            "metadata": {k: v for k, v in r.payload.items() if k != "text"},
            "score":    round(r.score, 4),
        }
        for r in results
    ]

    scores = [d["score"] for d in docs]
    add_current_span_metadata("collection",      settings.qdrant_collection)
    add_current_span_metadata("top_k_requested", n_results)
    add_current_span_metadata("results_returned", len(docs))
    add_current_span_metadata("top_score",       round(max(scores), 4) if scores else 0)
    add_current_span_metadata("avg_score",       round(sum(scores) / len(scores), 4) if scores else 0)
    add_current_span_metadata("min_score",       round(min(scores), 4) if scores else 0)
    return docs


def delete_collection() -> None:
    _get_client().delete_collection(settings.qdrant_collection)
