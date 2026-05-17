import { useState, useCallback } from 'react'
import { FlaskConical, CheckCircle2, XCircle, Loader2, Play, RefreshCw, Clock } from 'lucide-react'
import { getToken } from '../../auth/keycloak'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

type Status = 'idle' | 'running' | 'pass' | 'fail'

interface TestResult {
  status:    Status
  duration?: number
  detail?:   string
}

interface TestDef {
  id:          string
  section:     string
  name:        string
  description: string
  run:         () => Promise<string>
}

/* ── helpers ─────────────────────────────────────────────── */

async function apiFetch(path: string, withAuth = false): Promise<{ status: number; body: unknown; ms: number }> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (withAuth) headers['Authorization'] = `Bearer ${getToken() ?? 'dev-token'}`
  const t0  = performance.now()
  const res = await fetch(`${API_URL}${path}`, { headers })
  const ms  = Math.round(performance.now() - t0)
  let body: unknown = null
  try { body = await res.json() } catch { body = null }
  return { status: res.status, body, ms }
}

function assertOk(status: number, expected = 200) {
  if (status !== expected) throw new Error(`HTTP ${status} (expected ${expected})`)
}

function assertFields(obj: unknown, fields: string[]) {
  for (const f of fields) {
    if (typeof obj !== 'object' || obj === null || !(f in obj))
      throw new Error(`missing field '${f}'`)
  }
}

/* ── test definitions ────────────────────────────────────── */

