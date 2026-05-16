# togaf.md — TOGAF Architecture Definition: Enterprise RAG + Agentic AI

> Aligned to TOGAF Standard, 10th Edition (The Open Group)
> Architecture Domain: Business · Data · Application · Technology (BDAT)
> ADM Phases: Preliminary → A → B → C → D → E → F → G → H

---

## Preliminary Phase — Framework & Principles

### Architecture Principles

| # | Principle | Statement | Implication |
|---|-----------|-----------|-------------|
| P1 | Primacy of Enterprise | Architecture decisions prioritise enterprise-wide reusability over local optimisation | No service owns data exclusively; shared data plane enforced |
| P2 | Interoperability | All services expose standard interfaces (REST/gRPC/AsyncAPI) | No proprietary SDKs at integration boundaries |
| P3 | Data is an Asset | All data entities are classified, governed, and tracked in the Architecture Repository | Data lineage captured from ingestion to response |
| P4 | Security by Design | Security controls are embedded at every architectural layer, not bolted on | OPA + Keycloak + NeMo enforced structurally, not optionally |
| P5 | Separation of Concerns | Each architecture layer has a single bounded responsibility | Control Plane, Data Plane, Intelligence Plane are isolated |
| P6 | Continuity of Operations | System degrades gracefully; no single point of failure | Circuit breakers, fallback paths, and StatefulSet HA for all stores |
| P7 | Compliance with Law | All data handling complies with applicable data protection regulations | PII scrubbing, audit logs, data residency controls in place |
| P8 | Respond to Change | Architecture supports change through loose coupling and versioned APIs | All APIs versioned; services independently deployable |
| P9 | AI Governance | All AI/LLM components are governed, auditable, and responsible | Guardrails, evaluation pipelines, and explainability required |

---

### Architecture Repository Structure

```
Architecture Repository/
├── Architecture Metamodel          → BDAT domain definitions, relationship rules
├── Architecture Capability         → Team structure, governance bodies, tooling
├── Architecture Landscape
│   ├── Strategic Architecture      → Enterprise AI vision, 3-year roadmap
│   ├── Segment Architecture        → Enterprise RAG platform scope
│   └── Capability Architecture     → Individual service ABBs and SBBs
├── Standards Information Base      → Approved tech stack, banned patterns
├── Reference Library               → TOGAF patterns, RAG best practices, NIST AI RMF
└── Governance Log                  → ADM decisions, waivers, compliance records
```

---

## Phase A — Architecture Vision

### Architecture Vision Statement
> Deliver a production-grade, enterprise-scale Agentic RAG platform that provides accurate, governed, and observable AI-assisted knowledge retrieval — enabling enterprise users to query organisational knowledge with full auditability, policy enforcement, and measurable quality.

### Key Stakeholders & Concerns

| Stakeholder | Primary Concern |
|-------------|----------------|
| Enterprise CTO | Scalability, cost governance, vendor independence |
| CISO | Security, PII handling, audit trails, policy compliance |
| Data Governance Officer | Data lineage, classification, retention, access control |
| Platform Engineering | Kubernetes operability, observability, CI/CD integration |
| AI/ML Team | Model quality, evaluation, RAG accuracy, hallucination control |
| End Users | Response accuracy, latency, explainability |
| Compliance Officer | Regulatory alignment, audit logs, right-to-explanation |

### Architecture Drivers

| Driver | Type | Impact |
|--------|------|--------|
| Hallucination risk in LLM responses | Risk | Guardrails + RAGAS evaluation required |
| Data sensitivity across tenants | Constraint | Tenant isolation at every layer |
| Latency SLA < 3s p99 | NFR | HPA + caching + async evaluation |
| Vendor lock-in avoidance | Principle | Open-source stack; no proprietary LLM APIs required |
| Regulatory audit requirement | Constraint | Full audit log of every query, policy decision, response |

---

## Phase B — Business Architecture

### Business Capability Map

```
Level 1: Enterprise Knowledge Management
  └── Level 2: Document Intelligence
        ├── Level 3: Document Ingestion & Processing
        ├── Level 3: Semantic Chunking & Indexing
        └── Level 3: Knowledge Graph Construction

Level 1: AI-Assisted Decision Support
  └── Level 2: Intelligent Query Processing
        ├── Level 3: Query Understanding & Decomposition
        ├── Level 3: Hybrid Knowledge Retrieval
        └── Level 3: Context-Grounded Response Generation

Level 1: AI Platform Governance
  └── Level 2: Responsible AI Operations
        ├── Level 3: Policy Enforcement & Compliance
        ├── Level 3: AI Quality Evaluation
        └── Level 3: Observability & Audit
```

