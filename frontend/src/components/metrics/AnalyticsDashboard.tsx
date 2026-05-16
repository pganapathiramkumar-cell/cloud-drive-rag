import { useEffect, useState } from 'react'
import {
  RefreshCw, Cpu, Coins, BarChart2, Tag, Users, AlertOctagon, Database
} from 'lucide-react'
import { fetchAnalytics, type AnalyticsSummary } from '../../api/analytics'

const NODE_COLORS: Record<string, string> = {
  rewrite:     'bg-purple-500',
  scan_input:  'bg-yellow-500',
  retrieve:    'bg-blue-500',
  assemble:    'bg-cyan-500',
  generate:    'bg-green-500',
  scan_output: 'bg-orange-500',
}

const SCORE_COLORS: Record<string, string> = {
  '0.0-0.3 (noise)':          'bg-red-500',
  '0.3-0.5 (relevant)':       'bg-yellow-500',
  '0.5-0.7 (highly relevant)': 'bg-blue-500',
  '0.7+ (exact match)':       'bg-green-500',
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  async function load() {
    setLoading(true)
    setError('')
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
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  if (error) return (
    <div className="mx-auto max-w-4xl p-6">
      <p className="text-red-400 text-sm">{error}</p>
    </div>
  )

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">Deep Analytics</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {lastRefresh ? `Last updated ${lastRefresh.toLocaleTimeString()}` : 'Loading…'}
            {' · '}Auto-refreshes every 30s
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 disabled:opacity-50">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {data && <>

        {/* ── LangGraph Node Latency ── */}
        <Section title="LangGraph Node Latency" icon={<Cpu size={15} />}>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
            <p className="text-xs text-gray-500">Time spent in each pipeline node per query</p>
            {Object.entries(data.node_latency).map(([node, stat]) => {
              const maxMs = Math.max(...Object.values(data.node_latency).map(s => s.avg_ms), 1)
              return (
                <div key={node} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${NODE_COLORS[node] ?? 'bg-gray-500'}`} />
                      <span className="text-xs text-gray-300 w-24">{node}</span>
                      <span className="text-xs text-gray-500">{stat.calls} calls</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-200 font-medium">{stat.avg_ms.toFixed(0)}ms avg</span>
                      <span className="text-xs text-gray-600 ml-2">p95: {stat.p95_ms.toFixed(0)}ms</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${NODE_COLORS[node] ?? 'bg-gray-500'}`}
                      style={{ width: `${(stat.avg_ms / maxMs) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        {/* ── Token Usage & Cost ── */}
        <Section title="Token Usage & Cost Estimate" icon={<Coins size={15} />}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Tokens" value={data.tokens.total.toLocaleString()} sub="Groq LLM" color="blue" />
            <StatCard label="Input Tokens" value={data.tokens.total_input.toLocaleString()} sub="prompt + context" color="blue" />
            <StatCard label="Output Tokens" value={data.tokens.total_output.toLocaleString()} sub="generated response" color="green" />
            <StatCard label="Avg / Query" value={`${data.tokens.avg_per_query.toLocaleString()}`} sub="tokens" color="yellow" />
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 mt-3">
            <p className="text-xs font-medium text-gray-300 mb-3">Estimated Cost (USD)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <CostStat label="Groq Input" value={data.tokens.cost_usd.groq_input} rate="$0.59/1M tokens" />
              <CostStat label="Groq Output" value={data.tokens.cost_usd.groq_output} rate="$0.79/1M tokens" />
              <CostStat label="Cohere Embed" value={data.tokens.cost_usd.cohere_embed} rate="$0.10/1M tokens" />
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
                <div className="text-lg font-bold text-blue-400">${data.tokens.cost_usd.total.toFixed(6)}</div>
                <div className="text-xs text-gray-400">Total Cost</div>
                <div className="text-xs text-gray-600">{data.tokens.embed_calls} embed calls</div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Score Distribution ── */}
        <Section title="Retrieval Score Distribution" icon={<BarChart2 size={15} />}>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
            <p className="text-xs text-gray-500">Distribution of chunk similarity scores across all queries</p>
            {Object.entries(data.score_distribution)
              .filter(([k]) => k !== 'total')
              .map(([bucket, count]) => {
                const total = data.score_distribution['total'] || 1
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={bucket} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-300">{bucket}</span>
                      <span className="text-xs text-gray-400">{count} chunks ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${SCORE_COLORS[bucket] ?? 'bg-gray-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            <p className="text-xs text-gray-600 pt-1">
              Total: {data.score_distribution['total']} chunk scores recorded
            </p>
          </div>
        </Section>

        {/* ── Query Categories ── */}
        <Section title="Query Categories" icon={<Tag size={15} />}>
          <div className="grid grid-cols-3 gap-3">
            <CategoryCard label="On-Topic" value={data.query_categories.on_topic}
              total={data.query_categories.total} color="text-green-400" bg="bg-green-500"
              description="Avg score ≥ 0.45" />
            <CategoryCard label="Borderline" value={data.query_categories.borderline}
              total={data.query_categories.total} color="text-yellow-400" bg="bg-yellow-500"
              description="Avg score 0.30-0.45" />
            <CategoryCard label="Off-Topic" value={data.query_categories.off_topic}
              total={data.query_categories.total} color="text-red-400" bg="bg-red-500"
              description="Avg score < 0.30" />
          </div>
        </Section>

        {/* ── Session Depth ── */}
        <Section title="Session Depth" icon={<Users size={15} />}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Sessions" value={data.sessions.total} sub="unique users" color="blue" />
            <StatCard label="Avg Turns" value={data.sessions.avg_turns} sub="per session" color="green" />
            <StatCard label="Max Turns" value={data.sessions.max_turns} sub="longest session" color="yellow" />
            <StatCard label="Multi-turn" value={data.sessions.multi_turn} sub={`${data.sessions.single_turn} single-turn`} color="blue" />
          </div>
        </Section>

        {/* ── Error Taxonomy ── */}
        <Section title="Error Taxonomy" icon={<AlertOctagon size={15} />}>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            {data.errors.total === 0 ? (
              <p className="text-xs text-green-400">No errors recorded this session ✓</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ErrorStat label="Rate Limit" value={data.errors.rate_limit} desc="Cohere 429" />
                <ErrorStat label="LLM Error" value={data.errors.llm_error} desc="Groq failures" />
                <ErrorStat label="Retrieval" value={data.errors.retrieval_error} desc="Qdrant errors" />
                <ErrorStat label="Other" value={data.errors.other} desc="Unclassified" />
              </div>
            )}
          </div>
        </Section>

        {/* ── Index Coverage ── */}
        <Section title="Index Coverage" icon={<Database size={15} />}>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total Vectors" value={data.index_coverage.qdrant_total_vectors.toLocaleString()} sub="in Qdrant" color="blue" />
              <StatCard label="Sources Retrieved" value={data.index_coverage.unique_sources_retrieved} sub="unique files used" color="green" />
              <StatCard label="Coverage Rate" value={`${(data.index_coverage.coverage_rate * 100).toFixed(1)}%`} sub="files ever retrieved" color="yellow" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Index utilisation</span>
                <span>{(data.index_coverage.coverage_rate * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${Math.min(data.index_coverage.coverage_rate * 100, 100)}%` }}
                />
              </div>
            </div>
            {data.index_coverage.sources_list.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Retrieved sources</p>
                <div className="space-y-1">
                  {data.index_coverage.sources_list.map((s, i) => (
                    <p key={i} className="text-xs text-gray-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
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

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-300">{icon}{title}</div>
      {children}
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  const c = { blue: 'text-blue-400', green: 'text-green-400', yellow: 'text-yellow-400', red: 'text-red-400' }
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className={`text-2xl font-bold ${c[color as keyof typeof c]}`}>{value}</div>
      <div className="text-xs text-gray-300 mt-1">{label}</div>
      <div className="text-xs text-gray-600 mt-0.5">{sub}</div>
    </div>
  )
}

function CostStat({ label, value, rate }: { label: string; value: number; rate: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-3">
      <div className="text-lg font-bold text-gray-200">${value.toFixed(6)}</div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-xs text-gray-600">{rate}</div>
    </div>
  )
}

function CategoryCard({ label, value, total, color, bg, description }: {
  label: string; value: number; total: number; color: string; bg: string; description: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-2">
      <div className="flex justify-between">
        <span className="text-xs text-gray-400">{label}</span>
        <span className={`text-xs font-medium ${color}`}>{pct}%</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="w-full bg-gray-800 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${bg}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-600">{description}</p>
    </div>
  )
}

function ErrorStat({ label, value, desc }: { label: string; value: number; desc: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-3">
      <div className={`text-2xl font-bold ${value > 0 ? 'text-red-400' : 'text-green-400'}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-xs text-gray-600">{desc}</div>
    </div>
  )
}
