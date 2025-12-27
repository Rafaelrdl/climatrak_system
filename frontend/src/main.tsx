import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from './ErrorFallback.tsx'
import App from './App.tsx'

const root = createRoot(document.getElementById('root')!)

root.render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
  </ErrorBoundary>
)