### Business Value Streams

```
Value Stream 1: Knowledge Ingestion
  Trigger: Document uploaded
  Steps:   Ingest → Extract → Chunk → Embed → Index (Vector + Keyword + Graph)
  Outcome: Document searchable across all retrieval engines

Value Stream 2: Intelligent Query Fulfilment
  Trigger: User submits query
  Steps:   Authenticate → Rewrite → Decompose → Retrieve → Rerank →
           Assemble → Guardrail → Generate → Filter → Respond
  Outcome: Grounded, policy-compliant, cited answer delivered

Value Stream 3: AI Quality Assurance
  Trigger: Response generated (async)
  Steps:   Sample → Evaluate (RAGAS) → Score → Compare baseline →
           Log (MLflow) → Alert on regression
  Outcome: Continuous measurement of faithfulness, relevancy, and precision
```

### Business Services

| Service | Consumer | SLA |
|---------|----------|-----|
| RAG Query Service | End users, API consumers | p99 < 3s |
| Document Ingestion Service | Content teams, automated pipelines | Async, < 60s per doc |
| Knowledge Graph Service | Agent Brain, Analytics | p99 < 500ms |
| AI Evaluation Service | ML team, governance board | Async, daily batch |
| Audit & Compliance Service | CISO, Compliance Officer | Real-time log, 90-day retention |

---

## Phase C — Information Systems Architecture

### C1: Data Architecture

#### Data Entity Model

```
Document
  ├── id, source_uri, ingestion_timestamp, classification_label
  ├── tenant_id, owner, retention_policy
  └── processing_status

Chunk
  ├── id, document_id, chunk_index, text_content
  ├── embedding_vector, embedding_model, embedding_timestamp
  └── metadata (page, section, heading)

VectorIndex (Weaviate)
  ├── class per tenant
  ├── chunk_id reference
  └── cosine similarity index

KeywordIndex (OpenSearch)
  ├── index per tenant
  ├── BM25 field mappings
  └── metadata filters

GraphNode (Neo4j)
  ├── entity_id, entity_type, entity_name
  ├── document_id reference
  └── properties map

GraphEdge (Neo4j)
  ├── source_node, target_node, relationship_type
  └── confidence_score

UserSession (Redis)
  ├── session_id, user_id, tenant_id
  ├── conversation_turns (last 20)
  └── TTL: 3600s

EvaluationRecord (MLflow)
  ├── run_id, query, answer, contexts, ground_truth
  ├── faithfulness, answer_relevancy, context_precision, context_recall
  └── model_version, dataset_version, timestamp
```

#### Data Classification Schema

| Class | Description | Handling |
|-------|-------------|----------|
| PUBLIC | Non-sensitive, general knowledge | No restrictions |
| INTERNAL | Organisation-internal only | Tenant-scoped access |
| CONFIDENTIAL | Business-sensitive | RBAC + audit log on every access |
| RESTRICTED | PII, regulated data | PII scrubbing before LLM; DLP enforced |

#### Data Lineage Flow

```
Source Document
  → Ingestion Service (extract, classify)
  → Chunking Service (semantic split)
  → Embedding Service (SBERT → vector)
  → [Weaviate] + [OpenSearch] + [Neo4j]   ← indexed
  → Retrieval → Rerank → Context Assembly
  → Guardrail (PII check)
  → LLM Inference
  → Output Filter
  → Audit Log (full lineage recorded)
```

#### Data Governance Rules

- All data classified at ingestion; classification label propagates to all derived entities
- RESTRICTED data never enters LLM prompt without PII scrubbing
- Chunks retain reference to source document for full lineage traceability
- Retention policies enforced at vector store, keyword index, and graph level
- Cross-tenant data access prohibited at network policy and application level
- Data deletion cascades: document delete triggers chunk, vector, keyword, graph cleanup

---

### C2: Application Architecture

#### Architecture Building Blocks (ABBs)

