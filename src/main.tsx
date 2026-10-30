import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './ui/theme.css'
import './ui/components.css'
import { applyStoredTheme } from './ui/theme'

applyStoredTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
