import { Component } from 'react'

// Detect chunk-load failures from stale HTML pointing at hashes that vanished
// after a new deploy. Auto-reload bypasses the cached index.html.
const CHUNK_LOAD_PATTERNS = [
  /Loading chunk \d+ failed/i,
  /Importing a module script failed/i,
  /Failed to fetch dynamically imported module/i,
  /Unable to preload CSS/i,
  /ChunkLoadError/i,
]

const RELOAD_GUARD_KEY = '__atelier_chunk_reload_at'

function isChunkLoadError(error) {
  const msg = error?.message || String(error || '')
  return CHUNK_LOAD_PATTERNS.some(re => re.test(msg))
}

// Hard-reload at most once per 10 s so a permanent error doesn't loop forever.
function tryHardReload() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0)
    if (Date.now() - last < 10_000) return false
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
  } catch { /* sessionStorage blocked — reload anyway */ }
  window.location.reload()
  return true
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
    if (isChunkLoadError(error)) tryHardReload()
  }

  render() {
    if (this.state.hasError) {
      const chunkErr = isChunkLoadError(this.state.error)
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white px-8 text-center">
          <span className="font-brand text-lg text-black mb-10">
            ARTISAN SOLE
          </span>
          <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="font-playfair text-2xl text-black mb-3">
            {chunkErr ? 'Neue Version verfügbar' : 'Etwas ist schiefgelaufen'}
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed mb-8 max-w-xs">
            {chunkErr
              ? 'Die Seite wird neu geladen, um die aktuelle Version zu öffnen.'
              : 'Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu oder kehren Sie zur Startseite zurück.'}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-black text-white text-xs font-semibold uppercase tracking-widest px-8 py-4 rounded-lg"
          >
            Zur Startseite
          </button>
          <button
            onClick={() => {
              if (chunkErr) { tryHardReload(); return }
              this.setState({ hasError: false, error: null })
            }}
            className="mt-3 text-xs text-gray-400 underline bg-transparent border-0"
          >
            {chunkErr ? 'Jetzt neu laden' : 'Erneut versuchen'}
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

// Catch chunk-load errors that escape the React tree (e.g. prefetchRoute()).
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (isChunkLoadError(e.error || e)) tryHardReload()
  })
  window.addEventListener('unhandledrejection', (e) => {
    if (isChunkLoadError(e.reason)) tryHardReload()
  })
}
