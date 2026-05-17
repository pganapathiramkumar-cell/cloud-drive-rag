import { getToken } from '../auth/keycloak'
import type { WorkflowStage, WorkflowAnswer, FunctionSpan } from '../types/workflow'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface WorkflowCallbacks {
  onTraceStart: (traceId: string, runtimeVersions: Record<string, string>) => void
  onStage:      (stage: Partial<WorkflowStage> & { node: string; functionSpans: FunctionSpan[] }) => void
  onToken:      (content: string) => void
  onDone:       (payload: {
    citations:    WorkflowAnswer['citations']
    piiDetected:  boolean
    blocked:      boolean
    blockReason:  string | null
    totalMs:      number
    inputTokens:  number
    outputTokens: number
  }) => void
  onError: (msg: string) => void
}

export async function streamWorkflowQuery(
  query:     string,
  sessionId: string,
  callbacks: WorkflowCallbacks,
): Promise<void> {
  const token = getToken()

  const resp = await fetch(`${API_URL}/v1/workflow/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, session_id: sessionId }),
  })

  if (!resp.ok) {
    callbacks.onError(`HTTP ${resp.status}`)
    return
  }

  const reader    = resp.body!.getReader()
  const decoder   = new TextDecoder()
  let   buffer    = ''
  let   eventType = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      // Track event type
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim()
        continue
      }

      // Parse data line
      if (line.startsWith('data: ')) {
        const raw = line.slice(6).trim()
        if (!raw) continue
        try {
          const j = JSON.parse(raw)

          if (eventType === 'trace_start') {
            callbacks.onTraceStart(j.trace_id, j.runtime_versions ?? {})

          } else if (eventType === 'workflow_stage') {
            const spans: FunctionSpan[] = (j.function_spans ?? []).map((s: Record<string, unknown>) => ({
              name:       s.name       as string,
              file:       s.file       as string,
              durationMs: s.duration_ms as number,
              library:    s.library    as string,
              version:    s.version    as string,
              metadata:   (s.metadata  as Record<string, unknown>) ?? {},
              error:      (s.error     as string | null) ?? null,
              memDeltaMb: (s.mem_delta_mb as number | null) ?? null,
            }))
            callbacks.onStage({
              node:          j.node,
              label:         j.label,
              status:        j.status,
              startedAtMs:   j.started_at_ms,
              durationMs:    j.duration_ms ?? null,
              library:       j.library,
              logLine:       j.log_line,
              metadata:      j.metadata ?? {},
              functionSpans: spans,
            })

          } else if (eventType === 'token' || j.content !== undefined) {
            if (j.content) callbacks.onToken(j.content)

          } else if (eventType === 'done' || j.citations !== undefined) {
            callbacks.onDone({
              citations:    j.citations     ?? [],
              piiDetected:  j.pii_detected  ?? false,
              blocked:      j.blocked       ?? false,
              blockReason:  j.block_reason  ?? null,
              totalMs:      j.total_ms      ?? 0,
              inputTokens:  j.input_tokens  ?? 0,
              outputTokens: j.output_tokens ?? 0,
            })

          } else if (eventType === 'error' || j.detail !== undefined) {
            callbacks.onError(j.detail || 'Unknown error')
          }
        } catch { /* partial chunk */ }
        eventType = ''
      }

      if (line === '') eventType = ''
    }
  }
}
