/**
 * PasskeyPanel.jsx — Anmeldung ohne Passwort verwalten.
 *
 * Steht an zwei Stellen: in den Einstellungen jedes Kunden und im
 * Verwaltungsbereich. Neue Konten entstehen von vornherein ohne Passwort;
 * hier legt sich ein Konto von früher denselben Weg zu, und jedes Konto ein
 * zweites Gerät.
 *
 * Statt eines Passworts tritt Fingerabdruck, Gesicht oder Geräte-PIN. Anders
 * als ein Passwort lässt sich das nicht abgreifen: Der Schlüssel ist an die
 * Domain gebunden, eine nachgebaute Anmeldeseite bekommt ihn nicht heraus.
 *
 * Der Hinweis auf ein zweites Gerät ist kein Beiwerk. Ein Schlüssel, der nur
 * auf einem Telefon liegt, geht mit diesem Telefon verloren — beim
 * Verwaltungszugang stünde man dann vor dem eigenen Laden.
 */
import { useState, useEffect } from 'react'
import { KeyRound, Trash2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { startRegistration } from '@simplewebauthn/browser'
import { apiFetch } from '../hooks/useApi'

const supported = typeof window !== 'undefined'
  && !!window.PublicKeyCredential
  && !!navigator.credentials

export default function PasskeyPanel() {
  const [keys, setKeys] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)   // { ok: bool, text }

  const load = () => apiFetch('/api/auth/passkey').then(setKeys).catch(() => setKeys([]))
  useEffect(() => { load() }, [])

  const add = async () => {
    setBusy(true); setMsg(null)
    try {
      const { challengeId, options } = await apiFetch('/api/auth/passkey/register/options', { method: 'POST' })
      const response = await startRegistration({ optionsJSON: options })
      const label = window.prompt('Name für dieses Gerät (z. B. „iPhone" oder „MacBook"):', '') || ''
      await apiFetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        body: JSON.stringify({ challengeId, response, label }),
      })
      setMsg({ ok: true, text: 'Passkey hinterlegt.' })
      load()
    } catch (e) {
      // Ein Abbruch durch den Nutzer ist kein Fehler und braucht keine Meldung.
      const name = e?.name || ''
      if (name === 'NotAllowedError' || name === 'AbortError') setMsg(null)
      else setMsg({ ok: false, text: e?.error || e?.message || 'Konnte nicht angelegt werden' })
    } finally { setBusy(false) }
  }

  const remove = async (k) => {
    if (!confirm(`„${k.label}" wirklich entfernen?`)) return
    try {
      await apiFetch(`/api/auth/passkey/${k.id}`, { method: 'DELETE' })
      load()
    } catch (e) { setMsg({ ok: false, text: e?.error || 'Konnte nicht entfernt werden' }) }
  }

  if (!supported) {
    return (
      <div className="border border-black/[0.08] px-5 py-5">
        <p className="text-[13px] font-light text-black/60">
          Dieser Browser unterstützt keine Passkeys.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-black/[0.08] px-5 py-5">
      <div className="flex items-start gap-3 mb-4">
        <KeyRound size={16} strokeWidth={1.4} className="text-black/40 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[14px] font-light text-black/80">Ohne Passwort anmelden</p>
          <p className="text-[12px] text-black/40 font-light mt-1 leading-relaxed">
            Anmelden mit Fingerabdruck, Gesicht oder Geräte-PIN statt Passwort. Legen Sie
            das auf jedem Gerät an, das Sie nutzen, dann kommen Sie überall herein, ohne
            sich etwas zu merken.
          </p>
        </div>
      </div>

      {keys === null ? (
        <p className="text-[12px] text-black/30 font-light py-3">Laden…</p>
      ) : keys.length === 0 ? (
        <p className="text-[12px] text-black/35 font-light py-3">Noch kein Passkey hinterlegt.</p>
      ) : (
        <div className="mb-4">
          {keys.map(k => (
            <div key={k.id} className="flex items-center gap-3 py-2.5 border-b border-black/[0.05] last:border-0">
              <span className="flex-1 min-w-0">
                <span className="text-[13px] font-light text-black/75 block truncate">{k.label}</span>
                <span className="text-[11px] text-black/30 font-light">
                  seit {String(k.created_at).slice(0, 10)}
                  {k.last_used_at ? ` · zuletzt ${String(k.last_used_at).slice(0, 10)}` : ' · noch nicht benutzt'}
                </span>
              </span>
              <button onClick={() => remove(k)} aria-label="Passkey entfernen"
                className="w-9 h-9 flex items-center justify-center bg-transparent border-0 text-black/25 hover:text-red-600 transition-colors">
                <Trash2 size={14} strokeWidth={1.4} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Ein einziger Passkey ist ein Klumpenrisiko: Geht das Gerät verloren,
          bleibt nur noch das Passwort. Der Hinweis steht dort, wo er wirkt. */}
      {keys?.length === 1 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 px-3 py-2.5 mb-4">
          <AlertCircle size={13} className="text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={1.6} />
          <p className="text-[11px] text-amber-900 font-light leading-relaxed">
            Legen Sie einen zweiten Passkey auf einem anderen Gerät an, Telefon
            und Rechner. Sonst hängt der bequeme Zugang an einem einzigen Gerät.
          </p>
        </div>
      )}

      {msg && (
        <div className={`flex items-start gap-2 px-3 py-2.5 mb-4 border ${msg.ok ? 'border-black/10 bg-black/[0.02]' : 'border-red-200 bg-red-50'}`}>
          {msg.ok
            ? <CheckCircle2 size={13} className="text-green-700 flex-shrink-0 mt-0.5" strokeWidth={1.6} />
            : <AlertCircle size={13} className="text-red-600 flex-shrink-0 mt-0.5" strokeWidth={1.6} />}
          <p className={`text-[12px] font-light ${msg.ok ? 'text-black/70' : 'text-red-800'}`}>{msg.text}</p>
        </div>
      )}

      <button onClick={add} disabled={busy}
        className="h-11 px-6 flex items-center gap-2 border border-black text-black text-[11px] uppercase tracking-[0.18em] font-light bg-transparent hover:bg-black hover:text-white transition-colors disabled:opacity-30">
        <Plus size={13} strokeWidth={1.5} /> {busy ? 'Einen Moment…' : 'Passkey hinzufügen'}
      </button>
    </div>
  )
}
