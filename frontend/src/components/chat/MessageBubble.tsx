import { ShieldAlert, User, Bot } from 'lucide-react'
import type { Message } from '../../types/index'
import SourceCard from './SourceCard'

interface Props { message: Message }

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      gap: 8,
    }}>
      {/* Role label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: isUser ? 'var(--ds-blue-600)' : 'var(--ds-bg-3)',
          border: isUser ? 'none' : '1px solid var(--ds-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {isUser
            ? <User size={11} color="#fff" />
            : <Bot size={11} color="var(--ds-text-3)" />
          }
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-4)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {isUser ? 'You' : 'Assistant'}
        </span>
      </div>

      {/* Bubble */}
      <div className={isUser ? 'ds-chat-bubble-user' : 'ds-chat-bubble-ai'}>
        {message.content}
        {message.streaming && <span className="ds-streaming-cursor" />}
      </div>

      {/* PII warning */}
      {message.piiDetected && (
        <span className="ds-pii-tag">
          <ShieldAlert size={11} />
          PII detected and redacted
        </span>
      )}

      {/* Citations */}
      {!isUser && message.citations && message.citations.length > 0 && (
        <div style={{ width: '100%', maxWidth: 640 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: 'var(--ds-text-3)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 10, marginTop: 4,
          }}>
            Sources
          </p>
          <div className="ds-grid-2" style={{ gap: 8 }}>
            {message.citations.map(c => (
              <SourceCard key={c.index} citation={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
