"""Node 1 — Rewrite the raw query into a clear, standalone question."""
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.pipeline.state import AgentState
from app.services.llm import get_llm
from app.observability.metrics import node_duration

_TEMPLATE = PromptTemplate.from_template(
    "Rewrite the following user query to be clear, specific, and self-contained "
    "(remove ambiguity, resolve pronouns). Output only the rewritten query.\n\n"
    "Query: {query}\n\nRewritten:"
)


async def run(state: AgentState) -> AgentState:
    with node_duration.labels(node="rewrite").time():
        try:
            chain = _TEMPLATE | get_llm() | StrOutputParser()
            rewritten = (await chain.ainvoke({"query": state["query"]})).strip()
            rewritten = rewritten or state["query"]
        except Exception:
            rewritten = state["query"]

    return {**state, "rewritten_query": rewritten}
