# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Enterprise RAG + Agentic AI platform — production-grade, Kubernetes-native, TOGAF-aligned.

## Architecture Files

| File | Purpose |
|------|---------|
| `steer.md` | Runtime steering: layer rules, execution flow, failure handling, scaling, security, observability |
| `skill.md` | Modular skills catalogue: 24 skills across retrieval, intelligence, agent, memory, generation, safety, observability, evaluation |
| `togaf.md` | TOGAF architecture: ADM Phases A–H, BDAT domains, ABBs, SBBs, ADRs, gap analysis, governance |

## Architecture Constraints (never violate)

- No direct DB access outside the Retrieval layer
- No LLM call without passing through the Guardrails layer
- No cross-tenant data access at any layer
- All APIs versioned (`/v1/`)
- Every change to approved technology requires an ADR in `togaf.md`

## Core Stack

Ollama · Weaviate · OpenSearch · Neo4j · LangGraph · LangChain · LlamaIndex · SBERT · RAGAS · OPA · NeMo Guardrails · Keycloak · OpenTelemetry · Prometheus · Grafana · Langfuse · MLflow · Redis · Kafka · FastAPI · NGINX · Kubernetes · Istio

---

## Live Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | `https://cloud-rag.vercel.app` |
| Backend API | Railway | `https://cloud-drive-rag-production.up.railway.app` |
| Health check | Railway | `https://cloud-drive-rag-production.up.railway.app/v1/health` |
| API docs | Railway | `https://cloud-drive-rag-production.up.railway.app/docs` |

## Railway Port Configuration (CRITICAL)

Railway auto-injects a `PORT` env var into the container and routes public traffic to that port. **This port is Railway-controlled and is currently `8080`**, regardless of what `EXPOSE` says in the Dockerfile.

- **Dockerfile CMD must use `${PORT:-8000}`** — never hardcode the port
- **Railway public networking port must match what Railway injects** (currently 8080)
- Do NOT set `PORT` as a user-defined Railway variable — Railway manages it internally and will override it
- Do NOT add `healthcheckPath` to `railway.toml` unless you know Railway's PORT — the health check runs against `localhost:{PORT}`, which must match the app's actual port

**Current working Dockerfile CMD:**
```dockerfile
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

**Current `backend/railway.toml`:**
```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"
buildContext = "."

[deploy]
numReplicas = 1
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```
No `healthcheckPath` — Railway promotes the deployment based on container start only.

## Required Environment Variables

### Railway (Backend)
| Variable | Value | Notes |
|----------|-------|-------|
| `GROQ_API_KEY` | `gsk_...` | Required — queries fail without it |
| `COHERE_API_KEY` | `...` | Required — embeddings fail without it |
| `QDRANT_URL` | `https://...qdrant.io` | Required — defaults to localhost:6333 which breaks on Railway |
| `QDRANT_API_KEY` | `...` | Required for Qdrant Cloud |
| `REDIS_URL` | `rediss://...upstash.io` | Required — Upstash Redis URL |
| `SKIP_AUTH` | `true` | Required when Keycloak is not configured |
| `OTEL_ENABLED` | `false` | Disables OTEL when no collector is running |
| `GOOGLE_API_KEY` | `...` | Required for Google Drive public folder sync |

### Vercel (Frontend)
| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_URL` | `https://cloud-drive-rag-production.up.railway.app` | Already set in `frontend/vercel.json` build.env |
| `VITE_SKIP_AUTH` | `true` | Already set in `frontend/vercel.json` build.env |

Both Vercel vars are baked into `frontend/vercel.json` — no need to re-add in Vercel dashboard.
**Vite env vars are build-time only** — changing them in Vercel requires a redeploy.

## Vercel Configuration (`frontend/vercel.json`)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "build": {
    "env": {
      "VITE_API_URL": "https://cloud-drive-rag-production.up.railway.app",
      "VITE_SKIP_AUTH": "true"
    }
  }
}
```

## Railway Service Configuration

- Railway service root directory: `backend/` — Railway reads `backend/railway.toml` and `backend/Dockerfile`
- The repo-root `railway.toml` has `dockerfilePath = "backend/Dockerfile"` and `buildContext = "backend"` as fallback
- Git pushes to `main` trigger automatic Railway redeploy — **any backend file change (including Dockerfile) will cause a redeploy**
- Railway build takes ~3–5 minutes (pip install + spaCy download)
- After redeploy, the app takes ~5s to start (spaCy `en_core_web_sm` loads at lifespan startup)

## Troubleshooting: "Application failed to respond" on Railway

1. Check Railway deploy logs → look for `Uvicorn running on http://0.0.0.0:{PORT}` to see actual port
2. Ensure Railway public networking port matches the logged port
3. Do NOT add `healthcheckPath` unless the app's port and Railway's PORT are confirmed to match
4. The `SKIP_AUTH=true` env var must be set on Railway — without it every request tries to reach Keycloak (unavailable) and returns 503
5. If deployment is stuck: Railway dashboard → Deployments → Redeploy manually

## Responsive UI (Mobile / Tablet)

The frontend uses a custom responsive design system. Key breakpoints:
- **Tablet ≤1024px**: 4-column grids collapse to 2-column; workflow split adjusts to 55/45
- **Mobile ≤640px**: Header nav moves to a second scrollable row; all grids collapse; chat padding reduces; workflow stacks vertically

All layout is driven by `frontend/src/design-system.css` sections 22–23 (grid utilities + media queries). Never use fixed `repeat(N, 1fr)` inline styles — use `.ds-grid-4`, `.ds-grid-3`, `.ds-grid-2` classes instead.
