/**
 * ExpressHinweis — was der Kunde über die Express-Linie wissen muss,
 * bevor er sie wählt.
 *
 * ── Warum das nicht bloß ein Werbebanner ist ──────────────────────────────
 *
 * „Rund zwei Wochen statt sechs" liest sich wie ein reiner Vorteil. Ist es
 * aber nicht: Die Zeit wird nicht schneller gearbeitet, sie wird vorweg-
 * genommen. Häufig gewählte Bauteile liegen fertig da, und wer sie nutzt,
 * nimmt damit die Entscheidungen an, die bei ihrer Herstellung getroffen
 * wurden — Leder, Farbe, Ausführung.
 *
 * Wer das erst nach dem Kauf merkt, hat zu Recht das Gefühl, etwas anderes
 * bekommen zu haben als versprochen. Deshalb steht der Hinweis vor der
 * Konfiguration und nicht darunter, und deshalb nennt er den Nachteil zuerst
 * in derselben Schriftgröße wie den Vorteil.
 *
 * Was der Hinweis NICHT sagt, weil es nicht stimmt: dass der Schuh
 * „vorgefertigt" sei. Gezwickt und ausgearbeitet wird auf dem Leisten dieses
 * Kunden, nach seinen Maßen — vorbereitet sind Bauteile, nicht Schuhe. Der
 * Unterschied ist nicht bloß eine Formulierung: An ihm hängt, dass auch
 * dieses Paar eine Einzelanfertigung ist (AGB Ziffer 2.1 und 5).
 */
import { Zap, Clock, Layers } from 'lucide-react'

export default function ExpressHinweis({ wochen = 2, aufpreis = 100, offenGruppen = 0, className = '' }) {
  return (
    <div className={`border border-black/12 bg-[#fafaf9] px-5 py-5 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Zap size={13} strokeWidth={2} className="text-black" />
        <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">Express-Linie</p>
      </div>

      <p className="text-[15px] font-light text-black leading-snug">
        In rund {wochen} Wochen bei Ihnen statt in vier bis sechs.
      </p>

      <div className="mt-4 space-y-3">
        <div className="flex gap-3">
          <Clock size={14} strokeWidth={1.5} className="text-black/30 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-black/55 font-light leading-relaxed">
            Möglich wird das, weil wir für dieses Modell Bauteile vorbereitet vorhalten,
            zugeschnittene Schäfte, fertige Sohlen. Der Weg zum fertigen Paar ist dadurch
            kürzer, nicht die Arbeit daran hastiger.
          </p>
        </div>
        <div className="flex gap-3">
          <Layers size={14} strokeWidth={1.5} className="text-black/30 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-black/55 font-light leading-relaxed">
            <strong className="font-normal text-black/75">Dafür haben Sie weniger zu entscheiden.</strong>{' '}
            {offenGruppen > 0
              ? 'Was an diesem Modell wählbar bleibt, sehen Sie unten, alles Übrige ist durch das vorbereitete Bauteil festgelegt.'
              : 'Leder, Farbe und Ausführung sind durch die vorbereiteten Bauteile festgelegt. Sie wählen Größe und Weite.'}
            {' '}Ein Paar aus der Maßanfertigung ist individueller; dieses hier ist schneller.
          </p>
        </div>
      </div>

      <p className="text-[11px] text-black/35 font-light leading-relaxed mt-4 pt-4 border-t border-black/[0.07]">
        Gezwickt und ausgearbeitet wird trotzdem auf dem Leisten, der für Ihren Fuß bestimmt
        ist, nach Ihren Maßen, in Ihrer Größe und Weite. Es bleibt eine Einzelanfertigung
        und ist deshalb ebenso wenig rückgabefähig wie ein Paar aus der Maßanfertigung.
        {aufpreis > 0 && ` Die kürzere Wartezeit ist mit ${aufpreis} € im Preis enthalten.`}
      </p>
    </div>
  )
}
