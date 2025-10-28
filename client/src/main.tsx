import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './app.tsx'
import './styles/app.css'
import './utils/theme-verification'
import { FONT_GROUPS } from './utils/font-families'

const extractFontName = (family: string) => {
  const match = family.match(/['"]([^'"]+)['"]/);
  return match ? match[1] : family.split(',')[0].trim();
}

const fontNames: string[] = [];
FONT_GROUPS.forEach(group => {
  group.fonts.forEach(font => {
    fontNames.push(extractFontName(font.family));
    if (font.bold) fontNames.push(extractFontName(font.bold));
    if (font.italic) fontNames.push(extractFontName(font.italic));
  });
});

Promise.all(
  fontNames.map(name => 
    document.fonts.load(`12px "${name}"`).catch(() => console.warn(`Failed: ${name}`))
  )
).then(() => {
  createRoot(document.getElementById('root')!).render(<App />);
})
