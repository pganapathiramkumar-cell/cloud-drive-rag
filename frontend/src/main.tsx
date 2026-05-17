import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import './design-system.css'
import App from './App'
import AuthGuard from './auth/AuthGuard'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthGuard>
      <App />
    </AuthGuard>
  </React.StrictMode>,
)