| ABB | Responsibility | Realised By |
|-----|---------------|-------------|
| ABB-01: API Gateway | Auth, rate limiting, routing | FastAPI + NGINX + Keycloak |
| ABB-02: Orchestration Engine | Agent planning, tool routing, ReAct loop | LangGraph + LangChain |
| ABB-03: Query Intelligence | Rewrite, decompose, expand | LangChain + SBERT + Ollama |
| ABB-04: Vector Retrieval | Semantic similarity search | Weaviate + SBERT |
| ABB-05: Keyword Retrieval | BM25 full-text search | OpenSearch |
| ABB-06: Graph Retrieval | Entity relationship reasoning | Neo4j |
| ABB-07: Hybrid Fusion | Multi-source result merging | RRF Fusion Service |
| ABB-08: Reranker | Cross-encoder result reranking | SBERT cross-encoder |
| ABB-09: Context Assembler | Context window construction | Internal service |
| ABB-10: Memory Store | Session + semantic memory | Redis + Weaviate |
| ABB-11: Prompt Engine | System prompt + context injection | LangChain PromptTemplate |
| ABB-12: LLM Runtime | Token inference | Ollama |
| ABB-13: Safety Engine | Pre/post prompt guardrails | NeMo + OPA + Classifier |
| ABB-14: Observability Platform | Trace, metrics, dashboards | OTEL + Prometheus + Grafana + Langfuse |
| ABB-15: Evaluation Engine | RAG quality measurement | RAGAS + MLflow + HuggingFace |
| ABB-16: Event Bus | Async inter-service messaging | Kafka / RabbitMQ |

#### Solution Building Blocks (SBBs) — ABB to SBB Mapping

| ABB | SBB (Deployed Component) | Version Constraint |
|-----|--------------------------|--------------------|
| ABB-01 | `api-gateway` service (FastAPI 0.111+) | Pin to minor version |
| ABB-02 | `agent-brain` service (LangGraph 0.1+) | Pin to minor version |
| ABB-03 | `query-intelligence` service | Internal |
| ABB-04 | Weaviate 1.24+ | Approved version |
| ABB-05 | OpenSearch 2.13+ | Approved version |
| ABB-06 | Neo4j 5.x Enterprise | Approved version |
| ABB-07 | `hybrid-fusion` service | Internal |
| ABB-08 | `rerank-service` (SBERT cross-encoder) | Internal |
| ABB-09 | `context-assembler` service | Internal |
| ABB-10 | Redis 7.2+ Sentinel | Approved version |
| ABB-11 | `prompt-engine` service | Internal |
| ABB-12 | Ollama 0.3+ | Approved version |
| ABB-13 | `guardrails` service (NeMo 0.7+, OPA 0.65+) | Pin to minor version |
| ABB-14 | OTEL Collector + Prometheus 2.50+ + Grafana 10+ + Langfuse 2+ | Approved versions |
| ABB-15 | `evaluation` service (RAGAS 0.1+, MLflow 2.13+) | Pin to minor version |
| ABB-16 | Kafka 3.7+ | Approved version |

#### Application Integration Interfaces

| Interface | Type | From | To | Contract |
|-----------|------|------|----|----------|
| Query API | REST (OpenAPI 3.1) | Client | API Gateway | `POST /v1/query` |
| Ingest API | REST (OpenAPI 3.1) | Client | API Gateway | `POST /v1/documents` |
| Agent Dispatch | Internal gRPC | API Gateway | Agent Brain | Protobuf schema |
| Retrieval Call | Internal gRPC | Agent Brain | Retrieval Services | Protobuf schema |
| Memory R/W | Redis protocol | Agent Brain | Redis | Key schema documented |
| Audit Events | Kafka topic | All services | `audit.events` topic | Avro schema |
| Evaluation Events | Kafka topic | Response pipeline | `eval.requests` topic | Avro schema |
| Metrics | Prometheus scrape | Prometheus | All `/metrics` endpoints | OpenMetrics format |
| Traces | OTLP | All services | OTEL Collector | OTLP gRPC |

---

## Phase D — Technology Architecture

### Technology Standards

