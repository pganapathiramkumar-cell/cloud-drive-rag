"""POST /v1/ingest — triggers the background ingestion pipeline (admin only)."""
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends

from app.api.v1.schemas import IngestRequest, IngestStatus
from app.core.auth import require_role
from app.ingestion.worker import run_ingestion_job

router = APIRouter()

# In-memory job store — replace with Redis or a DB table in production
_jobs: dict[str, IngestStatus] = {}


@router.post("/ingest", response_model=IngestStatus)
async def trigger_ingest(
    request: IngestRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_role("admin")),
):
    job_id = str(uuid.uuid4())
    status = IngestStatus(job_id=job_id, status="queued")
    _jobs[job_id] = status

    background_tasks.add_task(
        run_ingestion_job,
        job_id=job_id,
        jobs=_jobs,
        base_url=request.base_url,
        max_pages=request.max_pages,
    )

    return status


@router.get("/ingest/{job_id}", response_model=IngestStatus)
async def get_ingest_status(
    job_id: str,
    user: dict = Depends(require_role("admin")),
):
    if job_id not in _jobs:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Job not found.")
    return _jobs[job_id]
