"""Extracts WorkflowStageEvent metadata from LangGraph astream_events output."""
from __future__ import annotations
from typing import Any

NODE_NAMES = {"rewrite", "scan_input", "retrieve", "assemble", "generate", "scan_output"}

PIPELINE_ORDER = ["rewrite", "scan_input", "retrieve", "assemble", "generate", "scan_output"]

NODE_META: dict[str, dict[str, str]] = {
    "rewrite":     {
        "label":   "Query Rewriting",
        "library": "langchain-groq 0.2.4 · llama-3.3-70b",
        "file":    "pipeline/nodes/rewrite.py",
        "func":    "rewrite.run(state)",
    },
    "scan_input":  {
        "label":   "PII Input Scan",
        "library": "presidio-analyzer 2.2.354 · spaCy 3.8.4",
        "file":    "pipeline/nodes/scan_input.py",
        "func":    "scan_input.run(state)",
    },
    "retrieve":    {
        "label":   "Vector Retrieval",
        "library": "qdrant-client 1.9.1 · cohere 5.5.8",
        "file":    "pipeline/nodes/retrieve.py · services/retriever.py",
        "func":    "retrieve.run(state) → retriever.retrieve(query)",
    },
    "assemble":    {
        "label":   "Context Assembly",
        "library": "langchain 0.3.19 · redis 5.0.6",
        "file":    "pipeline/nodes/assemble.py · services/memory.py",
        "func":    "assemble.run(state) → memory.get_history()",
    },
    "generate":    {
        "label":   "LLM Generation",
        "library": "langchain-groq 0.2.4 · llama-3.3-70b-versatile",
        "file":    "pipeline/nodes/generate.py · services/llm.py",
        "func":    "generate.run(state) → llm.ainvoke(messages)",
    },
    "scan_output": {
        "label":   "PII Output Scan",
        "library": "presidio-anonymizer 2.2.354 · spaCy 3.8.4",
        "file":    "pipeline/nodes/scan_output.py · services/pii.py",
        "func":    "scan_output.run(state) → pii.scrub(response)",
    },
}


def extract_metadata(node: str, output: dict[str, Any]) -> dict[str, Any]:
    """Extract relevant fields from the node's output state dict."""
    meta: dict[str, Any] = {}

    if node == "rewrite":
        rq = output.get("rewritten_query", "") or ""
        oq = output.get("query", "") or ""
        meta = {
            "original_query":  oq[:300],
            "rewritten_query": rq[:300],
            "input_chars":     len(oq),
            "output_chars":    len(rq),
            "changed":         oq.strip() != rq.strip(),
            "model":           "llama-3.3-70b-versatile",
            "temperature":     0,
        }

    elif node == "scan_input":
        meta = {
            "pii_detected": bool(output.get("pii_detected_input", False)),
            "blocked":      bool(output.get("blocked", False)),
            "block_reason": output.get("block_reason"),
            "engine":       "presidio-analyzer 2.2.354",
            "nlp_model":    "spaCy en_core_web_sm (12 MB)",
        }

    elif node == "retrieve":
        docs   = output.get("retrieved_docs", []) or []
        scores = [round(d.get("score", 0), 4) for d in docs]
        sources = [
            d.get("metadata", {}).get("source")
            or d.get("metadata", {}).get("title")
            or d.get("metadata", {}).get("url", "unknown")
            for d in docs
        ]
        meta = {
            "chunks_retrieved":  len(docs),
            "scores":            scores,
            "avg_score":         round(sum(scores) / len(scores), 4) if scores else 0,
            "top_score":         round(max(scores), 4) if scores else 0,
            "min_score":         round(min(scores), 4) if scores else 0,
            "sources":           [s for s in sources if s][:5],
            "top_source":        sources[0] if sources else None,
            "embedding_model":   "embed-english-v3.0",
            "embedding_dims":    1024,
            "distance_metric":   "cosine",
            "collection":        "enterprise_rag",
            "top_k_configured":  5,
        }

    elif node == "assemble":
        context   = output.get("context", "") or ""
        citations = output.get("citations", []) or []
        meta = {
            "context_chars":      len(context),
            "context_tokens_est": len(context) // 4,
            "citations_count":    len(citations),
            "session_memory":     "Redis · session_ttl=3600s",
        }

    elif node == "generate":
        response = output.get("response", "") or ""
        meta = {
            "model":          "llama-3.3-70b-versatile",
            "provider":       "Groq API",
            "response_chars": len(response),
            "temperature":    0,
            "max_tokens":     2048,
        }

    elif node == "scan_output":
        response = output.get("response", "") or ""
        meta = {
            "pii_detected":   bool(output.get("pii_detected_output", False)),
            "response_chars": len(response),
            "engine":         "presidio-anonymizer 2.2.354",
        }

    return meta


def make_log_line(node: str, meta: dict[str, Any]) -> str:
    """Short human-readable summary line shown on the node card."""
    if node == "rewrite":
        verb = "rewritten" if meta.get("changed") else "unchanged"
        return f"Query {verb} · {meta.get('output_chars', 0)} chars"
    if node == "scan_input":
        if meta.get("blocked"):
            return f"BLOCKED — {meta.get('block_reason') or 'PII detected in query'}"
        return "No PII detected · query approved"
    if node == "retrieve":
        n   = meta.get("chunks_retrieved", 0)
        avg = meta.get("avg_score", 0)
        top = meta.get("top_source") or "—"
        return f"{n} chunks · avg score {avg:.3f} · top: {top}"
    if node == "assemble":
        chars = meta.get("context_chars", 0)
        cit   = meta.get("citations_count", 0)
        return f"{chars:,} chars context · {cit} citations"
    if node == "generate":
        tok = meta.get("total_tokens", 0)
        chars = meta.get("response_chars", 0)
        if tok:
            return f"{tok} tokens · {chars} chars response"
        return f"{chars} chars response · Groq llama-3.3-70b"
    if node == "scan_output":
        if meta.get("pii_detected"):
            return "PII detected and redacted from response"
        return "Response clean · no PII found"
    return "completed"
