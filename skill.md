# skill.md — Enterprise RAG + Agentic AI Modular Skills

> Status legend: ✅ Implemented · 🔧 Partial · 📋 Planned

---

## Library Version Reference

| Library | Version | Used By |
|---------|---------|---------|
| `fastapi` | 0.111.0 | API gateway, all routes |
| `uvicorn[standard]` | 0.29.0 | ASGI server |
| `pydantic-settings` | 2.2.1 | Settings / config management |
| `python-multipart` | 0.0.9 | File upload endpoint |
| `langchain` | 0.3.19 | LLM chains, prompt templates |
| `langchain-community` | 0.3.19 | LangChain community integrations |
| `langchain-groq` | 0.2.4 | Groq ChatGroq client |
| `langgraph` | 0.2.73 | Pipeline StateGraph |
| `cohere` | 5.5.8 | `embed-english-v3.0` embeddings |
| `qdrant-client` | 1.9.1 | Qdrant Cloud vector store |
| `presidio-analyzer` | 2.2.354 | PII entity detection |
| `presidio-anonymizer` | 2.2.354 | PII entity replacement |
| `spacy` | 3.8.4 | NLP engine for Presidio (`en_core_web_sm` 12 MB) |
| `redis` | 5.0.6 | Session memory (Upstash-compatible) |
| `httpx` | 0.27.0 | Async HTTP client (crawler, Drive API) |
| `beautifulsoup4` | 4.12.3 | GCP Docs HTML scraping |
| `lxml` | 5.2.1 | HTML parser for BeautifulSoup4 |
| `PyMuPDF` | 1.24.5 | PDF text extraction (`fitz`) |
| `python-docx` | 1.1.2 | DOCX paragraph extraction |
| `python-pptx` | 0.6.23 | PPTX slide text extraction |
| `openpyxl` | 3.1.4 | XLSX cell value extraction |
| `google-auth` | 2.29.0 | Google API authentication |
| `google-auth-oauthlib` | 1.2.0 | OAuth2 flow for Drive |
| `google-api-python-client` | 2.134.0 | Google Drive API v3 client |
| `python-jose[cryptography]` | 3.3.0 | Keycloak JWT RS256 validation |
| `slowapi` | 0.1.9 | Rate limiting middleware |
| `prometheus-client` | 0.20.0 | `/metrics` endpoint |
| `opentelemetry-sdk` | 1.24.0 | Distributed tracing |
| `opentelemetry-instrumentation-fastapi` | 0.45b0 | FastAPI auto-instrumentation |
| `opentelemetry-exporter-otlp-proto-grpc` | 1.24.0 | OTLP gRPC trace export |
| `protobuf` | >=3.19,<5.0 | Pinned — qdrant-client/otel compatibility |
| `sse-starlette` | 2.1.0 | Server-Sent Events streaming |
| `pytest` | 8.2.2 | Test framework |
| `pytest-asyncio` | 0.23.7 | Async test support |
| `react` | 18.3.1 | Frontend UI framework |
| `react-dom` | 18.3.1 | React DOM renderer |
| `typescript` | 5.4.5 | Frontend language |
| `vite` | 5.3.1 | Frontend build tool |
| `@vitejs/plugin-react` | 4.3.1 | Vite React/JSX transform |
| `axios` | 1.7.2 | Frontend HTTP client |
| `keycloak-js` | 24.0.5 | Frontend Keycloak auth adapter |
| `lucide-react` | 0.390.0 | Frontend icon library |
| `zustand` | 4.5.2 | Frontend state management |
| `tailwindcss` | 3.4.4 | Tailwind base reset + utilities |
| `postcss` | 8.4.39 | CSS build pipeline |
| `autoprefixer` | 10.4.19 | CSS vendor prefix automation |
| Python runtime | 3.11 | Docker: `python:3.11-slim` |

---

## A. Retrieval Skills

