import { useState } from 'react'
import {
  Pencil, ShieldAlert, Search, Layers, Cpu, ShieldCheck,
  ChevronDown, ChevronUp, CheckCircle2, XCircle, Loader2, Clock,
} from 'lucide-react'
import type { WorkflowStage } from '../../types/workflow'
import { LEARNING_CONTENT } from '../../data/learningContent'
import NodeDetailDrawer from './NodeDetailDrawer'

const NODE_ICONS: Record<string, React.ReactNode> = {
  rewrite:     <Pencil size={14} />,
  scan_input:  <ShieldAlert size={14} />,
  retrieve:    <Search size={14} />,
  assemble:    <Layers size={14} />,
  generate:    <Cpu size={14} />,
  scan_output: <ShieldCheck size={14} />,
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'var(--ds-text-4)',
  running:   'var(--ds-blue-600)',
  completed: 'var(--ds-green-600)',
  failed:    'var(--ds-red-600)',
  skipped:   'var(--ds-text-4)',
}

interface Props {
  stage:        WorkflowStage
  expanded:     boolean
  learningMode: boolean
  onExpand:     () => void
}

export default function PipelineNode({ stage, expanded, learningMode, onExpand }: Props) {
  const [tab, setTab] = useState<'details' | 'learning'>('details')
  const color   = STATUS_COLORS[stage.status] ?? 'var(--ds-text-4)'
  const isPending   = stage.status === 'pending'
  const isRunning   = stage.status === 'running'
  const isCompleted = stage.status === 'completed'
  const isFailed    = stage.status === 'failed'

  function StatusIcon() {
    if (isRunning)   return <Loader2 size={14} color={color} style={{ animation: 'ds-spin 0.75s linear infinite' }} />
    if (isCompleted) return <CheckCircle2 size={14} color={color} />
    if (isFailed)    return <XCircle size={14} color={color} />
    return <Clock size={14} color={color} />
  }

  return (
    <div className={`ds-wf-node ds-wf-node--${stage.status}`}>
      {/* ── Node header ── */}
      <div
        className="ds-wf-node-header"
        onClick={isCompleted || isFailed ? onExpand : undefined}
        style={{ cursor: isCompleted || isFailed ? 'pointer' : 'default' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {/* Status dot / icon */}
          <div className="ds-wf-status-icon" style={{ color }}>
            <StatusIcon />
          </div>

          {/* Node icon + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <span style={{ color, flexShrink: 0 }}>
              {NODE_ICONS[stage.node] ?? <Cpu size={14} />}
            </span>
            <span style={{
              fontSize: 14, fontWeight: 600, color: isPending ? 'var(--ds-text-4)' : 'var(--ds-text-1)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {stage.label}
            </span>
          </div>
        </div>

        {/* Right side: duration + expand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {stage.durationMs !== null && (
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: stage.durationMs > 500 ? 'var(--ds-orange-600)' : 'var(--ds-text-3)',
              background: 'var(--ds-bg-3)', border: '1px solid var(--ds-border)',
              borderRadius: 6, padding: '2px 8px',
            }}>
              {stage.durationMs < 1000
                ? `${stage.durationMs} ms`
                : `${(stage.durationMs / 1000).toFixed(2)} s`}
            </span>
          )}
          {isRunning && (
            <span className="ds-badge ds-badge-running" style={{ fontSize: 11 }}>
              <span className="ds-badge-dot-pulse" />Running
            </span>
          )}
          {(isCompleted || isFailed) && (
            <span style={{ color: 'var(--ds-text-4)' }}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          )}
        </div>
      </div>

      {/* ── Library line ── */}
      {!isPending && (
        <div style={{ padding: '2px 16px 6px', fontSize: 11, color: 'var(--ds-text-4)', fontFamily: 'monospace' }}>
          {stage.library}
        </div>
      )}

      {/* ── Running progress bar ── */}
      {isRunning && (
        <div style={{ padding: '4px 16px 10px' }}>
          <div className="ds-progress ds-progress-xs">
            <div className="ds-wf-progress-indeterminate" />
          </div>
        </div>
      )}

      {/* ── Log line (completed/failed) ── */}
      {(isCompleted || isFailed) && stage.logLine && (
        <div style={{
          padding: '4px 16px 10px',
          fontSize: 12,
          color: isFailed ? 'var(--ds-red-600)' : 'var(--ds-text-3)',
          lineHeight: 1.5,
        }}>
          {stage.logLine}
        </div>
      )}

      {/* ── Expanded detail drawer ── */}
      {expanded && (isCompleted || isFailed) && (
        <div style={{ borderTop: '1px solid var(--ds-divider)', background: 'var(--ds-bg-3)' }}>
          {/* Tab switcher (only show if learning content exists) */}
          {learningMode && LEARNING_CONTENT[stage.node] && (
            <div style={{ display: 'flex', borderBottom: '1px solid var(--ds-divider)', padding: '0 16px' }}>
              {(['details', 'learning'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '8px 12px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    borderBottom: tab === t ? `2px solid var(--ds-blue-600)` : '2px solid transparent',
                    color: tab === t ? 'var(--ds-blue-600)' : 'var(--ds-text-3)',
                    marginBottom: -1,
                  }}
                >
                  {t === 'details' ? 'Execution Details' : '💡 Learning Mode'}
                </button>
              ))}
            </div>
          )}

          {tab === 'details' && <NodeDetailDrawer stage={stage} />}

          {tab === 'learning' && LEARNING_CONTENT[stage.node] && (
            <LearningPanel content={LEARNING_CONTENT[stage.node]} />
          )}
        </div>
      )}
    </div>
  )
}

function LearningPanel({ content }: { content: import('../../data/learningContent').LearningContent }) {
  const items: [string, string][] = [
    ['What it does',     content.what],
    ['Why it exists',    content.why],
    ['Best practice',    content.bestPractice],
    ['Optimisation',     content.optimization],
    ['Enterprise note',  content.enterpriseNote],
  ]
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map(([title, body]) => (
        <div key={title}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ds-blue-600)', marginBottom: 4 }}>
            {title}
          </p>
          <p style={{ fontSize: 13, color: 'var(--ds-text-2)', lineHeight: 1.65, margin: 0 }}>
            {body}
          </p>
        </div>
      ))}
    </div>
  )
}
