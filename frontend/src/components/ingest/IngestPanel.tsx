import { useState, useEffect, useRef } from 'react'
import {
  RefreshCw, Play, HardDrive, Globe, Upload,
  CheckCircle2, XCircle, AlertTriangle, Link2, Info,
} from 'lucide-react'
import StatusBadge from './StatusBadge'
import { useIngest } from '../../hooks/useIngest'
import { driveApi, type DriveSyncStatus } from '../../api/drive'
import { uploadFile } from '../../api/upload'

type Tab = 'upload' | 'drive' | 'gcp'

const SUPPORTED = [
  { ext: '.pdf',  label: 'PDF',        note: 'Text-based only (not scanned)' },
  { ext: '.docx', label: 'Word',       note: 'Microsoft Word 2007+' },
  { ext: '.pptx', label: 'PowerPoint', note: 'Slides 2007+' },
  { ext: '.xlsx', label: 'Excel',      note: 'Spreadsheets 2007+' },
  { ext: '.txt',  label: 'Text',       note: 'Plain text files' },
  { ext: '.csv',  label: 'CSV',        note: 'Comma-separated values' },
]

const UNSUPPORTED = [
  ['Scanned PDFs',       'No embedded text — open in Google Docs to OCR first'],
  ['Images (JPG / PNG)', 'Cannot extract text from image files'],
  ['ZIP / RAR',          'Compressed archives not supported'],
  ['Password protected', 'Remove password protection before uploading'],
]

const ACCEPT = '.pdf,.docx,.pptx,.xlsx,.txt,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv'

