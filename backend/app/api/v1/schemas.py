"""Pydantic request/response models for all v1 routes."""
from typing import Optional
from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    session_id: str = Field(default="default")


class Citation(BaseModel):
    index: int
    title: str
    url: str
    excerpt: str


class QueryResponse(BaseModel):
    response: str
    citations: list[Citation]
    session_id: str
    pii_detected: bool


class IngestRequest(BaseModel):
    base_url: Optional[str] = None  # defaults to GCP docs root
    max_pages: Optional[int] = Field(default=50, ge=1, le=500)


class IngestStatus(BaseModel):
    job_id: str
    status: str   # queued | running | done | error
    docs_crawled: int = 0
    chunks_stored: int = 0
    message: str = ""


class HealthResponse(BaseModel):
    status: str
    chromadb: str
    redis: str
    version: str = "1.0.0"


class DriveConnectStatus(BaseModel):
    connected: bool
    auth_url: Optional[str] = None


class DriveSyncStatus(BaseModel):
    job_id: str
    status: str          # queued | running | done | error
    folder_id: str
    files_found: int = 0
    files_indexed: int = 0
    chunks_stored: int = 0
    message: str = ""
