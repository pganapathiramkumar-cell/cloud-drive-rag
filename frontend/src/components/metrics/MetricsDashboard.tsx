import { useEffect, useState } from 'react'
import {
  RefreshCw, Database, MessageSquare, Zap, Target,
  AlertTriangle, CheckCircle2, Info, FileText, Clock,
} from 'lucide-react'
import { fetchMetrics, type MetricsSummary } from '../../api/metrics'

/* ─── Reusable sub-components ─── */

function Section({ title, icon, iconBg, children }: {
  title: string; icon: React.ReactNode; iconBg: string; children: React.ReactNode
}) {
  return (
    <div className="ds-section">
      <div className="ds-section-header">
        <div className="ds-section-icon" style={{ background: iconBg }}>
          {icon}
        </div>
        <span className="ds-section-title">{title}</span>
      </div>
      {children}
    </div>
  )
}

type StatColor = 'blue' | 'green' | 'red' | 'orange'

function StatCard({ label, value, sub, color }: {
  label: string; value: string | number; sub: string; color: StatColor
}) {
  const colorMap: Record<StatColor, string> = {
    blue:   'var(--ds-blue-600)',
    green:  'var(--ds-green-600)',
    red:    'var(--ds-red-600)',
    orange: 'var(--ds-orange-600)',
  }
  return (
    <div className="ds-stat-card">
      <div className="ds-stat-value" style={{ color: colorMap[color] }}>{value}</div>
      <div className="ds-stat-label">{label}</div>
      <div className="ds-stat-sub">{sub}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="ds-mini-stat">
      <span className="ds-mini-label">{label}</span>
      <span className="ds-mini-value">{value}</span>
    </div>
  )
}

function QualityCard({ label, value, description, good, invert = false }: {
  label: string; value: number; description: string; good: number; invert?: boolean
}) {
  const isGood  = invert ? value <= good : value >= good
  const pctVal  = Math.round(value * 100)
  const color   = isGood ? 'var(--ds-green-600)' : 'var(--ds-orange-600)'
  const fillCls = isGood ? 'ds-fill-green' : 'ds-fill-orange'

  return (
    <div className="ds-stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text-2)' }}>{label}</span>
        {isGood
          ? <CheckCircle2 size={14} color="var(--ds-green-600)" />
          : <AlertTriangle size={14} color="var(--ds-orange-600)" />
        }
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, letterSpacing: '-0.5px' }}>{pctVal}%</div>
      <div className="ds-progress ds-progress-sm">
        <div className={`ds-progress-fill ${fillCls}`} style={{ width: `${Math.min(pctVal, 100)}%` }} />
      </div>
      <p style={{ fontSize: 12, color: 'var(--ds-text-3)', margin: 0 }}>{description}</p>
    </div>
  )
}

function MetricRow({ label, desc }: { label: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--ds-divider)' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-2)', width: 140, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--ds-text-3)', lineHeight: 1.5 }}>{desc}</span>
    </div>
  )
}

function pct(rate: number) { return `${(rate * 100).toFixed(1)}%` }

/* ─── Main component ─── */

