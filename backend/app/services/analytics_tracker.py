"""Analytics tracker — node latency, tokens, score distribution, coverage, sessions, errors."""
import threading
from collections import defaultdict
from dataclasses import dataclass, field


@dataclass
class _Analytics:
    # Node latency — {node: [ms, ...]}
    node_latencies: dict = field(default_factory=lambda: defaultdict(list))

    # Token usage
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_embed_calls: int = 0
    total_embed_texts: int = 0

    # Score distribution buckets
    score_0_03: int = 0   # 0.0 - 0.3  noise
    score_03_05: int = 0  # 0.3 - 0.5  relevant
    score_05_07: int = 0  # 0.5 - 0.7  highly relevant
    score_07_plus: int = 0  # 0.7+    exact match

    # Query categories (per query avg score)
    cat_on_topic: int = 0    # avg > 0.45
    cat_borderline: int = 0  # 0.3 - 0.45
    cat_off_topic: int = 0   # avg < 0.3

    # Session depth — {session_id: turn_count}
    session_turns: dict = field(default_factory=lambda: defaultdict(int))

    # Error taxonomy
    err_rate_limit: int = 0
    err_llm: int = 0
    err_retrieval: int = 0
    err_other: int = 0

    # Index coverage — unique sources ever retrieved
    sources_retrieved: set = field(default_factory=set)


_a = _Analytics()
_lock = threading.Lock()

# Groq llama-3.3-70b pricing (USD per 1M tokens)
_GROQ_INPUT_PER_M = 0.59
_GROQ_OUTPUT_PER_M = 0.79
# Cohere embed-english-v3.0 (USD per 1M tokens)
_COHERE_PER_M = 0.10


def record_node_latency(node: str, ms: float) -> None:
    with _lock:
        _a.node_latencies[node].append(ms)


def record_tokens(input_tokens: int = 0, output_tokens: int = 0) -> None:
    with _lock:
        _a.total_input_tokens += input_tokens
        _a.total_output_tokens += output_tokens


def record_embed(num_texts: int) -> None:
    with _lock:
        _a.total_embed_calls += 1
        _a.total_embed_texts += num_texts


def record_retrieval_scores(scores: list[float], avg_score: float, sources: list[str], session_id: str) -> None:
    with _lock:
        for s in scores:
            if s < 0.3:
                _a.score_0_03 += 1
            elif s < 0.5:
                _a.score_03_05 += 1
            elif s < 0.7:
                _a.score_05_07 += 1
            else:
                _a.score_07_plus += 1

        if avg_score >= 0.45:
            _a.cat_on_topic += 1
        elif avg_score >= 0.3:
            _a.cat_borderline += 1
        else:
            _a.cat_off_topic += 1

        for src in sources:
            if src:
                _a.sources_retrieved.add(src)

        if session_id:
            _a.session_turns[session_id] += 1


def record_error(error_type: str) -> None:
    with _lock:
        if "rate" in error_type.lower() or "429" in error_type:
            _a.err_rate_limit += 1
        elif "llm" in error_type.lower() or "groq" in error_type.lower():
            _a.err_llm += 1
        elif "retriev" in error_type.lower() or "qdrant" in error_type.lower():
            _a.err_retrieval += 1
        else:
            _a.err_other += 1


def get_analytics(qdrant_total: int = 0) -> dict:
    with _lock:
        # Node latency summary
        node_summary = {}
        node_order = ["rewrite", "scan_input", "retrieve", "assemble", "generate", "scan_output"]
        for node in node_order:
            samples = _a.node_latencies.get(node, [])
            if samples:
                node_summary[node] = {
                    "avg_ms": round(sum(samples) / len(samples), 1),
                    "p95_ms": round(sorted(samples)[int(len(samples) * 0.95)], 1),
                    "calls": len(samples),
                }
            else:
                node_summary[node] = {"avg_ms": 0, "p95_ms": 0, "calls": 0}

        # Token cost
        input_cost = (_a.total_input_tokens / 1_000_000) * _GROQ_INPUT_PER_M
        output_cost = (_a.total_output_tokens / 1_000_000) * _GROQ_OUTPUT_PER_M
        embed_cost = (_a.total_embed_texts / 1_000_000) * _COHERE_PER_M
        total_tokens = _a.total_input_tokens + _a.total_output_tokens
        total_queries = sum(len(v) for v in _a.node_latencies.values() if v) // max(len(node_order), 1)

        # Session depth
        turns = list(_a.session_turns.values())
        avg_turns = round(sum(turns) / len(turns), 1) if turns else 0
        max_turns = max(turns) if turns else 0
        multi_turn = sum(1 for t in turns if t > 1)

        # Score distribution total
        total_scores = _a.score_0_03 + _a.score_03_05 + _a.score_05_07 + _a.score_07_plus

        # Index coverage
        unique_retrieved = len(_a.sources_retrieved)
        retrieval_rate = round(unique_retrieved / max(qdrant_total, 1), 3)

        return {
            "node_latency": node_summary,
            "tokens": {
                "total_input": _a.total_input_tokens,
                "total_output": _a.total_output_tokens,
                "total": total_tokens,
                "avg_per_query": round(total_tokens / max(total_queries, 1)),
                "embed_calls": _a.total_embed_calls,
                "embed_texts": _a.total_embed_texts,
                "cost_usd": {
                    "groq_input": round(input_cost, 6),
                    "groq_output": round(output_cost, 6),
                    "cohere_embed": round(embed_cost, 6),
                    "total": round(input_cost + output_cost + embed_cost, 6),
                },
            },
            "score_distribution": {
                "0.0-0.3 (noise)": _a.score_0_03,
                "0.3-0.5 (relevant)": _a.score_03_05,
                "0.5-0.7 (highly relevant)": _a.score_05_07,
                "0.7+ (exact match)": _a.score_07_plus,
                "total": total_scores,
            },
            "query_categories": {
                "on_topic": _a.cat_on_topic,
                "borderline": _a.cat_borderline,
                "off_topic": _a.cat_off_topic,
                "total": _a.cat_on_topic + _a.cat_borderline + _a.cat_off_topic,
            },
            "sessions": {
                "total": len(_a.session_turns),
                "avg_turns": avg_turns,
                "max_turns": max_turns,
                "multi_turn": multi_turn,
                "single_turn": len(turns) - multi_turn,
            },
            "errors": {
                "rate_limit": _a.err_rate_limit,
                "llm_error": _a.err_llm,
                "retrieval_error": _a.err_retrieval,
                "other": _a.err_other,
                "total": _a.err_rate_limit + _a.err_llm + _a.err_retrieval + _a.err_other,
            },
            "index_coverage": {
                "qdrant_total_vectors": qdrant_total,
                "unique_sources_retrieved": unique_retrieved,
                "sources_list": sorted(_a.sources_retrieved),
                "coverage_rate": retrieval_rate,
            },
        }
