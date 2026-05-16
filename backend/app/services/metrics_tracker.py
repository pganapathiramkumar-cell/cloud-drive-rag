"""In-memory metrics tracker — accumulates stats across requests since last restart."""
import threading
from collections import defaultdict
from dataclasses import dataclass, field


@dataclass
class _Stats:
    # Query counters
    total_queries: int = 0
    successful_queries: int = 0
    failed_queries: int = 0
    blocked_queries: int = 0
    pii_detected_count: int = 0

    # Latency (ms)
    total_latency_ms: float = 0.0
    latency_samples: list = field(default_factory=list)

    # Retrieval quality
    retrieval_score_samples: list = field(default_factory=list)
    chunks_retrieved_samples: list = field(default_factory=list)

    # Response quality
    response_length_samples: list = field(default_factory=list)  # char count
    rewritten_query_lengths: list = field(default_factory=list)

    # Source tracking — {filename: hit_count}
    source_hits: dict = field(default_factory=lambda: defaultdict(int))

    # Session tracking
    unique_sessions: set = field(default_factory=set)

    # Recent queries (last 20)
    recent_queries: list = field(default_factory=list)

    # Ingestion
    files_indexed: int = 0
    files_skipped: int = 0
    chunks_stored: int = 0
    uploads_indexed: int = 0
    upload_chunks: int = 0


_stats = _Stats()
_lock = threading.Lock()


def record_query(
    success: bool,
    blocked: bool,
    latency_ms: float,
    pii_detected: bool,
    retrieval_scores: list[float],
    chunks_retrieved: int,
    response_length: int = 0,
    sources: list[str] = None,
    session_id: str = "",
    query_text: str = "",
    rewritten_query: str = "",
) -> None:
    with _lock:
        _stats.total_queries += 1
        if blocked:
            _stats.blocked_queries += 1
        elif success:
            _stats.successful_queries += 1
        else:
            _stats.failed_queries += 1

        if pii_detected:
            _stats.pii_detected_count += 1

        _stats.total_latency_ms += latency_ms
        _stats.latency_samples.append(latency_ms)

        if retrieval_scores:
            _stats.retrieval_score_samples.append(sum(retrieval_scores) / len(retrieval_scores))
        _stats.chunks_retrieved_samples.append(chunks_retrieved)

        if response_length:
            _stats.response_length_samples.append(response_length)

        if rewritten_query:
            _stats.rewritten_query_lengths.append(len(rewritten_query))

        for src in (sources or []):
            _stats.source_hits[src] += 1

        if session_id:
            _stats.unique_sessions.add(session_id)

        # Keep last 20 queries
        _stats.recent_queries.append({
            "query": query_text[:120],
            "latency_ms": round(latency_ms, 1),
            "chunks": chunks_retrieved,
            "score": round(sum(retrieval_scores) / len(retrieval_scores), 3) if retrieval_scores else 0,
            "success": success,
        })
        if len(_stats.recent_queries) > 20:
            _stats.recent_queries.pop(0)


def record_ingestion(files_indexed: int, files_skipped: int, chunks: int) -> None:
    with _lock:
        _stats.files_indexed += files_indexed
        _stats.files_skipped += files_skipped
        _stats.chunks_stored += chunks


def record_upload(chunks: int) -> None:
    with _lock:
        _stats.uploads_indexed += 1
        _stats.upload_chunks += chunks


def get_summary() -> dict:
    with _lock:
        total = _stats.total_queries
        scores = _stats.retrieval_score_samples
        latencies = _stats.latency_samples
        chunks = _stats.chunks_retrieved_samples
        resp_lens = _stats.response_length_samples

        avg_latency = (_stats.total_latency_ms / total) if total else 0
        avg_score = (sum(scores) / len(scores)) if scores else 0
        avg_chunks = (sum(chunks) / len(chunks)) if chunks else 0
        success_rate = (_stats.successful_queries / total) if total else 0
        avg_resp_len = (sum(resp_lens) / len(resp_lens)) if resp_lens else 0

        context_precision = round(avg_score, 3)
        recall_hits = sum(1 for s in scores if s > 0.35)
        context_recall = round(recall_hits / len(scores), 3) if scores else 0

        f1 = 0.0
        if context_precision + context_recall > 0:
            f1 = round(2 * context_precision * context_recall / (context_precision + context_recall), 3)

        sorted_lat = sorted(latencies)
        p50 = sorted_lat[len(sorted_lat) // 2] if sorted_lat else 0
        p95 = sorted_lat[int(len(sorted_lat) * 0.95)] if sorted_lat else 0

        top_sources = sorted(
            [{"source": k, "hits": v} for k, v in _stats.source_hits.items()],
            key=lambda x: x["hits"], reverse=True
        )[:10]

        return {
            "queries": {
                "total": total,
                "successful": _stats.successful_queries,
                "failed": _stats.failed_queries,
                "blocked": _stats.blocked_queries,
                "success_rate": round(success_rate, 3),
                "pii_detected": _stats.pii_detected_count,
                "pii_rate": round(_stats.pii_detected_count / total, 3) if total else 0,
                "unique_sessions": len(_stats.unique_sessions),
                "avg_response_chars": round(avg_resp_len),
            },
            "latency": {
                "avg_ms": round(avg_latency, 1),
                "p50_ms": round(p50, 1),
                "p95_ms": round(p95, 1),
            },
            "retrieval": {
                "avg_chunks_per_query": round(avg_chunks, 1),
                "avg_similarity_score": round(avg_score, 3),
                "top_sources": top_sources,
            },
            "rag_quality": {
                "context_precision": context_precision,
                "context_recall": context_recall,
                "f1_score": f1,
                "answer_rate": round(success_rate, 3),
                "empty_context_rate": round(
                    sum(1 for c in chunks if c == 0) / len(chunks), 3
                ) if chunks else 0,
            },
            "ingestion": {
                "files_indexed": _stats.files_indexed,
                "files_skipped": _stats.files_skipped,
                "chunks_stored": _stats.chunks_stored,
                "uploads_indexed": _stats.uploads_indexed,
                "upload_chunks": _stats.upload_chunks,
                "total_chunks": _stats.chunks_stored + _stats.upload_chunks,
            },
            "recent_queries": list(reversed(_stats.recent_queries)),
        }
