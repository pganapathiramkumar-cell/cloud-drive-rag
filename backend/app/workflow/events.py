"""Structured workflow stage event emitted per LangGraph node."""
from __future__ import annotations
import json
from dataclasses import dataclass, field
from typing import Any


@dataclass
class WorkflowStageEvent:
    trace_id:       str
    node:           str
    label:          str
    status:         str          # 'running' | 'completed' | 'failed' | 'skipped'
    started_at_ms:  float
    duration_ms:    float
    library:        str
    log_line:       str
    metadata:       dict[str, Any]       = field(default_factory=dict)
    function_spans: list[dict[str, Any]] = field(default_factory=list)

    def to_json(self) -> str:
        return json.dumps({
            "trace_id":       self.trace_id,
            "node":           self.node,
            "label":          self.label,
            "status":         self.status,
            "started_at_ms":  self.started_at_ms,
            "duration_ms":    self.duration_ms,
            "library":        self.library,
            "log_line":       self.log_line,
            "metadata":       self.metadata,
            "function_spans": self.function_spans,
        })
