import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './app.tsx'
import './styles/app.css'

createRoot(document.getElementById('root')!).render(
  <App />
)
