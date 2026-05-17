"""Shared pytest configuration — sets env vars before any import."""
import os

# Must be set before app imports
os.environ.setdefault("SKIP_AUTH", "true")
os.environ.setdefault("OTEL_ENABLED", "false")
os.environ.setdefault("GROQ_API_KEY", "test-key")
os.environ.setdefault("COHERE_API_KEY", "test-key")
os.environ.setdefault("QDRANT_URL", "http://localhost:6333")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
