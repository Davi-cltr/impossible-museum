import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './styles/base.css'
import './styles/entrada.css'
import './styles/hud.css'
import './styles/paineis.css'
import gsap from 'gsap'
import App from './App.tsx'

;(window as unknown as { __gsap: typeof gsap }).__gsap = gsap

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