### `vector_search` ✅
- **Library**: `qdrant-client` **1.9.1**
- **Embedding**: `cohere` **5.5.8** — model `embed-english-v3.0`, 1024-dim, cosine distance
- **Input**: Query string → encoded to 1024-dim float vector via `encode_one()`
- **Output**: Top-K chunks `[{text, metadata:{source,url,title}, score}]`
- **Config**: `qdrant_collection="enterprise_rag"`, `retrieval_top_k=5`, `Distance.COSINE`
- **Collection schema**: `PointStruct(id=uuid4, vector=list[float][1024], payload={text, url, title, source})`
- **Auth**: Qdrant Cloud API key (`qdrant_api_key` env var); falls back to local `qdrant_url`
- **Auto-creates collection** on first use via `_ensure_collection()`
- **Owns**: `services/vectorstore.py` — lru_cache singleton, `add_chunks()`, `query()`, `delete_collection()`
- **Does NOT own**: Embedding generation (`embedder.py`), result assembly

---

### `keyword_search` 📋
- **Target library**: `opensearch-py` (planned)
- **Algorithm**: BM25 (k1/b configurable)
- **Notes**: Not yet implemented; all retrieval is vector-only via Qdrant

---

### `graph_reasoning` 📋
- **Target library**: `neo4j` Python driver (planned)
- **Query language**: Cypher, max 3 hops
- **Notes**: Not yet implemented

---

### `hybrid_search_engine` 📋
- **Algorithm**: Reciprocal Rank Fusion (RRF)
- **Input**: Results from `vector_search` + `keyword_search` + `graph_reasoning`
- **Notes**: Blocked on OpenSearch and Neo4j

---

## B. Intelligence Skills

### `query_rewriter` ✅
- **Libraries**: `langchain` **0.3.19** · `langchain-groq` **0.2.4** · `langgraph` **0.2.73**
- **LLM**: Groq API — `llama-3.3-70b-versatile`, `temperature=0`, `max_tokens=2048`
- **Chain**: `langchain_core.prompts.PromptTemplate | langchain_groq.ChatGroq | langchain_core.output_parsers.StrOutputParser`
- **Input**: `state["query"]` (raw user query)
- **Output**: `state["rewritten_query"]` — clear, specific, pronoun-resolved
- **Fallback**: Exception caught silently → returns original query unchanged
- **Tracks**: `analytics_tracker.record_node_latency("rewrite", ms)` · `prometheus_client` `node_duration.labels(node="rewrite")`
- **Owns**: `pipeline/nodes/rewrite.py` — prompt template, LLM chain, fallback logic

---

### `query_decomposer` 📋
- **Target**: LangGraph node using `langchain-groq` **0.2.4**
- **Notes**: Not yet implemented; pipeline is single-query only

---

### `cohere_embedder` ✅
- **Library**: `cohere` **5.5.8**
- **Model**: `embed-english-v3.0` — 1024-dim, float embeddings
- **Batch size**: 20 texts per API call
- **Rate limit handling**: 65 s sleep + 3 retries on HTTP 429 (trial quota resets per minute)
- **Input types**: `"search_document"` (ingestion) · `"search_query"` (query time)
- **Functions**: `encode(texts, input_type)` → batched · `encode_one(text)` → single
- **Client**: `cohere.Client` via `lru_cache(maxsize=1)` singleton
- **Tracks**: `analytics_tracker.record_embed(num_texts)` per batch
- **Owns**: `services/embedder.py` — client factory, batch loop, retry logic, `VECTOR_SIZE=1024`
- **Does NOT own**: Vector store operations, chunking

---

## C. Agent Skills

### `langgraph_pipeline` ✅
- **Library**: `langgraph` **0.2.73** · `langchain` **0.3.19**
- **Graph type**: `langgraph.graph.StateGraph` — compiled to singleton `rag_graph` at module import
- **State**: `AgentState(TypedDict)` — `{query, rewritten_query, context, answer, citations, session_id, blocked, error, pii_detected}`
- **Node sequence**:
  ```
  rewrite → scan_input → [conditional] → retrieve → assemble → generate → scan_output → END
                               ↓ (blocked=True or error)
                              END
  ```
- **Routing function**: `_route_after_scan_input` — checks `state.blocked or state.error`
- **Owns**: `pipeline/graph.py` — StateGraph wiring, edge definitions, conditional routing, module-level compile

---

