# steer.md — Enterprise RAG + Agentic AI System Steering Document

---

## TOGAF Alignment

> Full TOGAF architecture definition in `togaf.md` (ADM Phases A–H, BDAT domains, ABBs, SBBs, ADRs, governance).
> This file governs runtime execution. `togaf.md` governs architecture decisions and compliance.

---

## Implementation Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Implemented and live |
| 🔧 | Partially implemented |
| 📋 | Planned / architecture target |

---

## Complete Technology Stack & Library Versions

### Backend Runtime
| Component | Technology | Version |
|-----------|-----------|---------|
| Language | Python | 3.11 (Docker: `python:3.11-slim`) |
| Web Framework | FastAPI | 0.111.0 |
| ASGI Server | Uvicorn (standard) | 0.29.0 |
| Settings Management | pydantic-settings | 2.2.1 |
| File Upload | python-multipart | 0.0.9 |
| Async HTTP Client | httpx | 0.27.0 |
| Container / Deploy | Docker + Railway | `python:3.11-slim` base |

### LLM & Orchestration
| Component | Technology | Version |
|-----------|-----------|---------|
| LLM Provider | Groq API — `llama-3.3-70b-versatile` | langchain-groq 0.2.4 |
| LLM Framework | LangChain | 0.3.19 |
| LangChain Community | langchain-community | 0.3.19 |
| Pipeline Orchestration | LangGraph StateGraph | 0.2.73 |
| Prompt Templates | langchain-core (bundled with langchain 0.3.19) | — |

### Embeddings & Vector Store
| Component | Technology | Version |
|-----------|-----------|---------|
| Embedding Model | Cohere `embed-english-v3.0` (1024-dim) | cohere 5.5.8 |
| Vector Store | Qdrant Cloud (cosine, REST + gRPC) | qdrant-client 1.9.1 |
| Distance Metric | Cosine similarity | — |
| Chunk Size | 512 tokens, 64 overlap | RecursiveCharacterTextSplitter |

### PII & Safety
| Component | Technology | Version |
|-----------|-----------|---------|
| PII Detection | Microsoft Presidio Analyzer | presidio-analyzer 2.2.354 |
| PII Anonymisation | Microsoft Presidio Anonymizer | presidio-anonymizer 2.2.354 |
| NLP Engine | spaCy with `en_core_web_sm` (12 MB) | spacy 3.8.4 |

### Data Ingestion & Parsing
| Component | Technology | Version |
|-----------|-----------|---------|
| Web Crawler | BeautifulSoup4 + lxml | beautifulsoup4 4.12.3 / lxml 5.2.1 |
| PDF Parsing | PyMuPDF (`fitz`) — text only | PyMuPDF 1.24.5 |
| DOCX Parsing | python-docx | python-docx 1.1.2 |
| PPTX Parsing | python-pptx | python-pptx 0.6.23 |
| XLSX Parsing | openpyxl | openpyxl 3.1.4 |
| TXT / CSV | Python built-in `read()` | — |

### Storage & Memory
| Component | Technology | Version |
|-----------|-----------|---------|
| Session Memory | Redis (Upstash-compatible) | redis 5.0.6 |
| Session TTL | 3600 s, max 20 turns | — |

### Auth & Security
| Component | Technology | Version |
|-----------|-----------|---------|
| JWT Validation | Keycloak RS256 via python-jose | python-jose[cryptography] 3.3.0 |
| Rate Limiting | SlowAPI | slowapi 0.1.9 |

### Observability
| Component | Technology | Version |
|-----------|-----------|---------|
| Metrics Export | Prometheus client | prometheus-client 0.20.0 |
| Distributed Tracing | OpenTelemetry SDK | opentelemetry-sdk 1.24.0 |
| FastAPI Instrumentation | opentelemetry-instrumentation-fastapi | 0.45b0 |
| OTLP gRPC Exporter | opentelemetry-exporter-otlp-proto-grpc | 1.24.0 |
| Protobuf (pinned) | protobuf | >=3.19,<5.0 (qdrant-client compatibility) |
| SSE Streaming | sse-starlette | 2.1.0 |
| In-memory Metrics | Custom Python dataclass | — (`metrics_tracker.py`) |
| In-memory Analytics | Custom Python dataclass | — (`analytics_tracker.py`) |

