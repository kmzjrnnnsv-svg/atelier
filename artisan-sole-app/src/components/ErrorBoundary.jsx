import { Component } from 'react'

/**
 * ErrorBoundary
 *
 * Strategie für Chunk-Load-Fehler (stale HTML zeigt auf Hashes, die nach
 * einem Deploy nicht mehr existieren):
 *   1. SOFORT hart neu laden — niemals eine Zwischenseite anzeigen.
 *   2. Reload nutzt einen Cache-Bust-Query, damit auch hartnäckige CDN-/
 *      Browser-Caches der index.html umgangen werden.
 *   3. Reload-Counter pro Session: bei mehr als 2 Reloads in 30 s gilt der
 *      Fehler als persistent — dann zeigen wir EINMAL einen Hinweis und
 *      schicken den User zur Startseite. Verhindert Infinite-Reload-Loops
 *      OHNE den User mit der Zwischenseite zu belästigen.
 */

const CHUNK_LOAD_PATTERNS = [
  /Loading chunk \d+ failed/i,
  /Importing a module script failed/i,
  /Failed to fetch dynamically imported module/i,
  /Unable to preload CSS/i,
  /ChunkLoadError/i,
]

const RELOAD_COUNT_KEY = '__atelier_chunk_reloads'   // JSON [timestamp, …]
const RELOAD_WINDOW_MS = 30_000
const RELOAD_LIMIT     = 2  // 3. Versuch → permanent

function isChunkLoadError(error) {
  const msg = error?.message || String(error || '')
  return CHUNK_LOAD_PATTERNS.some(re => re.test(msg))
}

function recentReloadCount() {
  try {
    const arr = JSON.parse(sessionStorage.getItem(RELOAD_COUNT_KEY) || '[]')
    const cutoff = Date.now() - RELOAD_WINDOW_MS
    return arr.filter(t => t > cutoff).length
  } catch { return 0 }
}

function recordReload() {
  try {
    const arr = JSON.parse(sessionStorage.getItem(RELOAD_COUNT_KEY) || '[]')
    const cutoff = Date.now() - RELOAD_WINDOW_MS
    const fresh = arr.filter(t => t > cutoff).concat(Date.now())
    sessionStorage.setItem(RELOAD_COUNT_KEY, JSON.stringify(fresh))
  } catch { /* ignore */ }
}

// Cache-Bust-Reload — hängt einen Zeitstempel an, damit Browser-Cache,
// CDN-Cache und etwaige Service-Worker-Caches die index.html neu holen.
function reloadWithBust() {
  try {
    // ServiceWorker-Caches leeren (falls vorhanden) — non-blocking
    if ('caches' in window) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {})
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(regs => regs.forEach(r => r.update().catch(() => {})))
        .catch(() => {})
    }
  } catch { /* ignore */ }

  recordReload()
  const u = new URL(window.location.href)
  u.searchParams.set('_v', String(Date.now()))
  window.location.replace(u.toString())
}

// Hard reload bei Chunk-Fehler — nichts anzeigen, sofort.
// Gibt true zurück, wenn Reload ausgeführt wurde, false wenn Limit erreicht.
function tryHardReload() {
  if (recentReloadCount() >= RELOAD_LIMIT) return false
  reloadWithBust()
  return true
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, isChunkErr: false, reloadFailed: false }
  }

  static getDerivedStateFromError(error) {
    const isChunkErr = isChunkLoadError(error)
    return { hasError: true, error, isChunkErr, reloadFailed: false }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
    if (isChunkLoadError(error)) {
      const ok = tryHardReload()
      if (!ok) this.setState({ reloadFailed: true })
    }
  }

  render() {
    if (this.state.hasError) {
      // Chunk-Fehler + Reload läuft → nichts zeigen (Browser wechselt gleich)
      if (this.state.isChunkErr && !this.state.reloadFailed) {
        return null
      }

      // Echter Fehler (oder Reload-Limit erreicht) → freundliche Meldung
      const chunkErr = this.state.isChunkErr
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white px-8 text-center">
          <span className="font-brand text-lg text-black mb-10">ARTISAN SOLE</span>
          <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="font-playfair text-2xl text-black mb-3">
            {chunkErr ? 'Seite kann nicht geladen werden' : 'Etwas ist schiefgelaufen'}
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed mb-8 max-w-xs">
            {chunkErr
              ? 'Bitte leeren Sie den Browser-Cache (Cmd/Ctrl + Shift + R) und versuchen Sie es erneut.'
              : 'Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu oder kehren Sie zur Startseite zurück.'}
          </p>
          <button
            onClick={() => {
              try { sessionStorage.removeItem(RELOAD_COUNT_KEY) } catch {}
              // window.location.href = '/' funktioniert nicht, wenn die URL
              // bereits '/' ist (same-doc-Navigation wird unterdrückt).
              // Daher replace() mit Cache-Bust — erzwingt vollständigen Reload.
              const u = new URL('/', window.location.origin)
              u.searchParams.set('_v', String(Date.now()))
              window.location.replace(u.toString())
            }}
            className="bg-black text-white text-xs font-semibold uppercase tracking-widest px-8 py-4 rounded-lg"
          >
            Zur Startseite
          </button>
          <button
            onClick={() => {
              try { sessionStorage.removeItem(RELOAD_COUNT_KEY) } catch {}
              if (chunkErr) { reloadWithBust(); return }
              this.setState({ hasError: false, error: null })
            }}
            className="mt-3 text-xs text-gray-400 underline bg-transparent border-0"
          >
            {chunkErr ? 'Hart neu laden' : 'Erneut versuchen'}
          </button>
          {this.state.error && !chunkErr && (
            <pre className="mt-6 text-[10px] text-left text-red-400 bg-red-50 p-3 rounded max-w-xs overflow-auto max-h-32">
              {this.state.error.message}{'\n'}{this.state.error.stack?.split('\n').slice(0, 4).join('\n')}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

// Globale Listener: Chunk-Fehler aus prefetchRoute() oder anderen async-
// Quellen abfangen UND verhindern, dass sie als unhandled-Error im Browser-
// Devtools erscheinen. Default-Verhalten unterdrücken, sofort reload.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (isChunkLoadError(e.error || e)) {
      e.preventDefault?.()
      tryHardReload()
    }
  })
  window.addEventListener('unhandledrejection', (e) => {
    if (isChunkLoadError(e.reason)) {
      e.preventDefault?.()
      tryHardReload()
    }
  })
}
