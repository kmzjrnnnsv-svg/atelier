import { Component } from 'react'
import { istChunkFehler, seiteIstVeraltet } from '../lib/nachladen'

/**
 * ErrorBoundary
 *
 * Strategie für Chunk-Load-Fehler (ein Bündel lässt sich nicht nachladen):
 *
 *   1. Erst fragen, dann handeln. Nennt der Server ein anderes
 *      Einstiegsbündel, hält dieser Browser eine veraltete index.html — dann
 *      und nur dann hilft ein hartes Neuladen, und es geschieht sofort und
 *      ohne Zwischenseite.
 *   2. Sonst hat ein Abruf ausgesetzt. Neuladen bringt dagegen nichts; es
 *      warf den Besucher bisher nur aus dem, was er gerade tat, und beim
 *      dritten Mal in eine Sackgasse. Also gleich die ehrliche Meldung mit
 *      einem Knopf, der es noch einmal versucht.
 *   3. Reload-Zähler pro Sitzung als Schleifenbremse: mehr als 2 Neuladungen
 *      in 30 s gelten als aussichtslos.
 *
 * Der Regelfall wird ohnehin eine Stufe früher abgefangen: `nachladen()` in
 * lib/nachladen wiederholt einen verlorenen Abruf, bevor er hier ankommt.
 */

const RELOAD_COUNT_KEY = '__atelier_chunk_reloads'   // JSON [timestamp, …]
const RELOAD_WINDOW_MS = 30_000
const RELOAD_LIMIT     = 2  // 3. Versuch → permanent

const isChunkLoadError = istChunkFehler

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

// Cache-Bust-Reload, hängt einen Zeitstempel an, damit Browser-Cache,
// CDN-Cache und etwaige Service-Worker-Caches die index.html neu holen.
//
// Das Aufräumen lief bisher „non-blocking", der Reload feuerte unmittelbar
// danach. In der Praxis navigierte die Seite damit weg, bevor auch nur ein
// Cache gelöscht war — der nächste Versuch fand denselben Stand vor und die
// Schleife lief bis zum Limit. Deshalb jetzt abwarten, mit einer kurzen
// Frist, damit ein hängender Aufruf den Reload nicht seinerseits blockiert.
//
// Außerdem wurde ein vorhandener Service Worker nur mit update() angestoßen.
// Das prüft lediglich, ob ein neues Skript vorliegt, und nimmt ihm nicht die
// Kontrolle über die Seite. Zum Auflösen eines festgefahrenen Zustands muss
// er abgemeldet werden.
async function clearClientCaches() {
  const jobs = []
  if ('caches' in window) {
    jobs.push(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))))
  }
  if ('serviceWorker' in navigator) {
    jobs.push(
      navigator.serviceWorker.getRegistrations()
        .then(regs => Promise.all(regs.map(r => r.unregister())))
    )
  }
  if (!jobs.length) return
  // Nicht länger als 1,5 s warten — der Reload ist wichtiger als ein
  // vollständiges Aufräumen.
  await Promise.race([
    Promise.all(jobs).catch(() => {}),
    new Promise(resolve => setTimeout(resolve, 1500)),
  ])
}

function reloadWithBust() {
  recordReload()
  const u = new URL(window.location.href)
  u.searchParams.set('_v', String(Date.now()))
  clearClientCaches()
    .catch(() => {})
    .finally(() => window.location.replace(u.toString()))
}

// Hard reload bei Chunk-Fehler, nichts anzeigen, sofort.
// Gibt true zurück, wenn Reload ausgeführt wurde, false wenn Limit erreicht.
function tryHardReload() {
  if (recentReloadCount() >= RELOAD_LIMIT) return false
  reloadWithBust()
  return true
}

/**
 * Neu laden nur, wenn es etwas ändern kann.
 *
 * Ein Neuladen hilft gegen genau eine Ursache: eine veraltete index.html, die
 * auf Bündel zeigt, die es nicht mehr gibt. Gegen einen ausgesetzten Abruf
 * hilft es nicht — es kostet den Besucher nur seinen Stand. Deshalb wird
 * vorher nachgesehen.
 */