### `tool_router` 📋
- **Target**: LangGraph conditional edge with intent classifier
- **Notes**: Not yet implemented; current pipeline is fixed linear sequence

---

### `planner_agent` 📋
- **Target**: LangGraph StateGraph (AutoGen-style, multi-step)
- **Notes**: Not yet implemented

---

### `reasoning_loop` 📋
- **Target**: LangGraph ReAct loop (Thought → Action → Observation)
- **Notes**: Not yet implemented; current pipeline is single-pass

---

## D. Memory Skills

### `session_memory` ✅
- **Library**: `redis` **5.0.6** — Upstash-compatible URL (`redis://...` or `rediss://...`)
- **Config**: `session_ttl=3600 s`, `session_max_turns=20`, key namespace `session:{session_id}`
- **Read**: Before `assemble` node — fetches last N turns for context injection
- **Write**: After pipeline completes — appends `{query, answer}` as JSON-serialised turn
- **Serialisation**: JSON per turn, `LPUSH` + `EXPIRE` on write
- **Fallback**: If Redis unavailable → proceeds stateless (no history injected), logs warning
- **Owns**: `services/memory.py` — Redis client, session key schema, TTL management
- **Does NOT own**: Semantic memory, vector operations

---

### `semantic_memory` 📋
- **Target**: Weaviate (dedicated memory class)
- **Notes**: Not yet implemented; session memory covers multi-turn continuity

---

## E. Generation Skills

### `llm_inference` ✅
- **Library**: `langchain-groq` **0.2.4** — `langchain_groq.ChatGroq`
- **Model**: `llama-3.3-70b-versatile` (Groq API)
- **Config**: `temperature=0`, `max_tokens=2048`
- **Client**: `lru_cache(maxsize=2)` — separate cached instances for `streaming=True` and `streaming=False`
- **Token tracking**: `analytics_tracker.record_tokens(input_tokens, output_tokens)` after each call
- **Error handling**: `analytics_tracker.record_error("llm")` on exception
- **Owns**: `services/llm.py` — `get_llm(streaming: bool)` factory
- **Does NOT own**: Prompt construction, guardrail checks, context assembly

---

### `prompt_builder` ✅
- **Library**: `langchain` **0.3.19** — `langchain_core.prompts.PromptTemplate`
- **Templates**:
  - `rewrite` node: single-turn rewrite instruction
  - `generate` node: system instruction + `{context}` + `{question}` → grounded answer with citations
- **Token budget**: Implicitly managed by `chunk_size=512` × `retrieval_top_k=5` (≈2560 context tokens)
- **Owns**: `services/prompt.py` — template registry, variable injection
- **Does NOT own**: Context retrieval, LLM invocation

---

### `context_assembler` ✅
- **Library**: `langgraph` **0.2.73** — `assemble` node
- **Input**: `state["context"]` (Qdrant chunks) + Redis session turns
- **Output**: Formatted string injected into generate prompt
  ```
  [Source: {title} ({url})]
  {chunk_text}
  ---
  [Session history]
  User: ...  Assistant: ...
  ```
- **Tracks**: `analytics_tracker.record_node_latency("assemble", ms)`
- **Owns**: `pipeline/nodes/assemble.py`

---

### `document_parser` ✅
- **Libraries**:
  | Format | Library | Version |
  |--------|---------|---------|
  | PDF | `PyMuPDF` (`fitz`) | **1.24.5** |
  | DOCX | `python-docx` | **1.1.2** |
  | PPTX | `python-pptx` | **0.6.23** |
  | XLSX | `openpyxl` | **3.1.4** |
  | TXT / CSV | Python built-in | — |
- **Max file size**: 50 MB enforced at upload endpoint
- **Limitation**: PDF must be text-based (scanned/image PDFs return empty text)
- **Owns**: `services/doc_parser.py`

---

### `text_chunker` ✅
- **Library**: `langchain` **0.3.19** — `langchain_text_splitters.RecursiveCharacterTextSplitter`
- **Config**: `chunk_size=512`, `chunk_overlap=64`
- **Separators**: `["\n\n", "\n", " ", ""]` (recursive fallback order)
- **Metadata carrythrough**: `{url, title, source}` attached to every chunk dict
- **Output**: `list[{text: str, metadata: dict}]`
- **Owns**: `services/chunker.py`
- **Does NOT own**: Embedding, document parsing

