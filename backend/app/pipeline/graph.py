"""LangGraph StateGraph — wires all nodes into the RAG pipeline."""
from langgraph.graph import StateGraph, END

from app.pipeline.state import AgentState
from app.pipeline.nodes import rewrite, scan_input, retrieve, assemble, generate, scan_output


def _route_after_scan_input(state: AgentState) -> str:
    if state.get("blocked") or state.get("error"):
        return "blocked"
    return "continue"


def build_graph():
    g = StateGraph(AgentState)

    g.add_node("rewrite",     rewrite.run)
    g.add_node("scan_input",  scan_input.run)
    g.add_node("retrieve",    retrieve.run)
    g.add_node("assemble",    assemble.run)
    g.add_node("generate",    generate.run)
    g.add_node("scan_output", scan_output.run)

    g.set_entry_point("rewrite")
    g.add_edge("rewrite", "scan_input")

    g.add_conditional_edges(
        "scan_input",
        _route_after_scan_input,
        {"continue": "retrieve", "blocked": END},
    )

    g.add_edge("retrieve",    "assemble")
    g.add_edge("assemble",    "generate")
    g.add_edge("generate",    "scan_output")
    g.add_edge("scan_output", END)

    return g.compile()


# Module-level singleton — compiled once at import time
rag_graph = build_graph()
