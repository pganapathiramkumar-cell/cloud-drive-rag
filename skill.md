# skill.md — Enterprise RAG + Agentic AI Modular Skills

---

## A. Retrieval Skills

### `vector_search`
- **Runtime**: Weaviate
- **Input**: Encoded query vector (SBERT)
- **Output**: Top-K document chunks with scores and metadata
- **Config**: Class name, distance metric (cosine), top-K limit, filters (tenant, date, classification)
- **Owns**: Weaviate client, query builder, filter builder
- **Does NOT own**: Embedding generation, result fusion, reranking

---

### `keyword_search`
- **Runtime**: OpenSearch
- **Input**: Tokenised query string
- **Output**: BM25-ranked document chunks with relevance scores
- **Config**: Index name, BM25 k1/b parameters, field boosts, result window size
- **Owns**: OpenSearch client, query DSL builder, index routing
- **Does NOT own**: Semantic ranking, vector operations

---

### `graph_reasoning`
- **Runtime**: Neo4j
- **Input**: Named entities extracted from query
- **Output**: Entity relationships, reasoning paths, connected document references
- **Config**: Cypher query templates, hop depth limit (max 3), relationship type filters
- **Owns**: Neo4j driver, entity linker, Cypher builder
- **Does NOT own**: Entity extraction (Agent Brain), document retrieval

---

### `hybrid_search_engine`
- **Runtime**: Internal fusion service
- **Input**: Results from `vector_search`, `keyword_search`, `graph_reasoning`
- **Output**: Single unified ranked list (RRF-fused)
- **Config**: Source weights, RRF k parameter, deduplication threshold
- **Owns**: Reciprocal Rank Fusion (RRF) algorithm, deduplication, score normalisation
- **Does NOT own**: Individual source queries (delegates to above skills)

---

## B. Intelligence Skills

### `query_rewriter`
- **Runtime**: LangChain LLMChain + Ollama
- **Input**: Raw user query + conversation history
- **Output**: Normalised, unambiguous query string
- **Config**: Rewrite prompt template, max iterations: 1, temperature: 0
- **Owns**: Rewrite prompt, LLM call, output parser
- **Does NOT own**: Query decomposition, retrieval

---

### `query_decomposer`
- **Runtime**: LangGraph node
- **Input**: Complex or multi-hop query
- **Output**: List of atomic sub-queries with dependency graph
- **Config**: Decomposition prompt, max sub-queries: 5, dependency resolution strategy
- **Owns**: Decomposition prompt, sub-query dependency resolution, merge strategy
- **Does NOT own**: Sub-query execution (delegates to retrieval skills)

---

### `semantic_expander`
- **Runtime**: SBERT / Sentence Transformers
- **Input**: Query string
- **Output**: Query embedding vector + synonym-expanded query terms
- **Config**: Model name (e.g. `all-MiniLM-L6-v2`), expansion vocabulary, top-N synonyms
- **Owns**: Embedding model, synonym expansion, vector encoding
- **Does NOT own**: Vector store operations, retrieval logic

---

## C. Agent Skills

### `tool_router`
- **Runtime**: LangGraph conditional edge
- **Input**: Classified intent + query metadata
- **Output**: Tool selection decision + dispatch call
- **Config**: Intent-to-tool routing table, fallback tool, confidence threshold
- **Owns**: Intent classifier, routing logic, tool registry lookup
- **Does NOT own**: Tool execution, response aggregation

---

### `planner_agent`
- **Runtime**: LangGraph StateGraph (AutoGen-style)
- **Input**: User goal + available tools
- **Output**: Ordered execution plan with tool calls and dependencies
- **Config**: Planning prompt, max plan steps: 10, replanning threshold
- **Owns**: Goal decomposition, plan DAG construction, replanning logic
- **Does NOT own**: Tool execution, memory access

---

### `reasoning_loop`
- **Runtime**: LangGraph ReAct loop
- **Input**: Query + tool results (iterative)
- **Output**: Final answer with reasoning trace and citations
- **Config**: Max iterations: 5, stop conditions, scratchpad template
- **Owns**: Thought-Action-Observation loop, stop condition evaluation, citation builder
- **Does NOT own**: Tool invocation implementations, LLM inference

---

## D. Memory Skills

### `session_memory`
- **Runtime**: Redis
- **Input**: Session ID + new turn (query + response)
- **Output**: Conversation buffer (last N turns)
- **Config**: TTL: 3600s, max turns: 20, key namespace per tenant
- **Owns**: Redis client, session key schema, serialisation, TTL management
- **Does NOT own**: Semantic similarity, vector operations

---

### `semantic_memory`
- **Runtime**: Weaviate (dedicated memory class)
- **Input**: Query-response pair + embedding
- **Output**: Semantically similar prior answers
- **Config**: Memory class name, similarity threshold, max recall: 3, TTL policy
- **Owns**: Memory write (post-response), memory read (pre-retrieval), embedding lookup
- **Does NOT own**: Session tracking, Redis operations

---

## E. Generation Skills

### `llm_inference`
- **Runtime**: Ollama
- **Input**: Final assembled prompt (post-guardrail)
- **Output**: Streaming token response
- **Config**: Model name, temperature, max tokens, stop sequences, streaming: true
- **Owns**: Ollama client, model selection, streaming handler, token counter
- **Does NOT own**: Prompt construction, guardrail checks, context assembly