### Google Integrations
| Component | Technology | Version |
|-----------|-----------|---------|
| Google Auth | google-auth | 2.29.0 |
| OAuth Flow | google-auth-oauthlib | 1.2.0 |
| Drive API Client | google-api-python-client | 2.134.0 |

### Testing
| Component | Technology | Version |
|-----------|-----------|---------|
| Test Framework | pytest | 8.2.2 |
| Async Test Support | pytest-asyncio | 0.23.7 |

---

### Frontend Runtime
| Component | Technology | Version |
|-----------|-----------|---------|
| Language | TypeScript | 5.4.5 |
| UI Framework | React | 18.3.1 |
| React DOM | react-dom | 18.3.1 |
| Build Tool | Vite | 5.3.1 |
| Vite React Plugin | @vitejs/plugin-react | 4.3.1 |
| HTTP Client | Axios | 1.7.2 |
| Auth Client | keycloak-js | 24.0.5 |
| Icons | lucide-react | 0.390.0 |
| State Management | Zustand | 4.5.2 |
| CSS Framework | Tailwind CSS (utilities + base reset) | 3.4.4 |
| PostCSS | postcss | 8.4.39 |
| CSS Autoprefixer | autoprefixer | 10.4.19 |
| Type Definitions | @types/react + @types/react-dom | 18.3.3 / 18.3.0 |
| Design System | Custom `design-system.css` (CSS custom properties) | — |
| Font | Inter (Google Fonts) | 400/500/600/700/800 |

---

## Actual Technology Stack (Live)

| Domain | Planned (Architecture) | Implemented (Current) | Version |
|--------|------------------------|----------------------|---------|
| LLM Inference | Ollama (local) | **Groq API** — `llama-3.3-70b-versatile` | langchain-groq 0.2.4 |
| Embeddings | SBERT (local) | **Cohere** — `embed-english-v3.0` 1024-dim | cohere 5.5.8 |
| Vector Store | Weaviate | **Qdrant Cloud** — cosine, REST + gRPC | qdrant-client 1.9.1 |
| Pipeline | Custom | **LangGraph StateGraph** — 6-node pipeline | langgraph 0.2.73 |
| LLM Framework | Custom | **LangChain** | 0.3.19 |
| Keyword Search | OpenSearch BM25 | 📋 Planned | — |
| Graph Reasoning | Neo4j | 📋 Planned | — |
| Hybrid Fusion | RRF algorithm | 📋 Planned | — |
| Reranking | SBERT cross-encoder | 📋 Planned | — |
| PII Detection | NeMo Guardrails | **Presidio + spaCy `en_core_web_sm`** | presidio 2.2.354 / spacy 3.8.4 |
| Session Memory | Redis | **Redis** (Upstash-compatible) | redis 5.0.6 |
| Metrics | Prometheus | **In-memory** + Prometheus export | prometheus-client 0.20.0 |
| Auth | Keycloak | **Keycloak JWT** (RS256) + SKIP_AUTH bypass | python-jose 3.3.0 / keycloak-js 24.0.5 |
| Tracing | OpenTelemetry | **OTel SDK** — OTLP gRPC + node histograms | otel-sdk 1.24.0 |
| Frontend | Web App | **React + Vite + TypeScript** | React 18.3.1 / Vite 5.3.1 / TS 5.4.5 |
| API Framework | FastAPI | **FastAPI** — versioned at `/v1/` | 0.111.0 |
| Deployment | Kubernetes | **Railway** (Docker) → Kubernetes target | python:3.11-slim |

---

## System Architecture Principles

- Strict layer isolation: no cross-layer direct access
- Every request is authenticated, authorised, traced, and rate-limited before entering the intelligence plane
- All retrieval is hybrid by default (vector + keyword + graph) — currently vector-only, multi-source is planned
- LLM is a terminal node — it receives only assembled, guardrailed context
- Observability is not optional — every layer emits traces, metrics, and logs
- Stateless services only; session state lives in Redis
- All services are containerised and Kubernetes-native (Railway for current deployment)
- Policy enforcement is external (OPA) and applied before LLM invocation — PII filter is live, OPA is planned
- Evaluation pipelines run continuously against production traffic samples

