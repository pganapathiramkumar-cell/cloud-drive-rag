"""Groq ChatGroq client — streaming-capable, single instance per process."""
from functools import lru_cache

from langchain_groq import ChatGroq

from app.config import settings


@lru_cache(maxsize=2)
def get_llm(streaming: bool = False) -> ChatGroq:
    return ChatGroq(
        model=settings.groq_model,
        api_key=settings.groq_api_key,
        streaming=streaming,
        temperature=0,
        max_tokens=2048,
    )
