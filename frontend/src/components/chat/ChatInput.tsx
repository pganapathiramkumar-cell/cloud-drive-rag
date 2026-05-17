import { useState, KeyboardEvent } from 'react'
import { Send, Loader2 } from 'lucide-react'

interface Props {
  onSend:   (msg: string) => void
  disabled: boolean
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = !disabled && value.trim().length > 0

  return (
    <div className="ds-chat-input-area">
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          rows={2}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your documents… (Enter to send, Shift+Enter for newline)"
          disabled={disabled}
          className="ds-input ds-textarea"
          style={{ flex: 1, fontSize: 14, lineHeight: 1.6, paddingTop: 10, paddingBottom: 10 }}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="ds-btn ds-btn-primary"
          style={{ padding: '10px 16px', borderRadius: 10, alignSelf: 'flex-end', flexShrink: 0 }}
          title="Send message"
        >
          {disabled
            ? <Loader2 size={17} style={{ animation: 'ds-spin 0.75s linear infinite' }} />
            : <Send size={17} />
          }
        </button>
      </div>
      <p style={{ fontSize: 11, color: 'var(--ds-text-4)', marginTop: 6 }}>
        Enter to send · Shift+Enter for newline
      </p>
    </div>
  )
}
