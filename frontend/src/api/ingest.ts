import client from './client'
import type { IngestJob } from '../types'

export async function triggerIngest(maxPages = 50): Promise<IngestJob> {
  const { data } = await client.post<IngestJob>('/v1/ingest', { max_pages: maxPages })
  return data
}

export async function getIngestStatus(jobId: string): Promise<IngestJob> {
  const { data } = await client.get<IngestJob>(`/v1/ingest/${jobId}`)
  return data
}
