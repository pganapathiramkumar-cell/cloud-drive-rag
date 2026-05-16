"""Node 2 — Scrub PII from the rewritten query before it touches retrieval or LLM."""
import time
from app.pipeline.state import AgentState
from app.services.pii import scrub
from app.observability.metrics import node_duration
from app.services.analytics_tracker import record_node_latency


async def run(state: AgentState) -> AgentState:
    from app.config import settings
    start = time.monotonic()
    if settings.debug:
        record_node_latency("scan_input", (time.monotonic() - start) * 1000)
        return {**state, "pii_detected_input": False}

    with node_duration.labels(node="scan_input").time():
        clean_query, pii_found = scrub(state["rewritten_query"])

    record_node_latency("scan_input", (time.monotonic() - start) * 1000)
    return {**state, "rewritten_query": clean_query, "pii_detected_input": pii_found}
