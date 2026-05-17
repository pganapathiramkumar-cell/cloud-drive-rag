export interface LearningContent {
  what:          string
  why:           string
  bestPractice:  string
  optimization:  string
  enterpriseNote: string
}

export const LEARNING_CONTENT: Record<string, LearningContent> = {
  rewrite: {
    what:          'Transforms the raw user query into a clear, self-contained, unambiguous question using the Groq LLM.',
    why:           'Vague or pronoun-heavy queries produce irrelevant vector search results. Rewriting resolves context, removes ambiguity and boosts retrieval precision.',
    bestPractice:  'Always use temperature=0 for deterministic rewrites. Run exactly one rewrite — multiple rewrites risk hallucinating new intent.',
    optimization:  'Cache rewrites for identical raw queries in Redis (SHA-256 key) to eliminate redundant LLM calls for repeated questions.',
    enterpriseNote: 'In multi-tenant systems, strip tenant-identifying context from the query before rewriting to prevent cross-tenant data leakage.',
  },
  scan_input: {
    what:          'Scans the rewritten query for PII entities (names, emails, SSNs, credit cards, IPs) using Microsoft Presidio + spaCy en_core_web_sm.',
    why:           'Sending user PII to external APIs (Groq, Cohere) violates GDPR/CCPA. Blocking at the input layer prevents PII from ever reaching the LLM or vector store.',
    bestPractice:  'Block and redact at input, not just output. Log blocked queries for compliance audit without storing the PII itself.',
    optimization:  'en_core_web_sm (12 MB) is used over en_core_web_lg (560 MB) — sufficient for PII detection at 1/46th the memory cost.',
    enterpriseNote: 'Enterprise deployments should also add custom recognisers for domain-specific identifiers (employee IDs, case numbers, policy codes).',
  },
  retrieve: {
    what:          'Converts the query to a 1024-dim Cohere vector and performs cosine similarity search against the Qdrant vector database to find the top-5 most semantically relevant chunks.',
    why:           'Vector search finds conceptually relevant content even when there is zero keyword overlap — critical for technical documentation and natural language queries.',
    bestPractice:  'top_k=5 is the production sweet spot. More chunks dilute context quality and increase LLM token cost. Chunks with score < 0.4 are usually noise.',
    optimization:  'Add Qdrant payload filters (source, date, tenant_id) to reduce the search space before computing similarities, dramatically cutting latency at scale.',
    enterpriseNote: 'For multi-tenant RAG, always include a tenant_id payload filter in every Qdrant query. Never rely on post-retrieval filtering — data isolation must be enforced at the vector store level.',
  },
  assemble: {
    what:          'Formats the retrieved chunks into a structured context string and prepends the Redis session history, then builds the final prompt for the LLM.',
    why:           'Raw chunks from Qdrant are unstructured. The assembler adds source attribution, deduplicates, and injects conversational context so the LLM can give grounded, cited answers.',
    bestPractice:  'Keep assembled context under 4096 tokens. Beyond that, retrieval quality degrades and latency increases. Prioritise high-score chunks.',
    optimization:  'Implement MMR (Maximal Marginal Relevance) deduplication to avoid redundant chunks from the same source inflating the context window.',
    enterpriseNote: 'Attach data classification labels to each chunk in the assembled context. The LLM system prompt should instruct the model to respect classification boundaries in its response.',
  },
  generate: {
    what:          'Invokes the Groq API (llama-3.3-70b-versatile) with the assembled context and query to generate a grounded, cited answer.',
    why:           'The LLM synthesises information from the retrieved context — it does NOT use its training data. Grounding the answer in retrieved documents prevents hallucination.',
    bestPractice:  'temperature=0 ensures deterministic, factual responses. max_tokens=2048 prevents runaway generation. Always instruct the model to cite sources.',
    optimization:  'For high-volume deployments, use Groq batch API for offline workloads. For latency-sensitive paths, streaming (token-by-token) gives perceived sub-second response times.',
    enterpriseNote: 'At enterprise scale, model selection should be configurable per-tenant. Some tenants may require on-premises inference (Ollama) for data residency compliance.',
  },
  scan_output: {
    what:          'Scrubs the LLM response for any PII entities that may have leaked through from the retrieved documents using Presidio Anonymizer.',
    why:           'Even with input scanning, PII can appear in retrieved chunks (from documents) and be echoed in the LLM response. Output scanning is the final safety net.',
    bestPractice:  'Never skip output scanning, even if input scanning is active. The LLM can reconstruct or hallucinate PII based on context. Defence-in-depth requires both layers.',
    optimization:  'Reuse the same lru_cache Presidio singleton as scan_input — no warm-up cost. The output scan adds only 15–30 ms to the total pipeline latency.',
    enterpriseNote: 'Log redaction events with entity type (but not the value) to a compliance audit trail. This demonstrates GDPR/CCPA enforcement to regulators without storing PII in logs.',
  },
}