---

### `web_crawler` ✅
- **Libraries**: `httpx` **0.27.0** (async HTTP) · `beautifulsoup4` **4.12.3** + `lxml` **5.2.1** (HTML parsing)
- **Target**: `https://cloud.google.com/docs` (configurable via `gcp_docs_base_url`)
- **Config**: `max_crawl_pages` (default 100, max 500), `crawl_delay_seconds=0.5`
- **Extracts**: Page `<title>`, visible text (strips scripts/styles), canonical URL
- **Owns**: `services/crawler.py` — `crawl_gcp_docs(base_url, max_pages)` async generator

---

### `drive_sync` ✅
- **Libraries**: `google-api-python-client` **2.134.0** · `google-auth` **2.29.0** · `google-auth-oauthlib` **1.2.0**
- **API**: Google Drive API v3 — `files.list`, `files.get_media`
- **Auth**: Public folder access via `google_api_key`; OAuth2 flow available via `google_client_id/secret`
- **Supported MIME types**: PDF, DOCX, PPTX, XLSX, TXT, CSV
- **Job model**: Async background job with `job_id`; status polled by frontend every 2 s
- **Owns**: `services/gdrive.py` · `api/v1/routes/drive.py`

---

## F. Safety Skills

### `pii_detector_input` ✅
- **Libraries**: `presidio-analyzer` **2.2.354** · `presidio-anonymizer` **2.2.354** · `spacy` **3.8.4** (`en_core_web_sm` 12 MB)
- **Warm-up**: `get_pii_engines()` called at FastAPI lifespan startup via `lru_cache(maxsize=1)` singleton
- **Entities**: PERSON, EMAIL_ADDRESS, PHONE_NUMBER, US_SSN, CREDIT_CARD, LOCATION, IP_ADDRESS, URL, etc.
- **On PII detected in input**: `state.blocked = True`, `state.pii_detected = True` → LangGraph routes to END
- **Client response**: `{answer: "Query blocked — PII detected", pii_detected: true}` — no LLM call made
- **Owns**: `services/pii.py` — `scrub(text) → (anonymised_text, bool)` · `pipeline/nodes/scan_input.py`
- **Does NOT own**: Output scanning (separate `scan_output` node)

---

### `pii_detector_output` ✅
- **Libraries**: Same `presidio-analyzer` **2.2.354** + `presidio-anonymizer` **2.2.354** singleton
- **Input**: Raw LLM response (`state["answer"]`)
- **On detection**: Anonymises with `<TYPE>` placeholders (e.g. `<PERSON>`, `<EMAIL_ADDRESS>`)
- **Does NOT block**: Always returns answer (redacted if needed); pipeline continues to END
- **Tracks**: `analytics_tracker.record_node_latency("scan_output", ms)`
- **Owns**: `pipeline/nodes/scan_output.py`

---

### `auth_middleware` ✅
- **Library**: `python-jose[cryptography]` **3.3.0** — JWT RS256 decode + validation
- **Identity Provider**: Keycloak (realm: `enterprise-rag`, client: `rag-backend`)
- **Config**: `keycloak_server_url`, `keycloak_realm`, `keycloak_client_id` env vars
- **Validation**: Decodes Bearer token, extracts `sub` (user ID), `email`, `realm_access.roles`
- **Role enforcement**: `admin` role required for `/ingest`, `/drive`, `/metrics`, `/analytics` routes
- **Owns**: `core/auth.py` — `get_current_user()` FastAPI dependency

---

### `rate_limiter` ✅
- **Library**: `slowapi` **0.1.9** — wraps `limits` library
- **Config**: Per-IP rate limits on sensitive endpoints
- **Owns**: `core/rate_limit.py` — SlowAPI limiter, exception handler registration

---

### `policy_enforcer` 📋
- **Target**: OPA (Open Policy Agent) with Rego policy bundles
- **Notes**: Not yet implemented; auth middleware + PII scan are current gates

---

### `output_filter_nemo` 📋
- **Target**: NeMo Guardrails — topic rails, jailbreak defence, toxicity filter
- **Notes**: Not yet implemented

