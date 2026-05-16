"""Google Drive integration — OAuth2 flow and per-user folder sync."""
import json
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse

from app.api.v1.schemas import DriveConnectStatus, DriveSyncStatus
from app.core.auth import get_current_user
from app.services import doc_parser, gdrive
from app.services.chunker import split
from app.services.embedder import encode
from app.services.vectorstore import add_chunks
from app.config import settings

import redis.asyncio as aioredis
from pydantic import BaseModel

router = APIRouter(prefix="/drive")

_redis: aioredis.Redis | None = None


def _get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis

# In-memory sync job store — same pattern as ingest jobs
_sync_jobs: dict[str, DriveSyncStatus] = {}


def _token_key(user_id: str) -> str:
    return f"gdrive:token:{user_id}"


# ── OAuth flow ────────────────────────────────────────────────────────────────

@router.get("/auth", response_model=DriveConnectStatus)
async def start_auth(user: dict = Depends(get_current_user)):
    """Return Google authorization URL for the frontend to redirect the user to."""
    url, state = gdrive.get_auth_url()
    await _get_redis().setex(f"gdrive:state:{state}", 600, user["user_id"])
    return DriveConnectStatus(connected=False, auth_url=url)


@router.get("/callback")
async def oauth_callback(code: str = Query(...), state: str = Query(...)):
    """Google redirects here after the user grants Drive access."""
    user_id = await _get_redis().get(f"gdrive:state:{state}")
    if not user_id:
        raise HTTPException(400, "Invalid or expired OAuth state. Restart the auth flow.")

    token_data = gdrive.exchange_code(code)
    await _get_redis().set(_token_key(user_id), json.dumps(token_data))
    await _get_redis().delete(f"gdrive:state:{state}")

    return RedirectResponse(url=f"{settings.frontend_url}?drive=connected")


@router.get("/status", response_model=DriveConnectStatus)
async def drive_status(user: dict = Depends(get_current_user)):
    """Check whether the current user has a connected Google Drive token."""
    connected = bool(await _get_redis().exists(_token_key(user["user_id"])))
    return DriveConnectStatus(connected=connected)


@router.delete("/disconnect")
async def disconnect_drive(user: dict = Depends(get_current_user)):
    """Remove the stored Drive token for this user."""
    await _get_redis().delete(_token_key(user["user_id"]))
    return {"status": "disconnected"}


# ── Folder sync ───────────────────────────────────────────────────────────────

class PublicSyncRequest(BaseModel):
    folder_id: str


@router.post("/sync-public", response_model=DriveSyncStatus)
async def sync_public_folder(
    req: PublicSyncRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Sync a publicly shared Drive folder using just a Google API key — no OAuth needed."""
    if not settings.google_api_key:
        raise HTTPException(400, "GOOGLE_API_KEY not set in backend/.env")

    job_id = str(uuid.uuid4())
    job = DriveSyncStatus(job_id=job_id, status="queued", folder_id=req.folder_id)
    _sync_jobs[job_id] = job

    background_tasks.add_task(
        _run_public_sync,
        job_id=job_id,
        folder_id=req.folder_id,
        api_key=settings.google_api_key,
    )
    return job


class SyncRequest(BaseModel):
    folder_id: str  # Google Drive folder ID extracted from the folder URL


@router.post("/sync", response_model=DriveSyncStatus)
async def sync_folder(
    req: SyncRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Kick off background ingestion for all supported files in a Drive folder."""
    token_json = await _get_redis().get(_token_key(user["user_id"]))
    if not token_json:
        raise HTTPException(401, "Google Drive not connected. Call GET /v1/drive/auth first.")

    job_id = str(uuid.uuid4())
    job = DriveSyncStatus(job_id=job_id, status="queued", folder_id=req.folder_id)
    _sync_jobs[job_id] = job

    background_tasks.add_task(
        _run_sync,
        job_id=job_id,
        token_data=json.loads(token_json),
        folder_id=req.folder_id,
    )
    return job


@router.get("/sync/{job_id}", response_model=DriveSyncStatus)
async def get_sync_status(job_id: str, user: dict = Depends(get_current_user)):
    if job_id not in _sync_jobs:
        raise HTTPException(404, "Sync job not found.")
    return _sync_jobs[job_id]


# ── Background sync workers ───────────────────────────────────────────────────

def _run_public_sync(job_id: str, folder_id: str, api_key: str) -> None:
    import time
    job = _sync_jobs[job_id]
    job.status = "running"
    try:
        files = gdrive.list_public_folder_files(folder_id, api_key)
        job.files_found = len(files)

        for f in files:
            content_bytes, ext = gdrive.download_public_file(f["id"], f["mimeType"], api_key)
            text = doc_parser.extract_text(content_bytes, ext)
            if not text.strip():
                continue

            meta = {"source": f["name"], "drive_file_id": f["id"], "folder_id": folder_id}
            chunks = split(text, meta)
            if not chunks:
                continue

            embeddings = encode([c["text"] for c in chunks])
            add_chunks(chunks, embeddings)
            job.files_indexed += 1
            job.chunks_stored += len(chunks)
            time.sleep(1)  # pace requests to stay within Cohere trial limits

        job.status = "done"
    except Exception as exc:
        job.status = "error"
        job.message = str(exc)


def _run_sync(job_id: str, token_data: dict, folder_id: str) -> None:
    job = _sync_jobs[job_id]
    job.status = "running"
    try:
        files = gdrive.list_folder_files(token_data, folder_id)
        job.files_found = len(files)

        for f in files:
            content_bytes, ext = gdrive.download_file(token_data, f["id"], f["mimeType"])
            text = doc_parser.extract_text(content_bytes, ext)
            if not text.strip():
                continue

            meta = {
                "source":       f["name"],
                "drive_file_id": f["id"],
                "folder_id":    folder_id,
            }
            chunks = split(text, meta)
            if not chunks:
                continue

            embeddings = encode([c["text"] for c in chunks])
            add_chunks(chunks, embeddings)
            job.files_indexed += 1
            job.chunks_stored += len(chunks)

        job.status = "done"

    except Exception as exc:
        job.status = "error"
        job.message = str(exc)
