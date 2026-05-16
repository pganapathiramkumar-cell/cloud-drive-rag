"""Node 2 — Scrub PII from the rewritten query before it touches retrieval or LLM."""
from app.pipeline.state import AgentState
from app.services.pii import scrub
from app.observability.metrics import node_duration


async def run(state: AgentState) -> AgentState:
    with node_duration.labels(node="scan_input").time():
        clean_query, pii_found = scrub(state["rewritten_query"])

    return {
        **state,
        "rewritten_query": clean_query,
        "pii_detected_input": pii_found,
    }