---

## G. Observability Skills

### `node_latency_tracker` ✅
- **Library**: Pure Python — `threading.Lock()`, `collections.defaultdict` — `services/analytics_tracker.py`
- **Granularity**: Per LangGraph node (`rewrite`, `scan_input`, `retrieve`, `assemble`, `generate`, `scan_output`)
- **Computed metrics per node**: `avg_ms`, `p95_ms`, `calls`
- **API**: `GET /v1/analytics` — polled by frontend Analytics tab every 30 s
- **Owns**: `analytics_tracker.record_node_latency(node, ms)` · `get_analytics(qdrant_total)`

---

### `metrics_tracker` ✅
- **Library**: Pure Python — `threading.Lock()`, `dataclasses.dataclass` — `services/metrics_tracker.py`
- **Tracked fields**:
  - Queries: total, successful, failed, blocked, PII-detected
  - Latency: running sum + sample list → avg, p50, p95 computed at read time
  - Retrieval: avg similarity score, avg chunks/query, top-10 sources by hit count
  - Sessions: unique session IDs (set)
  - Response: avg character length
  - RAG quality (approximated): context precision (avg score), context recall (% > 0.35), F1, answer rate, empty-context rate
  - Recent queries: last 20 entries with query text, latency, chunks, score, success flag
  - Ingestion: Drive files indexed/skipped/chunks + upload files indexed/chunks
- **Thread-safe**: `threading.Lock()` on all mutations
- **API**: `GET /v1/metrics` — polled by frontend Metrics tab every 30 s

---

### `analytics_tracker` ✅
- **Library**: Pure Python — `threading.Lock()`, `collections.defaultdict`, `dataclasses.dataclass` — `services/analytics_tracker.py`
- **Tracked fields**:
  - Node latencies: `dict[node, list[ms]]` per pipeline node
  - Token usage: total input tokens, total output tokens, embed call count, embed text count
  - Cost estimates (USD): Groq input ($0.59/1M), Groq output ($0.79/1M), Cohere embed ($0.10/1M)
  - Score distribution: 4 buckets — noise (0–0.3), relevant (0.3–0.5), highly relevant (0.5–0.7), exact (0.7+)
  - Query categories per query avg score: on-topic (≥0.45), borderline (0.3–0.45), off-topic (<0.3)
  - Session depth: `dict[session_id, turn_count]` → avg turns, max turns, multi-turn / single-turn counts
  - Error taxonomy: rate_limit, llm_error, retrieval_error, other
  - Index coverage: unique sources retrieved (set), Qdrant total vectors, coverage rate
- **Thread-safe**: `threading.Lock()` on all mutations
- **API**: `GET /v1/analytics?qdrant_total=N`

---

### `prometheus_exporter` ✅
- **Library**: `prometheus-client` **0.20.0** · `opentelemetry-instrumentation-fastapi` **0.45b0**
- **Custom metrics** (`observability/metrics.py`):
  - `node_duration_seconds` — `Histogram`, label `node` — LangGraph node wall-clock time
  - `docs_ingested_total` — `Counter`, label `status` (success/error)
  - `chunks_created_total` — `Counter` — cumulative chunks stored
- **Endpoint**: `/metrics` (Prometheus scrape target, 15 s interval target)
- **Owns**: `observability/metrics.py`

---

### `otel_tracer` ✅
- **Libraries**: `opentelemetry-sdk` **1.24.0** · `opentelemetry-exporter-otlp-proto-grpc` **1.24.0** · `opentelemetry-instrumentation-fastapi` **0.45b0**
- **Protobuf pin**: `protobuf>=3.19,<5.0` — required because `qdrant-client` 1.9.1 pulls proto v6 which breaks otel-proto serialisation
- **Config**: `otel_service_name="enterprise-rag-backend"`, `otel_endpoint` (gRPC), `otel_enabled=true`
- **Auto-instrumentation**: FastAPI requests, response times, status codes via `opentelemetry-instrumentation-fastapi`
- **Owns**: `observability/tracing.py` — `setup_tracing()`, tracer provider, OTLP gRPC exporter

