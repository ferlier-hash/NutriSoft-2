import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'
import { AppErrorBoundary } from './components/system/AppErrorBoundary.tsx'
import { initializeObservability } from './lib/observability.ts'

void initializeObservability().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppErrorBoundary><App /></AppErrorBoundary>
    </StrictMode>,
  )
})
