export interface Citation {
  index: number
  title: string
  url: string
  excerpt: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  piiDetected?: boolean
  streaming?: boolean
  timestamp: number
}

export type IngestStatus = 'idle' | 'queued' | 'running' | 'done' | 'error'

export interface IngestJob {
  job_id: string
  status: IngestStatus
  docs_crawled: number
  chunks_stored: number
  message: string
}