| Category | Approved Technology | Version | Banned Alternatives |
|----------|--------------------|---------|--------------------|
| Container Runtime | Docker | 25+ | Podman (not yet approved) |
| Orchestration | Kubernetes | 1.29+ | Docker Swarm |
| Service Mesh | Istio | 1.21+ | Linkerd (pending evaluation) |
| API Gateway | FastAPI + NGINX | FastAPI 0.111+, NGINX 1.25+ | Express, Flask (not enterprise-grade for this use case) |
| Vector DB | Weaviate | 1.24+ | Pinecone (vendor lock-in), Chroma (not production-grade) |
| Search | OpenSearch | 2.13+ | Elasticsearch (licensing) |
| Graph DB | Neo4j | 5.x Enterprise | ArangoDB (pending evaluation) |
| Cache | Redis | 7.2+ Sentinel | Memcached |
| Message Queue | Kafka | 3.7+ | ActiveMQ |
| LLM Runtime | Ollama | 0.3+ | OpenAI API (vendor dependency), proprietary APIs |
| Embeddings | SBERT / Sentence Transformers | Latest stable | OpenAI Embeddings (vendor dependency) |
| IAM | Keycloak | 24+ | Auth0 (vendor lock-in) |
| Policy Engine | OPA | 0.65+ | Custom RBAC (not auditable) |
| LLM Safety | NeMo Guardrails | 0.7+ | None (guardrails are mandatory) |
| Tracing | OpenTelemetry | 1.x | Jaeger standalone, Zipkin |
| Metrics | Prometheus | 2.50+ | Datadog (cost), New Relic (vendor lock-in) |
| Dashboards | Grafana | 10+ | Kibana (reserved for log search) |
| LLM Tracing | Langfuse | 2+ | None equivalent |
| Experiment Tracking | MLflow | 2.13+ | Weights & Biases (vendor lock-in) |
| Evaluation | RAGAS | 0.1+ | Custom eval (not benchmarked) |
| CDN / Edge | Cloudflare | — | AWS CloudFront (vendor dependency) |

### Technology Deployment Model

```
Production Topology:

[Cloudflare Edge]
      ↓
[NGINX Ingress Controller] (K8s Ingress)
      ↓
[FastAPI API Gateway] (Deployment, HPA)
      ↓
[Istio Service Mesh] — mTLS across all below
      ↓
┌─────────────────────────────────────┐
│  Stateless Workload Node Pool       │
│  - agent-brain                      │
│  - query-intelligence               │
│  - hybrid-fusion                    │
│  - rerank-service                   │
│  - context-assembler                │
│  - prompt-engine                    │
│  - guardrails                       │
│  - evaluation                       │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  GPU Node Pool                      │
│  - ollama (LLM inference)           │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  StatefulSet Node Pool              │
│  - Weaviate (3 replicas)            │
│  - OpenSearch (3 replicas)          │
│  - Neo4j (3-node causal cluster)    │
│  - Redis Sentinel (3 replicas)      │
│  - Kafka (3 brokers)                │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  Observability Node Pool            │
│  - OTEL Collector                   │
│  - Prometheus                       │
│  - Grafana                          │
│  - Langfuse                         │
│  - MLflow                           │
└─────────────────────────────────────┘
```

### Non-Functional Requirements (NFR) Traceability

| NFR | Target | Mechanism |
|-----|--------|-----------|
| Availability | 99.9% uptime | HPA, PDB, multi-replica StatefulSets, circuit breakers |
| Latency | p99 < 3s end-to-end | Rerank caching, Redis session cache, async evaluation |
| Throughput | 500 concurrent queries | HPA on api-gateway and agent-brain |
| Data Durability | Zero data loss | Persistent volumes, Kafka replication factor 3 |
| Security | Zero-trust internal | Istio mTLS, OPA, Keycloak, deny-all network policies |
| Auditability | 100% query audit | Kafka audit topic, Langfuse, OpenSearch log index |
| Recoverability | RTO < 15min, RPO < 5min | StatefulSet PVCs, Kafka offsets, Redis persistence |

---

## Phase E — Opportunities & Solutions

### Architecture Roadmap

| Phase | Milestone | Components |
|-------|-----------|------------|
| MVP (Month 1–2) | Core RAG pipeline operational | API Gateway + Agent Brain + Weaviate + OpenSearch + Ollama + Redis + Basic Guardrails |
| Phase 1 (Month 3) | Full hybrid retrieval | Add Neo4j graph retrieval + Hybrid fusion + SBERT reranker |
| Phase 2 (Month 4) | Observability complete | OTEL + Prometheus + Grafana + Langfuse + MLflow |
| Phase 3 (Month 5) | Evaluation pipeline | RAGAS + HuggingFace benchmarks + regression testing |
| Phase 4 (Month 6) | Production hardening | Istio mTLS + OPA policies + NeMo Guardrails + full audit |
| Phase 5 (Month 7+) | Scale & optimise | GPU autoscaling + multi-tenant isolation + cost attribution |

