import { ExternalLink, FileText } from 'lucide-react'
import type { Citation } from '../../types/index'

interface Props { citation: Citation }

export default function SourceCard({ citation }: Props) {
  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noopener noreferrer"
      className="ds-card ds-card-hover"
      style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        padding: '12px 14px', textDecoration: 'none',
        borderRadius: 10,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 4, background: 'var(--ds-blue-50)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <FileText size={11} color="var(--ds-blue-600)" />
          </div>
          <span style={{
            fontSize: 13, fontWeight: 600, color: 'var(--ds-text-1)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {citation.title}
          </span>
        </div>
        <ExternalLink size={12} style={{ color: 'var(--ds-text-4)', flexShrink: 0, marginTop: 1 }} />
      </div>

      {/* Excerpt */}
      <p style={{
        fontSize: 12, color: 'var(--ds-text-3)', lineHeight: 1.55,
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
        margin: 0,
      }}>
        {citation.excerpt}
      </p>

      {/* URL */}
      <span style={{
        fontSize: 11, color: 'var(--ds-blue-600)', fontWeight: 500,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {citation.url}
      </span>
    </a>
  )
}
