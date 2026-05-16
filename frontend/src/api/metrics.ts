import client from './client'

export interface MetricsSummary {
  queries: {
    total: number
    successful: number
    failed: number
    blocked: number
    success_rate: number
    pii_detected: number
    pii_rate: number
  }
  latency: {
    avg_ms: number
    p50_ms: number
    p95_ms: number
  }
  retrieval: {
    avg_chunks_per_query: number
    avg_similarity_score: number
  }
  rag_quality: {
    context_precision: number
    context_recall: number
    f1_score: number
    answer_rate: number
    empty_context_rate: number
  }
  ingestion: {
    files_indexed: number
    files_skipped: number
    chunks_stored: number
    uploads_indexed: number
    upload_chunks: number
    total_chunks: number
    qdrant_vectors: number | null
    qdrant_status: string
  }
}

export async function fetchMetrics(): Promise<MetricsSummary> {
  const { data } = await client.get('/v1/metrics/summary')
  return data
}
