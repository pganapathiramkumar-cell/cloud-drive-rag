"""Full ingestion pipeline: crawl → PII scrub → chunk → embed → store."""
from app.services.crawler import crawl_gcp_docs
from app.services.pii import scrub
from app.services.chunker import split
from app.services.embedder import encode
from app.services.vectorstore import add_chunks
from app.observability.metrics import docs_ingested_total, chunks_created_total


async def run(base_url: str | None, max_pages: int) -> dict:
    from app.config import settings

    url = base_url or settings.gcp_docs_base_url
    pages = await crawl_gcp_docs(base_url=url, max_pages=max_pages)

    total_chunks = 0
    total_docs = 0

    for page in pages:
        try:
            # PII scrub raw page text before it ever hits storage
            clean_text, _ = scrub(page["text"])

            # Chunk the cleaned text, carrying URL + title as metadata
            chunks = split(
                clean_text,
                metadata={"url": page["url"], "title": page["title"]},
            )

            if not chunks:
                continue

            texts = [c["text"] for c in chunks]
            embeddings = encode(texts)

            stored = add_chunks(chunks, embeddings)
            total_chunks += stored
            total_docs += 1

            docs_ingested_total.labels(status="success").inc()
            chunks_created_total.inc(stored)

        except Exception:
            docs_ingested_total.labels(status="error").inc()

    return {"docs_crawled": total_docs, "chunks_stored": total_chunks}