---

## Layered Architecture Definition

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 0 — UI / CLIENT                        ✅ LIVE   │
│  React SPA (Vite + TypeScript)                          │
│  Tabs: Chat | Ingest | Metrics | Analytics              │
│  Global design-system.css (CSS custom properties)       │
│  Keycloak AuthGuard · VITE_SKIP_AUTH dev bypass         │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / WSS
┌────────────────────────▼────────────────────────────────┐
│  LAYER 1 — API GATEWAY                        ✅ LIVE   │
│  FastAPI (uvicorn) · /v1/ versioned routes              │
│  Keycloak JWT validation (RS256)                        │
│  CORS middleware · Rate limiter                         │
│  Routes: /query /ingest /upload /drive /metrics         │
│          /analytics /health                             │
└────────────────────────┬────────────────────────────────┘
                         │ Authenticated request
┌────────────────────────▼────────────────────────────────┐
│  LAYER 2 — AGENT BRAIN (Control Plane)        ✅ LIVE   │
│  LangGraph StateGraph — compiled singleton              │
│  6-node pipeline: rewrite → scan_input → retrieve       │
│                   → assemble → generate → scan_output   │
│  Conditional routing: PII block → END                   │
│  Node-level latency tracked via analytics_tracker       │
└──────────┬──────────────────────────┬───────────────────┘
           │ Vector query              │ Session lookup
┌──────────▼──────────┐   ┌───────────▼─────────────────┐
│  LAYER 3 — RETRIEVAL│   │  LAYER 4 — MEMORY ✅ LIVE   │
│  🔧 Vector-only now │   │  Redis — session turns       │
│  ✅ Qdrant Cloud    │   │  TTL: 3600s, max 20 turns    │
│     cosine/1024-dim │   │  Key: session_id per tenant  │
│  📋 OpenSearch BM25 │   └──────────┬──────────────────┘
│  📋 Neo4j graph     │              │
│  📋 Hybrid RRF      │              │
└──────────┬──────────┘              │
           │ Ranked chunks            │ Prior turns
┌──────────▼─────────────────────────▼────────────────────┐
│  LAYER 5 — CONTEXT ASSEMBLY               ✅ LIVE      │
│  assemble node — builds grounded context string         │
│  Injects: top-K chunks + source metadata + session hist │
│  📋 SBERT cross-encoder reranking                       │
│  📋 Semantic expander                                   │
└────────────────────────┬────────────────────────────────┘
                         │ Assembled prompt
┌────────────────────────▼────────────────────────────────┐
│  LAYER 6 — GUARDRAILS (Safety Plane)      ✅ LIVE      │
│  scan_input node: Presidio + spaCy en_core_web_sm       │
│    — PII detected → redact + block flag → route END     │
│  scan_output node: Presidio on LLM response             │
│    — PII in output → redacted before returning client   │
│  📋 OPA policy enforcer (role/data classification)      │
│  📋 NeMo rail definitions                               │
└────────────────────────┬────────────────────────────────┘
                         │ Approved prompt
┌────────────────────────▼────────────────────────────────┐
│  LAYER 7 — LLM INFERENCE                  ✅ LIVE      │
│  Groq API — llama-3.3-70b-versatile                     │
│  langchain_groq ChatGroq client (streaming + sync)      │
│  temperature: 0, max_tokens: 2048                       │
│  Token tracking: input + output → analytics_tracker     │
│  📋 Ollama local fallback                               │
└────────────────────────┬────────────────────────────────┘
                         │ Raw response → scan_output
┌────────────────────────▼────────────────────────────────┐
│  LAYER 8 — OBSERVABILITY (Cross-cutting)  🔧 PARTIAL   │
│  ✅ OpenTelemetry SDK — OTLP export configured          │
│  ✅ Prometheus — node_duration histogram, docs/chunks   │
│  ✅ In-memory metrics_tracker — query/latency/RAG       │
│  ✅ In-memory analytics_tracker — nodes/tokens/errors   │
│  📋 Grafana dashboards                                  │
│  📋 Langfuse LLM trace logger                           │
│  📋 MLflow experiment tracking                          │
└─────────────────────────────────────────────────────────┘
```

---

## Actual LangGraph Pipeline (Implemented)

```
State: AgentState {
  query, rewritten_query, context, answer,
  citations, session_id, blocked, error, pii_detected
}