---

### `sse_streaming` ✅
- **Library**: `sse-starlette` **2.1.0**
- **Usage**: Server-Sent Events for streaming LLM responses to frontend
- **Owns**: `api/v1/routes/query.py` — `EventSourceResponse` wrapper around async generator

---

### `dashboard_visualizer` 📋
- **Target**: Grafana dashboards over Prometheus + OpenSearch
- **Current substitute**: Frontend Metrics + Analytics tabs serve live dashboards via `/v1/metrics` and `/v1/analytics`

---

### `llm_trace_logger` 📋
- **Target**: Langfuse + Helicone
- **Current substitute**: `analytics_tracker` captures token counts and costs in-process

---

## H. Evaluation Skills

### `rag_evaluator` 🔧
- **Target library**: RAGAS (planned for offline eval)
- **Live approximation** (via `metrics_tracker.py`):
  - Context Precision ≈ avg Qdrant similarity score across all retrieval calls
  - Context Recall ≈ % queries with avg score > 0.35
  - F1 ≈ harmonic mean of approximated precision and recall
  - Answer Rate ≈ `successful_queries / total_queries`
  - Empty Context Rate ≈ % queries where `chunks_retrieved == 0`
- **Note**: Proximity-based proxies only; ground-truth RAGAS requires labelled Q&A pairs

---

### `benchmark_runner` 📋
- **Target**: HuggingFace `datasets` library
- **Notes**: Not yet implemented

---

### `regression_tester` 📋
- **Target**: MLflow experiment tracking
- **Notes**: Not yet implemented

---

## I. Frontend Skills (UI Layer)

### `design_system` ✅
- **Technology**: CSS custom properties — `frontend/src/design-system.css`
- **Loaded by**: `frontend/src/main.tsx` — imported after `index.css` (Tailwind base reset)
- **Tailwind role**: `tailwindcss` **3.4.4** provides `@tailwind base` CSS reset (Preflight) only; all component styling is in `design-system.css`
- **Token categories** (all `var(--ds-*)` prefixed):
  - Backgrounds: `--ds-bg` #FFFFFF · `--ds-bg-2` #FAFBFC · `--ds-bg-3` #F8FAFC
  - Blues: `--ds-blue-50` through `--ds-blue-800`
  - Greens: `--ds-green-50` through `--ds-green-700`
  - Reds: `--ds-red-50` through `--ds-red-700`
  - Oranges: `--ds-orange-50` through `--ds-orange-700`
  - Purples: `--ds-purple-50`, `--ds-purple-100`, `--ds-purple-500`, `--ds-purple-600`
  - Cyans: `--ds-cyan-50`, `--ds-cyan-500`, `--ds-cyan-600`
  - Text: `--ds-text-1` #111827 · `--ds-text-2` #374151 · `--ds-text-3` #6B7280 · `--ds-text-4` #9CA3AF · `--ds-text-inv` #FFFFFF
  - Typography: `--ds-font` (Inter, Segoe UI, system-ui) · `--ds-lh` 1.6
  - Spacing: `--ds-s1` 4px → `--ds-s16` 64px
  - Radius: `--ds-r-xs` 4px → `--ds-r-full` 9999px
  - Shadows: xs / sm / md / card / card-hover / header / btn / focus / input-focus
  - Transitions: `--ds-t-fast` 0.15s · `--ds-t` 0.20s · `--ds-t-slow` 0.30s
- **Component classes** (23 sections): layout shells, brand mark, nav tabs, segmented control, user chip, cards (standard/sm/flush/accent), stat cards, buttons (primary/secondary/ghost/danger/danger-ghost × xs/sm/md/lg/xl), form inputs, badges (idle/queued/running/done/error/info/warning/success), progress bars (xs/sm/md/lg), tables, alerts (info/success/warning/error), empty state, drop zone, chat bubbles (user/AI + streaming cursor), workflow pipeline nodes, utilities, **responsive grid utilities**, **media queries**
- **Font**: Inter loaded via `<link>` in `index.html` — weights 400, 500, 600, 700, 800
- **Responsive grid utilities** (Section 22):
  - `.ds-grid-4` — `repeat(4,1fr)` → 2-col at ≤1024px → 2-col at ≤640px
  - `.ds-grid-3` — `repeat(3,1fr)` → 3-col at ≤1024px → 2-col at ≤640px
  - `.ds-grid-2` — `repeat(2,1fr)` → 1-col at ≤640px
  - `.ds-page-actions` — space-between flex row, wraps on mobile
  - `.ds-input-row` — flex row for input+button, stacks on mobile
  - `.ds-chat-toolbar`, `.ds-chat-messages`, `.ds-chat-input-area` — chat layout shells
  - `.ds-workflow-query`, `.ds-workflow-split`, `.ds-workflow-left`, `.ds-workflow-right` — workflow layout
