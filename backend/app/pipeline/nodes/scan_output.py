"""Node 6 — Scrub PII from the LLM response before returning to the client."""
import time
from app.pipeline.state import AgentState
from app.services.pii import scrub
from app.observability.metrics import node_duration
from app.services.analytics_tracker import record_node_latency


async def run(state: AgentState) -> AgentState:
    from app.config import settings
    start = time.monotonic()
    if settings.debug:
        record_node_latency("scan_output", (time.monotonic() - start) * 1000)
        return {**state, "pii_detected_output": False}

    with node_duration.labels(node="scan_output").time():
        clean_response, pii_found = scrub(state["response"])

    record_node_latency("scan_output", (time.monotonic() - start) * 1000)
    return {**state, "response": clean_response, "pii_detected_output": pii_found}
