"""Retrieval — embed query with Cohere, search Qdrant, return ranked docs."""
from app.services.embedder import encode_one
from app.services import vectorstore as vs


def retrieve(query: str, top_k: int | None = None) -> list[dict]:
    from app.config import settings
    k = top_k or settings.retrieval_top_k

    # input_type="search_query" is required for Cohere v3 — different from indexing
    embedding = encode_one(query, input_type="search_query")
    raw_docs = vs.query(embedding, n_results=k)

    seen: set[str] = set()
    unique = []
    for doc in raw_docs:
        if doc["text"] not in seen:
            seen.add(doc["text"])
            unique.append(doc)

    return sorted(unique, key=lambda d: d["score"], reverse=True)
