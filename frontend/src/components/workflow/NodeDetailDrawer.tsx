import type { WorkflowStage, FunctionSpan } from '../../types/workflow'

interface Props { stage: WorkflowStage }

/* ── Generic key-value row ── */
function Row({ label, value, mono = false }: { label: string; value: unknown; mono?: boolean }) {
  if (value === undefined || value === null || value === '') return null
  const display = Array.isArray(value)
    ? value.length === 0 ? '—' : value.join(', ')
    : String(value)
  return (
    <div style={{ display: 'flex', gap: 12, padding: '5px 0', borderBottom: '1px solid var(--ds-divider)', alignItems: 'flex-start' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-3)', width: 150, flexShrink: 0, paddingTop: 1 }}>
        {label}
      </span>
      <span style={{
        fontSize: 12, color: 'var(--ds-text-1)', lineHeight: 1.55, wordBreak: 'break-word',
        fontFamily: mono ? "'JetBrains Mono','Fira Code',monospace" : undefined,
      }}>
        {display}
      </span>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: 'var(--ds-text-3)',
      margin: '14px 0 8px',
    }}>
      {children}
    </p>
  )
}

/* ── Function span tree (the new function-level trace section) ── */
function FunctionTraceTree({ spans }: { spans: FunctionSpan[] }) {
  if (!spans || spans.length === 0) {
    return (
      <p style={{ fontSize: 12, color: 'var(--ds-text-4)', fontStyle: 'italic', margin: '8px 0' }}>
        No function spans recorded for this node.
      </p>
    )
  }

  const maxDuration = Math.max(...spans.map(s => s.durationMs), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {spans.map((span, i) => (
        <FunctionSpanCard key={i} span={span} maxDuration={maxDuration} index={i} total={spans.length} />
      ))}
    </div>
  )
}

