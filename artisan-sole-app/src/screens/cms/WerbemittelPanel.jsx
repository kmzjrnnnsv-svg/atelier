/**
 * WerbemittelPanel.jsx — was Vermittler zeigen dürfen.
 *
 * Bisher war nichts hinterlegt: Jeder Vermittler baute sich sein Material
 * selbst. Bei einer Marke, die von Bildsprache lebt, ist das ein doppeltes
 * Risiko — schlechte Bilder und Aussagen, die das Haus nicht halten kann
 * („in einer Woche geliefert", „lebenslange Garantie").
 *
 * Zwei Arten: Bilder zum Herunterladen und Textbausteine zum Kopieren. Mehr
 * braucht es nicht, und weniger wäre zu wenig.
 */
import { useState, useEffect, useCallback } from 'react'
import { Megaphone, Plus, Trash2, Image as ImageIcon, Type, Eye, EyeOff } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const LEER = { title: '', kind: 'text', body: '', image_data: '', note: '', sort_order: 0, visible: 1 }

export default function WerbemittelPanel() {
  const [mittel, setMittel] = useState([])
  const [laed, setLaed] = useState(true)
  const [entwurf, setEntwurf] = useState(null)
  const [fehler, setFehler] = useState(null)
  const [speichert, setSpeichert] = useState(false)

  const laden = useCallback(async () => {
    setLaed(true)
    try {
      const rows = await apiFetch('/api/werbemittel')
      setMittel(Array.isArray(rows) ? rows : [])
    } catch (e) {
      setFehler(e.error || 'Konnte nicht geladen werden.')
    } finally {
      setLaed(false)
    }
  }, [])

  useEffect(() => { laden() }, [laden])

  const bildLesen = (datei) => {
    if (!datei) return
    // Bilder liegen wie bei den Modellen als Data-URL in der Zeile. Bei einer
    // Handvoll Werbemitteln ist das der einfachere Weg als eine Dateiablage
    // mit eigenem Aufräumen.
    if (datei.size > 2_000_000) {
      setFehler('Das Bild ist größer als 2 MB. Bitte vorher verkleinern.')
      return
    }
    const leser = new FileReader()
    leser.onload = () => setEntwurf(e => ({ ...e, image_data: leser.result, kind: 'bild' }))
    leser.readAsDataURL(datei)
  }

  const speichern = async () => {
    setSpeichert(true); setFehler(null)
    try {
      const { id, ...rumpf } = entwurf
      if (id) await apiFetch(`/api/werbemittel/${id}`, { method: 'PUT', body: JSON.stringify(rumpf) })
      else await apiFetch('/api/werbemittel', { method: 'POST', body: JSON.stringify(rumpf) })
      setEntwurf(null)
      laden()
    } catch (e) {
      setFehler(e.error || 'Speichern fehlgeschlagen.')
    } finally {
      setSpeichert(false)
    }
  }

  const loeschen = async (id) => {
    if (!window.confirm('Dieses Werbemittel entfernen? Vermittler sehen es dann nicht mehr.')) return
    try {
      await apiFetch(`/api/werbemittel/${id}`, { method: 'DELETE' })
      laden()
    } catch (e) {
      setFehler(e.error || 'Löschen fehlgeschlagen.')
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-2 font-light">Partner</p>
          <h1 className="text-[26px] font-extralight text-black tracking-tight">Werbemittel</h1>
          <p className="text-[12px] text-black/35 font-light mt-1.5 max-w-lg leading-relaxed">
            Freigegebene Bilder und Textbausteine. Vermittler finden sie in ihrem
            Konto und können sie kopieren, was hier nicht steht, bauen sie sich
            selbst.
          </p>
        </div>
        <button
          onClick={() => setEntwurf({ ...LEER, sort_order: mittel.length })}
          className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-[10px] uppercase tracking-[0.15em] border-0 flex-shrink-0"
        >
          <Plus size={12} strokeWidth={1.6} /> Neu
        </button>
      </div>

      {fehler && <p className="text-[12px] text-red-700 font-light mb-4">{fehler}</p>}

      {/* ── Maske ──────────────────────────────────────────────────────── */}
      {entwurf && (
        <div className="border border-black/15 p-5 mb-6 flex flex-col gap-4">
          <div className="flex gap-2">
            {[{ k: 'text', l: 'Textbaustein', i: Type }, { k: 'bild', l: 'Bild', i: ImageIcon }].map(t => (
              <button
                key={t.k} onClick={() => setEntwurf({ ...entwurf, kind: t.k })}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] border transition-all ${
                  entwurf.kind === t.k ? 'bg-black text-white border-black' : 'bg-transparent text-black/40 border-black/10'
                }`}
              >
                <t.i size={11} strokeWidth={1.4} /> {t.l}
              </button>
            ))}
          </div>

          <input
            value={entwurf.title}
            onChange={(e) => setEntwurf({ ...entwurf, title: e.target.value })}
            placeholder="Bezeichnung, wofür ist es gedacht?"
            className="h-11 border border-black/10 px-3 text-[13px] font-light focus:outline-none focus:border-black"
          />

          {entwurf.kind === 'text' ? (
            <textarea
              value={entwurf.body || ''}
              onChange={(e) => setEntwurf({ ...entwurf, body: e.target.value })}
              rows={4}
              placeholder="Der Text zum Kopieren. Denken Sie daran, dass er so veröffentlicht wird, wie er hier steht."
              className="border border-black/10 px-3 py-2.5 text-[13px] font-light resize-none focus:outline-none focus:border-black"
            />
          ) : (
            <div>
              <input
                type="file" accept="image/*"
                onChange={(e) => bildLesen(e.target.files?.[0])}
                className="text-[12px] font-light"
              />
              {entwurf.image_data && (
                <img src={entwurf.image_data} alt="" className="mt-3 max-h-48 border border-black/[0.06]" />
              )}
            </div>
          )}

          <input
            value={entwurf.note || ''}
            onChange={(e) => setEntwurf({ ...entwurf, note: e.target.value })}
            placeholder="Hinweis für den Vermittler (freiwillig), z. B. „nur für Instagram-Stories“"
            className="h-10 border border-black/10 px-3 text-[12px] font-light focus:outline-none focus:border-black"
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox" checked={!!entwurf.visible}
              onChange={(e) => setEntwurf({ ...entwurf, visible: e.target.checked ? 1 : 0 })}
              className="w-3.5 h-3.5 accent-black"
            />
            <span className="text-[11px] text-black/45 font-light">Für Vermittler sichtbar</span>
          </label>

          <div className="flex gap-2">
            <button
              onClick={speichern}
              disabled={speichert || !entwurf.title.trim()}
              className="px-6 py-2.5 bg-black text-white text-[10px] uppercase tracking-[0.15em] border-0 disabled:opacity-30"
            >
              {speichert ? '…' : 'Speichern'}
            </button>
            <button
              onClick={() => { setEntwurf(null); setFehler(null) }}
              className="px-5 py-2.5 border border-black/15 bg-white text-[10px] uppercase tracking-[0.15em] text-black/45"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* ── Liste ──────────────────────────────────────────────────────── */}
      {laed ? (
        <p className="text-[12px] text-black/30 font-light">Wird geladen …</p>
      ) : mittel.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone size={28} strokeWidth={0.8} className="text-black/10 mx-auto mb-3" />
          <p className="text-[13px] text-black/35 font-light">Noch nichts hinterlegt.</p>
          <p className="text-[11px] text-black/25 font-light mt-1">
            Solange hier nichts steht, wirbt jeder Vermittler mit eigenem Material.
          </p>
        </div>
      ) : (
        <div className="border border-black/[0.08]">
          {mittel.map((m, i) => (
            <div key={m.id} className={`px-4 py-3 flex items-start justify-between gap-4 ${i > 0 ? 'border-t border-black/[0.05]' : ''}`}>
              <div className="flex items-start gap-3 min-w-0">
                {m.kind === 'bild' && m.image_data ? (
                  <img src={m.image_data} alt="" className="w-14 h-14 object-cover border border-black/[0.06] flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 bg-black/[0.03] flex items-center justify-center flex-shrink-0">
                    <Type size={14} strokeWidth={1.2} className="text-black/25" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] text-black/75 font-light">{m.title}</p>
                  {m.body && <p className="text-[11px] text-black/35 font-light mt-0.5 line-clamp-2">{m.body}</p>}
                  {m.note && <p className="text-[10px] text-black/25 font-light mt-1">{m.note}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span title={m.visible ? 'Sichtbar' : 'Verborgen'}>
                  {m.visible
                    ? <Eye size={13} strokeWidth={1.3} className="text-black/30" />
                    : <EyeOff size={13} strokeWidth={1.3} className="text-black/15" />}
                </span>
                <button
                  onClick={() => setEntwurf(m)}
                  className="text-[10px] uppercase tracking-[0.15em] text-black/35 bg-transparent border-0 p-0"
                >
                  Ändern
                </button>
                <button
                  onClick={() => loeschen(m.id)}
                  className="bg-transparent border-0 p-0 text-black/20 hover:text-red-700 transition-colors"
                >
                  <Trash2 size={13} strokeWidth={1.3} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
