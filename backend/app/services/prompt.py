"""LangChain PromptTemplate registry — one template per use-case."""
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate

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


def build_rag_messages(query: str, context: str) -> list:
    """Return formatted messages ready for LLM invocation."""
    return _rag_template.format_messages(query=query, context=context)
