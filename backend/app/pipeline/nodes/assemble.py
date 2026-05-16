"""Node 4 — Build the context string and citation list from retrieved docs."""
from app.pipeline.state import AgentState
from app.observability.metrics import node_duration

_MAX_CONTEXT_CHARS = 6000  # stay well within Llama 3.3 context window


async def run(state: AgentState) -> AgentState:
    with node_duration.labels(node="assemble").time():
        docs = state["retrieved_docs"]

        context_parts: list[str] = []
        citations: list[dict] = []
        total_chars = 0

        for i, doc in enumerate(docs, start=1):
            meta = doc.get("metadata", {})
            url = meta.get("url", "")
            title = meta.get("title", f"Source {i}")
            excerpt = doc["text"][:200]

            chunk_text = f"[{i}] {title}\nURL: {url}\n{doc['text']}"

            if total_chars + len(chunk_text) > _MAX_CONTEXT_CHARS:
                break

            context_parts.append(chunk_text)
            total_chars += len(chunk_text)
            citations.append({"index": i, "title": title, "url": url, "excerpt": excerpt})

        context = "\n\n---\n\n".join(context_parts)

    return {**state, "context": context, "citations": citations}
