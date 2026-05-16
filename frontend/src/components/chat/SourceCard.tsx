import { ExternalLink } from 'lucide-react'
import type { Citation } from '../../types'

interface Props { citation: Citation }

export default function SourceCard({ citation }: Props) {
  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-1 rounded border border-gray-700 bg-gray-800 p-3 text-xs hover:border-brand-500 hover:bg-gray-750 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-gray-200 line-clamp-1">{citation.title}</span>
        <ExternalLink size={12} className="shrink-0 text-gray-500" />
      </div>
      <p className="text-gray-400 line-clamp-2">{citation.excerpt}</p>
      <span className="text-brand-500 truncate">{citation.url}</span>
    </a>
  )
}
