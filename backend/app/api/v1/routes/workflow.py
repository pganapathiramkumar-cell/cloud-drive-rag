"""POST /v1/workflow/query — RAG pipeline with real-time stage + function-level events via SSE."""
import json
import time
import uuid

from fastapi import APIRouter, Depends, Request
from sse_starlette.sse import EventSourceResponse

from app.api.v1.schemas import QueryRequest
from app.core.auth import get_current_user
from app.core.rate_limit import limiter
from app.pipeline.graph import rag_graph
from app.pipeline.state import AgentState
from app.services.memory import append_turn, get_history
from app.observability.metrics import query_total, query_duration, active_sessions
from app.services.metrics_tracker import record_query
from app.services.analytics_tracker import record_retrieval_scores, record_error
from app.workflow.events import WorkflowStageEvent
from app.workflow.parser import (
    NODE_NAMES, NODE_META, PIPELINE_ORDER,
    extract_metadata, make_log_line,
)
from app.workflow.tracer import init_trace_context, set_active_node, get_spans_for_node
from app.workflow.deps import get_all_versions

router = APIRouter()


@router.post("/workflow/query")
@limiter.limit("30/minute")
async def workflow_query_endpoint(
    request: Request,
    body: QueryRequest,
    user: dict = Depends(get_current_user),
):
    await get_history(body.session_id)
    trace_id = str(uuid.uuid4())

    initial_state: AgentState = {
        "query":               body.query,
        "session_id":          body.session_id,
        "user_id":             user["user_id"],
        "role":                user["roles"][0] if user["roles"] else "user",
        "rewritten_query":     "",
        "pii_detected_input":  False,
        "retrieved_docs":      [],
        "context":             "",
        "citations":           [],
        "response":            "",
        "pii_detected_output": False,
        "blocked":             False,
        "block_reason":        None,
        "error":               None,
    }

    async def event_generator():
        # ── Initialise per-request function trace context ──
        init_trace_context()

        active_sessions.inc()
        pipeline_start    = time.monotonic()
        final_state       = dict(initial_state)
        node_start_times: dict[str, float] = {}
        llm_input_tokens  = 0
        llm_output_tokens = 0

        # Emit trace_start so frontend pre-populates the pipeline
        yield {
            "event": "trace_start",
            "data": json.dumps({
                "trace_id":        trace_id,
                "query":           body.query,
                "session_id":      body.session_id,
                "pipeline_nodes":  PIPELINE_ORDER,
                "runtime_versions": get_all_versions(),
            }),
        }

        try:
            async for event in rag_graph.astream_events(initial_state, version="v2"):
                kind = event["event"]
                name = event.get("name", "")
                data = event.get("data", {}) or {}

                # ── Node started ──────────────────────────────────────────────
                if kind == "on_chain_start" and name in NODE_NAMES:
                    node_start_times[name] = time.monotonic()

                    # Set active node BEFORE the node executes so @traced decorators
                    # in service functions record spans under the correct node.
                    set_active_node(name)

                    info  = NODE_META.get(name, {})
                    stage = WorkflowStageEvent(
                        trace_id=trace_id, node=name,
                        label=info.get("label", name),
                        status="running",
                        started_at_ms=node_start_times[name] * 1000,
                        duration_ms=0,
                        library=info.get("library", ""),
                        log_line="Running…",
                        metadata={"file": info.get("file", ""), "func": info.get("func", "")},
                    )
                    yield {"event": "workflow_stage", "data": stage.to_json()}

                # ── Node completed ────────────────────────────────────────────
                elif kind == "on_chain_end" and name in NODE_NAMES:
                    started     = node_start_times.get(name, time.monotonic())
                    duration_ms = (time.monotonic() - started) * 1000
                    output      = data.get("output") or {}
                    if not isinstance(output, dict):
                        output = {}

                    # ── Collect function-level spans for this node ──
                    fn_spans = [s.to_dict() for s in get_spans_for_node(name)]

                    meta = extract_metadata(name, output)
                    info = NODE_META.get(name, {})

                    if name == "generate":
                        meta["input_tokens"]    = llm_input_tokens
                        meta["output_tokens"]   = llm_output_tokens
                        meta["total_tokens"]    = llm_input_tokens + llm_output_tokens
                        meta["groq_latency_ms"] = round(duration_ms, 1)
                        if llm_input_tokens or llm_output_tokens:
                            cost = (
                                (llm_input_tokens  / 1_000_000) * 0.59 +
                                (llm_output_tokens / 1_000_000) * 0.79
                            )
                            meta["cost_usd"] = round(cost, 8)

                    meta["file"] = info.get("file", "")
                    meta["func"] = info.get("func", "")

                    blocked = bool(output.get("blocked", False)) if name == "scan_input" else False

                    stage = WorkflowStageEvent(
                        trace_id=trace_id, node=name,
                        label=info.get("label", name),
                        status="failed" if blocked else "completed",
                        started_at_ms=started * 1000,
                        duration_ms=round(duration_ms, 1),
                        library=info.get("library", ""),
                        log_line=make_log_line(name, meta),
                        metadata=meta,
                        function_spans=fn_spans,
                    )
                    yield {"event": "workflow_stage", "data": stage.to_json()}

                # ── Graph end → capture final state ───────────────────────────
                elif kind == "on_chain_end" and name == "LangGraph":
                    out = data.get("output")
                    if isinstance(out, dict):
                        final_state = out

                # ── LLM token stream ──────────────────────────────────────────
                elif kind == "on_chat_model_stream":
                    chunk = data.get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        yield {"event": "token", "data": json.dumps({"content": chunk.content})}

                # ── LLM token counts ──────────────────────────────────────────
                elif kind == "on_chat_model_end":
                    out = data.get("output")
                    if out:
                        usage = getattr(out, "usage_metadata", None)
                        if usage:
                            llm_input_tokens  = usage.get("input_tokens", 0)
                            llm_output_tokens = usage.get("output_tokens", 0)

            # ── Pipeline complete ─────────────────────────────────────────────
            total_ms  = round((time.monotonic() - pipeline_start) * 1000, 1)
            citations = final_state.get("citations", [])

            yield {
                "event": "done",
                "data": json.dumps({
                    "citations":     citations,
                    "pii_detected":  bool(final_state.get("pii_detected_input") or final_state.get("pii_detected_output")),
                    "blocked":       bool(final_state.get("blocked", False)),
                    "block_reason":  final_state.get("block_reason"),
                    "total_ms":      total_ms,
                    "trace_id":      trace_id,
                    "input_tokens":  llm_input_tokens,
                    "output_tokens": llm_output_tokens,
                }),
            }

            await append_turn(body.session_id, body.query, final_state.get("response", ""))

            # ── Record global metrics ─────────────────────────────────────────
            elapsed = time.monotonic() - pipeline_start
            query_duration.observe(elapsed)
            query_total.labels(status="success").inc()
            docs    = final_state.get("retrieved_docs", []) or []
            scores  = [d.get("score", 0) for d in docs]
            sources = [d.get("metadata", {}).get("source", "") for d in docs if d.get("metadata", {}).get("source")]
            avg_sc  = sum(scores) / len(scores) if scores else 0
            record_retrieval_scores(scores, avg_sc, sources, body.session_id)
            record_query(
                success=True, blocked=bool(final_state.get("blocked", False)),
                latency_ms=elapsed * 1000,
                pii_detected=bool(final_state.get("pii_detected_input") or final_state.get("pii_detected_output")),
                retrieval_scores=scores, chunks_retrieved=len(docs),
                response_length=len(final_state.get("response", "")),
                sources=sources, session_id=body.session_id,
                query_text=body.query, rewritten_query=final_state.get("rewritten_query", ""),
            )

        except Exception as exc:
            query_total.labels(status="error").inc()
            record_error(str(exc))
            record_query(success=False, blocked=False, latency_ms=0,
                        pii_detected=False, retrieval_scores=[], chunks_retrieved=0)
            yield {"event": "error", "data": json.dumps({"detail": str(exc)})}

        finally:
            active_sessions.dec()

    return EventSourceResponse(event_generator())
