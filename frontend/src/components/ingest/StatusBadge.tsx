import type { IngestStatus } from '../../types'

const STYLES: Record<IngestStatus, string> = {
  idle:    'bg-gray-700 text-gray-400',
  queued:  'bg-yellow-900 text-yellow-300',
  running: 'bg-blue-900 text-blue-300 animate-pulse',
  done:    'bg-green-900 text-green-300',
  error:   'bg-red-900 text-red-300',
}

export default function StatusBadge({ status }: { status: IngestStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {status}
    </span>
  )
}
