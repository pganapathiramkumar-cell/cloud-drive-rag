"""Shared state TypedDict flowing through every LangGraph node."""
from __future__ import annotations

from typing import Optional
from typing_extensions import TypedDict


class AgentState(TypedDict):
    # ── Input ────────────────────────────────────────────────────────────────
    query: str
    session_id: str
    user_id: str
    role: str

    # ── Query Intelligence ────────────────────────────────────────────────────
    rewritten_query: str
    pii_detected_input: bool

    # ── Retrieval ─────────────────────────────────────────────────────────────
    retrieved_docs: list[dict]   # [{text, metadata, score}]
    context: str                 # assembled context string passed to LLM
    citations: list[dict]        # [{title, url, excerpt}]

    # ── Generation ────────────────────────────────────────────────────────────
    response: str
    pii_detected_output: bool

    # ── Control flow ──────────────────────────────────────────────────────────
    blocked: bool
    block_reason: Optional[str]
    error: Optional[str]
