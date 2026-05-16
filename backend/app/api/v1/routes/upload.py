"""POST /v1/upload — direct file upload, parse, chunk, embed, store."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.core.auth import get_current_user
from app.services.doc_parser import extract_text
from app.services.chunker import split
from app.services.embedder import encode
from app.services.vectorstore import add_chunks

router = APIRouter()

# Supported MIME types → file extension
SUPPORTED = {
    "application/pdf":
        (".pdf", "Text-based PDF — not scanned/image PDFs"),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        (".docx", "Microsoft Word"),
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        (".pptx", "Microsoft PowerPoint"),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        (".xlsx", "Microsoft Excel"),
    "text/plain":
        (".txt", "Plain text"),
    "text/csv":
        (".csv", "CSV spreadsheet"),
    "application/msword":
        (".doc", "Legacy Word — convert to .docx for best results"),
}


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    # Validate file type
    if file.content_type not in SUPPORTED:
        supported_list = ", ".join(ext for ext, _ in SUPPORTED.values())
        raise HTTPException(
            400,
            f"Unsupported file type '{file.content_type}'. "
            f"Supported formats: {supported_list}"
        )

    content = await file.read()

    if len(content) == 0:
        raise HTTPException(400, "File is empty.")

    if len(content) > 50 * 1024 * 1024:  # 50 MB limit
        raise HTTPException(413, "File too large. Maximum size is 50 MB.")

    ext, _ = SUPPORTED[file.content_type]

    # Extract text
    try:
        text = extract_text(content, ext)
    except Exception as exc:
        raise HTTPException(422, f"Failed to parse file: {exc}")

    if not text.strip():
        raise HTTPException(
            422,
            "No text could be extracted from this file. "
            "If this is a PDF, it may be scanned/image-based (OCR required). "
            "Please use a text-based PDF or copy the content into a Word document."
        )

    # Chunk → embed → store
    meta = {"source": file.filename, "upload": True}
    chunks = split(text, meta)

    if not chunks:
        raise HTTPException(422, "File parsed but produced no chunks.")

    embeddings = encode([c["text"] for c in chunks])
    stored = add_chunks(chunks, embeddings)

    return {
        "status": "indexed",
        "filename": file.filename,
        "chunks_stored": stored,
        "characters": len(text),
    }


@router.get("/upload/supported-types")
async def supported_types():
    """Return list of supported file types with descriptions."""
    return {
        "supported": [
            {"extension": ext, "mime": mime, "description": desc}
            for mime, (ext, desc) in SUPPORTED.items()
        ],
        "not_supported": [
            {"type": "Scanned PDF", "reason": "No embedded text — requires OCR software"},
            {"type": "Images (JPG, PNG, GIF)", "reason": "Cannot extract text from images"},
            {"type": "ZIP / RAR archives", "reason": "Compressed files not supported"},
            {"type": "Audio / Video", "reason": "Media files contain no readable text"},
            {"type": "Password-protected files", "reason": "Cannot open encrypted documents"},
        ],
        "tips": [
            "Open a scanned PDF in Google Docs — it will OCR the text automatically",
            "Save legacy .doc files as .docx before uploading",
            "Excel files: ensure data is in cells, not embedded images",
        ],
    }
