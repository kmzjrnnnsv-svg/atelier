/**
 * Schrittleiste — „← Futter 6/9 →", wie bei Nike By You.
 *
 * Der Konfigurator war eine lange Seite, auf der alle Schritte gleichzeitig
 * standen und die späteren grau blieben, bis die früheren gewählt waren. Wer
 * scrollte, sah vor allem, was er noch nicht durfte. Jetzt steht immer genau
 * ein Schritt da, und diese Leiste sagt, welcher es ist, wie viele noch
 * kommen und wie man vor und zurück kommt.
 *
 * Zurück geht immer. Vor geht erst, wenn im Schritt etwas gewählt ist: Ohne
 * Wahl gäbe es in der Bestellung eine Lücke, und die Werkstatt müsste raten.
 */
import { ArrowLeft, ArrowRight, Menu } from 'lucide-react'

export default function Schrittleiste({ schritt, nummer, anzahl, zurueckFrei, weiterFrei, onZurueck, onWeiter, onMenue }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onZurueck}
        disabled={!zurueckFrei}
        aria-label="Vorheriger Schritt"
        className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full bg-transparent border-0 c-tinte hover:bg-black/[0.05] disabled:opacity-25 transition-colors"
      >
        <ArrowLeft size={20} strokeWidth={1.4} />
      </button>

      <p className="t-lead c-tinte text-center min-w-0 truncate" aria-live="polite">
        {schritt}
        <span className="t-klein c-leise ml-2.5 tabular-nums align-middle">{nummer}/{anzahl}</span>
      </p>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onWeiter}
          disabled={!weiterFrei}
          aria-label="Nächster Schritt"
          className="w-11 h-11 flex items-center justify-center rounded-full bg-transparent border-0 c-tinte hover:bg-black/[0.05] disabled:opacity-25 transition-colors"
        >
          <ArrowRight size={20} strokeWidth={1.4} />
        </button>
        <button
          type="button"
          onClick={onMenue}
          aria-label="Alle Schritte"
          className="hidden sm:inline-flex t-klein h-11 items-center gap-2 px-4 rounded-full bg-transparent border border-black/15 c-tinte hover:border-black/40 transition-colors"
        >
          <Menu size={16} strokeWidth={1.4} /> Alle Schritte
        </button>
        <button
          type="button"
          onClick={onMenue}
          aria-label="Alle Schritte"
          className="sm:hidden w-11 h-11 flex items-center justify-center rounded-full bg-transparent border border-black/15 c-tinte"
        >
          <Menu size={18} strokeWidth={1.4} />
        </button>
      </div>
    </div>
  )
}
