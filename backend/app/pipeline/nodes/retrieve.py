"""Node 3 — Embed the query and fetch top-K chunks from ChromaDB."""
from app.pipeline.state import AgentState
from app.services.retriever import retrieve
from app.observability.metrics import node_duration


async def run(state: AgentState) -> AgentState:
    with node_duration.labels(node="retrieve").time():
        try:
            docs = retrieve(state["rewritten_query"])
        except Exception:
            docs = []  # ChromaDB unavailable — continue with empty context

    return {**state, "retrieved_docs": docs}
