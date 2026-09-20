/**
 * Modellwahl — die Stelle, an der man aufhört zu lesen und anfängt zu suchen.
 *
 * ── Warum es sie gibt ─────────────────────────────────────────────────────
 *
 * Die Kollektionen davor führen an die Schuhe heran: drei Jahreszeiten, je
 * ein Modell groß, mit einem Satz darüber, wofür es gebaut ist. Das ist das
 * Herantasten — man sieht einen Schuh und versteht, wozu er gehört.
 *
 * Was fehlte, war das Gegenteil: Wer weiß, dass er einen Loafer sucht, will
 * nicht drei Jahreszeiten lesen. Er will die Loafer sehen. Hier stehen sie,
 * nach der Form sortiert, die ein Käufer ohnehin im Kopf hat.
 *
 * Beides nebeneinander, und keins ersetzt das andere: Die Kapitel oben
 * machen Lust, diese Zeile macht handlich.
 *
 * ── Warum Wörter und keine Knöpfe ─────────────────────────────────────────
 *
 * Fünf gerundete Kästchen mit Zahlen darin sind ein Filter, und ein Filter
 * gehört in einen Webshop. Hier stehen fünf Wörter nebeneinander, und unter
 * dem gewählten liegt ein Strich — so, wie in einem Heft ein Kapitel
 * angestrichen ist. Dieselbe Funktion, andere Tonlage.
 *
 * Die Zahl steht klein daneben und nicht darin: Sie ist eine Auskunft, kein
 * Etikett.
 *
 * ── Zur Bewegung ──────────────────────────────────────────────────────────
 *
 * Das Raster bekommt die gewählte Familie als `key`. React baut es damit neu
 * auf, und die Kacheln kommen gestaffelt herein — dasselbe Enthüllen wie
 * beim ersten Scrollen. Das ist der ganze Unterschied zwischen einer
 * Auswahl, die umschaltet, und einer, die antwortet.
 */
import { useMemo, useState } from 'react'
import Enthuellen from './Enthuellen'
import Kapitelmarke from './Kapitelmarke'
import { FAMILIEN, familieVon } from '../lib/machartFamilien'
import { resolveMediaUrl } from '../lib/mediaUrl'

/* Wie viele Kacheln höchstens stehen. Acht füllen zwei Reihen zu vier und
   lassen die Zeile darunter noch etwas zu sagen haben. Wer mehr will,
   nimmt den Weg in den Katalog. */
const HOECHSTENS = 8

export default function Modellwahl({ shoes = [], oeffnen, zumKatalog }) {
  /* Die Modelle je Familie, einmal gerechnet. Familien ohne Modell fallen
     heraus — ein Wort, hinter dem nichts steht, ist eine Sackgasse. */
  const familien = useMemo(() => {
    const nach = new Map(FAMILIEN.map(f => [f.key, []]))
    for (const s of shoes) {
      const k = familieVon(s)
      if (k) nach.get(k).push(s)
    }
    return FAMILIEN
      .map(f => ({ ...f, schuhe: nach.get(f.key) }))
      .filter(f => f.schuhe.length)
  }, [shoes])

  const [gewaehlt, setGewaehlt] = useState(null)
  const aktiv = familien.find(f => f.key === gewaehlt) || familien[0]

  if (!aktiv) return null

  return (
    <div className="px-5 lg:px-16 pt-16 pb-10 lg:pt-24 lg:pb-14">
      <div className="max-w-6xl mx-auto">
        <Enthuellen>
          <div className="text-center">
            <Kapitelmarke>Die Auswahl</Kapitelmarke>
            <h3 className="satz-titel text-[26px] lg:text-[38px] leading-[1.16] mt-4">
              Oder such dir eins aus.
            </h3>
          </div>
        </Enthuellen>

        {/* Die fünf Wörter. Der Strich unter dem gewählten ist die ganze
            Auszeichnung — keine Fläche, kein Rahmen, keine Farbe. */}
        <Enthuellen verzoegerung={100}>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mt-10 lg:mt-12">
            {familien.map((f) => {
              const an = f.key === aktiv.key
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={an}
                  onClick={() => setGewaehlt(f.key)}
                  className={`group bg-transparent border-0 p-0 inline-flex items-baseline gap-2 text-[11px] uppercase transition-colors ${
                    an ? 'text-black' : 'text-black/40 hover:text-black/70'
                  }`}
                  style={{ letterSpacing: '0.22em' }}
                >
                  <span className="relative pb-1.5">
                    {f.name}
                    <span
                      className="absolute left-0 bottom-0 h-px w-full transition-all duration-500"
                      style={{
                        background: an ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
                        transform: an ? 'scaleX(1)' : 'scaleX(0.3)',
                      }}
                    />
                  </span>
                  <span className="text-[10px] tabular-nums text-black/30">{f.schuhe.length}</span>
                </button>
              )
            })}
          </div>
        </Enthuellen>

        <p className="text-[13px] lg:text-[14px] text-black/45 font-light text-center mt-7 max-w-md mx-auto min-h-[3em]">
          {aktiv.satz}
        </p>

        {/* `key` am Raster: Es wird bei jedem Wechsel neu aufgebaut, und die
            Kacheln kommen gestaffelt herein statt umzuspringen. */}
        <div key={aktiv.key} className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10 mt-8 lg:mt-10">
          {aktiv.schuhe.slice(0, HOECHSTENS).map((schuh, i) => (
            <Enthuellen key={schuh.id} verzoegerung={Math.min(i, 5) * 70}>
              <button
                type="button"
                onClick={() => oeffnen(schuh)}
                className="group block w-full bg-transparent border-0 p-0 text-left"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={resolveMediaUrl(schuh.image)}
                    alt={`${schuh.name}, nach Maß gefertigt`}
                    loading="lazy"
                    className="w-full h-full object-contain transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                  />
                </div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-black/60 mt-3 line-clamp-2 min-h-[2.4em]">
                  {schuh.name}
                </p>
                <p className="text-[12px] text-black/40 font-light mt-0.5">
                  {schuh.price ? `ab ${schuh.price}` : 'auf Anfrage'}
                </p>
              </button>
            </Enthuellen>
          ))}
        </div>

        {aktiv.schuhe.length > HOECHSTENS && (
          <div className="text-center mt-10 lg:mt-12">
            <button
              type="button"
              onClick={zumKatalog}
              className="group bg-transparent border-0 p-0 inline-flex items-center gap-3 text-[11px] uppercase text-black/60 hover:text-black transition-colors"
              style={{ letterSpacing: '0.22em' }}
            >
              <span className="relative pb-1">
                {`Alle ${aktiv.schuhe.length} ${aktiv.name}`}
                <span className="absolute left-0 bottom-0 h-px w-full bg-black/20 group-hover:bg-black/45 transition-colors" />
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
