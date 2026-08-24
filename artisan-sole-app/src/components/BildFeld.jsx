/**
 * BildFeld — ein Bild wählen, auf dem kurzen Weg.
 *
 * ── Warum nicht über die Mediathek ────────────────────────────────────────
 *
 * Vorher lief ein Bild des Konfigurators durch die Mediathek: Die Datei ging
 * an /api/media, der Server legte sie unter /uploads ab, und im Datensatz
 * stand nur der Pfad. Ausgeliefert wird /uploads aber allein vom Backend.
 * Steht davor ein Webserver, der diesen Pfad nicht durchreicht, bekommt der
 * Browser statt des Bildes die index.html zurück — und zeigt sein
 * Fragezeichen. Das Bild war hochgeladen, in der Mediathek vorhanden und
 * trotzdem nirgends zu sehen.
 *
 * Die Schuhbilder gehen den kürzeren Weg: Die Datei wird im Browser gelesen
 * und als Data-URL im Datensatz gespeichert. Sie hängt damit an keinem Pfad
 * und an keiner Auslieferungsregel — wo der Datensatz ankommt, ist auch das
 * Bild da. Eine Lederprobe ist ohnehin ein Plättchen von wenigen Hundert
 * Pixeln, kein Bildband.
 *
 * Ältere Werte tragen weiterhin einen /uploads-Pfad. `resolveMediaUrl` lässt
 * beide Formen gelten, damit deren Vorschau unverändert funktioniert.
 *
 * ── Warum als eigene Datei ────────────────────────────────────────────────
 *
 * Es gibt jetzt drei Stellen, an denen ein Bild zu einem Konfigurator-Wert
 * gehört: Optionswerte (Sohlen, Rahmen …), Lederarten und Farben. Stünde das
 * Feld dreimal, wichen die Größengrenze und die Fehlermeldung nach dem
 * nächsten Umbau an einer davon ab.
 */
import { useState } from 'react'
import { Upload, X } from 'lucide-react'
import { resolveMediaUrl } from '../lib/mediaUrl'

/** Dieselbe Grenze wie für Schuhbilder (routes/content.js). */
export const MAX_BILD = 3 * 1024 * 1024

/**
 * Für Listen, die als Ganzes ausgeliefert werden, gilt eine engere Grenze.
 *
 * Ein Optionswert steht in der Antwort seiner Gruppe. Lederarten und Farben
 * dagegen kommen komplett: `GET /api/colors` liefert vierzig Einträge an
 * jeden Besucher. Vierzig Bilder zu je drei Megabyte wären ein Laden, der
 * auf dem Telefon nicht mehr aufgeht — deshalb hier ein Megabyte, und das
 * ist für ein Plättchen von wenigen Hundert Pixeln immer noch reichlich.
 */
export const MAX_BILD_LISTE = 1024 * 1024

const megabyte = (n) => `${Math.round(n / (1024 * 1024) * 10) / 10} MB`.replace('.', ',')

export default function BildFeld({ value, onChange, label = 'Bild', hinweis = null, maxBytes = MAX_BILD }) {
  const [fehler, setFehler] = useState(null)

  const dateiLesen = (datei) => {
    if (!datei) return
    setFehler(null)
    // Die Werte gehen mit jeder Antwort an jeden Besucher des Konfigurators.
    // Ein Foto in voller Größe läge dort in jeder einzelnen.
    if (datei.size > maxBytes) {
      setFehler(`Das Bild ist zu groß. Höchstens ${megabyte(maxBytes)}.`)
      return
    }
    const leser = new FileReader()
    leser.onload = e => onChange(e.target.result)
    // Ein Fehlschlag wird gesagt. Ein Feld, in das man eine Datei legt und in
    // dem daraufhin nichts geschieht, ist schlimmer als eine Beschwerde.
    leser.onerror = () => setFehler('Die Datei ließ sich nicht lesen.')
    leser.readAsDataURL(datei)
  }

  // Das Feld wird nach jeder Wahl geleert: Sonst löst dieselbe Datei ein
  // zweites Mal kein change-Ereignis aus.
  const feld = (
    <input
      type="file"
      accept="image/*"
      className="hidden"
      onChange={e => { dateiLesen(e.target.files?.[0]); e.target.value = '' }}
    />
  )

  return (
    <div className="mb-4">
      <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">{label}</label>
      {hinweis && <p className="text-[10px] text-black/35 mb-2 font-light leading-relaxed">{hinweis}</p>}
      <div className="flex flex-wrap gap-2">
        {value ? (
          <div className="relative w-24 group">
            {/* Das Bild ist selbst die Fläche zum Austauschen. Erst entfernen
                und dann neu wählen wären zwei Schritte für eine Absicht. */}
            <label className="block w-24 h-24 overflow-hidden border border-black/10 bg-[#f6f5f3] cursor-pointer">
              <img src={resolveMediaUrl(value)} alt="" className="w-full h-full object-cover" />
              <span className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/40 text-white text-[8px] tracking-[0.16em] uppercase">
                Ersetzen
              </span>
              {feld}
            </label>
            <button
              type="button"
              onClick={() => { setFehler(null); onChange('') }}
              className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-black/20 text-black/60 hover:text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Bild entfernen"
            >
              <X size={10} strokeWidth={1.6} />
            </button>
          </div>
        ) : (
          <label className="w-24 h-24 flex flex-col items-center justify-center border border-dashed border-black/15 text-black/30 hover:border-black/40 hover:text-black/60 cursor-pointer transition-colors">
            <Upload size={14} strokeWidth={1.4} />
            <span className="text-[8px] tracking-[0.16em] uppercase mt-1">Hinzufügen</span>
            {feld}
          </label>
        )}
      </div>
      {fehler && <p role="alert" className="text-[10px] text-red-600 mt-1.5 leading-relaxed">{fehler}</p>}
    </div>
  )
}
