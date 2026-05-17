import { create } from 'zustand'
import type { WorkflowStage, TraceInfo, WorkflowAnswer, TraceStatus, FunctionSpan } from '../types/workflow'
import { PIPELINE_NODES } from '../types/workflow'

interface WorkflowStore {
  stages:       WorkflowStage[]
  trace:        TraceInfo | null
  answer:       WorkflowAnswer
  expandedNode: string | null
  learningMode: boolean

  initTrace:      (query: string, sessionId: string) => void
  setTraceStart:  (traceId: string, runtimeVersions: Record<string, string>) => void
  updateStage:    (event: Partial<WorkflowStage> & { node: string; functionSpans?: FunctionSpan[] }) => void
  appendToken:    (content: string) => void
  finalize:       (payload: {
    citations:   WorkflowAnswer['citations']
    piiDetected: boolean
    blocked:     boolean
    blockReason: string | null
    totalMs:     number
  }) => void
  setTraceStatus: (status: TraceStatus) => void
  setExpanded:    (node: string | null) => void
  toggleLearning: () => void
  reset:          () => void
}

const freshAnswer = (): WorkflowAnswer => ({
  tokens: '', citations: [], piiDetected: false, blocked: false, blockReason: null,
})

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  stages:       PIPELINE_NODES.map(n => ({ ...n })),
  trace:        null,
  answer:       freshAnswer(),
  expandedNode: null,
  learningMode: false,

  initTrace: (query, sessionId) => set({
    stages:       PIPELINE_NODES.map(n => ({ ...n })),
    answer:       freshAnswer(),
    expandedNode: null,
    trace: {
      traceId:         '',
      query,
      sessionId,
      startedAtMs:     Date.now(),
      totalMs:         null,
      status:          'running',
      runtimeVersions: {},
    },
  }),

  setTraceStart: (traceId, runtimeVersions) => set(s => ({
    trace: s.trace ? { ...s.trace, traceId, runtimeVersions } : null,
  })),

  updateStage: (event) => set(s => ({
    stages: s.stages.map(st =>
      st.node === event.node
        ? {
            ...st,
            ...(event.status        !== undefined && { status:        event.status }),
            ...(event.startedAtMs   !== undefined && { startedAtMs:   event.startedAtMs }),
            ...(event.durationMs    !== undefined && { durationMs:    event.durationMs }),
            ...(event.library       !== undefined && { library:       event.library }),
            ...(event.logLine       !== undefined && { logLine:       event.logLine }),
            ...(event.metadata      !== undefined && { metadata:      event.metadata }),
            ...(event.functionSpans !== undefined && { functionSpans: event.functionSpans }),
          }
        : st
    ),
  })),

  appendToken: (content) => set(s => ({
    answer: { ...s.answer, tokens: s.answer.tokens + content },
  })),

  finalize: (payload) => set(s => ({
    answer: { ...s.answer, ...payload },
    trace:  s.trace ? { ...s.trace, totalMs: payload.totalMs, status: 'completed' } : null,
  })),

  setTraceStatus: (status) => set(s => ({
    trace: s.trace ? { ...s.trace, status } : null,
  })),

  setExpanded:    (node) => set({ expandedNode: get().expandedNode === node ? null : node }),
  toggleLearning: ()     => set(s => ({ learningMode: !s.learningMode })),
  reset:          ()     => set({
    stages: PIPELINE_NODES.map(n => ({ ...n })),
    trace: null, answer: freshAnswer(), expandedNode: null,
  }),
}))
