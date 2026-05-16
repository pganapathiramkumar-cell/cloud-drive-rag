"""Async crawler for cloud.google.com/docs — respects rate limits, extracts clean text."""
import asyncio
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from app.config import settings


async def crawl_gcp_docs(
    base_url: str = settings.gcp_docs_base_url,
    max_pages: int = settings.max_crawl_pages,
) -> list[dict]:
    visited: set[str] = set()
    queue: list[str] = [base_url]
    pages: list[dict] = []

    headers = {"User-Agent": "EnterpriseRAG-Crawler/1.0 (educational; contact: admin@example.com)"}

    async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=15.0) as client:
        while queue and len(visited) < max_pages:
            url = queue.pop(0)
            if url in visited:
                continue
            visited.add(url)

            try:
                resp = await client.get(url)
                resp.raise_for_status()
            except Exception:
                continue

            soup = BeautifulSoup(resp.text, "lxml")

            # Extract main content — GCP docs use <main> or <article>
            main = soup.find("main") or soup.find("article") or soup.body
            if not main:
                continue

            text = main.get_text(separator=" ", strip=True)
            title = soup.title.string.strip() if soup.title else url

            pages.append({"url": url, "title": title, "text": text})

            # Discover internal GCP docs links
            for tag in soup.find_all("a", href=True):
                href: str = tag["href"]
                if href.startswith("/docs") or "cloud.google.com/docs" in href:
                    full = urljoin("https://cloud.google.com", href).split("#")[0]
                    if full not in visited and _is_gcp_docs(full):
                        queue.append(full)

            await asyncio.sleep(settings.crawl_delay_seconds)

    return pages


def _is_gcp_docs(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.netloc == "cloud.google.com" and parsed.path.startswith("/docs")
