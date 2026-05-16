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
