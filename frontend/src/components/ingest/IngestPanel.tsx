import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Play, HardDrive, Globe, Link2, Upload, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { useIngest } from '../../hooks/useIngest'
import { driveApi, type DriveSyncStatus } from '../../api/drive'
import { uploadFile } from '../../api/upload'

type Tab = 'upload' | 'drive' | 'gcp'

const SUPPORTED_TYPES = [
  { ext: '.pdf',  label: 'PDF',        note: 'Text-based only — not scanned' },
  { ext: '.docx', label: 'Word',       note: 'Microsoft Word 2007+' },
  { ext: '.pptx', label: 'PowerPoint', note: 'Microsoft PowerPoint 2007+' },
  { ext: '.xlsx', label: 'Excel',      note: 'Microsoft Excel 2007+' },
  { ext: '.txt',  label: 'Text',       note: 'Plain text files' },
  { ext: '.csv',  label: 'CSV',        note: 'Comma-separated values' },
]

const ACCEPT = '.pdf,.docx,.pptx,.xlsx,.txt,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv'

export default function IngestPanel() {
  const { job, status, startIngest } = useIngest()
  const [maxPages, setMaxPages] = useState(50)
  const [tab, setTab] = useState<Tab>('drive')
  const [folderUrl, setFolderUrl] = useState('')
  const [syncJob, setSyncJob] = useState<DriveSyncStatus | null>(null)
  const [syncError, setSyncError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Upload state
  const [uploadResults, setUploadResults] = useState<{ name: string; chunks: number; error?: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{
    current: string; done: number; total: number; totalChunks: number
  } | null>(null)

  const gcpBusy = status === 'queued' || status === 'running'
  const driveBusy = syncJob?.status === 'queued' || syncJob?.status === 'running'

  useEffect(() => {
    if (driveBusy && syncJob) {
      pollRef.current = setInterval(async () => {
        try {
          const updated = await driveApi.getSyncStatus(syncJob.job_id)
          setSyncJob(updated)
          if (updated.status === 'done' || updated.status === 'error') {
            clearInterval(pollRef.current!)
          }
        } catch {
          // job lost (backend reloaded) — stop polling and reset
          clearInterval(pollRef.current!)
          setSyncJob(null)
          setSyncError('Sync was interrupted (backend reloaded). Please click Sync again.')
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

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files)
    if (!arr.length) return
    setUploading(true)
    const results: { name: string; chunks: number; error?: string }[] = []
    let totalChunks = 0

    for (let i = 0; i < arr.length; i++) {
      const file = arr[i]
      setUploadProgress({ current: file.name, done: i, total: arr.length, totalChunks })
      try {
        const res = await uploadFile(file)
        totalChunks += res.chunks_stored
        results.push({ name: file.name, chunks: res.chunks_stored })
      } catch (err: unknown) {
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          ?? (err instanceof Error ? err.message : 'Upload failed')
        results.push({ name: file.name, chunks: 0, error: detail })
      }
      setUploadProgress({ current: file.name, done: i + 1, total: arr.length, totalChunks })
    }

    setUploadResults(prev => [...results, ...prev])
    setUploading(false)
    setUploadProgress(null)
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-gray-900 p-1">
        <TabButton active={tab === 'upload'} onClick={() => setTab('upload')} icon={<Upload size={14} />}>
          Upload
        </TabButton>
        <TabButton active={tab === 'drive'} onClick={() => setTab('drive')} icon={<HardDrive size={14} />}>
          Google Drive
        </TabButton>
        <TabButton active={tab === 'gcp'} onClick={() => setTab('gcp')} icon={<Globe size={14} />}>
          GCP Docs
        </TabButton>
      </div>

      {/* ── Upload tab ── */}
      {tab === 'upload' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Upload Documents</h2>
            <p className="mt-1 text-sm text-gray-400">
              Upload files directly from your computer to index for the chatbot.
            </p>
          </div>

          {/* Supported types */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
            <p className="text-xs font-medium text-gray-300">Supported formats</p>
            <div className="grid grid-cols-3 gap-2">
              {SUPPORTED_TYPES.map(t => (
                <div key={t.ext} className="flex items-start gap-1.5">
                  <CheckCircle2 size={12} className="text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-gray-200 font-medium">{t.ext}</span>
                    <p className="text-xs text-gray-600">{t.note}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-800 pt-3 space-y-1.5">
              <p className="text-xs font-medium text-yellow-400 flex items-center gap-1">
                <AlertTriangle size={11} /> Not supported
              </p>
              {[
                ['Scanned PDFs', 'No embedded text — open in Google Docs to OCR first'],
                ['Images (JPG/PNG)', 'Cannot extract text from image files'],
                ['ZIP / RAR', 'Compressed archives not supported'],
                ['Password protected', 'Remove password before uploading'],
              ].map(([type, reason]) => (
                <div key={type} className="flex items-start gap-1.5">
                  <XCircle size={12} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-500"><span className="text-gray-400">{type}</span> — {reason}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-800 pt-3">
              <p className="text-xs font-medium text-blue-400 mb-1">Tips</p>
              <p className="text-xs text-gray-500">• Scanned PDF? Open in Google Drive → right-click → Open with Google Docs → download as .docx</p>
              <p className="text-xs text-gray-500">• Max file size: 50 MB per file</p>
              <p className="text-xs text-gray-500">• Multiple files can be uploaded at once</p>
            </div>
          </div>

          {/* Live progress — shown above drop zone while uploading */}
          {uploadProgress && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-400 flex items-center gap-1.5">
                  <RefreshCw size={12} className="animate-spin" /> Processing…
                </span>
                <span className="text-xs text-gray-400">
                  {uploadProgress.done} / {uploadProgress.total} files
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded bg-gray-800 p-2 text-center">
                  <div className="text-lg font-bold text-gray-100">{uploadProgress.done}</div>
                  <div className="text-xs text-gray-500">Indexed</div>
                </div>
                <div className="rounded bg-gray-800 p-2 text-center">
                  <div className="text-lg font-bold text-gray-100">{uploadProgress.total - uploadProgress.done}</div>
                  <div className="text-xs text-gray-500">Remaining</div>
                </div>
                <div className="rounded bg-gray-800 p-2 text-center">
                  <div className="text-lg font-bold text-blue-400">{uploadProgress.totalChunks}</div>
                  <div className="text-xs text-gray-500">Chunks</div>
                </div>
              </div>

              <p className="text-xs text-gray-500 truncate">
                Current: <span className="text-gray-300">{uploadProgress.current}</span>
              </p>
            </div>
          )}

          {/* Drop zone — always visible */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragOver ? 'border-blue-500 bg-blue-500/5' : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            <Upload size={24} className="mx-auto mb-3 text-gray-600" />
            <p className="text-sm text-gray-400 mb-1">Drag & drop files here</p>
            <p className="text-xs text-gray-600 mb-3">PDF, DOCX, PPTX, XLSX, TXT, CSV</p>
            <label className="cursor-pointer">
              <span className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                uploading ? 'bg-gray-700 opacity-50 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700'
              }`}>
                {uploading ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                {uploading ? 'Uploading…' : 'Browse files'}
              </span>
              <input
                type="file"
                multiple
                accept={ACCEPT}
                className="hidden"
                disabled={uploading}
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </label>
          </div>

          {/* Upload results */}
          {uploadResults.length > 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
              {/* Summary */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-300">Upload history</p>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span className="text-green-400">
                    {uploadResults.filter(r => !r.error).length} indexed
                  </span>
                  <span className="text-blue-400">
                    {uploadResults.reduce((s, r) => s + r.chunks, 0)} total chunks
                  </span>
                  {uploadResults.some(r => r.error) && (
                    <span className="text-red-400">
                      {uploadResults.filter(r => r.error).length} failed
                    </span>
                  )}
                </div>
              </div>

              {/* File list */}
              <div className="space-y-2">
                {uploadResults.map((r, i) => (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {r.error
                        ? <XCircle size={13} className="text-red-400 shrink-0" />
                        : <CheckCircle2 size={13} className="text-green-400 shrink-0" />
                      }
                      <span className="text-xs text-gray-300 truncate">{r.name}</span>
                    </div>
                    {r.error
                      ? <span className="text-xs text-red-400 shrink-0 max-w-[200px] text-right leading-tight">{r.error}</span>
                      : <span className="text-xs text-blue-400 shrink-0">{r.chunks} chunks</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
              <div className="grid grid-cols-4 gap-3 text-sm">
                <Stat label="Found" value={syncJob.files_found} />
                <Stat label="Indexed" value={syncJob.files_indexed} />
                <Stat label="Skipped" value={syncJob.files_skipped ?? 0} />
                <Stat label="Chunks" value={syncJob.chunks_stored} />
              </div>
              {syncJob.indexed_files?.length > 0 && (
                <div>
                  <p className="text-xs text-green-400 font-medium mb-1">Indexed</p>
                  {syncJob.indexed_files.map((name, i) => (
                    <p key={i} className="text-xs text-gray-400 pl-2">✓ {name}</p>
                  ))}
                </div>
              )}
              {syncJob.skipped_files?.length > 0 && (
                <div>
                  <p className="text-xs text-yellow-400 font-medium mb-1">Skipped</p>
                  {syncJob.skipped_files.map((name, i) => (
                    <p key={i} className="text-xs text-gray-500 pl-2">✗ {name}</p>
                  ))}
                </div>
              )}
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
