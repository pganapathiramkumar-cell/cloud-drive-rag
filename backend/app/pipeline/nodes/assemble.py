"""Node 4 — Build the context string and citation list from retrieved docs."""
import time

from app.pipeline.state import AgentState
from app.observability.metrics import node_duration
from app.services.analytics_tracker import record_node_latency
from app.workflow.tracer import traced, add_current_span_metadata

_MAX_CONTEXT_CHARS = 6000


@traced(
    "assemble_context_window",
    file="pipeline/nodes/assemble.py",
    library="langchain 0.3.19 · redis 5.0.6",
    version="—",
    max_context_chars=_MAX_CONTEXT_CHARS,
)
def _build_context(docs: list[dict]) -> tuple[str, list[dict]]:
    """Format retrieved docs into a context string and citation list."""
    context_parts: list[str] = []
    citations:     list[dict] = []
    total_chars = 0

    for i, doc in enumerate(docs, start=1):
        meta  = doc.get("metadata", {})
        url   = meta.get("url", "")
        title = meta.get("title", meta.get("source", f"Source {i}"))
        excerpt    = doc["text"][:200]
        chunk_text = f"[{i}] {title}\nURL: {url}\n{doc['text']}"

        if total_chars + len(chunk_text) > _MAX_CONTEXT_CHARS:
            break

        context_parts.append(chunk_text)
        total_chars += len(chunk_text)
        citations.append({"index": i, "title": title, "url": url, "excerpt": excerpt})

    context = "\n\n---\n\n".join(context_parts)

    add_current_span_metadata("docs_input",       len(docs))
    add_current_span_metadata("docs_included",    len(citations))
    add_current_span_metadata("docs_truncated",   len(docs) - len(citations))
    add_current_span_metadata("context_chars",    len(context))
    add_current_span_metadata("context_tokens_est", len(context) // 4)
    add_current_span_metadata("citations_built",  len(citations))
    return context, citations


async def run(state: AgentState) -> AgentState:
    start = time.monotonic()
    with node_duration.labels(node="assemble").time():
        context, citations = _build_context(state["retrieved_docs"])

    record_node_latency("assemble", (time.monotonic() - start) * 1000)
    return {**state, "context": context, "citations": citations}
