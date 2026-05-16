import { getToken } from '../auth/keycloak'
import type { Citation } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface StreamCallbacks {
  onToken:  (token: string) => void
  onDone:   (citations: Citation[], piiDetected: boolean) => void
  onError:  (msg: string) => void
}

export async function streamQuery(
  query: string,
  sessionId: string,
  callbacks: StreamCallbacks,
): Promise<void> {
  const token = getToken()

  const resp = await fetch(`${API_URL}/v1/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, session_id: sessionId }),
  })

  if (!resp.ok) {
    callbacks.onError(`HTTP ${resp.status}`)
    return
  }

  const reader = resp.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.startsWith('event: token')) continue
      if (line.startsWith('data: ')) {
        const raw = line.slice(6).trim()
        if (!raw) continue
        try {
          const json = JSON.parse(raw)
          if (json.content !== undefined) {
            callbacks.onToken(json.content)
          } else if (json.citations !== undefined) {
            callbacks.onDone(json.citations, json.pii_detected ?? false)
          } else if (json.detail !== undefined) {
            callbacks.onError(json.detail)
          }
        } catch { /* partial line */ }
      }
    }
  }
}
