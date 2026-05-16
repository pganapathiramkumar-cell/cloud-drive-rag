import client from './client'

export interface DriveConnectStatus {
  connected: boolean
  auth_url?: string
}

export interface DriveSyncStatus {
  job_id: string
  status: 'queued' | 'running' | 'done' | 'error'
  folder_id: string
  files_found: number
  files_indexed: number
  files_skipped: number
  chunks_stored: number
  message: string
  indexed_files: string[]
  skipped_files: string[]
}

export const driveApi = {
  async getStatus(): Promise<DriveConnectStatus> {
    const { data } = await client.get('/v1/drive/status')
    return data
  },

  async startAuth(): Promise<DriveConnectStatus> {
    const { data } = await client.get('/v1/drive/auth')
    return data
  },

  async disconnect(): Promise<void> {
    await client.delete('/v1/drive/disconnect')
  },

  async syncFolder(folder_id: string): Promise<DriveSyncStatus> {
    const { data } = await client.post('/v1/drive/sync', { folder_id })
    return data
  },

  async syncPublicFolder(folder_id: string): Promise<DriveSyncStatus> {
    const { data } = await client.post('/v1/drive/sync-public', { folder_id })
    return data
  },

  async getSyncStatus(job_id: string): Promise<DriveSyncStatus> {
    const { data } = await client.get(`/v1/drive/sync/${job_id}`)
    return data
  },
}