export default function MetricsDashboard() {
  const [data, setData]           = useState<MetricsSummary | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  async function load() {
    setLoading(true); setError('')
    try {
      setData(await fetchMetrics())
      setLastRefresh(new Date())
    } catch {
      setError('Could not load metrics. Make sure the backend is running.')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [])

  if (error) return (
    <div className="ds-container">
      <div className="ds-alert ds-alert-error">
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        {error}
      </div>
    </div>
  )

  return (
    <div className="ds-container">

      {/* Page header */}
      <div className="ds-page-actions" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="ds-page-title" style={{ marginBottom: 4 }}>App Metrics</h1>
          <p style={{ fontSize: 13, color: 'var(--ds-text-3)' }}>
            {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Loading…'}
            {' · '}Auto-refreshes every 30 s
          </p>
        </div>
        <button onClick={load} disabled={loading} className="ds-btn ds-btn-secondary ds-btn-sm">
          <RefreshCw size={12} style={loading ? { animation: 'ds-spin 0.75s linear infinite' } : {}} />
          Refresh
        </button>
      </div>

      {data && <>

        {/* ── Documents & Indexing ── */}
        <Section title="Documents & Indexing" iconBg="var(--ds-blue-50)"
          icon={<Database size={13} color="var(--ds-blue-600)" />}>
          <div className="ds-grid-4" style={{ marginBottom: 12 }}>
            <StatCard label="Vectors in Qdrant"  value={data.ingestion.qdrant_vectors ?? '—'} sub={data.ingestion.qdrant_status} color="blue" />
            <StatCard label="Total Chunks"        value={data.ingestion.total_chunks}           sub="across all sources"           color="blue" />
            <StatCard label="Files Indexed"       value={data.ingestion.files_indexed + data.ingestion.uploads_indexed} sub="Drive + uploads" color="green" />
            <StatCard label="Files Skipped"       value={data.ingestion.files_skipped}          sub="unreadable files"             color="orange" />
          </div>
          <div className="ds-grid-2">
            <MiniStat label="Drive sync chunks" value={data.ingestion.chunks_stored} />
            <MiniStat label="Upload chunks"     value={data.ingestion.upload_chunks} />
          </div>
        </Section>

        {/* ── Query Usage ── */}
        <Section title="Query Usage" iconBg="var(--ds-blue-50)"
          icon={<MessageSquare size={13} color="var(--ds-blue-600)" />}>
          <div className="ds-grid-4" style={{ marginBottom: 12 }}>
            <StatCard label="Total Queries"  value={data.queries.total}      sub="since last restart"  color="blue" />
            <StatCard label="Successful"     value={data.queries.successful}  sub={pct(data.queries.success_rate)} color="green" />
            <StatCard label="Failed"         value={data.queries.failed}      sub="errors"              color="red" />
            <StatCard label="Blocked"        value={data.queries.blocked}     sub="PII / guardrails"    color="orange" />
          </div>
          <div className="ds-grid-4">
            <MiniStat label="Unique sessions"    value={data.queries.unique_sessions} />
            <MiniStat label="PII detected"       value={`${data.queries.pii_detected} (${pct(data.queries.pii_rate)})`} />
            <MiniStat label="Avg response"       value={`${data.queries.avg_response_chars} chars`} />
            <MiniStat label="Empty context rate" value={pct(data.rag_quality.empty_context_rate)} />
          </div>
        </Section>

        {/* ── Latency ── */}
        <Section title="Latency" iconBg="var(--ds-green-100)"
          icon={<Zap size={13} color="var(--ds-green-600)" />}>
          <div className="ds-grid-3" style={{ marginBottom: 12 }}>
            <StatCard label="Avg Response" value={`${data.latency.avg_ms.toFixed(0)} ms`} sub="end-to-end"      color="blue" />
            <StatCard label="P50 Median"   value={`${data.latency.p50_ms.toFixed(0)} ms`} sub="50th percentile" color="green" />
            <StatCard label="P95"          value={`${data.latency.p95_ms.toFixed(0)} ms`} sub="95th percentile" color="orange" />
          </div>
          <div className="ds-grid-2">
            <MiniStat label="Avg chunks retrieved"  value={data.retrieval.avg_chunks_per_query.toFixed(1)} />
            <MiniStat label="Avg similarity score"  value={data.retrieval.avg_similarity_score.toFixed(3)} />
          </div>
        </Section>

        {/* ── Top Sources ── */}
        {data.retrieval.top_sources.length > 0 && (
          <Section title="Most Retrieved Sources" iconBg="var(--ds-blue-50)"
            icon={<FileText size={13} color="var(--ds-blue-600)" />}>
            <div className="ds-card-flush">
              <div style={{ padding: '4px 0' }}>
                {data.retrieval.top_sources.map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '10px 20px',
                    borderBottom: i < data.retrieval.top_sources.length - 1 ? '1px solid var(--ds-divider)' : 'none',
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--ds-text-4)', width: 18, textAlign: 'right', flexShrink: 0, fontWeight: 600 }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, color: 'var(--ds-text-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.source}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--ds-text-3)', flexShrink: 0, marginLeft: 12, fontWeight: 500 }}>
                          {s.hits} hits
                        </span>
                      </div>
                      <div className="ds-progress ds-progress-xs">
                        <div className="ds-progress-fill ds-fill-blue"
                          style={{ width: `${(s.hits / data.retrieval.top_sources[0].hits) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* ── Recent Queries ── */}
        {data.recent_queries.length > 0 && (
          <Section title="Recent Queries" iconBg="var(--ds-blue-50)"
            icon={<Clock size={13} color="var(--ds-blue-600)" />}>
            <div className="ds-table-wrap">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Query</th>
                    <th className="ds-th-right">Chunks</th>
                    <th className="ds-th-right">Score</th>
                    <th className="ds-th-right">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_queries.map((q, i) => (
                    <tr key={i}>
                      <td style={{ maxWidth: 340 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          {q.success
                            ? <CheckCircle2 size={11} color="var(--ds-green-600)" style={{ flexShrink: 0 }} />
                            : <AlertTriangle size={11} color="var(--ds-red-500)" style={{ flexShrink: 0 }} />
                          }
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ds-text-1)', fontWeight: 500 }}>
                            {q.query || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="ds-td-right">{q.chunks}</td>
                      <td className="ds-td-right">{q.score.toFixed(3)}</td>
                      <td className="ds-td-right">{q.latency_ms.toFixed(0)} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ── RAG Quality ── */}
        <Section title="RAG Quality Metrics" iconBg="var(--ds-orange-100)"
          icon={<Target size={13} color="var(--ds-orange-600)" />}>
          <div className="ds-alert ds-alert-info" style={{ marginBottom: 16 }}>
            <Info size={13} style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
              Approximations based on retrieval similarity scores — not ground-truth labels.
              For precise evaluation, use <strong>RAGAS</strong> with labelled Q&amp;A pairs.
            </p>
          </div>

          <div className="ds-grid-3" style={{ marginBottom: 16 }}>
            <QualityCard label="Context Precision" value={data.rag_quality.context_precision} good={0.7}
              description="Avg relevance score of retrieved chunks" />
            <QualityCard label="Context Recall"    value={data.rag_quality.context_recall}    good={0.7}
              description="% queries retrieving relevant chunks" />
            <QualityCard label="F1 Score"          value={data.rag_quality.f1_score}           good={0.7}
              description="Harmonic mean of precision & recall" />
            <QualityCard label="Answer Rate"        value={data.rag_quality.answer_rate}       good={0.9}
              description="% queries that got a successful answer" />
            <QualityCard label="Empty Context"      value={data.rag_quality.empty_context_rate} good={0.1} invert
              description="% queries with no relevant docs found" />
          </div>

          <div className="ds-card-flush">
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-2)', marginBottom: 8 }}>Metric Definitions</p>
              {[
                ['Context Precision', 'How relevant are the chunks retrieved? Higher = more relevant results.'],
                ['Context Recall',    'Do we find relevant chunks when they exist? Higher = better coverage.'],
                ['F1 Score',          'Balance between precision and recall. > 0.7 is good for RAG.'],
                ['Answer Rate',       '% of queries successfully answered. Should be close to 1.0.'],
                ['Empty Context',     'Queries with no matching documents. Lower is better.'],
              ].map(([l, d]) => <MetricRow key={l} label={l} desc={d} />)}
            </div>
          </div>
        </Section>

      </>}
    </div>
  )
}
