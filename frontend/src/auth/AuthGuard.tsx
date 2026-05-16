import { useEffect, useState } from 'react'
import { initKeycloak } from './keycloak'

const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === 'true'

interface Props { children: React.ReactNode }

export default function AuthGuard({ children }: Props) {
  const [ready, setReady] = useState(SKIP_AUTH)
  const [error, setError] = useState('')

  useEffect(() => {
    if (SKIP_AUTH) return
    initKeycloak()
      .then(() => setReady(true))
      .catch(() => setError('Authentication service unavailable. Check Keycloak is running.'))
  }, [])

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-3">
        <p className="text-red-400">{error}</p>
        <p className="text-xs text-gray-500">
          For local dev without Keycloak, set <code className="text-gray-300">VITE_SKIP_AUTH=true</code> in <code className="text-gray-300">frontend/.env.local</code>
        </p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
