"""Node 5 — Call Groq LLM with the assembled context.

The node uses streaming=True so that astream_events() in the route captures
individual tokens and forwards them to the client via SSE.
"""
from app.pipeline.state import AgentState
from app.services.llm import get_llm
from app.services.prompt import build_rag_messages
from app.observability.metrics import node_duration, llm_tokens_total


async def run(state: AgentState) -> AgentState:
    with node_duration.labels(node="generate").time():
        messages = build_rag_messages(
            query=state["rewritten_query"],
            context=state["context"],
        )
        llm = get_llm(streaming=True)
        ai_message = await llm.ainvoke(messages)
        response = ai_message.content

    usage = getattr(ai_message, "usage_metadata", None)
    if usage:
        llm_tokens_total.inc(usage.get("total_tokens", 0))

    return {**state, "response": response}
