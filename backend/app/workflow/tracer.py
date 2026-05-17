"""
Async-safe function-level tracing using ContextVar.

Architecture:
  - init_trace_context()  → call once per workflow request in the SSE generator
  - set_active_node(node) → call in the SSE generator on on_chain_start events
  - @traced(...)          → decorate service functions; no-op outside trace contexts
  - add_current_span_metadata(k,v) → enrich the innermost active span from inside a function
  - get_spans_for_node(node)       → read spans after on_chain_end

ContextVar propagation: all LangGraph nodes run inside the same asyncio task as
the SSE event generator (sequential StateGraph), so ContextVar mutations made in
the generator ARE visible inside node executions.
"""
from __future__ import annotations

import functools
import inspect
import time
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Any, Callable

# Optional psutil for memory tracking — install with: pip install psutil
try:
    import psutil as _psutil
    _process = _psutil.Process()
    _HAS_PSUTIL = True
except ImportError:
    _HAS_PSUTIL = False


@dataclass
class FunctionSpan:
    name:         str
    file:         str
    start_ms:     float
    end_ms:       float       = 0.0
    duration_ms:  float       = 0.0
    library:      str         = ""
    version:      str         = ""
    metadata:     dict[str, Any] = field(default_factory=dict)
    error:        str | None  = None
    mem_delta_mb: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "name":         self.name,
            "file":         self.file,
            "duration_ms":  self.duration_ms,
            "library":      self.library,
            "version":      self.version,
            "metadata":     self.metadata,
            "error":        self.error,
            "mem_delta_mb": self.mem_delta_mb,
        }


# ── ContextVar storage (all None / empty by default = zero cost outside workflow) ──
_spans:      ContextVar[dict[str, list[FunctionSpan]] | None] = ContextVar("_wf_spans",      default=None)
_active_node: ContextVar[str]                                  = ContextVar("_wf_active_node", default="unknown")
_span_stack: ContextVar[list[FunctionSpan] | None]             = ContextVar("_wf_span_stack", default=None)


def init_trace_context() -> None:
    """Initialise fresh, isolated span storage for this request. Call once per SSE request."""
    _spans.set({})
    _span_stack.set([])


def set_active_node(node: str) -> None:
    """
    Set the currently executing pipeline node.
    Call in the SSE event generator immediately after receiving on_chain_start.
    Because LangGraph runs the node AFTER yielding on_chain_start, and all execution
    is in the same asyncio task, this ContextVar value is visible inside the node.
    """
    _active_node.set(node)


def get_spans_for_node(node: str) -> list[FunctionSpan]:
    """Return all function spans recorded under the given node name."""
    store = _spans.get()
    if store is None:
        return []
    return list(store.get(node, []))


def add_current_span_metadata(key: str, value: Any) -> None:
    """
    Enrich the innermost currently-executing span with a key/value pair.
    Call this from inside a @traced function body for dynamic runtime data.
    """
    stack = _span_stack.get()
    if stack:
        stack[-1].metadata[key] = value


def _record_span(node: str, span: FunctionSpan) -> None:
    store = _spans.get()
    if store is None:
        return
    store.setdefault(node, []).append(span)


def traced(
    label:   str,
    file:    str    = "",
    library: str    = "",
    version: str    = "",
    **static_meta: Any,
) -> Callable:
    """
    Decorator that captures sync and async function execution as a FunctionSpan.
    Completely no-op when init_trace_context() has not been called (i.e., all
    non-workflow requests: /v1/query, ingestion, uploads).
    """
    def decorator(fn: Callable) -> Callable:
        src_file = file or _safe_getfile(fn)

        if inspect.iscoroutinefunction(fn):
            @functools.wraps(fn)
            async def async_wrapper(*args, **kwargs):
                if _spans.get() is None:
                    return await fn(*args, **kwargs)

                node         = _active_node.get()
                mem_before   = _get_mem()
                span         = FunctionSpan(
                    name=label, file=src_file, library=library, version=version,
                    start_ms=time.perf_counter() * 1000,
                    metadata=dict(static_meta),
                )
                stack = _span_stack.get() or []
                stack.append(span)
                try:
                    result = await fn(*args, **kwargs)
                    return result
                except Exception as exc:
                    span.error = str(exc)[:300]
                    raise
                finally:
                    _finalise_span(span, stack, mem_before)
                    _record_span(node, span)

            return async_wrapper

        else:
            @functools.wraps(fn)
            def sync_wrapper(*args, **kwargs):
                if _spans.get() is None:
                    return fn(*args, **kwargs)

                node         = _active_node.get()
                mem_before   = _get_mem()
                span         = FunctionSpan(
                    name=label, file=src_file, library=library, version=version,
                    start_ms=time.perf_counter() * 1000,
                    metadata=dict(static_meta),
                )
                stack = _span_stack.get() or []
                stack.append(span)
                try:
                    result = fn(*args, **kwargs)
                    return result
                except Exception as exc:
                    span.error = str(exc)[:300]
                    raise
                finally:
                    _finalise_span(span, stack, mem_before)
                    _record_span(node, span)

            return sync_wrapper

    return decorator


def _finalise_span(
    span:       FunctionSpan,
    stack:      list[FunctionSpan],
    mem_before: float | None,
) -> None:
    span.end_ms      = time.perf_counter() * 1000
    span.duration_ms = round(span.end_ms - span.start_ms, 2)
    if _HAS_PSUTIL and mem_before is not None:
        span.mem_delta_mb = round(_get_mem() - mem_before, 3)  # type: ignore[operator]
    if stack and stack[-1] is span:
        stack.pop()


def _get_mem() -> float | None:
    if _HAS_PSUTIL:
        return _process.memory_info().rss / 1_048_576
    return None


def _safe_getfile(fn: Callable) -> str:
    try:
        return inspect.getfile(fn)
    except (TypeError, OSError):
        return ""
