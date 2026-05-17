export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
export type TraceStatus = 'idle' | 'running' | 'completed' | 'error'

export interface FunctionSpan {
  name:        string
  file:        string
  durationMs:  number
  library:     string
  version:     string
  metadata:    Record<string, unknown>
  error:       string | null
  memDeltaMb:  number | null
}

export interface WorkflowStage {
  node:          string
  label:         string
  status:        StageStatus
  startedAtMs:   number | null
  durationMs:    number | null
  library:       string
  logLine:       string
  metadata:      Record<string, unknown>
  functionSpans: FunctionSpan[]
}

export interface TraceInfo {
  traceId:         string
  query:           string
  sessionId:       string
  startedAtMs:     number
  totalMs:         number | null
  status:          TraceStatus
  runtimeVersions: Record<string, string>
}

export interface WorkflowAnswer {
  tokens:      string
  citations:   Citation[]
  piiDetected: boolean
  blocked:     boolean
  blockReason: string | null
}

export interface Citation {
  title:   string
  url:     string
  excerpt: string
  index?:  number
}

export const PIPELINE_NODES: WorkflowStage[] = [
  { node: 'rewrite',     label: 'Query Rewriting',   status: 'pending', startedAtMs: null, durationMs: null, library: 'langchain-groq 0.2.4',               logLine: '', metadata: {}, functionSpans: [] },
  { node: 'scan_input',  label: 'PII Input Scan',     status: 'pending', startedAtMs: null, durationMs: null, library: 'presidio-analyzer 2.2.354',          logLine: '', metadata: {}, functionSpans: [] },
  { node: 'retrieve',    label: 'Vector Retrieval',   status: 'pending', startedAtMs: null, durationMs: null, library: 'qdrant-client 1.9.1 · cohere 5.5.8', logLine: '', metadata: {}, functionSpans: [] },
  { node: 'assemble',    label: 'Context Assembly',   status: 'pending', startedAtMs: null, durationMs: null, library: 'langchain 0.3.19 · redis 5.0.6',      logLine: '', metadata: {}, functionSpans: [] },
  { node: 'generate',    label: 'LLM Generation',     status: 'pending', startedAtMs: null, durationMs: null, library: 'langchain-groq 0.2.4',               logLine: '', metadata: {}, functionSpans: [] },
  { node: 'scan_output', label: 'PII Output Scan',    status: 'pending', startedAtMs: null, durationMs: null, library: 'presidio-anonymizer 2.2.354',        logLine: '', metadata: {}, functionSpans: [] },
]