---

### `prompt_builder`
- **Runtime**: LangChain PromptTemplate
- **Input**: System prompt template + context chunks + query + memory
- **Output**: Fully rendered prompt string
- **Config**: Template per use-case (QA, summarisation, reasoning), max context tokens: 4096
- **Owns**: Template registry, variable injection, token budget enforcement
- **Does NOT own**: Context retrieval, LLM invocation

---

### `context_assembler`
- **Runtime**: Internal service
- **Input**: Reranked chunks + session memory + graph paths
- **Output**: Structured context object (chunks, sources, confidence scores)
- **Config**: Max chunks: 10, deduplication threshold, source attribution format
- **Owns**: Chunk selection, deduplication, source metadata attachment
- **Does NOT own**: Reranking logic, prompt rendering

---

## F. Safety Skills

### `prompt_injection_detector`
- **Runtime**: Custom classifier (fine-tuned SBERT)
- **Input**: User query string
- **Output**: Injection risk score (0–1) + block/allow decision
- **Config**: Threshold: 0.75, pattern blocklist, audit log on block
- **Owns**: Injection pattern library, classifier inference, audit event emission
- **Does NOT own**: Policy enforcement, output filtering

---

### `policy_enforcer`
- **Runtime**: OPA (Open Policy Agent)
- **Input**: Request context (user role, query classification, data sensitivity labels)
- **Output**: Allow / Deny + policy decision reason
- **Config**: Rego policy bundles, data classification schema, role-permission matrix
- **Owns**: OPA client, policy bundle loader, decision logger
- **Does NOT own**: Authentication (Keycloak), LLM safety (NeMo)

---

### `output_filter`
- **Runtime**: NeMo Guardrails
- **Input**: Raw LLM response + original query
- **Output**: Filtered response or refusal message
- **Config**: Rail definitions (topics, PII, toxicity), action on violation (redact / refuse / warn)
- **Owns**: NeMo rail runner, PII scrubber, violation event emitter
- **Does NOT own**: Pre-prompt safety (injection detector), policy access control (OPA)

---

## G. Observability Skills

### `trace_logger`
- **Runtime**: OpenTelemetry SDK
- **Input**: Span start/end events from all layers
- **Output**: Distributed trace exported to OTLP collector
- **Config**: Service name, OTLP endpoint, sampling rate (production: 10%, staging: 100%)
- **Owns**: Span creation, propagation headers, OTLP export
- **Does NOT own**: Metrics collection, LLM-specific tracing

---

### `metrics_collector`
- **Runtime**: Prometheus client libraries (per service)
- **Input**: Internal counters, histograms, gauges from each service
- **Output**: `/metrics` endpoint scraped by Prometheus server
- **Config**: Metric names, label schema (tenant, service, model), scrape interval: 15s
- **Owns**: Metric registration, label cardinality control, `/metrics` endpoint
- **Does NOT own**: Alerting rules, dashboard rendering

---

### `dashboard_visualizer`
- **Runtime**: Grafana
- **Input**: Prometheus metrics, OpenSearch logs, MLflow experiment data
- **Output**: Real-time dashboards (latency, throughput, error rate, RAGAS scores, LLM cost)
- **Config**: Dashboard JSON definitions, datasource configs, alert thresholds
- **Owns**: Dashboard definitions, datasource connections, alert rules
- **Does NOT own**: Metric collection, log ingestion

---

### `llm_trace_logger`
- **Runtime**: Langfuse + Helicone
- **Input**: LLM call metadata (prompt, response, model, latency, token count, cost)
- **Output**: LLM traces, session timelines, cost attribution reports
- **Config**: Langfuse project key, Helicone proxy endpoint, trace retention: 90 days
- **Owns**: LLM trace capture, session grouping, cost calculation, user attribution
- **Does NOT own**: Infrastructure metrics (Prometheus), distributed tracing (OTEL)

---

## H. Evaluation Skills

### `rag_evaluator`
- **Runtime**: RAGAS
- **Input**: Question, generated answer, retrieved contexts, ground truth (optional)
- **Output**: RAGAS scores — faithfulness, answer relevancy, context precision, context recall
- **Config**: Evaluation LLM (Ollama), metrics selection, async batch size
- **Owns**: RAGAS pipeline, metric computation, score storage
- **Does NOT own**: Benchmark dataset loading, MLflow logging

---

### `benchmark_runner`
- **Runtime**: HuggingFace `datasets` library
- **Input**: Dataset name/path, evaluation config
- **Output**: Batch evaluation results against standard QA/RAG benchmarks
- **Config**: Dataset names (e.g. `squad`, `hotpot_qa`), split, sample size, evaluation interval
- **Owns**: Dataset loading, batch query execution, result aggregation
- **Does NOT own**: Metric computation (delegates to `rag_evaluator`), experiment logging

---

### `regression_tester`
- **Runtime**: MLflow
- **Input**: Current evaluation scores + baseline run ID
- **Output**: Regression report (pass/fail per metric vs baseline), experiment diff
- **Config**: Baseline run ID, regression thresholds per metric, alert on regression: true
- **Owns**: MLflow run logging, baseline comparison, regression alert emission
- **Does NOT own**: Score computation, dataset management
