import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './app.tsx'
import './styles/app.css'
import './utils/theme-verification'
import { FONT_GROUPS } from './utils/font-families'
import { FONT_GROUPS } from './utils/font-families'

// Preload all fonts by creating hidden elements
const fontPreloader = document.createElement('div')
fontPreloader.style.position = 'absolute'
fontPreloader.style.left = '-9999px'
fontPreloader.style.visibility = 'hidden'

FONT_GROUPS.forEach(group => {
  group.fonts.forEach(font => {
    const span = document.createElement('span')
    span.style.fontFamily = font.family
    span.textContent = 'Load'
    fontPreloader.appendChild(span)
    
    if (font.bold) {
      const boldSpan = document.createElement('span')
      boldSpan.style.fontFamily = font.bold
      boldSpan.textContent = 'Load'
      fontPreloader.appendChild(boldSpan)
    }
    
    if (font.italic) {
      const italicSpan = document.createElement('span')
      italicSpan.style.fontFamily = font.italic
      italicSpan.textContent = 'Load'
      fontPreloader.appendChild(italicSpan)
    }
  })
})

document.body.appendChild(fontPreloader)

document.fonts.ready.then(() => {
  createRoot(document.getElementById('root')!).render(
    <App />
  )
})