NODE 1 — rewrite
  Input:  state.query
  Action: Groq LLM (ChatGroq, temp=0) rewrites query to be
          clear, specific, self-contained (resolves pronouns)
  Output: state.rewritten_query
  Tracks: node_latency["rewrite"] via analytics_tracker
          Prometheus node_duration.labels(node="rewrite")

NODE 2 — scan_input
  Input:  state.rewritten_query
  Action: Presidio AnalyzerEngine + spaCy en_core_web_sm
          detects PII entities in the user query
          If PII found: state.blocked = True, state.pii_detected = True
  Output: anonymised query OR blocked flag
  Route:  blocked=True  → END (no retrieval, no LLM call)
          blocked=False → NODE 3

NODE 3 — retrieve
  Input:  state.rewritten_query (or original if rewrite failed)
  Action: Cohere encode_one() → 1024-dim query vector
          Qdrant similarity search (cosine, top_k=5)
  Output: state.context (list of {text, metadata, score})
  Tracks: node_latency["retrieve"], retrieval scores → analytics_tracker

NODE 4 — assemble
  Input:  state.context + session history (Redis)
  Action: Formats retrieved chunks with source attribution
          Prepends session memory turns
  Output: state.context (assembled string for prompt)
  Tracks: node_latency["assemble"]

NODE 5 — generate
  Input:  state.rewritten_query + state.context
  Action: Groq LLM generates answer grounded in context
          Token counts recorded → analytics_tracker
  Output: state.answer + state.citations
  Tracks: node_latency["generate"], input/output tokens

NODE 6 — scan_output
  Input:  state.answer
  Action: Presidio scrubs PII from LLM response
          If PII found in output: redacted before returning
  Output: clean state.answer
  Tracks: node_latency["scan_output"]
  → END
```

---

## Ingestion Pipelines (Implemented)

### Pipeline A — GCP Docs Crawler
```
trigger: POST /v1/ingest (admin role)
  ↓
crawl_gcp_docs() — async BeautifulSoup crawler
  cloud.google.com/docs, respects crawl_delay_seconds=0.5
  ↓
Presidio PII scrub on raw page text
  ↓
chunker.split() — 512 tokens, 64 overlap (RecursiveCharacterTextSplitter)
  ↓
Cohere embed-english-v3.0 — batches of 20, retry on 429
  ↓
Qdrant upsert — uuid4 point IDs, payload: {text, url, title}
  ↓
Prometheus: docs_ingested_total, chunks_created_total
metrics_tracker: record_ingestion()
```

### Pipeline B — Google Drive Sync
```
trigger: POST /v1/drive/sync (admin role)
  input: folder_id extracted from URL or direct ID
  ↓
Google Drive API — list files in public folder
  supported: PDF, DOCX, PPTX, XLSX, TXT, CSV (max 50 MB)
  ↓
doc_parser — format-specific extraction:
  PDF   → PyMuPDF (text only, not scanned)
  DOCX  → python-docx
  PPTX  → python-pptx (slide text)
  XLSX  → openpyxl (cell values)
  TXT/CSV → direct read
  ↓
Presidio PII scrub
  ↓
chunker.split() — 512 tokens, 64 overlap
  ↓
Cohere embed + Qdrant upsert
  ↓
job status polled by frontend every 2s via GET /v1/drive/status/{job_id}
```

### Pipeline C — Direct File Upload
```
trigger: POST /v1/upload (any authenticated user)
  multipart/form-data, single file per request
  ↓
doc_parser — same format handlers as Drive sync
  ↓
Presidio PII scrub
  ↓
chunker.split() — 512 tokens, 64 overlap
  ↓
Cohere embed + Qdrant upsert
  ↓
metrics_tracker: record_upload(chunks)
returns: {filename, chunks_stored}
```

---

## Full Execution Workflow (Current)

```
1.  CLIENT         →  sends query over HTTPS, includes session_id cookie
2.  NGINX          →  TLS termination (Railway handles TLS in prod)
3.  FASTAPI GW     →  Keycloak JWT validation (or SKIP_AUTH bypass)
                       Rate limit check · CORS · request routing
