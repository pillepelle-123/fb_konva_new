import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './app.tsx'
import './styles/app.css'
import './utils/theme-verification'

createRoot(document.getElementById('root')!).render(
  <App />
)
