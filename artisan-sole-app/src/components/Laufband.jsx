/**
 * Laufband — der Fortschritt einer Scrollfolge.
 *
 * ── Warum es alle vier Folgen bekommen ────────────────────────────────────
 *
 * Eine klebende Bühne ist der einzige Ort einer Seite, an dem Scrollen nichts
 * zu bewegen scheint: Das Bild steht, die Seite steht, und wer nicht weiß,
 * dass gleich der nächste Schritt kommt, hält es für eine Seite, die hängt.
 *
 * Die Aufbaufolge hatte dafür von Anfang an dieses Band. Der Sohlenstapel
 * hatte stattdessen sieben Striche, einer je Teil, der laufende etwas
 * länger. Das war als Zähler gedacht und las sich nicht als einer: Sieben
 * Haarstriche nebeneinander sind ein Zierrat, kein Stand. Auf schwarzem
 * Grund kam dazu, dass sie in Schwarz gezeichnet waren und damit gar nicht
 * zu sehen. Maßnehmen und Pflege hatten links eine Liste, die auf dem
 * Telefon ausgeblendet ist — dort gab es also überhaupt keinen Fortschritt.
 *
 * Jetzt steht unter jeder Folge dasselbe: links, woran gerade gearbeitet
 * wird, rechts eine Zahl, die durchläuft, darunter ein Balken, der auf 100
 * zuläuft. Das Wichtigste daran ist nicht der Stand, sondern dass es ein
 * Ende gibt — mit einem Balken scrollt man weiter, um ihn vollzumachen.
 *
 * Die Zahl zählt den echten Fortschritt und nicht die Schritte: Sie läuft
 * durch, während der Name springt, und genau dieser Unterschied macht, dass
 * es sich nach Maschine anfühlt und nicht nach Diaschau.
 *
 * Alle vier Folgen stehen auf #111, deshalb gibt es nur die helle Fassung.
 * Käme je eine auf hellen Grund, wäre hier ein `dunkel`-Schalter fällig und
 * kein zweites Band.
 *
 * ── Was links steht ──────────────────────────────────────────────────────
 *
 * Das entscheidet der Aufrufer, und zwar nach einer Regel: Steht der Name
 * des Schritts ohnehin unmittelbar darunter, gehört er nicht auch noch ins
 * Band. Genau das passierte beim Sohlenstapel auf dem Telefon — „Die
 * Doppelnaht" im Band, vierzig Pixel tiefer „Die Doppelnaht" in Versalien.
 * Dort steht deshalb der Zähler („Teil 06 von 07"), in der Aufbaufolge der
 * Name: Dort liegt der Text am anderen Ende der Bühne, und die Wiederholung
 * fällt nicht als eine auf.
 *
 * @param {string} titel Was links steht: der Schritt oder der Zähler.
 * @param {number} fortschritt 0 … 1, wie ihn die Bühne meldet.
 */
export default function Laufband({ titel, fortschritt, className = '' }) {
  const stand = Math.round(Math.min(1, Math.max(0, fortschritt)) * 100)
  return (
    <div className={`w-full max-w-xs ${className}`}>
      <div className="flex items-baseline justify-between gap-6">
        <p className="text-[10px] uppercase tracking-[0.26em] text-white/70 truncate">
          {titel}
        </p>
        <p className="text-[11px] tabular-nums text-white/40 tracking-[0.1em] shrink-0">
          {String(stand).padStart(3, '0')}
        </p>
      </div>
      <div className="relative h-px bg-white/15 mt-3" aria-hidden="true">
        <div
          className="absolute left-0 top-0 h-px bg-white/70 transition-[width] duration-150 ease-out"
          style={{ width: `${stand}%` }}
        />
      </div>
    </div>
  )
}
