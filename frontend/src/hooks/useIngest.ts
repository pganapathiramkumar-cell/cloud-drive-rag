import { useState, useRef } from 'react'
import { triggerIngest, getIngestStatus } from '../api/ingest'
import type { IngestJob, IngestStatus } from '../types'

export function useIngest() {
  const [job, setJob] = useState<IngestJob | null>(null)
  const [status, setStatus] = useState<IngestStatus>('idle')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function startIngest(maxPages = 50) {
    setStatus('queued')
    const newJob = await triggerIngest(maxPages)
    setJob(newJob)
    setStatus(newJob.status as IngestStatus)

    pollRef.current = setInterval(async () => {
      const updated = await getIngestStatus(newJob.job_id)
      setJob(updated)
      setStatus(updated.status as IngestStatus)
      if (updated.status === 'done' || updated.status === 'error') {
        clearInterval(pollRef.current!)
      }
    }, 3000)
  }

  return { job, status, startIngest }
}