export default function IngestPanel() {
  const { job, status, startIngest } = useIngest()
  const [maxPages, setMaxPages]     = useState(50)
  const [tab, setTab]               = useState<Tab>('drive')
  const [folderUrl, setFolderUrl]   = useState('')
  const [syncJob, setSyncJob]       = useState<DriveSyncStatus | null>(null)
  const [syncError, setSyncError]   = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [uploadResults, setUploadResults]   = useState<{ name: string; chunks: number; error?: string }[]>([])
  const [uploading, setUploading]           = useState(false)
  const [dragOver, setDragOver]             = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{
    current: string; done: number; total: number; totalChunks: number
  } | null>(null)

  const gcpBusy   = status === 'queued' || status === 'running'
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
          clearInterval(pollRef.current!)
          setSyncJob(null)
          setSyncError('Sync was interrupted (backend reloaded). Click Sync to retry.')
        }
      }, 2000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [driveBusy, syncJob?.job_id])

  function extractFolderId(input: string) {
    const match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : input.trim()
  }

  async function startSync() {
    const folderId = extractFolderId(folderUrl)
    if (!folderId) return
    setSyncError('')
    try {
      const j = await driveApi.syncPublicFolder(folderId)
      setSyncJob(j)
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

  const progressPct = uploadProgress
    ? Math.round((uploadProgress.done / uploadProgress.total) * 100)
    : 0

  return (
    <div className="ds-container-md">
      <div style={{ marginBottom: 24 }}>
        <h1 className="ds-page-title" style={{ marginBottom: 4 }}>Data Ingestion</h1>
        <p style={{ fontSize: 13, color: 'var(--ds-text-3)' }}>
          Index documents from Google Drive, cloud sources, or direct uploads.
        </p>
      </div>

      {/* ── Tab bar ── */}
      <div className="ds-tab-bar" style={{ marginBottom: 24 }}>
        {([
          { id: 'upload', icon: <Upload size={13} />,   label: 'Upload Files' },
          { id: 'drive',  icon: <HardDrive size={13} />, label: 'Google Drive' },
          { id: 'gcp',    icon: <Globe size={13} />,     label: 'GCP Docs' },
        ] as const).map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`ds-tab-btn ${tab === id ? 'ds-active' : ''}`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ════════ UPLOAD TAB ════════ */}
      {tab === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Supported formats */}
          <div className="ds-card" style={{ padding: '20px 24px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-1)', marginBottom: 14 }}>
              Supported formats
            </p>
            <div className="ds-grid-3" style={{ marginBottom: 16 }}>
              {SUPPORTED.map(t => (
                <div key={t.ext} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <CheckCircle2 size={13} color="var(--ds-green-600)" style={{ marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-1)' }}>{t.ext}</span>
                    <p style={{ fontSize: 12, color: 'var(--ds-text-3)', margin: 0 }}>{t.note}</p>
                  </div>
                </div>
              ))}
            </div>

            <hr className="ds-divider" style={{ margin: '14px 0' }} />

            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-orange-600)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
              <AlertTriangle size={12} /> Not supported
            </p>
            {UNSUPPORTED.map(([type, reason]) => (
              <div key={type} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 6 }}>
                <XCircle size={12} color="var(--ds-red-500)" style={{ marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: 'var(--ds-text-3)', margin: 0 }}>
                  <span style={{ color: 'var(--ds-text-2)', fontWeight: 500 }}>{type}</span> — {reason}
                </p>
              </div>
            ))}

            <hr className="ds-divider" style={{ margin: '14px 0' }} />

            <div className="ds-alert ds-alert-info" style={{ padding: '10px 12px' }}>
              <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12 }}>
                <strong>Tip:</strong> Scanned PDF? Open in Google Drive → right-click → Open with Docs → download as .docx.
                Max 50 MB per file. Multiple files supported.
              </div>
            </div>
          </div>

          {/* Progress card */}
          {uploadProgress && (
            <div className="ds-card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'var(--ds-text-1)' }}>
                  <RefreshCw size={13} style={{ animation: 'ds-spin 0.75s linear infinite', color: 'var(--ds-blue-600)' }} />
                  Processing files…
                </span>
                <span style={{ fontSize: 13, color: 'var(--ds-text-3)' }}>
                  {uploadProgress.done} / {uploadProgress.total}
                </span>
              </div>

              <div className="ds-progress ds-progress-sm" style={{ marginBottom: 14 }}>
                <div className="ds-progress-fill ds-fill-blue" style={{ width: `${progressPct}%` }} />
              </div>

              <div className="ds-grid-3" style={{ marginBottom: 10 }}>
                {[
                  { label: 'Indexed',    value: uploadProgress.done,                     color: 'var(--ds-green-600)' },
                  { label: 'Remaining',  value: uploadProgress.total - uploadProgress.done, color: 'var(--ds-orange-600)' },
                  { label: 'Chunks',     value: uploadProgress.totalChunks,              color: 'var(--ds-blue-600)' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--ds-bg-3)', border: '1px solid var(--ds-border)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--ds-text-3)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 12, color: 'var(--ds-text-3)' }}>
                Current: <span style={{ color: 'var(--ds-text-1)', fontWeight: 500 }}>{uploadProgress.current}</span>
              </p>
            </div>
          )}

          {/* Drop zone */}
          <div
            className={`ds-dropzone ${dragOver ? 'drag-active' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'var(--ds-blue-50)', border: '1px solid var(--ds-blue-200)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Upload size={20} color="var(--ds-blue-600)" />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text-1)', marginBottom: 4 }}>
              {dragOver ? 'Drop files to upload' : 'Drag & drop files here'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--ds-text-3)', marginBottom: 18 }}>
              PDF · DOCX · PPTX · XLSX · TXT · CSV
            </p>
            <label style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
              <span className={`ds-btn ds-btn-secondary ${uploading ? '' : ''}`}
                style={{ opacity: uploading ? 0.5 : 1 }}>
                {uploading
                  ? <><RefreshCw size={13} style={{ animation: 'ds-spin 0.75s linear infinite' }} /> Uploading…</>
                  : <><Upload size={13} /> Browse files</>
                }
              </span>
              <input
                type="file" multiple accept={ACCEPT}
                className="sr-only" style={{ display: 'none' }}
                disabled={uploading}
                onChange={e => e.target.files && handleFiles(e.target.files)}
              />
            </label>
          </div>

          {/* Upload results */}
          {uploadResults.length > 0 && (
            <div className="ds-card-flush">
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px', borderBottom: '1px solid var(--ds-divider)',
              }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-1)', margin: 0 }}>Upload history</p>
                <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                  <span style={{ color: 'var(--ds-green-600)', fontWeight: 500 }}>
                    {uploadResults.filter(r => !r.error).length} indexed
                  </span>
                  <span style={{ color: 'var(--ds-text-3)' }}>
                    {uploadResults.reduce((s, r) => s + r.chunks, 0)} chunks
                  </span>
                  {uploadResults.some(r => r.error) && (
                    <span style={{ color: 'var(--ds-red-600)', fontWeight: 500 }}>
                      {uploadResults.filter(r => r.error).length} failed
                    </span>
                  )}
                </div>
              </div>
              <div style={{ padding: '8px 0' }}>
                {uploadResults.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 20px', gap: 12,
                    borderBottom: i < uploadResults.length - 1 ? '1px solid var(--ds-divider)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      {r.error
                        ? <XCircle size={13} color="var(--ds-red-500)" style={{ flexShrink: 0 }} />
                        : <CheckCircle2 size={13} color="var(--ds-green-600)" style={{ flexShrink: 0 }} />
                      }
                      <span style={{ fontSize: 13, color: 'var(--ds-text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.name}
                      </span>
                    </div>
                    {r.error
                      ? <span style={{ fontSize: 12, color: 'var(--ds-red-600)', flexShrink: 0, maxWidth: 220, textAlign: 'right', lineHeight: 1.4 }}>{r.error}</span>
                      : <span style={{ fontSize: 12, color: 'var(--ds-text-3)', flexShrink: 0 }}>{r.chunks} chunks</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════ GOOGLE DRIVE TAB ════════ */}
      {tab === 'drive' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="ds-card">
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ds-text-1)', marginBottom: 4 }}>
              Sync Google Drive Folder
            </p>
            <p style={{ fontSize: 13, color: 'var(--ds-text-3)', marginBottom: 20, lineHeight: 1.6 }}>
              Paste a publicly shared Drive folder URL. All supported files (PDF, Word, PowerPoint, Excel)
              will be chunked, embedded, and indexed automatically.
            </p>

            <label className="ds-label-text">Drive folder URL or ID</label>
            <div className="ds-input-row" style={{ marginBottom: 8 }}>
              <div className="ds-input-group" style={{ flex: 1 }}>
                <Link2 size={13} className="ds-input-icon" />
                <input
                  type="text"
                  value={folderUrl}
                  onChange={e => setFolderUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/…"
                  className="ds-input ds-input-has-icon"
                  style={{ fontSize: 13 }}
                />
              </div>
              <button
                onClick={startSync}
                disabled={driveBusy || !folderUrl.trim()}
                className="ds-btn ds-btn-primary"
              >
                {driveBusy
                  ? <><RefreshCw size={13} style={{ animation: 'ds-spin 0.75s linear infinite' }} /> Syncing…</>
                  : <><Play size={13} /> Sync</>
                }
              </button>
            </div>
            <p className="ds-field-hint">Folder must be set to "Anyone with the link can view" in Drive.</p>

            {syncError && (
              <div className="ds-alert ds-alert-error" style={{ marginTop: 12 }}>
                <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                {syncError}
              </div>
            )}
          </div>

          {syncJob && (
            <div className="ds-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-1)' }}>
                  Job {syncJob.job_id.slice(0, 8)}…
                </span>
                <StatusBadge status={syncJob.status} />
              </div>

              <div className="ds-grid-4" style={{ marginBottom: 16 }}>
                {([
                  { label: 'Found',   value: syncJob.files_found,   color: 'var(--ds-blue-600)' },
                  { label: 'Indexed', value: syncJob.files_indexed,  color: 'var(--ds-green-600)' },
                  { label: 'Skipped', value: syncJob.files_skipped ?? 0, color: 'var(--ds-orange-600)' },
                  { label: 'Chunks',  value: syncJob.chunks_stored,  color: 'var(--ds-blue-600)' },
                ] as const).map(s => (
                  <div key={s.label} style={{
                    background: 'var(--ds-bg-3)', border: '1px solid var(--ds-border)',
                    borderRadius: 10, padding: '10px 14px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--ds-text-3)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {syncJob.indexed_files?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-green-600)', marginBottom: 6 }}>
                    Indexed ({syncJob.indexed_files.length})
                  </p>
                  {syncJob.indexed_files.map((name, i) => (
                    <p key={i} style={{ fontSize: 12, color: 'var(--ds-text-2)', paddingLeft: 12, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={11} color="var(--ds-green-600)" /> {name}
                    </p>
                  ))}
                </div>
              )}

              {syncJob.skipped_files?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-orange-600)', marginBottom: 6 }}>
                    Skipped ({syncJob.skipped_files.length})
                  </p>
                  {syncJob.skipped_files.map((name, i) => (
                    <p key={i} style={{ fontSize: 12, color: 'var(--ds-text-3)', paddingLeft: 12, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <XCircle size={11} color="var(--ds-orange-500)" /> {name}
                    </p>
                  ))}
                </div>
              )}

              {syncJob.message && (
                <p style={{ fontSize: 12, color: syncJob.status === 'error' ? 'var(--ds-red-600)' : 'var(--ds-text-3)' }}>
                  {syncJob.message}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════ GCP DOCS TAB ════════ */}
      {tab === 'gcp' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="ds-card">
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ds-text-1)', marginBottom: 4 }}>
              Google Cloud Documentation
            </p>
            <p style={{ fontSize: 13, color: 'var(--ds-text-3)', marginBottom: 20, lineHeight: 1.6 }}>
              Crawls{' '}
              <span style={{ color: 'var(--ds-blue-600)', fontWeight: 500 }}>cloud.google.com/docs</span>,
              scrubs PII, chunks text, embeds with Cohere, and stores in Qdrant.
            </p>

            <label className="ds-label-text">Max pages to crawl</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
              <input
                type="number"
                value={maxPages}
                min={1} max={500}
                onChange={e => setMaxPages(Number(e.target.value))}
                className="ds-input"
                style={{ width: 120, fontSize: 14 }}
              />
              <span style={{ fontSize: 13, color: 'var(--ds-text-3)' }}>pages (max 500)</span>
            </div>

            <button
              onClick={() => startIngest(maxPages)}
              disabled={gcpBusy}
              className="ds-btn ds-btn-primary ds-btn-md"
            >
              {gcpBusy
                ? <><RefreshCw size={13} style={{ animation: 'ds-spin 0.75s linear infinite' }} /> Crawling…</>
                : <><Play size={14} /> Start Ingestion</>
              }
            </button>
          </div>

          {job && (
            <div className="ds-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-1)' }}>
                  Job {job.job_id.slice(0, 8)}…
                </span>
                <StatusBadge status={status} />
              </div>

              <div className="ds-grid-2" style={{ marginBottom: 12 }}>
                {[
                  { label: 'Docs crawled',  value: job.docs_crawled,  color: 'var(--ds-blue-600)' },
                  { label: 'Chunks stored', value: job.chunks_stored, color: 'var(--ds-green-600)' },
                ].map(s => (
                  <div key={s.label} style={{
                    background: 'var(--ds-bg-3)', border: '1px solid var(--ds-border)',
                    borderRadius: 10, padding: '12px 16px',
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--ds-text-3)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {job.message && (
                <p style={{ fontSize: 12, color: status === 'error' ? 'var(--ds-red-600)' : 'var(--ds-text-3)' }}>
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
