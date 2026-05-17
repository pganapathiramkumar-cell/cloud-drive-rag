import { useEffect, useRef } from 'react'
import { Trash2, MessageSquare } from 'lucide-react'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import { useChat } from '../../hooks/useChat'

export default function ChatWindow() {
  const { messages, loading, sendMessage, clearChat } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FFFFFF' }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 24px',
        borderBottom: '1px solid var(--ds-divider)',
        background: 'var(--ds-bg)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, color: 'var(--ds-text-3)', fontWeight: 500 }}>
          {messages.length === 0
            ? 'Ask anything about your indexed documents'
            : `${messages.length} message${messages.length !== 1 ? 's' : ''}`}
        </span>

        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="ds-btn ds-btn-danger-ghost ds-btn-xs"
          >
            <Trash2 size={12} />
            Clear chat
          </button>
        )}
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20,
        background: 'var(--ds-bg-3)',
      }}>
        {messages.length === 0 && (
          <div className="ds-empty" style={{ height: '100%' }}>
            <div className="ds-empty-icon">
              <MessageSquare size={22} />
            </div>
            <p className="ds-empty-title">Start a conversation</p>
            <p className="ds-empty-sub">
              Ask questions about your indexed documents and get precise, cited answers.
            </p>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={sendMessage} disabled={loading} />
    </div>
  )
}
