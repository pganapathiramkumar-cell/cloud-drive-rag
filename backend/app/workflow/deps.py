"""Runtime dependency version cache — reads from importlib.metadata once at startup."""
from __future__ import annotations
from importlib.metadata import version, PackageNotFoundError
from functools import lru_cache

_TRACKED = [
    "fastapi", "uvicorn", "langchain", "langchain-groq", "langgraph",
    "cohere", "qdrant-client", "presidio-analyzer", "presidio-anonymizer",
    "spacy", "redis", "opentelemetry-sdk", "prometheus-client",
    "google-api-python-client", "PyMuPDF", "python-docx",
    "python-pptx", "openpyxl", "beautifulsoup4", "httpx",
    "python-jose", "slowapi", "sse-starlette",
]

# Maps package install-name → import-name (for display)
_ALIASES: dict[str, str] = {
    "qdrant-client":          "qdrant_client",
    "langchain-groq":         "langchain_groq",
    "google-api-python-client": "googleapiclient",
    "PyMuPDF":                "fitz",
    "python-docx":            "docx",
    "python-pptx":            "pptx",
}

# Function → library mapping used by @traced spans for display
FUNCTION_LIBRARIES: dict[str, tuple[str, str]] = {
    "generate_query_embedding": ("cohere",        "5.5.8"),
    "embed_batch":              ("cohere",        "5.5.8"),
    "qdrant_client.search":     ("qdrant-client", "1.9.1"),
    "qdrant_client.upsert":     ("qdrant-client", "1.9.1"),
    "retrieve_documents":       ("manual",        "—"),
    "presidio.scrub":           ("presidio-analyzer", "2.2.354"),
    "redis.get_history":        ("redis",         "5.0.6"),
    "redis.append_turn":        ("redis",         "5.0.6"),
    "build_rag_messages":       ("langchain",     "0.3.19"),
    "recursive_char_split":     ("langchain",     "0.3.19"),
    "assemble_context_window":  ("manual",        "—"),
}


@lru_cache(maxsize=1)
def get_all_versions() -> dict[str, str]:
    result: dict[str, str] = {}
    for pkg in _TRACKED:
        try:
            result[pkg] = version(pkg)
        except PackageNotFoundError:
            result[pkg] = "not installed"
    return result


def get_version(package: str) -> str:
    return get_all_versions().get(package, "unknown")
