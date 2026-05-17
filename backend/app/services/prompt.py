"""LangChain PromptTemplate registry — one template per use-case."""
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate

from app.workflow.tracer import traced, add_current_span_metadata

_SYSTEM = """You are an expert assistant for Google Cloud Platform documentation.
Answer only using the provided context. If the answer is not in the context, say so.
Always cite the source URLs from the context in your answer.

Context:
{context}"""

_HUMAN = "{query}"

_rag_template = ChatPromptTemplate.from_messages(
    [
        SystemMessagePromptTemplate.from_template(_SYSTEM),
        HumanMessagePromptTemplate.from_template(_HUMAN),
    ]
)


@traced(
    "build_rag_messages",
    file="services/prompt.py",
    library="langchain",
    version="0.3.19",
    template="ChatPromptTemplate",
    llm_target="llama-3.3-70b-versatile",
)
def build_rag_messages(query: str, context: str) -> list:
    """Return formatted messages ready for LLM invocation."""
    messages = _rag_template.format_messages(query=query, context=context)

    add_current_span_metadata("query_chars",   len(query))
    add_current_span_metadata("context_chars", len(context))
    add_current_span_metadata("context_tokens_est", len(context) // 4)
    add_current_span_metadata("message_count", len(messages))
    add_current_span_metadata("system_prompt_chars", len(_SYSTEM))
    return messages
