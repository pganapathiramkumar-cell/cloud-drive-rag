import type { IngestStatus } from '../../types/index'

const STATUS_CLASS: Record<IngestStatus, string> = {
  idle:    'ds-badge ds-badge-idle',
  queued:  'ds-badge ds-badge-queued',
  running: 'ds-badge ds-badge-running',
  done:    'ds-badge ds-badge-done',
  error:   'ds-badge ds-badge-error',
}

const STATUS_LABEL: Record<IngestStatus, string> = {
  idle:    'Idle',
  queued:  'Queued',
  running: 'Running',
  done:    'Done',
  error:   'Error',
}

export default function StatusBadge({ status }: { status: IngestStatus }) {
  return (
    <span className={STATUS_CLASS[status]}>
      {status === 'running' && <span className="ds-badge-dot-pulse" />}
      {STATUS_LABEL[status]}
    </span>
  )
}
