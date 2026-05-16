import { useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
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
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
        <span className="text-xs text-gray-500">
          {messages.length === 0 ? 'Ask anything about Google Cloud' : `${messages.length} messages`}
        </span>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:text-red-400"
          >
            <Trash2 size={12} /> Clear
          </button>
        )}
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-600 text-sm">No messages yet. Start by asking a question.</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={sendMessage} disabled={loading} />
    </div>
  )
}