async function reloadWennEsHilft() {
  if (!(await seiteIstVeraltet())) return false
  return tryHardReload()
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
      // Bis die Antwort da ist, bleibt der Bildschirm leer (siehe render).
      // Der Besucher soll keine Fehlermeldung sehen, die eine Sekunde später
      // vom Neuladen weggewischt wird.
      reloadWennEsHilft()
        .then(neugeladen => { if (!neugeladen) this.setState({ reloadFailed: true }) })
        .catch(() => this.setState({ reloadFailed: true }))
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
            {chunkErr ? 'Der Laden lädt gerade nicht' : 'Etwas ist schiefgelaufen'}
          </h1>
          {/* Der frühere Satz bat um „Cmd/Ctrl + Shift + R". Auf einem Telefon
              gibt es diese Tasten nicht, und wer zum ersten Mal hier ist, hat
              keinen Zwischenspeicher, den er leeren könnte — der Rat schickte
              genau die Besucher ins Leere, die ihn zu sehen bekamen. */}
          <p className="text-sm text-gray-400 leading-relaxed mb-8 max-w-xs">
            {chunkErr
              ? 'Ein Teil der Seite kam nicht durch — meist liegt es an einer kurz unterbrochenen Verbindung. Bitte noch einmal versuchen.'
              : 'Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu oder kehren Sie zur Startseite zurück.'}
          </p>
          {/* Beim Ladefehler steht der zweite Versuch vorn: Er ist es, der in
              den allermeisten Fällen genügt. Der Weg zur Startseite bleibt
              daneben stehen, für den Fall, dass er es nicht tut. */}
          <button
            onClick={() => {
              try { sessionStorage.removeItem(RELOAD_COUNT_KEY) } catch {}
              if (chunkErr) { reloadWithBust(); return }
              // window.location.href = '/' funktioniert nicht, wenn die URL
              // bereits '/' ist (same-doc-Navigation wird unterdrückt).
              // Daher replace() mit Cache-Bust, erzwingt vollständigen Reload.
              const u = new URL('/', window.location.origin)
              u.searchParams.set('_v', String(Date.now()))
              window.location.replace(u.toString())
            }}
            className="bg-black text-white text-xs font-semibold uppercase tracking-widest px-8 py-4 rounded-lg"
          >
            {chunkErr ? 'Nochmal versuchen' : 'Zur Startseite'}
          </button>
          <button
            onClick={() => {
              try { sessionStorage.removeItem(RELOAD_COUNT_KEY) } catch {}
              if (chunkErr) {
                const u = new URL('/', window.location.origin)
                u.searchParams.set('_v', String(Date.now()))
                window.location.replace(u.toString())
                return
              }
              this.setState({ hasError: false, error: null })
            }}
            className="mt-3 text-xs text-gray-400 underline bg-transparent border-0"
          >
            {chunkErr ? 'Zur Startseite' : 'Erneut versuchen'}
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

// Globale Listener: Chunk-Fehler aus anderen async-Quellen abfangen UND
// verhindern, dass sie als unhandled-Error in den Entwicklerwerkzeugen
// erscheinen.
//
// Hier wurde bisher blind neu geladen. Das traf auch Ladevorgänge, die
// niemand angefordert hatte — ein vorausgeladenes Bündel etwa —, und riss dem
// Besucher die Seite unter den Fingern weg, obwohl er nichts davon merken
// sollte. Jetzt gilt auch hier: neu laden nur, wenn die Seite veraltet ist.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (isChunkLoadError(e.error || e)) {
      e.preventDefault?.()
      reloadWennEsHilft()
    }
  })
  window.addEventListener('unhandledrejection', (e) => {
    if (isChunkLoadError(e.reason)) {
      e.preventDefault?.()
      reloadWennEsHilft()
    }
  })
}
