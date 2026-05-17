import { LogOut, Database, BarChart2, Activity, Bot, GitBranch } from 'lucide-react'
import { getUserInfo, logout } from '../../auth/keycloak'

interface Props {
  activeTab: 'chat' | 'workflow' | 'ingest' | 'metrics' | 'analytics'
  onTabChange: (tab: 'chat' | 'workflow' | 'ingest' | 'metrics' | 'analytics') => void
}

interface Tab {
  id:         'chat' | 'workflow' | 'ingest' | 'metrics' | 'analytics'
  label:      string
  icon:       React.ReactNode
  adminOnly?: boolean
}

const TABS: Tab[] = [
  { id: 'chat',      label: 'Chat',         icon: null                      },
  { id: 'workflow',  label: 'ChatWorkflow',  icon: <GitBranch size={13} />   },
  { id: 'ingest',    label: 'Ingest',        icon: <Database size={13} />,   adminOnly: true },
  { id: 'metrics',   label: 'Metrics',       icon: <BarChart2 size={13} />,  adminOnly: true },
  { id: 'analytics', label: 'Analytics',     icon: <Activity size={13} />,   adminOnly: true },
]

export default function Header({ activeTab, onTabChange }: Props) {
  const user     = getUserInfo()
  const isAdmin  = user.roles.includes('admin')
  const email    = user.email || user.userId || 'user'
  const initials = email.slice(0, 2).toUpperCase()

  return (
    <header className="ds-page-header">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>

        {/* ── Left: brand + nav ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          {/* Brand */}
          <div className="ds-brand">
            <div className="ds-brand-logo">
              <Bot size={15} />
            </div>
            <span className="ds-brand-name">Enterprise RAG</span>
            <span className="ds-brand-tag">AI</span>
          </div>

          {/* Nav tabs */}
          <nav className="ds-nav">
            {TABS.map(({ id, label, icon, adminOnly }) => {
              if (adminOnly && !isAdmin) return null
              return (
                <button
                  key={id}
                  onClick={() => onTabChange(id)}
                  className={`ds-nav-tab ${activeTab === id ? 'ds-active' : ''}`}
                >
                  {icon}
                  {label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* ── Right: user chip ── */}
        <div className="ds-user-chip">
          <div className="ds-avatar">{initials}</div>
          <span className="ds-user-email">{email}</span>
          <button
            onClick={logout}
            className="ds-btn ds-btn-danger-ghost ds-btn-sm"
            style={{ marginLeft: '4px' }}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>

      </div>
    </header>
  )
}
