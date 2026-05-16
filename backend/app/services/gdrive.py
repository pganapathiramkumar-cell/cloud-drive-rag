"""Google Drive service — OAuth2 flow, folder listing, file download."""
import io

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

from app.config import settings

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

# Google Workspace MIME → (export format, file extension)
_WORKSPACE_EXPORTS: dict[str, tuple[str, str]] = {
    "application/vnd.google-apps.document":     ("text/plain", ".txt"),
    "application/vnd.google-apps.spreadsheet":  ("text/csv",   ".csv"),
    "application/vnd.google-apps.presentation": ("text/plain", ".txt"),
}

_MIME_TO_EXT: dict[str, str] = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":  ".docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":         ".xlsx",
    "text/plain": ".txt",
    "text/csv":   ".csv",
}

SUPPORTED_MIME_TYPES: set[str] = {*_MIME_TO_EXT, *_WORKSPACE_EXPORTS}


def _build_flow() -> Flow:
    client_config = {
        "web": {
            "client_id":     settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uris": [settings.google_redirect_uri],
            "auth_uri":      "https://accounts.google.com/o/oauth2/auth",
            "token_uri":     "https://oauth2.googleapis.com/token",
        }
    }
    return Flow.from_client_config(
        client_config, scopes=SCOPES, redirect_uri=settings.google_redirect_uri
    )


def get_auth_url() -> tuple[str, str]:
    """Return (authorization_url, state) to redirect the browser to Google."""
    flow = _build_flow()
    url, state = flow.authorization_url(access_type="offline", prompt="consent")
    return url, state


def exchange_code(code: str) -> dict:
    """Exchange the auth code from Google callback for a serialisable token dict."""
    flow = _build_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials
    return {
        "token":         creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri":     creds.token_uri,
        "client_id":     creds.client_id,
        "client_secret": creds.client_secret,
        "scopes":        list(creds.scopes or SCOPES),
    }


def _creds(token_data: dict) -> Credentials:
    return Credentials(
        token=token_data["token"],
        refresh_token=token_data.get("refresh_token"),
        token_uri=token_data["token_uri"],
        client_id=token_data["client_id"],
        client_secret=token_data["client_secret"],
        scopes=token_data["scopes"],
    )


def list_public_folder_files(folder_id: str, api_key: str) -> list[dict]:
    """List supported files in a publicly shared Drive folder using an API key."""
    service = build("drive", "v3", developerKey=api_key)
    mime_filter = " or ".join(f"mimeType='{m}'" for m in SUPPORTED_MIME_TYPES)
    query = f"'{folder_id}' in parents and trashed=false and ({mime_filter})"

    files: list[dict] = []
    page_token = None
    while True:
        resp = service.files().list(
            q=query,
            fields="nextPageToken, files(id, name, mimeType)",
            pageToken=page_token,
            pageSize=100,
        ).execute()
        files.extend(resp.get("files", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return files


def download_public_file(file_id: str, mime_type: str, api_key: str) -> tuple[bytes, str]:
    """Download a public Drive file using an API key."""
    service = build("drive", "v3", developerKey=api_key)

    if mime_type in _WORKSPACE_EXPORTS:
        export_mime, ext = _WORKSPACE_EXPORTS[mime_type]
        request = service.files().export_media(fileId=file_id, mimeType=export_mime)
    else:
        ext = _MIME_TO_EXT.get(mime_type, ".bin")
        request = service.files().get_media(fileId=file_id)

    buf = io.BytesIO()
    downloader = MediaIoBaseDownload(buf, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()
    return buf.getvalue(), ext


def list_folder_files(token_data: dict, folder_id: str) -> list[dict]:
    """Return all supported files directly inside a Drive folder (non-recursive)."""
    service = build("drive", "v3", credentials=_creds(token_data))
    mime_filter = " or ".join(f"mimeType='{m}'" for m in SUPPORTED_MIME_TYPES)
    query = f"'{folder_id}' in parents and trashed=false and ({mime_filter})"

    files: list[dict] = []
    page_token = None
    while True:
        resp = service.files().list(
            q=query,
            fields="nextPageToken, files(id, name, mimeType)",
            pageToken=page_token,
            pageSize=100,
        ).execute()
        files.extend(resp.get("files", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return files


def download_file(token_data: dict, file_id: str, mime_type: str) -> tuple[bytes, str]:
    """Download a file. Returns (raw_bytes, extension)."""
    service = build("drive", "v3", credentials=_creds(token_data))

    if mime_type in _WORKSPACE_EXPORTS:
        export_mime, ext = _WORKSPACE_EXPORTS[mime_type]
        request = service.files().export_media(fileId=file_id, mimeType=export_mime)
    else:
        ext = _MIME_TO_EXT.get(mime_type, ".bin")
        request = service.files().get_media(fileId=file_id)

    buf = io.BytesIO()
    downloader = MediaIoBaseDownload(buf, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()
    return buf.getvalue(), ext
