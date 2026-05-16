"""BackgroundTask runner — updates the in-memory job store throughout the run."""
import asyncio

from app.api.v1.schemas import IngestStatus
from app.ingestion.pipeline import run as run_pipeline


async def run_ingestion_job(
    job_id: str,
    jobs: dict[str, IngestStatus],
    base_url: str | None,
    max_pages: int,
) -> None:
    jobs[job_id].status = "running"
    try:
        result = await run_pipeline(base_url=base_url, max_pages=max_pages)
        jobs[job_id].status = "done"
        jobs[job_id].docs_crawled = result["docs_crawled"]
        jobs[job_id].chunks_stored = result["chunks_stored"]
        jobs[job_id].message = f"Ingested {result['docs_crawled']} docs, {result['chunks_stored']} chunks."
    except Exception as exc:
        jobs[job_id].status = "error"
        jobs[job_id].message = str(exc)
