import { useWorkflowStore } from '../../stores/workflowStore'

const NODE_ORDER = ['rewrite', 'scan_input', 'retrieve', 'assemble', 'generate', 'scan_output']
const NODE_LABELS: Record<string, string> = {
  rewrite:     'Rewrite',
  scan_input:  'Scan In',
  retrieve:    'Retrieve',
  assemble:    'Assemble',
  generate:    'Generate',
  scan_output: 'Scan Out',
}
const NODE_COLORS: Record<string, string> = {
  rewrite:     'var(--ds-purple-500)',
  scan_input:  'var(--ds-orange-500)',
  retrieve:    'var(--ds-blue-500)',
  assemble:    'var(--ds-cyan-500)',
  generate:    'var(--ds-green-500)',
  scan_output: 'var(--ds-orange-600)',
}

export default function MetricsSidebar() {
  const { stages, trace, answer } = useWorkflowStore()

  const completedStages = stages.filter(s => s.durationMs !== null)
  const maxDuration     = Math.max(...completedStages.map(s => s.durationMs ?? 0), 1)

  const retrieveStage  = stages.find(s => s.node === 'retrieve')
  const generateStage  = stages.find(s => s.node === 'generate')
  const retrieveMeta   = retrieveStage?.metadata as Record<string, unknown> | undefined
  const generateMeta   = generateStage?.metadata as Record<string, unknown> | undefined

  const totalTokens = ((generateMeta?.input_tokens as number) ?? 0) + ((generateMeta?.output_tokens as number) ?? 0)

  if (!trace) {
    return (
      <div className="ds-card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="ds-empty" style={{ padding: '24px 16px' }}>
          <p className="ds-empty-title" style={{ fontSize: 14 }}>Trace Summary</p>
          <p className="ds-empty-sub" style={{ fontSize: 12 }}>Submit a query to see live metrics</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Total time ── */}
      <div className="ds-card" style={{ padding: '16px' }}>
        <p className="ds-section-title" style={{ marginBottom: 10 }}>Trace Summary</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--ds-text-3)' }}>Total time</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--ds-text-1)', fontVariantNumeric: 'tabular-nums' }}>
            {trace.totalMs !== null
              ? (trace.totalMs < 1000 ? `${trace.totalMs} ms` : `${(trace.totalMs / 1000).toFixed(2)} s`)
              : '—'}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ds-text-4)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {trace.traceId || '…'}
        </div>
      </div>

      {/* ── Tokens & Cost ── */}
      {totalTokens > 0 && (
        <div className="ds-card" style={{ padding: '16px' }}>
          <p className="ds-section-title" style={{ marginBottom: 10 }}>Tokens & Cost</p>
          {[
            { label: 'Input tokens',  value: generateMeta?.input_tokens  as number },
            { label: 'Output tokens', value: generateMeta?.output_tokens as number },
            { label: 'Total tokens',  value: totalTokens },
          ].map(({ label, value }) => value ? (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--ds-divider)' }}>
              <span style={{ fontSize: 12, color: 'var(--ds-text-3)' }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-1)', fontVariantNumeric: 'tabular-nums' }}>
                {(value as number).toLocaleString()}
              </span>
            </div>
          ) : null)}
          {generateMeta?.cost_usd !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 0' }}>
              <span style={{ fontSize: 12, color: 'var(--ds-text-3)' }}>Est. cost</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ds-green-600)' }}>
                ${(generateMeta.cost_usd as number).toFixed(6)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Retrieval ── */}
      {retrieveMeta && (retrieveMeta.chunks_retrieved as number) > 0 && (
        <div className="ds-card" style={{ padding: '16px' }}>
          <p className="ds-section-title" style={{ marginBottom: 10 }}>Retrieval</p>
          {[
            { label: 'Chunks',     value: retrieveMeta.chunks_retrieved },
            { label: 'Avg score',  value: (retrieveMeta.avg_score as number)?.toFixed(4) },
            { label: 'Top score',  value: (retrieveMeta.top_score as number)?.toFixed(4) },
            { label: 'Dimensions', value: retrieveMeta.embedding_dims },
            { label: 'Collection', value: retrieveMeta.collection },
          ].map(({ label, value }) => value !== undefined && value !== null ? (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--ds-divider)' }}>
              <span style={{ fontSize: 12, color: 'var(--ds-text-3)' }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-1)', fontFamily: label === 'Collection' ? 'monospace' : undefined }}>
                {String(value)}
              </span>
            </div>
          ) : null)}
        </div>
      )}

      {/* ── Latency breakdown ── */}
      {completedStages.length > 0 && (
        <div className="ds-card" style={{ padding: '16px' }}>
          <p className="ds-section-title" style={{ marginBottom: 12 }}>Latency Breakdown</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {NODE_ORDER.map(node => {
              const s = stages.find(st => st.node === node)
              if (!s || s.durationMs === null) return null
              const pct = Math.round((s.durationMs / maxDuration) * 100)
              const color = NODE_COLORS[node] ?? 'var(--ds-blue-500)'
              return (
                <div key={node}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: 'var(--ds-text-3)', width: 72 }}>{NODE_LABELS[node]}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-2)', fontVariantNumeric: 'tabular-nums' }}>
                      {s.durationMs < 1000 ? `${s.durationMs} ms` : `${(s.durationMs / 1000).toFixed(2)} s`}
                    </span>
                  </div>
                  <div className="ds-progress ds-progress-xs">
                    <div className="ds-progress-fill" style={{ width: `${pct}%`, background: color, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── PII / blocked ── */}
      {answer.piiDetected && (
        <div className="ds-alert ds-alert-warning" style={{ padding: '10px 12px', fontSize: 12 }}>
          PII detected and {answer.blocked ? 'blocked' : 'redacted'}.
          {answer.blockReason && <span> Reason: {answer.blockReason}</span>}
        </div>
      )}

    </div>
  )
}