### Gap Analysis

| Capability | Current State | Target State | Gap |
|------------|--------------|-------------|-----|
| Vector retrieval | Not deployed | Weaviate operational | Deploy + seed index |
| Graph reasoning | Not deployed | Neo4j operational | Deploy + entity pipeline |
| LLM inference | Not deployed | Ollama GPU runtime | GPU node + model pull |
| Policy enforcement | Not deployed | OPA + Keycloak live | Rego policies + realm config |
| Evaluation | Not deployed | RAGAS daily batch | Evaluation service + MLflow |
| Observability | Not deployed | Full OTEL stack | Instrument all services |

---

## Phase F — Migration Planning

### Work Packages

| WP | Description | Dependencies | Owner |
|----|-------------|-------------|-------|
| WP-01 | K8s cluster setup + namespaces + RBAC | None | Platform Engineering |
| WP-02 | Keycloak deployment + realm + client config | WP-01 | Security Team |
| WP-03 | Data plane: Weaviate + OpenSearch + Neo4j + Redis + Kafka | WP-01 | Data Engineering |
| WP-04 | API Gateway + Agent Brain service deployment | WP-02, WP-03 | AI Engineering |
| WP-05 | Ollama GPU deployment + model registry | WP-01 (GPU pool) | ML Engineering |
| WP-06 | Guardrails service: OPA policies + NeMo rails | WP-04, WP-05 | Security + AI |
| WP-07 | Observability stack: OTEL + Prometheus + Grafana + Langfuse | WP-04 | Platform Engineering |
| WP-08 | Evaluation pipeline: RAGAS + MLflow + HuggingFace | WP-04, WP-07 | ML Engineering |
| WP-09 | Istio mTLS + network policies + Cloudflare integration | WP-04 | Platform + Security |
| WP-10 | Load testing, NFR validation, go-live checklist | All WPs | Architecture Team |

---

## Phase G — Implementation Governance

### Architecture Compliance Checkpoints

| Checkpoint | When | Pass Criteria |
|------------|------|--------------|
| Architecture Design Review | Before each WP starts | ABB/SBB mapping approved; no cross-layer violations |
| Security Review | Before WP-06 and WP-09 | OPA policies peer-reviewed; penetration test passed |
| Data Governance Review | Before WP-03 | Classification schema approved; lineage documented |
| NFR Validation | After WP-10 | p99 < 3s; availability > 99.9%; zero audit gaps |
| AI Governance Review | Before production go-live | RAGAS scores above baseline; guardrails tested; explainability documented |

### Architecture Decision Records (ADRs)

| ADR | Decision | Rationale |
|-----|----------|-----------|
| ADR-001 | Ollama over OpenAI API | Avoid vendor lock-in; data stays on-premise |
| ADR-002 | Weaviate over Pinecone | Open-source; tenant isolation via classes; no per-query cost |
| ADR-003 | OPA over custom RBAC | Policy-as-code; auditable; decoupled from application |
| ADR-004 | Kafka over direct service calls | Async decoupling; audit event durability; replay capability |
| ADR-005 | RAGAS for evaluation | Open standard; faithfulness + relevancy + precision measurable |
| ADR-006 | Istio for mTLS | Zero-trust internal networking; no application code changes |
| ADR-007 | LangGraph over AutoGen | Explicit state machine; deterministic flow control; production-stable |

---

## Phase H — Architecture Change Management

### Change Triggers

| Trigger | Response |
|---------|----------|
| New LLM model available | ADR update → model evaluation → MLflow benchmark → staged rollout |
| Regulatory change (e.g. GDPR update) | Data governance review → OPA policy update → audit log verification |
| Performance regression (p99 > 3s) | Root cause analysis → HPA tuning or caching strategy update |
| RAGAS score drops below baseline | ML review → retrieval tuning → prompt engineering → re-evaluation |
| New retrieval source required | ABB extension → isolated service → hybrid fusion weight update |
| Security vulnerability discovered | Immediate patch → Istio policy update → architecture review |

### Versioning Policy

- All APIs versioned (`/v1/`, `/v2/`) — no breaking changes within a major version
- All approved SBB versions pinned in Standards Information Base
- Architecture Repository updated within 5 business days of any approved change
- ADR required for any deviation from approved technology standards
