import client from './client'

export interface UploadResult {
  status: string
  filename: string
  chunks_stored: number
  characters: number
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post('/v1/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
