import { useEffect, useState } from 'react'
import {
  RefreshCw, Cpu, Coins, BarChart2, Tag, Users, AlertOctagon, Database, AlertTriangle,
} from 'lucide-react'
import { fetchAnalytics, type AnalyticsSummary } from '../../api/analytics'

const NODE_COLORS: Record<string, string> = {
  rewrite:     'var(--ds-purple-500)',
  scan_input:  'var(--ds-orange-500)',
  retrieve:    'var(--ds-blue-500)',
  assemble:    'var(--ds-cyan-500)',
  generate:    'var(--ds-green-500)',
  scan_output: 'var(--ds-orange-600)',
}

const SCORE_FILL: Record<string, string> = {
  '0.0-0.3 (noise)':           'ds-fill-red',
  '0.3-0.5 (relevant)':        'ds-fill-orange',
  '0.5-0.7 (highly relevant)': 'ds-fill-blue',
  '0.7+ (exact match)':        'ds-fill-green',
}

export default function AnalyticsDashboard() {
  const [data, setData]           = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  async function load() {
    setLoading(true); setError('')
    try {
      setData(await fetchAnalytics())
      setLastRefresh(new Date())
    } catch {
      setError('Could not load analytics. Make sure the backend is running.')
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
          <h1 className="ds-page-title" style={{ marginBottom: 4 }}>Deep Analytics</h1>
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

        {/* ── LangGraph Node Latency ── */}
        <Section title="LangGraph Node Latency"
          icon={<Cpu size={13} color="var(--ds-blue-600)" />}
          iconBg="var(--ds-blue-50)">
          <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--ds-text-3)', margin: 0 }}>
              Time spent in each pipeline node per query
            </p>
            {Object.entries(data.node_latency).map(([node, stat]) => {
              const maxMs = Math.max(...Object.values(data.node_latency).map(s => s.avg_ms), 1)
              const color = NODE_COLORS[node] ?? 'var(--ds-text-4)'
              return (
                <div key={node} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="ds-dot" style={{ background: color }} />
                      <span style={{ fontSize: 13, color: 'var(--ds-text-2)', width: 96 }}>{node}</span>
                      <span style={{ fontSize: 12, color: 'var(--ds-text-3)' }}>{stat.calls} calls</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-1)' }}>
                        {stat.avg_ms.toFixed(0)} ms avg
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--ds-text-3)', marginLeft: 10 }}>
                        p95: {stat.p95_ms.toFixed(0)} ms
                      </span>
                    </div>
                  </div>
                  <div className="ds-progress ds-progress-xs">
                    <div className="ds-progress-fill"
                      style={{ width: `${(stat.avg_ms / maxMs) * 100}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        {/* ── Token Usage & Cost ── */}
        <Section title="Token Usage & Cost Estimate"
          icon={<Coins size={13} color="var(--ds-blue-600)" />}
          iconBg="var(--ds-blue-50)">
          <div className="ds-grid-4" style={{ marginBottom: 12 }}>
            <StatCard label="Total Tokens"  value={data.tokens.total.toLocaleString()}        sub="Groq LLM"            color="blue" />
            <StatCard label="Input Tokens"  value={data.tokens.total_input.toLocaleString()}   sub="prompt + context"   color="blue" />
            <StatCard label="Output Tokens" value={data.tokens.total_output.toLocaleString()}  sub="generated response" color="green" />
            <StatCard label="Avg / Query"   value={data.tokens.avg_per_query.toLocaleString()} sub="tokens"             color="orange" />
          </div>
          <div className="ds-card" style={{ padding: '20px 24px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-2)', marginBottom: 16 }}>
              Estimated Cost (USD)
            </p>
            <div className="ds-grid-4">
              <CostStat label="Groq Input"   value={data.tokens.cost_usd.groq_input}   rate="$0.59 / 1M tokens" />
              <CostStat label="Groq Output"  value={data.tokens.cost_usd.groq_output}  rate="$0.79 / 1M tokens" />
              <CostStat label="Cohere Embed" value={data.tokens.cost_usd.cohere_embed} rate="$0.10 / 1M tokens" />
              <div className="ds-stat-card">
                <div className="ds-stat-value ds-stat-blue">${data.tokens.cost_usd.total.toFixed(6)}</div>
                <div className="ds-stat-label">Total Cost</div>
                <div className="ds-stat-sub">{data.tokens.embed_calls} embed calls</div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Score Distribution ── */}
        <Section title="Retrieval Score Distribution"
          icon={<BarChart2 size={13} color="var(--ds-blue-600)" />}
          iconBg="var(--ds-blue-50)">
          <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--ds-text-3)', margin: 0 }}>
              Distribution of chunk similarity scores across all queries
            </p>
            {Object.entries(data.score_distribution)
              .filter(([k]) => k !== 'total')
              .map(([bucket, count]) => {
                const total = data.score_distribution['total'] || 1
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={bucket} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: 'var(--ds-text-2)' }}>{bucket}</span>
                      <span style={{ fontSize: 13, color: 'var(--ds-text-3)' }}>{count} chunks ({pct}%)</span>
                    </div>
                    <div className="ds-progress ds-progress-sm">
                      <div className={`ds-progress-fill ${SCORE_FILL[bucket] ?? 'ds-fill-blue'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            <p style={{ fontSize: 12, color: 'var(--ds-text-3)', marginTop: 4 }}>
              Total: {data.score_distribution['total']} chunk scores recorded
            </p>
          </div>
        </Section>

        {/* ── Query Categories ── */}
        <Section title="Query Categories"
          icon={<Tag size={13} color="var(--ds-blue-600)" />}
          iconBg="var(--ds-blue-50)">
          <div className="ds-grid-3">
            <CategoryCard label="On-Topic"   value={data.query_categories.on_topic}
              total={data.query_categories.total} fillClass="ds-fill-green"
              valueColor="var(--ds-green-600)"  description="Avg score ≥ 0.45" />
            <CategoryCard label="Borderline" value={data.query_categories.borderline}
              total={data.query_categories.total} fillClass="ds-fill-orange"
              valueColor="var(--ds-orange-600)" description="Avg score 0.30–0.45" />
            <CategoryCard label="Off-Topic"  value={data.query_categories.off_topic}
              total={data.query_categories.total} fillClass="ds-fill-red"
              valueColor="var(--ds-red-600)"   description="Avg score < 0.30" />
          </div>
        </Section>

        {/* ── Session Depth ── */}
        <Section title="Session Depth"
          icon={<Users size={13} color="var(--ds-green-600)" />}
          iconBg="var(--ds-green-100)">
          <div className="ds-grid-4">
            <StatCard label="Total Sessions" value={data.sessions.total}      sub="unique users"       color="blue" />
            <StatCard label="Avg Turns"      value={data.sessions.avg_turns}  sub="per session"        color="green" />
            <StatCard label="Max Turns"      value={data.sessions.max_turns}  sub="longest session"    color="orange" />
            <StatCard label="Multi-turn"     value={data.sessions.multi_turn}
              sub={`${data.sessions.single_turn} single-turn`} color="blue" />
          </div>
        </Section>

        {/* ── Error Taxonomy ── */}
        <Section title="Error Taxonomy"
          icon={<AlertOctagon size={13} color="var(--ds-red-600)" />}
          iconBg="var(--ds-red-100)">
          <div className="ds-card">
            {data.errors.total === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--ds-green-600)', fontWeight: 500, margin: 0 }}>
                No errors recorded this session ✓
              </p>
            ) : (
              <div className="ds-grid-4">
                <ErrorStat label="Rate Limit" value={data.errors.rate_limit}      desc="Cohere 429" />
                <ErrorStat label="LLM Error"  value={data.errors.llm_error}       desc="Groq failures" />
                <ErrorStat label="Retrieval"  value={data.errors.retrieval_error} desc="Qdrant errors" />
                <ErrorStat label="Other"      value={data.errors.other}           desc="Unclassified" />
              </div>
            )}
          </div>
        </Section>

        {/* ── Index Coverage ── */}
        <Section title="Index Coverage"
          icon={<Database size={13} color="var(--ds-blue-600)" />}
          iconBg="var(--ds-blue-50)">
          <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="ds-grid-3">
              <StatCard label="Total Vectors"     value={data.index_coverage.qdrant_total_vectors.toLocaleString()} sub="in Qdrant"            color="blue" />
              <StatCard label="Sources Retrieved" value={data.index_coverage.unique_sources_retrieved}              sub="unique files used"    color="green" />
              <StatCard label="Coverage Rate"     value={`${(data.index_coverage.coverage_rate * 100).toFixed(1)}%`} sub="files ever retrieved" color="orange" />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ds-text-3)', marginBottom: 6 }}>
                <span>Index utilisation</span>
                <span>{(data.index_coverage.coverage_rate * 100).toFixed(1)}%</span>
              </div>
              <div className="ds-progress ds-progress-sm">
                <div className="ds-progress-fill ds-fill-blue"
                  style={{ width: `${Math.min(data.index_coverage.coverage_rate * 100, 100)}%` }} />
              </div>
            </div>

            {data.index_coverage.sources_list.length > 0 && (
              <div>
                <p style={{ fontSize: 12, color: 'var(--ds-text-3)', marginBottom: 8 }}>Retrieved sources</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {data.index_coverage.sources_list.map((s, i) => (
                    <p key={i} style={{ fontSize: 13, color: 'var(--ds-text-2)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                      <span className="ds-dot ds-dot-green" />
                      {s}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

      </>}
    </div>
  )
}

/* ─── Shared sub-components ─── */

function Section({ title, icon, iconBg, children }: {
  title: string; icon: React.ReactNode; iconBg: string; children: React.ReactNode
}) {
  return (
    <div className="ds-section">
      <div className="ds-section-header">
        <div className="ds-section-icon" style={{ background: iconBg }}>{icon}</div>
        <span className="ds-section-title">{title}</span>
      </div>
      {children}
    </div>
  )
}

function StatCard({ label, value, sub, color }: {
  label: string; value: string | number; sub: string; color: 'blue' | 'green' | 'orange' | 'red'
}) {
  const colorMap = {
    blue:   'var(--ds-blue-600)',
    green:  'var(--ds-green-600)',
    orange: 'var(--ds-orange-600)',
    red:    'var(--ds-red-600)',
  }
  return (
    <div className="ds-stat-card">
      <div className="ds-stat-value" style={{ color: colorMap[color] }}>{value}</div>
      <div className="ds-stat-label">{label}</div>
      <div className="ds-stat-sub">{sub}</div>
    </div>
  )
}

function CostStat({ label, value, rate }: { label: string; value: number; rate: string }) {
  return (
    <div className="ds-stat-card">
      <div className="ds-stat-value" style={{ fontSize: 18, color: 'var(--ds-text-1)' }}>${value.toFixed(6)}</div>
      <div className="ds-stat-label">{label}</div>
      <div className="ds-stat-sub">{rate}</div>
    </div>
  )
}

function CategoryCard({ label, value, total, fillClass, valueColor, description }: {
  label: string; value: number; total: number
  fillClass: string; valueColor: string; description: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="ds-stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text-2)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: valueColor }}>{pct}%</span>
      </div>
      <div className="ds-stat-value" style={{ color: valueColor }}>{value}</div>
      <div className="ds-progress ds-progress-xs">
        <div className={`ds-progress-fill ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
      <p style={{ fontSize: 12, color: 'var(--ds-text-3)', margin: 0 }}>{description}</p>
    </div>
  )
}

function ErrorStat({ label, value, desc }: { label: string; value: number; desc: string }) {
  return (
    <div className="ds-stat-card">
      <div className="ds-stat-value" style={{ color: value > 0 ? 'var(--ds-red-600)' : 'var(--ds-green-600)' }}>
        {value}
      </div>
      <div className="ds-stat-label">{label}</div>
      <div className="ds-stat-sub">{desc}</div>
    </div>
  )
}
