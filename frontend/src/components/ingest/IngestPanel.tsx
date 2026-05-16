import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Play, HardDrive, Globe, Link2 } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { useIngest } from '../../hooks/useIngest'
import { driveApi, type DriveSyncStatus } from '../../api/drive'

type Tab = 'gcp' | 'drive'

export default function IngestPanel() {
  const { job, status, startIngest } = useIngest()
  const [maxPages, setMaxPages] = useState(50)
  const [tab, setTab] = useState<Tab>('drive')
  const [folderUrl, setFolderUrl] = useState('')
  const [syncJob, setSyncJob] = useState<DriveSyncStatus | null>(null)
  const [syncError, setSyncError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const gcpBusy = status === 'queued' || status === 'running'
  const driveBusy = syncJob?.status === 'queued' || syncJob?.status === 'running'

  useEffect(() => {
    if (driveBusy && syncJob) {
      pollRef.current = setInterval(async () => {
        const updated = await driveApi.getSyncStatus(syncJob.job_id)
        setSyncJob(updated)
        if (updated.status === 'done' || updated.status === 'error') {
          clearInterval(pollRef.current!)
        }
      }, 2000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [driveBusy, syncJob?.job_id])

  function extractFolderId(input: string): string {
    const match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : input.trim()
  }

  async function startSync() {
    const folderId = extractFolderId(folderUrl)
    if (!folderId) return
    setSyncError('')
    try {
      const job = await driveApi.syncPublicFolder(folderId)
      setSyncJob(job)
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed — check backend logs')
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-gray-900 p-1">
        <TabButton active={tab === 'drive'} onClick={() => setTab('drive')} icon={<HardDrive size={14} />}>
          Google Drive
        </TabButton>
        <TabButton active={tab === 'gcp'} onClick={() => setTab('gcp')} icon={<Globe size={14} />}>
          GCP Docs
        </TabButton>
      </div>

      {/* ── Google Drive tab ── */}
      {tab === 'drive' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Google Drive Sync</h2>
            <p className="mt-1 text-sm text-gray-400">
              Paste a publicly shared Drive folder URL. All PDF, Word, PowerPoint,
              and spreadsheet files will be indexed for the chatbot.
            </p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Drive folder URL or ID</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 size={13} className="absolute left-2.5 top-2.5 text-gray-500" />
                  <input
                    type="text"
                    value={folderUrl}
                    onChange={(e) => setFolderUrl(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/…"
                    className="w-full rounded border border-gray-700 bg-gray-800 pl-7 pr-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={startSync}
                  disabled={driveBusy || !folderUrl.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {driveBusy ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
                  {driveBusy ? 'Syncing…' : 'Sync'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                Folder must be "Anyone with the link can view" in Drive sharing settings.
              </p>
            </div>
            {syncError && <p className="text-xs text-red-400">{syncError}</p>}
          </div>

          {syncJob && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Job {syncJob.job_id.slice(0, 8)}…</span>
                <StatusBadge status={syncJob.status} />
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Stat label="Found" value={syncJob.files_found} />
                <Stat label="Indexed" value={syncJob.files_indexed} />
                <Stat label="Chunks" value={syncJob.chunks_stored} />
              </div>
              {syncJob.message && (
                <p className={`text-xs ${syncJob.status === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
                  {syncJob.message}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── GCP Docs tab ── */}
      {tab === 'gcp' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Google Cloud Docs Ingestion</h2>
            <p className="mt-1 text-sm text-gray-400">
              Crawls <span className="text-brand-500">cloud.google.com/docs</span>, scrubs PII,
              chunks text, embeds with Cohere, and stores in Qdrant.
            </p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max pages to crawl</label>
              <input
                type="number"
                value={maxPages}
                min={1}
                max={500}
                onChange={(e) => setMaxPages(Number(e.target.value))}
                className="w-32 rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:border-brand-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => startIngest(maxPages)}
              disabled={gcpBusy}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {gcpBusy ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              {gcpBusy ? 'Running…' : 'Start ingestion'}
            </button>
          </div>
          {job && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Job {job.job_id.slice(0, 8)}…</span>
                <StatusBadge status={status} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Docs crawled" value={job.docs_crawled} />
                <Stat label="Chunks stored" value={job.chunks_stored} />
              </div>
              {job.message && (
                <p className={`text-xs ${status === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
                  {job.message}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon, children }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {icon}{children}
    </button>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-gray-800 p-3">
      <div className="text-2xl font-bold text-gray-100">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}
