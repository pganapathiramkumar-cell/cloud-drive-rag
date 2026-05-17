"""Unit tests for the text chunker — no external services required."""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.services.chunker import split


def test_short_text_produces_one_chunk():
    chunks = split("Hello world.", metadata={"source": "test"})
    assert len(chunks) == 1
    assert chunks[0]["text"] == "Hello world."
    assert chunks[0]["metadata"]["source"] == "test"


def test_long_text_splits_into_multiple_chunks():
    long_text = " ".join(["word"] * 1000)
    chunks = split(long_text, metadata={"source": "test"})
    assert len(chunks) > 1


def test_metadata_carried_through_all_chunks():
    long_text = " ".join(["word"] * 1000)
    meta = {"source": "test.pdf", "url": "https://example.com", "title": "Test"}
    chunks = split(long_text, metadata=meta)
    for chunk in chunks:
        assert chunk["metadata"]["source"] == "test.pdf"
        assert chunk["metadata"]["url"] == "https://example.com"
        assert chunk["metadata"]["title"] == "Test"


def test_empty_text_returns_empty_list():
    chunks = split("", metadata={})
    assert chunks == []


def test_whitespace_only_returns_empty_list():
    chunks = split("   \n\n\t  ", metadata={})
    assert chunks == []


def test_each_chunk_has_text_and_metadata_keys():
    chunks = split("Some text here.", metadata={"source": "x"})
    for chunk in chunks:
        assert "text" in chunk
        assert "metadata" in chunk


def test_chunk_size_respected():
    # Each chunk should not wildly exceed chunk_size (512 tokens ≈ ~2000 chars)
    long_text = "A" * 10000
    chunks = split(long_text, metadata={})
    for chunk in chunks:
        assert len(chunk["text"]) <= 3000, f"chunk too large: {len(chunk['text'])} chars"
