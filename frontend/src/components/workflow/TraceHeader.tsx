import { useEffect, useRef, useState } from 'react'
import { Copy, CheckCheck } from 'lucide-react'
import type { TraceInfo } from '../../types/workflow'

interface Props { trace: TraceInfo | null }

export default function TraceHeader({ trace }: Props) {
  const [copied, setCopied]   = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!trace) { setElapsed(0); return }
    if (trace.status === 'running') {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - trace.startedAtMs)
      }, 100)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      if (trace.totalMs !== null) setElapsed(trace.totalMs)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [trace?.status, trace?.startedAtMs])

  if (!trace) return null

  function copy() {
    navigator.clipboard.writeText(trace!.traceId)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const statusColors: Record<string, string> = {
    running:   'var(--ds-blue-600)',
    completed: 'var(--ds-green-600)',
    error:     'var(--ds-red-600)',
    idle:      'var(--ds-text-4)',
  }
  const color = statusColors[trace.status] ?? 'var(--ds-text-4)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '10px 16px',
      background: 'var(--ds-bg)',
      border: '1px solid var(--ds-border)',
      borderRadius: 'var(--ds-r-lg)',
      marginBottom: 16,
      flexWrap: 'wrap',
    }}>
      {/* Status dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="ds-dot" style={{
          background: color,
          animation: trace.status === 'running' ? 'ds-pulse 1.4s ease-in-out infinite' : 'none',
        }} />
        <span style={{ fontSize: 13, fontWeight: 600, color, textTransform: 'capitalize' }}>
          {trace.status}
        </span>
      </div>

      {/* Trace ID */}
      {trace.traceId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--ds-text-3)' }}>Trace</span>
          <code style={{
            fontSize: 12, fontFamily: 'monospace',
            background: 'var(--ds-bg-3)', border: '1px solid var(--ds-border)',
            borderRadius: 4, padding: '1px 6px', color: 'var(--ds-text-2)',
          }}>
            {trace.traceId.slice(0, 8)}…{trace.traceId.slice(-4)}
          </code>
          <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--ds-text-4)' }}>
            {copied ? <CheckCheck size={12} color="var(--ds-green-600)" /> : <Copy size={12} />}
          </button>
        </div>
      )}

      {/* Elapsed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
        <span style={{ fontSize: 12, color: 'var(--ds-text-3)' }}>
          {trace.status === 'completed' ? 'Total' : 'Elapsed'}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ds-text-1)', fontVariantNumeric: 'tabular-nums' }}>
          {elapsed < 1000 ? `${Math.round(elapsed)} ms` : `${(elapsed / 1000).toFixed(2)} s`}
        </span>
      </div>
    </div>
  )
}
