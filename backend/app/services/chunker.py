"""Text chunking using LangChain's RecursiveCharacterTextSplitter."""
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings
from app.workflow.tracer import traced, add_current_span_metadata

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=settings.chunk_size,
    chunk_overlap=settings.chunk_overlap,
    separators=["\n\n", "\n", ". ", " ", ""],
)


@traced(
    "recursive_char_split",
    file="services/chunker.py",
    library="langchain",
    version="0.3.19",
    splitter="RecursiveCharacterTextSplitter",
    chunk_size=512,
    chunk_overlap=64,
)
def split(text: str, metadata: dict | None = None) -> list[dict]:
    """Split text into chunks, carrying metadata forward to every chunk."""
    chunks = _splitter.split_text(text)
    meta   = metadata or {}
    result = [{"text": chunk, "metadata": meta} for chunk in chunks]

    add_current_span_metadata("input_chars",   len(text))
    add_current_span_metadata("chunks_created", len(result))
    add_current_span_metadata("avg_chunk_chars", round(len(text) / max(len(result), 1)))
    add_current_span_metadata("chunk_size",    settings.chunk_size)
    add_current_span_metadata("chunk_overlap", settings.chunk_overlap)
    return result