4.  POST /v1/query →  extracts: query, session_id from body
5.  LANGGRAPH      →  rag_graph.ainvoke(AgentState)
6.  rewrite node   →  Groq rewrites query → rewritten_query
7.  scan_input     →  Presidio checks for PII in rewritten_query
                       If blocked → return early with pii_blocked message
8.  retrieve node  →  Cohere encodes rewritten_query
                       Qdrant search → top-5 chunks with scores
9.  assemble node  →  Redis fetches last N session turns
                       Formats: session history + retrieved chunks + sources
10. generate node  →  Groq generates grounded answer
                       Token counts captured for cost tracking
11. scan_output    →  Presidio scrubs PII from LLM response
12. METRICS        →  metrics_tracker.record_query() — latency, scores, PII, source hits
                       analytics_tracker records: node latency, tokens, score distribution
13. FASTAPI GW     →  Returns structured JSON:
                       {answer, citations, pii_detected, session_id}
14. REDIS          →  Session turn appended (query + answer)
```

---

## Frontend Architecture (Implemented)

### Application Shell
```
src/
├── design-system.css          # Global design system — single source of truth
│     20 sections: tokens, typography, layout, brand, nav, segmented control,
│     user chip, cards, stat cards, buttons, forms, badges, progress bars,
│     tables, alerts, empty states, drop zone, chat bubbles, utilities
├── main.tsx                   # React root — imports design-system.css
├── App.tsx                    # Tab router: chat | ingest | metrics | analytics
├── auth/AuthGuard.tsx         # Keycloak init wrapper, VITE_SKIP_AUTH bypass
└── components/
    ├── layout/Header.tsx       # Brand, tab nav (admin-gated), user chip, sign out
    ├── chat/
    │   ├── ChatWindow.tsx      # Message list, toolbar, empty state
    │   ├── ChatInput.tsx       # Textarea, enter-to-send, loading spinner
    │   ├── MessageBubble.tsx   # User/AI bubbles, PII tag, citations grid
    │   └── SourceCard.tsx      # Citation card with excerpt + URL
    ├── ingest/
    │   ├── IngestPanel.tsx     # Three-tab: Upload | Google Drive | GCP Docs
    │   └── StatusBadge.tsx     # Ingestion status pill (idle/queued/running/done/error)
    └── metrics/
        ├── MetricsDashboard.tsx  # Ingestion, Query, Latency, Sources, RAG Quality
        └── AnalyticsDashboard.tsx # Node latency, Token cost, Score distribution,
                                   # Query categories, Session depth, Errors, Coverage
