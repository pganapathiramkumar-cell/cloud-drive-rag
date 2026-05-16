"""Node 3 — Embed the query and fetch top-K chunks from Qdrant."""
import time

from app.pipeline.state import AgentState
from app.services.retriever import retrieve
from app.observability.metrics import node_duration
from app.services.analytics_tracker import record_node_latency


async def run(state: AgentState) -> AgentState:
    start = time.monotonic()
    with node_duration.labels(node="retrieve").time():
        try:
            docs = retrieve(state["rewritten_query"])
        except Exception:
            docs = []

    record_node_latency("retrieve", (time.monotonic() - start) * 1000)
    return {**state, "retrieved_docs": docs}
