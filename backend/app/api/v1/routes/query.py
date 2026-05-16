"""POST /v1/query — runs the LangGraph pipeline, streams tokens via SSE."""
import json
import time

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

router = APIRouter()


@router.post("/query")
@limiter.limit("30/minute")
async def query_endpoint(
    request: Request,
    body: QueryRequest,
    user: dict = Depends(get_current_user),
):
    history = await get_history(body.session_id)

    initial_state: AgentState = {
        "query": body.query,
        "session_id": body.session_id,
        "user_id": user["user_id"],
        "role": user["roles"][0] if user["roles"] else "user",
        "rewritten_query": "",
        "pii_detected_input": False,
        "retrieved_docs": [],
        "context": "",
        "citations": [],
        "response": "",
        "pii_detected_output": False,
        "blocked": False,
        "block_reason": None,
        "error": None,
    }

    async def event_generator():
        active_sessions.inc()
        start = time.monotonic()
        final_state = initial_state

        try:
            async for event in rag_graph.astream_events(initial_state, version="v2"):
                kind = event["event"]

                if kind == "on_chat_model_stream":
                    chunk = event["data"].get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        yield {
                            "event": "token",
                            "data": json.dumps({"content": chunk.content}),
                        }

                elif kind == "on_chain_end" and event.get("name") == "LangGraph":
                    final_state = event["data"].get("output", initial_state)

            citations = final_state.get("citations", [])
            yield {
                "event": "done",
                "data": json.dumps({
                    "citations": citations,
                    "pii_detected": final_state.get("pii_detected_input") or final_state.get("pii_detected_output"),
                    "blocked": final_state.get("blocked", False),
                    "block_reason": final_state.get("block_reason"),
                }),
            }

            await append_turn(
                body.session_id,
                body.query,
                final_state.get("response", ""),
            )

            elapsed = time.monotonic() - start
            elapsed_ms = elapsed * 1000
            query_duration.observe(elapsed)
            query_total.labels(status="success").inc()

            docs = final_state.get("retrieved_docs", [])
            record_query(
                success=True,
                blocked=final_state.get("blocked", False),
                latency_ms=elapsed_ms,
                pii_detected=final_state.get("pii_detected_input") or final_state.get("pii_detected_output"),
                retrieval_scores=[d.get("score", 0) for d in docs],
                chunks_retrieved=len(docs),
            )

        except Exception as exc:
            query_total.labels(status="error").inc()
            record_query(success=False, blocked=False, latency_ms=0,
                        pii_detected=False, retrieval_scores=[], chunks_retrieved=0)
            yield {"event": "error", "data": json.dumps({"detail": str(exc)})}

        finally:
            active_sessions.dec()

    return EventSourceResponse(event_generator())
