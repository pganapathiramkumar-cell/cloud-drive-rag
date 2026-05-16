"""Node 5 — Call Groq LLM with the assembled context."""
import time

from app.pipeline.state import AgentState
from app.services.llm import get_llm
from app.services.prompt import build_rag_messages
from app.observability.metrics import node_duration, llm_tokens_total
from app.services.analytics_tracker import record_node_latency, record_tokens


async def run(state: AgentState) -> AgentState:
    start = time.monotonic()
    with node_duration.labels(node="generate").time():
        messages = build_rag_messages(
            query=state["rewritten_query"],
            context=state["context"],
        )
        llm = get_llm(streaming=True)
        ai_message = await llm.ainvoke(messages)
        response = ai_message.content

    record_node_latency("generate", (time.monotonic() - start) * 1000)

    usage = getattr(ai_message, "usage_metadata", None)
    if usage:
        llm_tokens_total.inc(usage.get("total_tokens", 0))
        record_tokens(
            input_tokens=usage.get("input_tokens", 0),
            output_tokens=usage.get("output_tokens", 0),
        )

    return {**state, "response": response}
