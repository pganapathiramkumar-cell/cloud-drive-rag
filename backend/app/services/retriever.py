"""Retrieval — embed query with Cohere, search Qdrant, return ranked docs."""
from app.services.embedder import encode_one
from app.services import vectorstore as vs
from app.workflow.tracer import traced, add_current_span_metadata


@traced(
    "retrieve_documents",
    file="services/retriever.py",
    library="cohere + qdrant-client",
    version="5.5.8 + 1.9.1",
)
def retrieve(query: str, top_k: int | None = None) -> list[dict]:
    from app.config import settings
    k = top_k or settings.retrieval_top_k

    # input_type="search_query" is required for Cohere v3 — different from indexing
    embedding = encode_one(query, input_type="search_query")
    raw_docs  = vs.query(embedding, n_results=k)

    seen:   set[str] = set()
    unique: list[dict] = []
    for doc in raw_docs:
        if doc["text"] not in seen:
            seen.add(doc["text"])
            unique.append(doc)

    ranked = sorted(unique, key=lambda d: d["score"], reverse=True)

    scores  = [d["score"] for d in ranked]
    sources = [
        d.get("metadata", {}).get("source")
        or d.get("metadata", {}).get("title")
        or d.get("metadata", {}).get("url", "unknown")
        for d in ranked
    ]
    add_current_span_metadata("query_chars",      len(query))
    add_current_span_metadata("top_k",            k)
    add_current_span_metadata("chunks_returned",  len(ranked))
    add_current_span_metadata("duplicates_removed", len(raw_docs) - len(unique))
    add_current_span_metadata("avg_score",        round(sum(scores) / len(scores), 4) if scores else 0)
    add_current_span_metadata("top_score",        round(max(scores), 4) if scores else 0)
    add_current_span_metadata("top_source",       sources[0] if sources else None)
    return ranked
