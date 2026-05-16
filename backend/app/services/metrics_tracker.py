"""In-memory metrics tracker — accumulates query and ingestion stats across requests."""
import threading
from dataclasses import dataclass, field
from typing import Optional


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
            avg_score = sum(retrieval_scores) / len(retrieval_scores)
            _stats.retrieval_score_samples.append(avg_score)
        _stats.chunks_retrieved_samples.append(chunks_retrieved)


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

        avg_latency = (_stats.total_latency_ms / total) if total else 0
        avg_score = (sum(scores) / len(scores)) if scores else 0
        avg_chunks = (sum(chunks) / len(chunks)) if chunks else 0
        success_rate = (_stats.successful_queries / total) if total else 0

        # Context precision: avg retrieval similarity score (0-1)
        context_precision = round(avg_score, 3)

        # Context recall proxy: % of queries where avg score > 0.5
        recall_hits = sum(1 for s in scores if s > 0.5)
        context_recall = round(recall_hits / len(scores), 3) if scores else 0

        # F1 score
        if context_precision + context_recall > 0:
            f1 = round(2 * context_precision * context_recall / (context_precision + context_recall), 3)
        else:
            f1 = 0

        # Latency percentiles
        sorted_lat = sorted(latencies)
        p50 = sorted_lat[len(sorted_lat) // 2] if sorted_lat else 0
        p95 = sorted_lat[int(len(sorted_lat) * 0.95)] if sorted_lat else 0

        return {
            "queries": {
                "total": total,
                "successful": _stats.successful_queries,
                "failed": _stats.failed_queries,
                "blocked": _stats.blocked_queries,
                "success_rate": round(success_rate, 3),
                "pii_detected": _stats.pii_detected_count,
                "pii_rate": round(_stats.pii_detected_count / total, 3) if total else 0,
            },
            "latency": {
                "avg_ms": round(avg_latency, 1),
                "p50_ms": round(p50, 1),
                "p95_ms": round(p95, 1),
            },
            "retrieval": {
                "avg_chunks_per_query": round(avg_chunks, 1),
                "avg_similarity_score": round(avg_score, 3),
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
        }
