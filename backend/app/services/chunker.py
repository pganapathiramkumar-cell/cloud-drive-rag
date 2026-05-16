"""Text chunking using LangChain's RecursiveCharacterTextSplitter."""
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=settings.chunk_size,
    chunk_overlap=settings.chunk_overlap,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def split(text: str, metadata: dict | None = None) -> list[dict]:
    """Split text into chunks, carrying metadata forward to every chunk."""
    chunks = _splitter.split_text(text)
    meta = metadata or {}
    return [{"text": chunk, "metadata": meta} for chunk in chunks]
