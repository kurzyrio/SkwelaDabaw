import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initErrorTelemetry } from './services/errorTelemetryService'

// Initialize early-boot partitioned error telemetry & crash monitoring
initErrorTelemetry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