```

### Design System Standards
- **Color tokens**: `--ds-blue-*`, `--ds-green-*`, `--ds-red-*`, `--ds-orange-*`, `--ds-purple-*`, `--ds-cyan-*`
- **Text scale**: `--ds-text-1` (#111827) through `--ds-text-4` (#9CA3AF)
- **Backgrounds**: `--ds-bg` (#FFF), `--ds-bg-2` (#FAFBFC), `--ds-bg-3` (#F8FAFC)
- **Typography**: Inter (Google Fonts), 400/500/600/700/800 weights
- **Spacing**: 4–64px scale via `--ds-s1` through `--ds-s16`
- **Radius**: 4–9999px via `--ds-r-xs` through `--ds-r-full`
- **Shadows**: xs / sm / md / card / card-hover / header / btn / focus
- **Component classes**: `ds-btn`, `ds-card`, `ds-stat-card`, `ds-input`, `ds-badge`, `ds-alert`, `ds-progress`, `ds-table`, `ds-nav-tab`, `ds-tab-btn`, `ds-spinner`
- **Tabs**: `Chat` (all users), `Ingest / Metrics / Analytics` (admin role only)
- **Auth**: Keycloak role `admin` gates admin tabs; `VITE_SKIP_AUTH=true` for local dev

---

## Strict Layer Rules

| Rule | Enforcement |
|------|-------------|
| No direct DB access outside Retrieval layer (Layer 3) | vectorstore.py is the only Qdrant client |
| No LLM access from Retrieval layer | llm.py only called from pipeline nodes (generate, rewrite) |
| No UI logic in backend layers | Backend returns structured JSON only; rendering is client responsibility |
| No unauthenticated request reaches Layer 2+ | Keycloak JWT enforced at Layer 1 or SKIP_AUTH in dev |
| No LLM call without PII scan | scan_input blocks before retrieve; scan_output sanitises after generate |
| No retrieval result served without context assembly | assemble node runs before generate |
| Chunking always before embedding | chunker.split() always called before embedder.encode() in all three pipelines |
| PII scrub before storage | Presidio scrub runs before chunker in all ingestion pipelines |

---

## Failure Handling Strategy

| Failure | Strategy |
|---------|----------|
| Groq rate limit / timeout | 3 retries with backoff; analytics_tracker.record_error("llm"); return graceful error |
| Cohere 429 rate limit | 65s sleep, retry ×3 (Cohere trial quota resets per minute); record_error("rate_limit") |
| Qdrant unavailable | Exception surfaces to retrieve node; record_error("retrieval"); empty context → generate with no context |
| PII detected in input | scan_input routes to END immediately; no LLM call; pii_blocked response to client |
| PII detected in output | scan_output redacts entities; answer returned with PII replaced by `<TYPE>` |
| Query rewrite failure | Fallback to original query; rewrite exception is caught silently |
| Redis unavailable | Proceed stateless (no session history); log warning; do not block request |
| Auth failure | 401 at gateway; no downstream propagation |
| Unsupported file type | doc_parser raises ValueError; upload endpoint returns 400 with detail |
| Scanned PDF (no text) | Extracted text is empty; chunker produces 0 chunks; file marked as skipped |

---

## Scaling Strategy (Kubernetes — Target)

```yaml
api-gateway:         HPA min:2  max:10  cpu:60%
agent-brain:         HPA min:2  max:8   cpu:70%
retrieval-vector:    HPA min:2  max:6   cpu:65%
retrieval-keyword:   HPA min:2  max:6   cpu:65%   # planned
retrieval-graph:     HPA min:1  max:4   cpu:70%   # planned
llm-inference:       Groq API (external — no pod)
guardrails:          HPA min:2  max:6   cpu:60%
redis:               StatefulSet replicas:3 (sentinel)
qdrant:              StatefulSet replicas:3 (or Qdrant Cloud)
opensearch:          StatefulSet replicas:3        # planned
neo4j:               StatefulSet replicas:3 (causal cluster) # planned
kafka:               StatefulSet replicas:3
```

---

## Security Enforcement Model

```
Request flow security checkpoints:

[Cloudflare/Railway] → TLS termination, DDoS protection
     ↓
[FastAPI GW]  → Keycloak JWT (RS256), scope validation, CORS
     ↓
[scan_input]  → Presidio PII detection, block if found
     ↓
[generate]    → Groq API (external, API key auth)
     ↓
[scan_output] → Presidio PII scrub on LLM response
     ↓
[Response]    → Structured JSON back to client

Planned (not yet live):
[OPA]         → Policy-as-code: RBAC, data classification, query filters
[NeMo]        → Topic guardrails, jailbreak defence, toxicity filter
```

- All secrets via environment variables / Railway secrets (not committed)
- Keycloak realm: `enterprise-rag`, client: `rag-backend`
- Admin role required for Ingest, Metrics, Analytics tabs
- Session data scoped per `session_id` in Redis

---

## Observability Rules (Current)

- ✅ Every LangGraph node records latency to `analytics_tracker` (ms histogram)
- ✅ Prometheus `node_duration` histogram per node (`/metrics` endpoint)
- ✅ `metrics_tracker` accumulates: query counts, latency percentiles, retrieval scores, source hits, session IDs, RAG quality approximations
- ✅ `analytics_tracker` accumulates: per-node latency, token counts, score distribution, query categories, session depth, error taxonomy, index coverage
- ✅ Frontend Metrics tab: real-time dashboard polling every 30s via `GET /v1/metrics`
- ✅ Frontend Analytics tab: real-time dashboard polling every 30s via `GET /v1/analytics`
- 📋 Grafana dashboards (target)
- 📋 Langfuse LLM trace capture (target)
- 📋 MLflow experiment logging (target)
- Alert targets: p99 latency > 3s, error rate > 1%, LLM cost spike > 20% baseline
