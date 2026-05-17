import { useState } from 'react'
import Header from './components/layout/Header'
import ChatWindow from './components/chat/ChatWindow'
import IngestPanel from './components/ingest/IngestPanel'
import MetricsDashboard from './components/metrics/MetricsDashboard'
import AnalyticsDashboard from './components/metrics/AnalyticsDashboard'
import ChatWorkflowTab from './components/workflow/ChatWorkflowTab'

type Tab = 'chat' | 'workflow' | 'ingest' | 'metrics' | 'analytics'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat')

  return (
    <div className="ds-app">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="ds-main">
        {activeTab === 'chat' && <ChatWindow />}

        {activeTab === 'workflow' && <ChatWorkflowTab />}

        {activeTab === 'ingest' && (
          <div className="ds-scroll-area">
            <IngestPanel />
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="ds-scroll-area">
            <MetricsDashboard />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="ds-scroll-area">
            <AnalyticsDashboard />
          </div>
        )}
      </main>
    </div>
  )
}
