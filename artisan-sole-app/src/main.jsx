import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Der Service Worker war seit jeher ein reiner No-Op (public/sw.js enthält
// nur einen leeren fetch-Listener). Er bringt weder Offline-Betrieb noch
// Zwischenspeicher, kontrolliert aber die Seite und steht damit zwischen
// Browser und Server — bei Auslieferungsproblemen eine zusätzliche
// Fehlerquelle ohne Gegenwert. Statt ihn erneut zu registrieren, melden wir
// vorhandene Registrierungen ab, damit auch Browser, die ihn noch tragen,
// wieder direkt vom Server laden.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(regs => regs.forEach(r => r.unregister()))
    .catch(() => {})
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
