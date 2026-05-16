import { create } from 'zustand'
import type { Message, Citation } from '../types'

interface ChatStore {
  messages:  Message[]
  sessionId: string
  loading:   boolean

  addUserMessage:      (content: string) => string
  appendAssistantMsg:  (id: string, token: string) => void
  finaliseAssistantMsg:(id: string, citations: Citation[], pii: boolean) => void
  clearChat:           () => void
}

function uid() {
  return Math.random().toString(36).slice(2)
}

export const useChatStore = create<ChatStore>((set) => ({
  messages:  [],
  sessionId: uid(),
  loading:   false,

  addUserMessage: (content) => {
    const id = uid()
    set((s) => ({
      loading: true,
      messages: [
        ...s.messages,
        { id, role: 'user', content, timestamp: Date.now() },
        { id: uid(), role: 'assistant', content: '', streaming: true, timestamp: Date.now() },
      ],
    }))
    return id
  },

  appendAssistantMsg: (_id, token) => {
    set((s) => {
      const msgs = [...s.messages]
      const last = msgs[msgs.length - 1]
      if (last?.role === 'assistant') last.content += token
      return { messages: msgs }
    })
  },

  finaliseAssistantMsg: (_id, citations, pii) => {
    set((s) => {
      const msgs = [...s.messages]
      const last = msgs[msgs.length - 1]
      if (last?.role === 'assistant') {
        last.streaming = false
        last.citations = citations
        last.piiDetected = pii
      }
      return { messages: msgs, loading: false }
    })
  },

  clearChat: () => set({ messages: [], sessionId: uid(), loading: false }),
}))
