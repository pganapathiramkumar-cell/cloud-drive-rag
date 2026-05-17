"""Unit tests for the document parser — no external services required."""
import pytest
import sys
import os
import io

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.services.doc_parser import parse_file


def test_plain_text_parsed():
    content = b"Hello, this is a plain text document."
    text = parse_file(content, filename="test.txt")
    assert "Hello" in text
    assert len(text) > 0


def test_csv_parsed():
    content = b"name,age\nAlice,30\nBob,25"
    text = parse_file(content, filename="test.csv")
    assert "Alice" in text or "name" in text


def test_unsupported_extension_raises():
    with pytest.raises((ValueError, Exception)):
        parse_file(b"some data", filename="file.zip")


def test_empty_txt_returns_empty_string():
    text = parse_file(b"", filename="empty.txt")
    assert text.strip() == ""


def test_filename_case_insensitive():
    content = b"Hello world"
    text_lower = parse_file(content, filename="test.txt")
    text_upper = parse_file(content, filename="TEST.TXT")
    assert text_lower == text_upper
