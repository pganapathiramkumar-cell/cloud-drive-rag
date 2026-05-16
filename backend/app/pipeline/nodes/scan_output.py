"""Node 6 — Scrub PII from the LLM response before returning to the client."""
from app.pipeline.state import AgentState
from app.services.pii import scrub
from app.observability.metrics import node_duration


async def run(state: AgentState) -> AgentState:
    from app.config import settings
    if settings.debug:
        return {**state, "pii_detected_output": False}

    with node_duration.labels(node="scan_output").time():
        clean_response, pii_found = scrub(state["response"])

    return {
        **state,
        "response": clean_response,
        "pii_detected_output": pii_found,
    }