const TESTS: TestDef[] = [
  // ── Reachability ─────────────────────────────────────────
  {
    id: 'health-200', section: 'Backend Reachability',
    name: 'Health endpoint responds',
    description: 'GET /v1/health → 200 OK',
    async run() {
      const { status, ms } = await apiFetch('/v1/health')
      assertOk(status)
      return `200 OK in ${ms} ms`
    },
  },
  {
    id: 'health-shape', section: 'Backend Reachability',
    name: 'Health response shape',
    description: 'Body contains status, qdrant, redis, version',
    async run() {
      const { body } = await apiFetch('/v1/health')
      assertFields(body, ['status', 'qdrant', 'redis', 'version'])
      const b = body as Record<string, unknown>
      return `status=${b.status}  qdrant=${b.qdrant}  redis=${b.redis}`
    },
  },
  {
    id: 'qdrant-ok', section: 'Backend Reachability',
    name: 'Qdrant connected',
    description: 'health.qdrant === "ok"',
    async run() {
      const { body } = await apiFetch('/v1/health')
      const b = body as Record<string, unknown>
      if (b.qdrant !== 'ok') throw new Error(`qdrant=${b.qdrant} — check QDRANT_URL on Railway`)
      return 'Qdrant reachable'
    },
  },
  {
    id: 'redis-ok', section: 'Backend Reachability',
    name: 'Redis connected',
    description: 'health.redis === "ok"',
    async run() {
      const { body } = await apiFetch('/v1/health')
      const b = body as Record<string, unknown>
      if (b.redis !== 'ok') throw new Error(`redis=${b.redis} — check REDIS_URL on Railway`)
      return 'Redis reachable'
    },
  },

  // ── Auth ─────────────────────────────────────────────────
  {
    id: 'auth-dev-token', section: 'Authentication',
    name: 'dev-token accepted',
    description: 'Bearer dev-token → /v1/metrics → 200 (requires SKIP_AUTH=true on Railway)',
    async run() {
      const { status, ms } = await apiFetch('/v1/metrics', true)
      assertOk(status)
      return `200 OK in ${ms} ms — SKIP_AUTH is active`
    },
  },
  {
    id: 'auth-admin-role', section: 'Authentication',
    name: 'Admin role granted',
    description: 'dev-token resolves to admin role → admin endpoints accessible',
    async run() {
      const { status } = await apiFetch('/v1/analytics', true)
      assertOk(status)
      return 'Admin-gated /v1/analytics accessible'
    },
  },

  // ── Endpoints ─────────────────────────────────────────────
  {
    id: 'metrics-shape', section: 'API Endpoints',
    name: 'Metrics response shape',
    description: '/v1/metrics contains queries, ingestion, latency, retrieval, rag_quality',
    async run() {
      const { body } = await apiFetch('/v1/metrics', true)
      assertFields(body, ['queries', 'ingestion', 'latency', 'retrieval', 'rag_quality'])
      const b = body as Record<string, Record<string, unknown>>
      return `total queries: ${b.queries?.total ?? '?'}`
    },
  },
  {
    id: 'analytics-shape', section: 'API Endpoints',
    name: 'Analytics response shape',
    description: '/v1/analytics contains node_latency, tokens, score_distribution',
    async run() {
      const { body } = await apiFetch('/v1/analytics', true)
      assertFields(body, ['node_latency', 'tokens', 'score_distribution', 'query_categories', 'sessions'])
      return 'All expected fields present'
    },
  },
  {
    id: 'swagger-ui', section: 'API Endpoints',
    name: 'Swagger UI reachable',
    description: 'GET /docs → 200',
    async run() {
      const res = await fetch(`${API_URL}/docs`)
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`)
      return `GET /docs → 200`
    },
  },

  // ── Performance ───────────────────────────────────────────
  {
    id: 'latency-health', section: 'Performance',
    name: 'Health latency < 3 s',
    description: 'Cold /v1/health response time',
    async run() {
      const { ms } = await apiFetch('/v1/health')
      if (ms > 3000) throw new Error(`${ms} ms — too slow (> 3 s)`)
      return `${ms} ms`
    },
  },
  {
    id: 'latency-metrics', section: 'Performance',
    name: 'Metrics latency < 5 s',
    description: 'Cold /v1/metrics response time',
    async run() {
      const { ms } = await apiFetch('/v1/metrics', true)
      if (ms > 5000) throw new Error(`${ms} ms — too slow (> 5 s)`)
      return `${ms} ms`
    },
  },
]

const SECTIONS = [...new Set(TESTS.map(t => t.section))]

/* ── sub-components ──────────────────────────────────────── */

function StatusIcon({ status }: { status: Status }) {
  if (status === 'running') return <Loader2 size={14} style={{ animation: 'ds-spin 0.75s linear infinite', color: 'var(--ds-blue-500)', flexShrink: 0 }} />
  if (status === 'pass')    return <CheckCircle2 size={14} color="var(--ds-green-600)" style={{ flexShrink: 0 }} />
  if (status === 'fail')    return <XCircle size={14} color="var(--ds-red-600)" style={{ flexShrink: 0 }} />
  return <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--ds-border)', display: 'inline-block', flexShrink: 0 }} />
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    idle:    'ds-badge ds-badge-idle',
    running: 'ds-badge ds-badge-running',
    pass:    'ds-badge ds-badge-done',
    fail:    'ds-badge ds-badge-error',
  }
  const label: Record<Status, string> = { idle: 'idle', running: 'running', pass: 'pass', fail: 'fail' }
  return <span className={map[status]}>{label[status]}</span>
}

/* ── main component ──────────────────────────────────────── */

export default function TestsPanel() {
  const [results, setResults] = useState<Record<string, TestResult>>({})
  const [running, setRunning]  = useState(false)

  const setResult = useCallback((id: string, r: TestResult) => {
    setResults(prev => ({ ...prev, [id]: r }))
  }, [])

  async function runTest(def: TestDef) {
    setResult(def.id, { status: 'running' })
    const t0 = performance.now()
    try {
      const detail   = await def.run()
      const duration = Math.round(performance.now() - t0)
      setResult(def.id, { status: 'pass', duration, detail })
    } catch (err) {
      const duration = Math.round(performance.now() - t0)
      setResult(def.id, { status: 'fail', duration, detail: err instanceof Error ? err.message : String(err) })
    }
  }

  async function runAll() {
    setRunning(true)
    for (const t of TESTS) await runTest(t)
    setRunning(false)
  }

  const counts = TESTS.reduce(
    (acc, t) => { acc[results[t.id]?.status ?? 'idle']++; return acc },
    { idle: 0, running: 0, pass: 0, fail: 0 } as Record<Status, number>
  )

  return (
    <div className="ds-container">

      {/* ── Page header ── */}
      <div className="ds-page-actions" style={{ marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <FlaskConical size={18} color="var(--ds-blue-600)" />
            <h1 className="ds-page-title">System Tests</h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ds-text-3)' }}>
            Target: <span style={{ fontFamily: 'monospace', color: 'var(--ds-text-2)' }}>{API_URL}</span>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Summary chips */}
          {counts.pass > 0   && <span className="ds-badge ds-badge-done">{counts.pass} passed</span>}
          {counts.fail > 0   && <span className="ds-badge ds-badge-error">{counts.fail} failed</span>}
          {counts.idle > 0   && <span className="ds-badge ds-badge-idle">{counts.idle} idle</span>}

          <button
            onClick={runAll}
            disabled={running}
            className="ds-btn ds-btn-primary ds-btn-sm"
          >
            {running
              ? <><RefreshCw size={13} style={{ animation: 'ds-spin 0.75s linear infinite' }} /> Running…</>
              : <><Play size={13} /> Run All</>
            }
          </button>
        </div>
      </div>

      {/* ── Sections ── */}
      {SECTIONS.map(section => (
        <div key={section} className="ds-section">
          <div className="ds-section-header">
            <span className="ds-section-title">{section}</span>
          </div>

          <div className="ds-card-flush">
            {TESTS.filter(t => t.section === section).map((test, i, arr) => {
              const r = results[test.id]
              return (
                <div
                  key={test.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 20px',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--ds-divider)' : 'none',
                    background: r?.status === 'fail' ? 'var(--ds-red-50)'
                              : r?.status === 'pass' ? 'var(--ds-green-50)'
                              : 'transparent',
                    transition: 'background 0.2s ease',
                  }}
                >
                  <StatusIcon status={r?.status ?? 'idle'} />

                  {/* Name + description */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-1)' }}>
                      {test.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ds-text-3)', marginTop: 1 }}>
                      {r?.detail ?? test.description}
                    </div>
                  </div>

                  {/* Duration */}
                  {r?.duration !== undefined && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ds-text-4)', flexShrink: 0 }}>
                      <Clock size={11} />
                      {r.duration} ms
                    </div>
                  )}

                  {/* Status badge */}
                  <StatusBadge status={r?.status ?? 'idle'} />

                  {/* Run single test */}
                  <button
                    onClick={() => runTest(test)}
                    disabled={running || r?.status === 'running'}
                    className="ds-btn ds-btn-ghost ds-btn-xs"
                    title="Run this test"
                    style={{ flexShrink: 0 }}
                  >
                    <Play size={11} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}

    </div>
  )
}
