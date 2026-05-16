import client from './client'

export interface NodeLatency {
  avg_ms: number
  p95_ms: number
  calls: number
}

export interface AnalyticsSummary {
  node_latency: Record<string, NodeLatency>
  tokens: {
    total_input: number
    total_output: number
    total: number
    avg_per_query: number
    embed_calls: number
    embed_texts: number
    cost_usd: {
      groq_input: number
      groq_output: number
      cohere_embed: number
      total: number
    }
  }
  score_distribution: Record<string, number>
  query_categories: {
    on_topic: number
    borderline: number
    off_topic: number
    total: number
  }
  sessions: {
    total: number
    avg_turns: number
    max_turns: number
    multi_turn: number
    single_turn: number
  }
  errors: {
    rate_limit: number
    llm_error: number
    retrieval_error: number
    other: number
    total: number
  }
  index_coverage: {
    qdrant_total_vectors: number
    unique_sources_retrieved: number
    sources_list: string[]
    coverage_rate: number
  }
}

export async function fetchAnalytics(): Promise<AnalyticsSummary> {
  const { data } = await client.get('/v1/analytics/summary')
  return data
}
