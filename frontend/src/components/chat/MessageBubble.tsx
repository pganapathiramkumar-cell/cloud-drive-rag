import { ShieldAlert } from 'lucide-react'
import type { Message } from '../../types'
import SourceCard from './SourceCard'

interface Props { message: Message }

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-brand-600 text-white rounded-br-sm'
            : 'bg-gray-800 text-gray-100 rounded-bl-sm'
        }`}
      >
        {message.content}
        {message.streaming && (
          <span className="ml-1 inline-block h-3 w-0.5 animate-pulse bg-gray-400" />
        )}
      </div>

      {message.piiDetected && (
        <div className="flex items-center gap-1 text-xs text-amber-400">
          <ShieldAlert size={12} />
          PII detected and redacted
        </div>
      )}

      {!isUser && message.citations && message.citations.length > 0 && (
        <div className="w-full max-w-2xl">
          <p className="mb-1.5 text-xs text-gray-500">Sources</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {message.citations.map((c) => (
              <SourceCard key={c.index} citation={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
