# steer.md — Enterprise RAG + Agentic AI System Steering Document

---

## TOGAF Alignment

> Full TOGAF architecture definition in `togaf.md` (ADM Phases A–H, BDAT domains, ABBs, SBBs, ADRs, governance).
> This file governs runtime execution. `togaf.md` governs architecture decisions and compliance.

---

## System Architecture Principles

- Strict layer isolation: no cross-layer direct access
- Every request is authenticated, authorised, traced, and rate-limited before entering the intelligence plane
- All retrieval is hybrid by default (vector + keyword + graph)
- LLM is a terminal node — it receives only assembled, guardrailed context
- Observability is not optional — every layer emits traces, metrics, and logs
- Stateless services only; session state lives in Redis
- All services are containerised and Kubernetes-native
- Policy enforcement is external (OPA) and applied before LLM invocation
- Evaluation pipelines run continuously against production traffic samples

---

## Layered Architecture Definition

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 0 — UI / CLIENT                                  │
│  Web App · Mobile · API Consumer                        │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / WSS
┌────────────────────────▼────────────────────────────────┐
│  LAYER 1 — API GATEWAY                                  │
│  NGINX · FastAPI · Auth Middleware · Rate Limiter       │
│  Keycloak JWT validation · Request routing              │
└────────────────────────┬────────────────────────────────┘
                         │ Authenticated request
┌────────────────────────▼────────────────────────────────┐
│  LAYER 2 — AGENT BRAIN (Control Plane)                  │
│  LangGraph orchestrator · Planner Agent                 │
│  Tool Router · ReAct Reasoning Loop                     │
│  Query Rewriter · Query Decomposer                      │
└──────────┬─────────────────────────┬────────────────────┘
           │ Retrieval dispatch       │ Memory access
┌──────────▼──────────┐   ┌──────────▼──────────────────┐
│  LAYER 3 — RETRIEVAL│   │  LAYER 4 — MEMORY           │
│  (Data Plane)       │   │  Redis session store         │
│  Weaviate (vector)  │   │  Semantic memory (vector)    │
│  OpenSearch (BM25)  │   │  Conversation buffer         │
│  Neo4j (graph)      │   └──────────┬──────────────────┘
│  Hybrid fusion      │              │
└──────────┬──────────┘              │
           │ Raw chunks              │ Prior context
┌──────────▼─────────────────────────▼────────────────────┐
│  LAYER 5 — RERANK + CONTEXT ASSEMBLY                    │
│  SBERT cross-encoder reranker                           │
│  Semantic expander · Context assembler                  │
│  Prompt builder                                         │
└────────────────────────┬────────────────────────────────┘
                         │ Assembled prompt
┌────────────────────────▼────────────────────────────────┐
│  LAYER 6 — GUARDRAILS (Safety Plane)                    │
│  NeMo Guardrails · Prompt injection detector            │
│  OPA policy enforcer · Output filter                    │
└────────────────────────┬────────────────────────────────┘
                         │ Approved prompt
┌────────────────────────▼────────────────────────────────┐
│  LAYER 7 — LLM INFERENCE                               │
│  Ollama runtime · Model router                          │
│  Streaming response handler                             │
└────────────────────────┬────────────────────────────────┘
                         │ Raw response → back to Layer 6 output filter
┌────────────────────────▼────────────────────────────────┐
│  LAYER 8 — OBSERVABILITY (Cross-cutting)                │
│  OpenTelemetry · Prometheus · Grafana                   │
│  Langfuse · Helicone · MLflow                           │
└─────────────────────────────────────────────────────────┘
```

---

## Execution Workflow

```
1.  CLIENT         →  sends query over HTTPS/WSS
2.  NGINX          →  TLS termination, Cloudflare CDN edge
3.  FASTAPI GW     →  JWT validation (Keycloak), rate limit check, request routing
4.  AGENT BRAIN    →  LangGraph receives validated request
5.  AGENT BRAIN    →  Query rewriter normalises and expands query
6.  AGENT BRAIN    →  Query decomposer splits multi-hop queries into sub-queries
7.  AGENT BRAIN    →  Tool router dispatches sub-queries to retrieval layer
8.  RETRIEVAL      →  Parallel execution:
                       a. Weaviate vector search (SBERT embeddings)
                       b. OpenSearch BM25 keyword search
                       c. Neo4j graph traversal (entity + relationship reasoning)