function FunctionSpanCard({ span, maxDuration, index, total }: {
  span: FunctionSpan; maxDuration: number; index: number; total: number
}) {
  const pct      = Math.round((span.durationMs / maxDuration) * 100)
  const isSlow   = span.durationMs > 500
  const hasMeta  = Object.keys(span.metadata).length > 0
  const isLast   = index === total - 1

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {/* Tree connector */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 16 }}>
        <div style={{
          width: 1, height: 14, background: isLast ? 'transparent' : 'var(--ds-border)',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 14, color: 'var(--ds-text-4)', lineHeight: 1 }}>
          {isLast ? '└' : '├'}
        </span>
        {!isLast && <div style={{ width: 1, flex: 1, background: 'var(--ds-border)' }} />}
      </div>

      {/* Span card */}
      <div style={{
        flex: 1, background: 'var(--ds-bg)', border: '1px solid var(--ds-border)',
        borderRadius: 'var(--ds-r-md)', padding: '10px 12px', minWidth: 0,
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{ minWidth: 0 }}>
            <code style={{
              fontSize: 12, fontWeight: 700, color: 'var(--ds-text-1)',
              fontFamily: "'JetBrains Mono','Fira Code',monospace",
            }}>
              {span.name}()
            </code>
            {span.error && (
              <span style={{ fontSize: 11, color: 'var(--ds-red-600)', marginLeft: 8, fontWeight: 600 }}>
                ERROR
              </span>
            )}
          </div>
          <span style={{
            fontSize: 12, fontWeight: 700, flexShrink: 0, marginLeft: 12,
            color: isSlow ? 'var(--ds-orange-600)' : 'var(--ds-text-2)',
          }}>
            {span.durationMs < 1000
              ? `${span.durationMs} ms`
              : `${(span.durationMs / 1000).toFixed(2)} s`}
          </span>
        </div>

        {/* File + library row */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          {span.file && (
            <span style={{
              fontSize: 11, color: 'var(--ds-text-3)',
              fontFamily: "'JetBrains Mono','Fira Code',monospace",
              background: 'var(--ds-bg-3)', border: '1px solid var(--ds-border)',
              borderRadius: 4, padding: '1px 6px',
            }}>
              {span.file.replace(/.*[/\\]/, '')}
            </span>
          )}
          {span.library && span.library !== 'manual' && (
            <span style={{
              fontSize: 11, color: 'var(--ds-blue-600)',
              background: 'var(--ds-blue-50)', border: '1px solid var(--ds-blue-200)',
              borderRadius: 4, padding: '1px 6px', fontWeight: 500,
            }}>
              {span.library}{span.version && span.version !== '—' ? ` ${span.version}` : ''}
            </span>
          )}
          {span.memDeltaMb !== null && span.memDeltaMb !== undefined && Math.abs(span.memDeltaMb) > 0.1 && (
            <span style={{
              fontSize: 11, color: 'var(--ds-purple-600)',
              background: 'var(--ds-purple-50)', border: '1px solid var(--ds-border)',
              borderRadius: 4, padding: '1px 6px',
            }}>
              {span.memDeltaMb > 0 ? '+' : ''}{span.memDeltaMb.toFixed(1)} MB
            </span>
          )}
        </div>

        {/* Duration bar */}
        <div className="ds-progress ds-progress-xs" style={{ marginBottom: hasMeta ? 8 : 0 }}>
          <div
            className="ds-progress-fill"
            style={{
              width: `${pct}%`,
              background: isSlow ? 'var(--ds-orange-500)' : 'var(--ds-blue-500)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Error message */}
        {span.error && (
          <div style={{
            fontSize: 12, color: 'var(--ds-red-600)', background: 'var(--ds-red-50)',
            border: '1px solid var(--ds-red-200)', borderRadius: 6, padding: '6px 10px', marginTop: 6,
            fontFamily: "'JetBrains Mono','Fira Code',monospace",
          }}>
            {span.error}
          </div>
        )}

        {/* Runtime metadata key-value grid */}
        {hasMeta && (
          <div style={{
            marginTop: 8, display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '4px 12px',
          }}>
            {Object.entries(span.metadata).map(([k, v]) => {
              if (v === undefined || v === null) return null
              const display = Array.isArray(v) ? v.slice(0, 3).join(', ') + (v.length > 3 ? '…' : '') : String(v)
              return (
                <div key={k} style={{ fontSize: 11 }}>
                  <span style={{ color: 'var(--ds-text-4)', marginRight: 4 }}>{k}:</span>
                  <span style={{ color: 'var(--ds-text-2)', fontWeight: 500, fontFamily: typeof v === 'number' ? 'monospace' : undefined }}>
                    {display}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main drawer ── */
export default function NodeDetailDrawer({ stage }: Props) {
  const m = stage.metadata as Record<string, unknown>

  return (
    <div style={{ padding: '16px' }}>

      {/* ── FUNCTION TRACE ─────────────────────────────── */}
      <SectionTitle>Functions Executed</SectionTitle>
      <FunctionTraceTree spans={stage.functionSpans} />

      {/* ── RUNTIME ───────────────────────────────────── */}
      <SectionTitle>Runtime</SectionTitle>
      <Row label="Node"         value={stage.node} mono />
      <Row label="Function"     value={m.func as string} mono />
      <Row label="File"         value={m.file as string} mono />
      <Row label="Library"      value={stage.library} />
      <Row label="Duration"     value={stage.durationMs !== null ? `${stage.durationMs} ms` : null} />
      <Row label="Status"       value={stage.status} />

      {/* ── NODE-SPECIFIC METADATA ─────────────────────── */}
      {stage.node === 'rewrite' && (<>
        <SectionTitle>Query Rewriting</SectionTitle>
        <Row label="Original query"  value={m.original_query  as string} />
        <Row label="Rewritten query" value={m.rewritten_query as string} />
        <Row label="Input chars"     value={m.input_chars     as number} />
        <Row label="Output chars"    value={m.output_chars    as number} />
        <Row label="Changed"         value={m.changed ? 'Yes — query was rewritten' : 'No — query unchanged'} />
        <Row label="Model"           value={m.model           as string} />
        <Row label="Temperature"     value={m.temperature     as number} />
      </>)}

      {stage.node === 'scan_input' && (<>
        <SectionTitle>PII Scan — Input</SectionTitle>
        <Row label="PII detected"  value={m.pii_detected ? 'YES — entities found' : 'Clean'} />
        <Row label="Blocked"       value={m.blocked ? `YES — ${m.block_reason ?? 'PII in query'}` : 'No'} />
        <Row label="Engine"        value={m.engine    as string} />
        <Row label="NLP model"     value={m.nlp_model as string} />
      </>)}

      {stage.node === 'retrieve' && (<>
        <SectionTitle>Vector Retrieval</SectionTitle>
        <Row label="Chunks retrieved" value={m.chunks_retrieved  as number} />
        <Row label="Avg score"        value={m.avg_score         as number} />
        <Row label="Top score"        value={m.top_score         as number} />
        <Row label="Min score"        value={m.min_score         as number} />
        <Row label="Top source"       value={m.top_source        as string} />
        <Row label="All sources"      value={m.sources           as string[]} />
        <Row label="Embedding model"  value={m.embedding_model   as string} />
        <Row label="Embedding dims"   value={m.embedding_dims    as number} />
        <Row label="Distance metric"  value={m.distance_metric   as string} />
        <Row label="Collection"       value={m.collection        as string} mono />
        <Row label="Top-K configured" value={m.top_k_configured  as number} />
      </>)}

      {stage.node === 'assemble' && (<>
        <SectionTitle>Context Assembly</SectionTitle>
        <Row label="Context chars"    value={m.context_chars      as number} />
        <Row label="Est. tokens"      value={m.context_tokens_est as number} />
        <Row label="Citations"        value={m.citations_count    as number} />
        <Row label="Session memory"   value={m.session_memory     as string} />
      </>)}

      {stage.node === 'generate' && (<>
        <SectionTitle>LLM Generation</SectionTitle>
        <Row label="Model"           value={m.model          as string} />
        <Row label="Provider"        value={m.provider       as string} />
        <Row label="Input tokens"    value={m.input_tokens   as number} />
        <Row label="Output tokens"   value={m.output_tokens  as number} />
        <Row label="Total tokens"    value={m.total_tokens   as number} />
        <Row label="Estimated cost"  value={m.cost_usd !== undefined ? `$${(m.cost_usd as number).toFixed(8)}` : null} />
        <Row label="Groq latency"    value={m.groq_latency_ms !== undefined ? `${m.groq_latency_ms} ms` : null} />
        <Row label="Temperature"     value={m.temperature    as number} />
        <Row label="Max tokens"      value={m.max_tokens     as number} />
        <Row label="Response chars"  value={m.response_chars as number} />
      </>)}

      {stage.node === 'scan_output' && (<>
        <SectionTitle>PII Scan — Output</SectionTitle>
        <Row label="PII detected"    value={m.pii_detected ? 'YES — entities redacted' : 'Clean'} />
        <Row label="Response chars"  value={m.response_chars as number} />
        <Row label="Engine"          value={m.engine         as string} />
      </>)}

    </div>
  )
}
