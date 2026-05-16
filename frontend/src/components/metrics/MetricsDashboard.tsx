import { useEffect, useState } from 'react'
import { RefreshCw, Database, MessageSquare, Zap, Target, AlertTriangle, CheckCircle2, Info, FileText, Clock } from 'lucide-react'
import { fetchMetrics, type MetricsSummary } from '../../api/metrics'

export default function MetricsDashboard() {
  const [data, setData] = useState<MetricsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const m = await fetchMetrics()
      setData(m)
      setLastRefresh(new Date())
    } catch {
      setError('Could not load metrics. Make sure the backend is running.')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000) // auto-refresh every 30s
    return () => clearInterval(interval)
  }, [])

  if (error) return (
    <div className="mx-auto max-w-4xl p-6">
      <p className="text-red-400 text-sm">{error}</p>
    </div>
  )

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">App Metrics</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {lastRefresh ? `Last updated ${lastRefresh.toLocaleTimeString()}` : 'Loading…'}
            {' · '}Auto-refreshes every 30s
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {data && <>
        {/* ── Document / Ingestion ── */}
        <Section title="Documents & Indexing" icon={<Database size={15} />}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Vectors in Qdrant"
              value={data.ingestion.qdrant_vectors ?? '—'}
              sub={data.ingestion.qdrant_status}
              color="blue"
            />
            <StatCard label="Total Chunks" value={data.ingestion.total_chunks} sub="across all sources" color="blue" />
            <StatCard label="Files Indexed" value={data.ingestion.files_indexed + data.ingestion.uploads_indexed} sub="Drive + uploads" color="green" />
            <StatCard label="Files Skipped" value={data.ingestion.files_skipped} sub="unreadable files" color="yellow" />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <MiniStat label="Drive sync chunks" value={data.ingestion.chunks_stored} />
            <MiniStat label="Upload chunks" value={data.ingestion.upload_chunks} />
          </div>
        </Section>

        {/* ── Query Usage ── */}
        <Section title="Query Usage" icon={<MessageSquare size={15} />}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Queries" value={data.queries.total} sub="since last restart" color="blue" />
            <StatCard label="Successful" value={data.queries.successful} sub={pct(data.queries.success_rate)} color="green" />
            <StatCard label="Failed" value={data.queries.failed} sub="errors" color="red" />
            <StatCard label="Blocked" value={data.queries.blocked} sub="PII / guardrails" color="yellow" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <MiniStat label="Unique sessions" value={data.queries.unique_sessions} />
            <MiniStat label="PII detected" value={`${data.queries.pii_detected} (${pct(data.queries.pii_rate)})`} />
            <MiniStat label="Avg response length" value={`${data.queries.avg_response_chars} chars`} />
            <MiniStat label="Empty context rate" value={pct(data.rag_quality.empty_context_rate)} />
          </div>
        </Section>

        {/* ── Latency ── */}
        <Section title="Latency" icon={<Zap size={15} />}>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Avg Response" value={`${data.latency.avg_ms.toFixed(0)} ms`} sub="end-to-end" color="blue" />
            <StatCard label="P50 (Median)" value={`${data.latency.p50_ms.toFixed(0)} ms`} sub="50th percentile" color="green" />
            <StatCard label="P95" value={`${data.latency.p95_ms.toFixed(0)} ms`} sub="95th percentile" color="yellow" />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <MiniStat label="Avg chunks retrieved" value={data.retrieval.avg_chunks_per_query.toFixed(1)} />
            <MiniStat label="Avg similarity score" value={data.retrieval.avg_similarity_score.toFixed(3)} />
          </div>
        </Section>

        {/* ── Top Sources ── */}
        {data.retrieval.top_sources.length > 0 && (
          <Section title="Most Retrieved Sources" icon={<FileText size={15} />}>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-2">
              {data.retrieval.top_sources.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-4 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs text-gray-300 truncate">{s.source}</span>
                      <span className="text-xs text-blue-400 shrink-0 ml-2">{s.hits} hits</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full"
                        style={{ width: `${(s.hits / data.retrieval.top_sources[0].hits) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Recent Queries ── */}
        {data.recent_queries.length > 0 && (
          <Section title="Recent Queries" icon={<Clock size={15} />}>
            <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-gray-500 font-normal px-4 py-2">Query</th>
                    <th className="text-right text-gray-500 font-normal px-3 py-2">Chunks</th>
                    <th className="text-right text-gray-500 font-normal px-3 py-2">Score</th>
                    <th className="text-right text-gray-500 font-normal px-4 py-2">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_queries.map((q, i) => (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-2 text-gray-300 max-w-xs truncate">
                        <div className="flex items-center gap-1.5">
                          {q.success
                            ? <CheckCircle2 size={11} className="text-green-400 shrink-0" />
                            : <AlertTriangle size={11} className="text-red-400 shrink-0" />
                          }
                          {q.query || '—'}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-400">{q.chunks}</td>
                      <td className="px-3 py-2 text-right text-gray-400">{q.score.toFixed(3)}</td>
                      <td className="px-4 py-2 text-right text-gray-400">{q.latency_ms.toFixed(0)}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ── RAG Quality ── */}
        <Section title="RAG Quality Metrics" icon={<Target size={15} />}>
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
            <Info size={13} className="text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-400">
              These are <span className="text-gray-200">approximations</span> based on retrieval similarity scores — not ground-truth labels.
              For precise evaluation, use RAGAS with labelled Q&A pairs.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <QualityCard
              label="Context Precision"
              value={data.rag_quality.context_precision}
              description="Avg relevance score of retrieved chunks"
              good={0.7}
            />
            <QualityCard
              label="Context Recall"
              value={data.rag_quality.context_recall}
              description="% queries retrieving relevant chunks (score > 0.5)"
              good={0.7}
            />
            <QualityCard
              label="F1 Score"
              value={data.rag_quality.f1_score}
              description="Harmonic mean of precision & recall"
              good={0.7}
            />
            <QualityCard
              label="Answer Rate"
              value={data.rag_quality.answer_rate}
              description="% queries that got a successful response"
              good={0.9}
            />
            <QualityCard
              label="Empty Context"
              value={data.rag_quality.empty_context_rate}
              description="% queries with no relevant docs found"
              good={0.1}
              invert
            />
          </div>

          <div className="mt-4 rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-2">
            <p className="text-xs font-medium text-gray-300">What these mean</p>
            <MetricExplain label="Context Precision" desc="How relevant are the chunks retrieved? Higher = more relevant results" />
            <MetricExplain label="Context Recall" desc="Do we find relevant chunks when they exist? Higher = better coverage" />
            <MetricExplain label="F1 Score" desc="Balance between precision and recall. > 0.7 is good for RAG" />
            <MetricExplain label="Answer Rate" desc="% of queries successfully answered. Should be close to 1.0" />
            <MetricExplain label="Empty Context" desc="Queries with no matching documents. Lower = better index coverage" />
            <div className="border-t border-gray-800 pt-2 mt-2">
              <p className="text-xs text-gray-500">
                <span className="text-yellow-400">Accuracy / ROC AUC</span> — require labelled test sets.
                Add ground truth Q&A pairs and use the RAGAS library to compute these precisely.
              </p>
            </div>
          </div>
        </Section>
      </>}
    </div>
  )
}

function pct(rate: number) {
  return `${(rate * 100).toFixed(1)}%`
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
        {icon}{title}
      </div>
      {children}
    </div>
  )
}

function StatCard({ label, value, sub, color }: {
  label: string; value: string | number; sub: string; color: 'blue' | 'green' | 'red' | 'yellow'
}) {
  const colors = {
    blue: 'text-blue-400', green: 'text-green-400',
    red: 'text-red-400', yellow: 'text-yellow-400',
  }
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
      <div className="text-xs text-gray-300 mt-1">{label}</div>
      <div className="text-xs text-gray-600 mt-0.5">{sub}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 flex justify-between items-center">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-200">{value}</span>
    </div>
  )
}

function QualityCard({ label, value, description, good, invert = false }: {
  label: string; value: number; description: string; good: number; invert?: boolean
}) {
  const isGood = invert ? value <= good : value >= good
  const pctVal = Math.round(value * 100)

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{label}</span>
        {isGood
          ? <CheckCircle2 size={13} className="text-green-400" />
          : <AlertTriangle size={13} className="text-yellow-400" />
        }
      </div>
      <div className={`text-2xl font-bold ${isGood ? 'text-green-400' : 'text-yellow-400'}`}>
        {pctVal}%
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${isGood ? 'bg-green-500' : 'bg-yellow-500'}`}
          style={{ width: `${Math.min(pctVal, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-600">{description}</p>
    </div>
  )
}

function MetricExplain({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-xs text-blue-400 shrink-0 w-36">{label}</span>
      <span className="text-xs text-gray-500">{desc}</span>
    </div>
  )
}
