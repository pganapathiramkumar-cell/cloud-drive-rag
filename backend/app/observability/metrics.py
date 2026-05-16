"""Prometheus metrics registry — imported by routes and pipeline nodes."""
from prometheus_client import Counter, Gauge, Histogram, make_asgi_app

# ── Query metrics ──────────────────────────────────────────────────────────
query_total = Counter(
    "rag_queries_total",
    "Total RAG queries",
    ["status"],  # success | error | blocked
)

query_duration = Histogram(
    "rag_query_duration_seconds",
    "End-to-end query latency",
    buckets=[0.1, 0.5, 1.0, 2.0, 3.0, 5.0, 10.0],
)

# ── Per-node latency ───────────────────────────────────────────────────────
node_duration = Histogram(
    "rag_node_duration_seconds",
    "Latency per pipeline node",
    ["node"],  # rewrite | scan_input | retrieve | assemble | generate | scan_output
)

# ── LLM metrics ───────────────────────────────────────────────────────────
llm_tokens_total = Counter("rag_llm_tokens_total", "Total LLM tokens consumed")

# ── Ingestion metrics ─────────────────────────────────────────────────────
docs_ingested_total = Counter(
    "rag_docs_ingested_total",
    "Total documents ingested",
    ["status"],  # success | error
)

chunks_created_total = Counter("rag_chunks_created_total", "Total chunks stored in ChromaDB")

# ── Session metrics ────────────────────────────────────────────────────────
active_sessions = Gauge("rag_active_sessions", "Currently active sessions")

# ASGI app that Prometheus scrapes at /metrics
metrics_app = make_asgi_app()