- **Media queries** (Section 23):
  - Tablet `@media (max-width: 1024px)`: grid-4 → 2-col, workflow 55/45 split
  - Mobile `@media (max-width: 640px)`: header wraps 2 rows, all grids collapse, reduced padding, workflow stacks vertically, tables scroll horizontally, tab bars scroll horizontally
- **Rule**: Never write inline `style={{ gridTemplateColumns: 'repeat(N,1fr)' }}` — use `.ds-grid-N` so breakpoints apply

---

### `chat_interface` ✅
- **Libraries**: `react` **18.3.1** · `axios` **1.7.2** · `lucide-react` **0.390.0** · `zustand` **4.5.2**
- **Components**: `ChatWindow`, `ChatInput`, `MessageBubble`, `SourceCard`
- **Layout classes**: `ds-chat-toolbar` (top bar) · `ds-chat-messages` (scroll area, flex-1) · `ds-chat-input-area` (bottom input bar)
- **API**: `streamQuery()` in `src/api/query.ts` — uses `fetch` + `ReadableStream` for SSE, NOT axios; sends `Authorization: Bearer {token}` header
- **API URL**: `const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'` — must have `VITE_API_URL` set on Vercel
- **Auth token**: `getToken()` returns `'dev-token'` when `VITE_SKIP_AUTH=true`; backend accepts `dev-token` when `SKIP_AUTH=true`
- **Features**:
  - Streaming cursor animation — CSS `@keyframes ds-blink` in `design-system.css`
  - `ds-chat-bubble-user` (blue gradient) / `ds-chat-bubble-ai` (white bordered) — `max-width: min(640px, 88%)`
  - PII warning tag (`ds-pii-tag`) on messages with redacted content
  - Citation grid — `ds-grid-2` class (1-column on mobile) under AI responses
  - Enter-to-send, Shift+Enter for newline (textarea `onKeyDown`)
  - Auto-scroll via `useRef + scrollIntoView({ behavior: "smooth" })`
  - Clear chat with `ds-btn-danger-ghost`
  - Empty state with `ds-empty` layout + `MessageSquare` icon from lucide-react
- **State hook**: `useChat()` — messages, loading, sendMessage, clearChat

---

### `ingest_panel` ✅
- **Libraries**: `react` **18.3.1** · `axios` **1.7.2** · `lucide-react` **0.390.0**
- **Components**: `IngestPanel`, `StatusBadge`
- **Three tabs** via `ds-tab-bar` segmented control:
  1. **Upload Files** — `ds-dropzone` drag-and-drop, multi-file progress card, upload history table
  2. **Google Drive** — URL/folder-ID input, Sync button, polling every 2 s via `setInterval`, file-level indexed/skipped lists
  3. **GCP Docs** — `max_pages` number input (1–500), Start Ingestion button
- **Status badge**: `ds-badge-idle/queued/running/done/error` — running state has `ds-badge-dot-pulse` CSS animation
- **Supported formats shown**: PDF, DOCX, PPTX, XLSX, TXT, CSV with notes and unsupported types

---

### `metrics_dashboard` ✅
- **Libraries**: `react` **18.3.1** · `axios` **1.7.2** · `lucide-react` **0.390.0**
- **Component**: `MetricsDashboard`
- **Data source**: `GET /v1/metrics` — `fetchMetrics()` — auto-refresh every 30 s via `setInterval`
- **Sections**: Documents & Indexing · Query Usage · Latency · Most Retrieved Sources · Recent Queries · RAG Quality
- **Sub-components**: `StatCard` (ds-stat-card), `MiniStat` (ds-mini-stat), `QualityCard` (stat-card with progress bar + threshold icon), `MetricRow`, `Section` (ds-section with icon)
- **RAG quality note**: Similarity-based approximations — not ground-truth RAGAS