9.  RETRIEVAL      →  Hybrid fusion merges ranked results (RRF algorithm)
10. MEMORY         →  Redis fetches session history; semantic memory fetches prior answers
11. RERANK         →  SBERT cross-encoder reranks fused results
12. CONTEXT        →  Context assembler builds grounded context window
13. PROMPT         →  Prompt builder injects system prompt + context + query
14. GUARDRAILS     →  Prompt injection scan → OPA policy check → NeMo rail evaluation
15. LLM            →  Ollama executes inference (streaming)
16. GUARDRAILS     →  Output filter validates response against policy
17. MEMORY         →  Session memory updated (Redis), semantic memory updated if novel
18. OBSERVABILITY  →  Span closed; metrics emitted; Langfuse trace recorded
19. FASTAPI GW     →  Streams response back to client
20. EVALUATION     →  Async: RAGAS scores sampled; MLflow logs experiment
```

---

## Strict Layer Rules

| Rule | Enforcement |
|------|-------------|
| No direct DB access outside Retrieval layer (Layer 3) | Service mesh network policy; no DB credentials outside retrieval services |
| No LLM access from Retrieval layer | LLM endpoint not exposed below Layer 6 |
| No UI logic in backend layers | Backend returns structured JSON only; rendering is client responsibility |
| No unauthenticated request reaches Layer 2+ | Keycloak JWT enforced at Layer 1 boundary |
| No LLM call without passing Guardrails (Layer 6) | LLM service unreachable except via guardrail proxy |
| No retrieval result served without reranking | Context assembler rejects raw retrieval output |
| Kafka/RabbitMQ for all async events | No direct service-to-service calls for async workflows |

---

## Failure Handling Strategy

| Failure | Strategy |
|---------|----------|
| Retrieval timeout (any source) | Partial result fusion; fallback to available sources; flag low-confidence |
| LLM inference timeout | Retry ×2 with backoff; circuit breaker after threshold; return graceful error |
| Guardrail policy block | Return policy denial message; emit audit event to Kafka; log to Langfuse |
| Memory read failure (Redis) | Proceed stateless; log warning; do not block request |
| Agent reasoning loop | Max 5 hops enforced by LangGraph; terminate with partial answer + citation |
| Auth failure | 401 at gateway; no downstream propagation |
| Vector DB unavailable | Fallback to keyword-only (OpenSearch); degrade gracefully; alert Prometheus |
| Graph DB unavailable | Skip graph reasoning step; log degraded mode; continue with hybrid result |

---

## Scaling Strategy (Kubernetes)

```yaml
# Horizontal scaling targets
api-gateway:         HPA min:2  max:10  cpu:60%
agent-brain:         HPA min:2  max:8   cpu:70%
retrieval-vector:    HPA min:2  max:6   cpu:65%
retrieval-keyword:   HPA min:2  max:6   cpu:65%
retrieval-graph:     HPA min:1  max:4   cpu:70%
rerank-service:      HPA min:2  max:6   cpu:70%
llm-inference:       HPA min:1  max:4   gpu:80%  (GPU node pool)
guardrails:          HPA min:2  max:6   cpu:60%
redis:               StatefulSet replicas:3 (sentinel)
weaviate:            StatefulSet replicas:3
opensearch:          StatefulSet replicas:3
neo4j:               StatefulSet replicas:3 (causal cluster)
kafka:               StatefulSet replicas:3
```

- All stateless services scale horizontally via HPA
- Stateful services (DBs, cache, queue) scale via StatefulSets with persistent volumes
- LLM inference pods scheduled on GPU node pool with resource limits
- Cluster autoscaler enabled for node-level scaling
- PodDisruptionBudgets defined for all critical services

---

## Security Enforcement Model

```
Request flow security checkpoints:

[Cloudflare] → DDoS protection, WAF, bot filtering
     ↓
[NGINX]      → TLS 1.3, certificate pinning, connection limits
     ↓
[FastAPI GW] → Keycloak JWT (RS256), scope validation, tenant isolation
     ↓
[OPA]        → Policy-as-code: role-based access, data classification, query filters
     ↓
[NeMo]       → LLM-layer safety: topic guardrails, PII detection, jailbreak defence
     ↓
[Output]     → OPA post-response policy check before returning to client
```

- All secrets via Kubernetes Secrets + external vault (not env vars in manifests)
- mTLS between all internal services (Istio service mesh)
- Network policies: deny-all default; explicit allow per service pair
- Audit log emitted to Kafka on every policy decision
- RBAC enforced at both Keycloak (user) and OPA (resource) levels
- Tenant data isolation enforced at Weaviate class and OpenSearch index level

---

## Observability Rules

- Every inbound request starts an OpenTelemetry trace span at the gateway
- Every layer adds child spans with operation name, duration, and status
- All LLM calls traced in Langfuse (prompt, response, model, latency, token count)
- Prometheus scrapes all services on `/metrics` endpoint every 15s
- Grafana dashboards: per-layer latency, error rate, throughput, LLM cost, RAGAS scores
- Helicone captures LLM API-level usage for cost attribution
- MLflow logs every evaluation run (RAGAS metrics, dataset version, model version)
- Alert rules: p99 latency > 3s, error rate > 1%, LLM cost spike > 20% baseline
- All structured logs shipped to OpenSearch for full-text search and audit
