import { LogOut, Database, BarChart2 } from 'lucide-react'
import { getUserInfo, logout } from '../../auth/keycloak'

interface Props {
  activeTab: 'chat' | 'ingest' | 'metrics'
  onTabChange: (tab: 'chat' | 'ingest' | 'metrics') => void
}

export default function Header({ activeTab, onTabChange }: Props) {
  const user = getUserInfo()
  const isAdmin = user.roles.includes('admin')

  return (
    <header className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-6 py-3">
      <div className="flex items-center gap-4">
        <span className="text-lg font-semibold text-brand-500">Enterprise RAG</span>

        <nav className="flex gap-1">
          <button
            onClick={() => onTabChange('chat')}
            className={`rounded px-3 py-1.5 text-sm transition-colors ${
              activeTab === 'chat'
                ? 'bg-brand-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Chat
          </button>

          {isAdmin && (
            <button
              onClick={() => onTabChange('ingest')}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors ${
                activeTab === 'ingest'
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Database size={14} />
              Ingest
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => onTabChange('metrics')}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors ${
                activeTab === 'metrics'
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BarChart2 size={14} />
              Metrics
            </button>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-400">
        <span>{user.email || user.userId}</span>
        <button
          onClick={logout}
          className="flex items-center gap-1 rounded px-2 py-1 hover:bg-gray-800 hover:text-white"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </header>
  )
}
