import { useState } from 'react'
import Header from './components/layout/Header'
import ChatWindow from './components/chat/ChatWindow'
import IngestPanel from './components/ingest/IngestPanel'
import MetricsDashboard from './components/metrics/MetricsDashboard'

type Tab = 'chat' | 'ingest' | 'metrics'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat')

  return (
    <div className="flex h-screen flex-col bg-gray-950 text-gray-100">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-hidden">
        {activeTab === 'chat'    && <ChatWindow />}
        {activeTab === 'ingest'  && (
          <div className="h-full overflow-y-auto">
            <IngestPanel />
          </div>
        )}
        {activeTab === 'metrics' && (
          <div className="h-full overflow-y-auto">
            <MetricsDashboard />
          </div>
        )}
      </main>
    </div>
  )
}
