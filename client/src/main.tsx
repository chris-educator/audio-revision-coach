import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { initSentry } from './monitoring/sentry'
import { BROWSER_TAB_TITLE } from './constants/branding'
import './index.css'
import { registerServiceWorker } from './utils/registerServiceWorker'

initSentry()

document.title = BROWSER_TAB_TITLE
void registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
