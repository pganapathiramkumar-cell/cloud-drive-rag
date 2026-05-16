import { useChatStore } from '../stores/chatStore'
import { streamQuery } from '../api/query'

export function useChat() {
  const store = useChatStore()

  async function sendMessage(query: string) {
    if (!query.trim() || store.loading) return

    const msgId = store.addUserMessage(query)

    try {
      await streamQuery(query, store.sessionId, {
        onToken:  (token) => store.appendAssistantMsg(msgId, token),
        onDone:   (citations, pii) => store.finaliseAssistantMsg(msgId, citations, pii),
        onError:  (err) => {
          store.appendAssistantMsg(msgId, `Error: ${err}`)
          store.finaliseAssistantMsg(msgId, [], false)
        },
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not reach the backend. Is it running on port 8000?'
      store.appendAssistantMsg(msgId, `Error: ${msg}`)
      store.finaliseAssistantMsg(msgId, [], false)
    }
  }

  return {
    messages:    store.messages,
    loading:     store.loading,
    sendMessage,
    clearChat:   store.clearChat,
  }
}
