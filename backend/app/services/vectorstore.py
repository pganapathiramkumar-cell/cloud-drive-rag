"""Qdrant Cloud vector store — replaces local ChromaDB for production deployment."""
import uuid
from functools import lru_cache

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.config import settings
from app.services.embedder import VECTOR_SIZE


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
    return len(points)


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
    return [
        {
            "text": r.payload.get("text", ""),
            "metadata": {k: v for k, v in r.payload.items() if k != "text"},
            "score": round(r.score, 4),
        }
        for r in results
    ]


def delete_collection() -> None:
    _get_client().delete_collection(settings.qdrant_collection)
