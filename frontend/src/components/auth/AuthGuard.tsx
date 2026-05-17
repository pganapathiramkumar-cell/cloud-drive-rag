import { useEffect, useState } from 'react'
import { initKeycloak } from '../../auth/keycloak'
import { Bot, AlertCircle } from 'lucide-react'

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

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--ds-bg-3)' }}>
      <div className="ds-card" style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--ds-red-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={24} color="var(--ds-red-600)" />
          </div>
        </div>
        <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--ds-text-1)', marginBottom: 8 }}>
          Authentication Error
        </p>
        <p style={{ fontSize: 13, color: 'var(--ds-text-3)', lineHeight: 1.6, marginBottom: 16 }}>
          {error}
        </p>
        <div className="ds-alert ds-alert-info" style={{ textAlign: 'left' }}>
          For local dev, set{' '}
          <code style={{ background: 'var(--ds-blue-100)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}>
            VITE_SKIP_AUTH=true
          </code>{' '}
          in{' '}
          <code style={{ background: 'var(--ds-blue-100)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}>
            frontend/.env.local
          </code>
        </div>
      </div>
    </div>
  )

  if (!ready) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--ds-bg-3)', gap: 20 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'linear-gradient(135deg, var(--ds-blue-600), var(--ds-blue-700))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(37,99,235,0.30)',
      }}>
        <Bot size={22} color="#fff" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div className="ds-spinner" style={{ width: 28, height: 28 }} />
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text-3)' }}>Authenticating…</p>
      </div>
    </div>
  )

  return <>{children}</>
}