---

### `analytics_dashboard` ✅
- **Libraries**: `react` **18.3.1** · `axios` **1.7.2** · `lucide-react` **0.390.0**
- **Component**: `AnalyticsDashboard`
- **Data source**: `GET /v1/analytics` — `fetchAnalytics()` — auto-refresh every 30 s via `setInterval`
- **Sections**:
  1. LangGraph Node Latency — per-node `ds-dot` + progress bar with inline `background: NODE_COLORS[node]`
  2. Token Usage & Cost — 4-column stat grid + cost breakdown card
  3. Retrieval Score Distribution — `SCORE_FILL` map → `ds-fill-*` progress bars
  4. Query Categories — on-topic (green) / borderline (orange) / off-topic (red)
  5. Session Depth — total, avg turns, max turns, multi-turn
  6. Error Taxonomy — rate_limit, llm_error, retrieval_error, other
  7. Index Coverage — vectors, sources, coverage rate + progress bar
- **Node color map**: rewrite=`--ds-purple-500` · scan_input=`--ds-orange-500` · retrieve=`--ds-blue-500` · assemble=`--ds-cyan-500` · generate=`--ds-green-500` · scan_output=`--ds-orange-600`
- **Sub-components**: `Section`, `StatCard`, `CostStat`, `CategoryCard`, `ErrorStat` — all use `ds-stat-card`

---

### `auth_guard` ✅
- **Library**: `keycloak-js` **24.0.5**
- **Component**: `src/auth/AuthGuard.tsx` — wraps entire React app in `main.tsx`
- **Init**: `initKeycloak()` called once at app startup; resolves when Keycloak adapter is ready
- **Dev bypass**: `VITE_SKIP_AUTH=true` in `frontend/.env.local` — skips Keycloak entirely
- **Loading state**: Brand logo + `ds-spinner` (CSS `@keyframes ds-spin`) while initialising
- **Error state**: `ds-card` with `AlertCircle` icon + `ds-alert-info` tip showing `VITE_SKIP_AUTH` code
- **Owns**: `src/auth/AuthGuard.tsx` · `src/auth/keycloak.ts` — `initKeycloak()`, `getUserInfo()`, `logout()`

---

### `header_nav` ✅
- **Libraries**: `react` **18.3.1** · `lucide-react` **0.390.0** · `keycloak-js` **24.0.5**
- **Component**: `src/components/layout/Header.tsx`
- **Structure**: brand, nav, user-chip are **direct children** of `<header className="ds-page-header">` — no inner wrapper divs
- **Desktop layout**: `[Brand] [Nav flex-1] [User Chip]` — all on one row; nav fills space between brand and user chip via `flex: 1`
- **Mobile layout** (≤640px via CSS): row 1 = brand (order:1) + user chip (order:2, margin-left:auto); row 2 = nav (order:3, width:100%, overflow-x:auto, hidden scrollbar)
- **Elements**: `ds-brand` (Bot icon + "Enterprise RAG" + "AI" tag) · `ds-nav` (tab buttons, `flex:1` on desktop) · `ds-user-chip` (avatar + email + sign-out)
- **Tab gating**: `adminOnly` flag on Ingest/Metrics/Analytics tabs → hidden if `getUserInfo().roles` does not include `"admin"`
- **Tabs**: Chat · ChatWorkflow (all users) · Ingest · Metrics · Analytics (admin only)
- **Active tab**: `ds-active` class → `--ds-blue-600` background, white text, `--ds-shadow-btn`
- **Avatar**: 2-letter initials from email, `ds-avatar` (blue gradient circle, 28 × 28 px)
- **Email**: hidden on mobile via `ds-user-email { display: none }` at ≤640px
- **Sign-out**: calls `logout()` from `keycloak.ts` → Keycloak session termination; on `VITE_SKIP_AUTH=true` this is a no-op redirect
