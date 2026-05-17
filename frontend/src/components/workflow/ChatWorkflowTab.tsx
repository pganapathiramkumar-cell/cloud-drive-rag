import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, GraduationCap, RotateCcw, Bot, FileText } from 'lucide-react'
import { useWorkflowStore } from '../../stores/workflowStore'
import { streamWorkflowQuery } from '../../api/workflow'
import PipelineFlow from './PipelineFlow'
import TraceHeader from './TraceHeader'
import MetricsSidebar from './MetricsSidebar'
import { nanoid } from '../chat/nanoid'

export default function ChatWorkflowTab() {
  const [query, setQuery]       = useState('')
  const store                   = useWorkflowStore()
  const sessionId               = useRef(nanoid())
  const answerRef               = useRef<HTMLDivElement>(null)
  const isRunning               = store.trace?.status === 'running'

  useEffect(() => {
    if (answerRef.current && store.answer.tokens) {
      answerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [store.answer.tokens])

  async function handleSubmit() {
    const q = query.trim()
    if (!q || isRunning) return

    store.initTrace(q, sessionId.current)
    setQuery('')

    try {
      await streamWorkflowQuery(q, sessionId.current, {
        onTraceStart: (traceId, runtimeVersions) => store.setTraceStart(traceId, runtimeVersions),

        onStage: (stage) => store.updateStage(stage),

        onToken: (content) => store.appendToken(content),

        onDone: (payload) => store.finalize({
          citations:   payload.citations,
          piiDetected: payload.piiDetected,
          blocked:     payload.blocked,
          blockReason: payload.blockReason,
          totalMs:     payload.totalMs,
        }),

        onError: (msg) => {
          store.setTraceStatus('error')
          store.appendToken(`\n\n[Error: ${msg}]`)
        },
      })
    } catch (err) {
      store.setTraceStatus('error')
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--ds-bg-3)' }}>

      {/* ── Tab header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 24px',
        background: 'var(--ds-bg)', borderBottom: '1px solid var(--ds-divider)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-text-1)' }}>ChatWorkflow</span>
          <span className="ds-badge ds-badge-info" style={{ fontSize: 10 }}>Observability</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Learning mode toggle */}
          <button
            onClick={store.toggleLearning}
            className={`ds-btn ds-btn-sm ${store.learningMode ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
            title="Toggle learning mode explanations on each node"
          >
            <GraduationCap size={13} />
            Learning Mode
          </button>
          {store.trace && (
            <button onClick={store.reset} className="ds-btn ds-btn-ghost ds-btn-sm">
              <RotateCcw size={13} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Query input ── */}
      <div style={{
        padding: '12px 24px',
        background: 'var(--ds-bg)', borderBottom: '1px solid var(--ds-divider)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            rows={2}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            disabled={isRunning}
            placeholder="Ask a question — watch the full pipeline execute in real time…"
            className="ds-input ds-textarea"
            style={{ flex: 1, fontSize: 14, lineHeight: 1.6, paddingTop: 10, paddingBottom: 10 }}
          />
          <button
            onClick={handleSubmit}
            disabled={!query.trim() || isRunning}
            className="ds-btn ds-btn-primary"
            style={{ padding: '10px 16px', borderRadius: 10, alignSelf: 'flex-end', flexShrink: 0 }}
          >
            {isRunning
              ? <Loader2 size={17} style={{ animation: 'ds-spin 0.75s linear infinite' }} />
              : <Send size={17} />
            }
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--ds-text-4)', marginTop: 6 }}>
          Enter to send · Shift+Enter for newline · Every stage executes live on the right
        </p>
      </div>

      {/* ── Main body ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {!store.trace ? (
          /* Empty state */
          <div className="ds-empty" style={{ height: '100%' }}>
            <div className="ds-empty-icon">
              <Bot size={24} />
            </div>
            <p className="ds-empty-title">RAG Pipeline Observer</p>
            <p className="ds-empty-sub">
              Submit a query above to watch every stage of the LangGraph pipeline execute in real time —
              from query rewriting through vector retrieval, LLM generation, and PII scanning.
            </p>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: 0 }}>

            {/* ── Left: Pipeline + Answer ── */}
            <div style={{ flex: '0 0 60%', overflowY: 'auto', padding: '20px 20px 20px 24px', borderRight: '1px solid var(--ds-divider)' }}>
              <TraceHeader trace={store.trace} />
              <PipelineFlow />

              {/* Answer area */}
              {(store.answer.tokens || store.trace.status === 'completed') && (
                <div style={{ marginTop: 20 }} ref={answerRef}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'var(--ds-bg-3)', border: '1px solid var(--ds-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Bot size={11} color="var(--ds-text-3)" />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Answer
                    </span>
                  </div>
                  <div className="ds-chat-bubble-ai" style={{ maxWidth: '100%' }}>
                    {store.answer.tokens || '…'}
                    {isRunning && <span className="ds-streaming-cursor" />}
                  </div>

                  {/* Citations */}
                  {store.answer.citations.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ds-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                        Sources
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                        {store.answer.citations.map((c, i) => (
                          <a key={i} href={c.url} target="_blank" rel="noopener noreferrer"
                            className="ds-card ds-card-hover"
                            style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', textDecoration: 'none', borderRadius: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <FileText size={11} color="var(--ds-blue-600)" />
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.title}
                              </span>
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--ds-text-3)', lineHeight: 1.5, margin: 0,
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {c.excerpt}
                            </p>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Right: Metrics sidebar ── */}
            <div style={{ flex: '0 0 40%', overflowY: 'auto', padding: '20px 24px 20px 20px' }}>
              <MetricsSidebar />
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
