/**
 * TestHomepage — eine Startseite zur Ansicht, unter /test-homepage.
 *
 * ── Warum es sie gibt ─────────────────────────────────────────────────────
 *
 * Der Laden hat keine Startseite. `/` leitet weiter auf `/collection`
 * (siehe StartRoute): Wer artisansole.com eintippt, steht sofort im Regal.
 * Für jemanden, der die Marke kennt, ist das der kürzeste Weg — für alle
 * anderen der Moment, in dem die Seite nichts erklärt. Und für die Suche ist
 * es ungünstig: Die Adresse mit dem stärksten Gewicht trägt keinen eigenen
 * Inhalt.
 *
 * ── Was diese Fassung versucht ────────────────────────────────────────────
 *
 * Bei 1.300 Euro für ein Paar Schuhe entscheidet nicht der Preis, sondern
 * ob jemand versteht, wofür er ihn zahlt. Diese Seite erzählt das in
 * Kapiteln, und jedes beantwortet eine Frage, die sonst offenbliebe:
 *
 *   1  Erster Blick    Was ist das, und was kostet es?
 *   2  Drei Zahlen     Woran hängt der Preis?
 *   3  Die Modelle     Wie sieht es aus, und wofür ist es gemacht?
 *   4  Das Handwerk    Warum hält das länger als Geklebtes?
 *   5  Das Leder       Woraus besteht es?
 *   6  In eigener Sache Was behaupten wir NICHT?
 *   7  Der Ablauf      Was passiert, wenn ich bestelle?
 *   8  Der Anfang      Wo fange ich an?
 *
 * Am Ende ist keine Frage offen, die vor dem Kauf zählt. Das ist gemeint,
 * wenn hier von einer geschlossenen Geschichte die Rede ist.
 *
 * ── Woher die Texte kommen ────────────────────────────────────────────────
 *
 * Die Geschichte zu jedem Modell ist NICHT erfunden: Sie steht als
 * `description` im Katalog, geschrieben für genau dieses Modell, und wird
 * hier nur größer gesetzt. Fehlt sie, entfällt das Kapitel — lieber drei
 * Modelle mit Geschichte als sechs mit Füllsatz.
 *
 * Erfunden ist das, was über die Machart gesagt wird: was ein Rahmen ist,
 * was Shell Cordovan von Kalbsleder unterscheidet, warum ein Leisten zählt.
 * Das ist Sachwissen über Schuhe und gilt unabhängig von diesem Haus.
 *
 * Bewusst NICHT erfunden ist alles, was sich nachprüfen ließe und dem Haus
 * zugeschrieben würde: kein Gründungsjahr, kein Name einer Manufaktur, kein
 * Ort außer Spanien, keine Auszeichnung, keine Stückzahl, keine Kundenstimme.
 * Eine Marke, deren Alleinstellung die Offenheit über die Machart ist, darf
 * sich keine Geschichte erfinden — der erste, der nachfragt, nimmt ihr damit
 * auch das, was stimmt.
 *
 * ── Die Bilder ────────────────────────────────────────────────────────────
 *
 * Die Modellkapitel tragen die echte Aufnahme aus dem Katalog. Die
 * Stimmungsflächen greifen auf `lib/editorialImages.js` zurück — Stockfotos,
 * als solche im Bestand vermerkt. Sie sind ein Platzhalter, kein Ziel: Was
 * diese Seite trägt, sind eigene Aufnahmen, und dieser Aufbau ist so
 * gebaut, dass sie nur ausgetauscht werden müssen.
 *
 * ── Bewegung ──────────────────────────────────────────────────────────────
 *
 * Über `Enthuellen` und zwei Regeln in index.css, beide zurückhaltend und
 * beide abgeschaltet, wenn das Gerät `prefers-reduced-motion` meldet. Nichts
 * hält jemanden auf — der Inhalt ist von der ersten Sekunde an da. Aus
 * diesem Laden ist einmal eine blockierende Animation entfernt worden, und
 * das zu Recht.
 *
 * ── Nicht indexieren ──────────────────────────────────────────────────────
 *
 * `indexieren: false`, dazu ein Disallow in der robots.txt. Solange zwei
 * Startseiten nebeneinander stehen, gehört nur eine in den Index.
 *
 * Wird dies die echte Startseite: Route auf `/` statt StartRoute,
 * `indexieren` weg, Disallow weg, und `/collection` gibt seinen
 * Sitemap-Eintrag an `/` ab.
 */
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Footprints, Ruler, Hammer, CalendarDays } from 'lucide-react'
import useStore from '../store/store'
import { useSeo } from '../lib/seo'
import { shoePath } from '../lib/shoePath'
import { PreisFuss } from '../lib/preisangabe'
import { preisAlsZahl, preisAlsText } from '../lib/preis'
import { resolveMediaUrl } from '../lib/mediaUrl'
import { SHOES, CRAFT, LIFESTYLE } from '../lib/editorialImages'
import Enthuellen from '../components/Enthuellen'
import RahmenSchnitt from '../components/RahmenSchnitt'
import Ablauf from '../components/Ablauf'

/* ── Bausteine ──────────────────────────────────────────────────────────── */

/** Die kleine gesperrte Zeile über jeder Überschrift. Gliedert die Seite. */
function Kapitelmarke({ children, hell = false }) {
  return (
    <p
      className={`text-[10px] uppercase tracking-[0.3em] ${hell ? 'text-white/45' : 'text-black/30'}`}
    >
      {children}
    </p>
  )
}

/**
 * Drei Zahlen, die den Preis erklären.
 *
 * Keine Werbeworte — Zahlen, die jeder nachhalten kann. „Über 200
 * Arbeitsschritte" steht auch im Konfigurator und im Ablauf; sie hier zu
 * nennen ist keine neue Behauptung, sondern dieselbe an der Stelle, an der
 * jemand zum ersten Mal auf den Preis trifft.
 */
const ZAHLEN = [
  { icon: Ruler,        zahl: '2',      einheit: 'Maße',           text: 'Fußlänge und Ballenumfang. Daraus Leisten, Größe und Weite — keine Konfektionsnummer.' },
  { icon: Hammer,       zahl: '200+',   einheit: 'Arbeitsschritte', text: 'Vom Zuschnitt über das Zwicken bis zur Endkontrolle. Jeder einzeln, an einem einzelnen Paar.' },
  { icon: CalendarDays, zahl: '4–6',    einheit: 'Wochen',         text: 'So lange dauert ein Paar, das es vorher nicht gab. Wir haben kein Lager, aus dem wir greifen.' },
]

/**
 * Die Leder. Sachwissen über Häute, nicht über dieses Haus.
 *
 * Die Auswahl im Konfigurator ist größer und ändert sich; hier stehen die
 * drei, an denen sich der Unterschied erklären lässt. Wer mehr will, findet
 * alles im Konfigurator — darauf verweist der Abschnitt auch.
 */
const LEDER = [
  {
    bild: CRAFT.leather,
    name: 'Vollnarbiges Kalbsleder',
    text: 'Die äußerste, dichteste Schicht der Haut, ungeschliffen. Sie trägt ihre Narbung noch, '
        + 'nimmt mit den Jahren die Bewegung des Fußes an und bekommt dabei eine Patina, '
        + 'die kein neues Paar hat.',
  },
  {
    bild: LIFESTYLE.darkLeather,
    name: 'Shell Cordovan',
    text: 'Aus einer besonderen, sehr dichten Lage der Pferdehaut. Es knittert nicht in scharfen '
        + 'Falten, sondern legt sich in weiche Wellen, und es gewinnt beim Tragen an Tiefe. '
        + 'Die Gerbung dauert Monate — daran hängt der Aufpreis.',
  },
  {
    bild: CRAFT.stitching,
    name: 'Nubuk und Velours',
    text: 'Angeschliffene Oberflächen mit kurzem, mattem Flor. Sie nehmen der Form die Strenge '
        + 'und machen einen strengen Schuh tragbar an Tagen, an denen Sorgfalt nicht nach '
        + 'Anstrengung aussehen soll.',
  },
]

/* ── Die Seite ──────────────────────────────────────────────────────────── */

export default function TestHomepage() {
  const navigate = useNavigate()
  const shoes = useStore(s => s.shoes)
  const katalogStatus = useStore(s => s.katalogStatus)
  const initStore = useStore(s => s.initStore)

  useSeo({
    titel: 'Rahmengenähte Schuhe nach deinen Maßen',
    beschreibung: 'Rahmengenäht statt geklebt, einzeln gefertigt in einer spanischen '
      + 'Manufaktur, nach deinen Maßen. Leder, Sohle und Details stellst du selbst zusammen.',
    pfad: '/test-homepage',
    indexieren: false,
  })

  // Der Katalog wird sonst erst von der Kollektionsseite geholt; diese Seite
  // kann die erste sein, die jemand öffnet.
  useEffect(() => { initStore?.() }, [initStore])

  /**
   * Die Modelle, die ein eigenes Kapitel bekommen.
   *
   * Bedingung: eine Aufnahme UND eine eigene Beschreibung. Ein Kapitel ohne
   * Bild ist eine leere Fläche, eines ohne Text eine Überschrift ohne
   * Geschichte — beides ist schlechter als ein Kapitel weniger. Vier, weil
   * die Seite danach noch fünf Kapitel trägt und niemand acht Modelle liest,
   * bevor er das Handwerk verstanden hat.
   */
  const kapitel = useMemo(() => {
    // Höchstens eines je Machart, und jede Geschichte nur einmal.
    //
    // Ohne die erste Regel standen hier vier Loafer: Der Katalog führt zehn
    // davon, und sie kommen zuerst. Vier Kapitel, die sich in einer
    // Schnallenform unterscheiden, zeigen keine Bandbreite — sie zeigen,
    // dass niemand ausgewählt hat.
    //
    // Die zweite fängt die Express-Fassungen: Sie tragen denselben
    // Beschreibungstext wie ihr Grundmodell, und zwei Kapitel mit demselben
    // Absatz lassen eine Seite kaputt wirken.
    const machartGesehen = new Set()
    const textGesehen = new Set()
    const treffer = []
    for (const s of shoes) {
      const text = String(s.description || '').trim()
      const machart = String(s.category || '').toUpperCase()
      if (!s.image || text.length < 80) continue
      if (textGesehen.has(text) || machartGesehen.has(machart)) continue
      machartGesehen.add(machart)
      textGesehen.add(text)
      treffer.push(s)
      if (treffer.length === 4) break
    }
    return treffer
  }, [shoes])

  /** Der Rest der Auswahl, klein und in einer Reihe. */
  const weitere = useMemo(() => {
    const gezeigt = new Set(kapitel.map(s => s.id))
    return shoes.filter(s => s.image && !gezeigt.has(s.id)).slice(0, 6)
  }, [shoes, kapitel])

  const abPreis = useMemo(() => {
    const preise = shoes.map(s => preisAlsZahl(s.price)).filter(p => p > 0)
    return preise.length ? Math.min(...preise) : null
  }, [shoes])

  const zurKollektion = () => navigate('/collection')

  return (
    <div className="min-h-full bg-white">

      {/* ══ 1 · Erster Blick ══════════════════════════════════════════════
          Bildschirmfüllend, ein Bild, ein Satz, zwei Wege. Die Überschrift
          nennt das Produkt und nicht die Marke: Der Name steht ohnehin in
          der Leiste, und wer ihn nicht kennt, sucht auch nicht danach. */}
      <header className="relative min-h-[82vh] flex items-end overflow-hidden bg-[#111]">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={SHOES.hero}
            alt=""
            aria-hidden="true"
            className="bild-heran w-full h-full object-cover opacity-[0.55]"
          />
        </div>
        {/* Der Verlauf trägt die Schrift. Ohne ihn hinge die Lesbarkeit am
            Motiv, und ein ausgetauschtes Bild machte die Seite unlesbar. */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.15) 100%)' }}
        />

        <div className="relative w-full px-5 lg:px-16 pb-14 lg:pb-20">
          <Enthuellen>
            <Kapitelmarke hell>Custom Made · Made in Spain</Kapitelmarke>
          </Enthuellen>

          <Enthuellen verzoegerung={120}>
            <h1 className="text-[34px] lg:text-[64px] font-extralight text-white leading-[1.02] tracking-tight mt-4 max-w-3xl">
              Ein Paar, das es<br />vorher nicht gab.
            </h1>
          </Enthuellen>

          <Enthuellen verzoegerung={220}>
            <p className="text-[14px] lg:text-[17px] text-white/70 font-light leading-relaxed mt-6 max-w-lg">
              Rahmengenäht, nach deinen Maßen gebaut, einzeln gefertigt in einer
              spanischen Manufaktur.
              {abPreis ? <> Ab <span className="text-white">€&nbsp;{preisAlsText(abPreis)}</span>.</> : null}
            </p>
          </Enthuellen>

          <Enthuellen verzoegerung={320}>
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mt-8 max-w-md sm:max-w-none">
              <button
                type="button"
                onClick={zurKollektion}
                className="w-full sm:w-auto bg-white text-black border-0 px-9 h-12 text-[11px] uppercase flex items-center justify-center gap-2 whitespace-nowrap hover:bg-white/85 transition-colors"
                style={{ letterSpacing: '0.18em' }}
              >
                Modelle ansehen
                <ArrowRight size={15} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/scan')}
                className="w-full sm:w-auto bg-transparent border border-white/30 text-white/85 px-9 h-12 text-[11px] uppercase flex items-center justify-center gap-2 whitespace-nowrap hover:border-white/70 hover:text-white transition-colors"
                style={{ letterSpacing: '0.18em' }}
              >
                <Footprints size={15} strokeWidth={1.5} />
                Passform bestimmen
              </button>
            </div>
          </Enthuellen>
        </div>

        {/* Der Hinweis, dass es weitergeht. Auf dem Telefon steht er im Weg
            und entfällt dort. */}
        <div className="hidden lg:block absolute right-16 bottom-20 w-px h-14 bg-white/25 overflow-hidden">
          <div className="strich-wandert w-px h-full bg-white/80" />
        </div>
      </header>

      {/* ══ 2 · Drei Zahlen ═══════════════════════════════════════════════
          Der Preis steht oben. Hier steht, woran er hängt — bevor jemand
          weiterscrollt und die Frage mitnimmt. */}
      <section className="px-5 lg:px-16 py-14 lg:py-24 border-b border-black/[0.07]">
        <div className="grid sm:grid-cols-3 gap-10 lg:gap-16 max-w-5xl mx-auto">
          {ZAHLEN.map((z, i) => (
            <Enthuellen key={z.einheit} verzoegerung={i * 90}>
              <z.icon size={18} strokeWidth={1.3} className="text-black/35" />
              <p className="text-[34px] lg:text-[44px] font-extralight leading-none tracking-tight mt-4">
                {z.zahl}
              </p>
              <p className="text-[10px] uppercase tracking-[0.24em] text-black/40 mt-2">{z.einheit}</p>
              <p className="text-[12px] lg:text-[13px] text-black/50 font-light leading-relaxed mt-4 max-w-xs">
                {z.text}
              </p>
            </Enthuellen>
          ))}
        </div>
      </section>

      {/* ══ 3 · Die Modelle ═══════════════════════════════════════════════
          Kapitel, keine Kacheln. Jedes Modell bekommt eine ganze Fläche: die
          Aufnahme bis an den Seitenrand, daneben die Geschichte, die im
          Katalog für genau dieses Modell steht, und darunter die Angaben,
          die vor dem Klick zählen.

          Die erste Fassung setzte Bild und Text in zwei gleich breite
          Spalten mit Rand ringsum. Das sah aufgeräumt aus und wirkte leer:
          Ein Foto mit Luft an allen vier Seiten ist eine Abbildung, eines
          bis an die Kante ist eine Fläche, in der man steht. Dazu kommt der
          Wechsel des Grundes — vier weiße Abschnitte hintereinander haben
          keinen Takt.

          Die Angaben unter der Geschichte stammen ausnahmslos aus dem
          Katalog. Was dort nicht steht, steht auch hier nicht: keine
          Machart je Modell, denn ein Mokassin ist nicht rahmengenäht, und
          eine Zeile, die das behauptete, wäre an der einen Stelle falsch,
          an der es jemand nachprüfen kann. */}
      <section>
        <div className="px-5 lg:px-16 py-14 lg:py-24 max-w-3xl">
          <Enthuellen>
            <Kapitelmarke>Die Modelle</Kapitelmarke>
            <h2 className="text-[26px] lg:text-[40px] font-extralight leading-[1.1] tracking-tight mt-3">
              Jede Form hat einen Grund.<br className="hidden sm:block" /> Meist einen älteren als wir.
            </h2>
          </Enthuellen>
          <Enthuellen verzoegerung={120}>
            <p className="text-[13px] lg:text-[15px] text-black/50 font-light leading-[1.9] mt-6">
              Oxford, Derby, Monk, Chelsea: Diese Formen sind älter als jedes Haus, das
              sie heute verkauft. Keine ist als Entwurf entstanden, jede aus einer
              Notwendigkeit — die geschlossene Schnürung für die Strenge der Etikette,
              die offene für den kräftigen Spann, der Riemen für den Steigbügel, der
              Gummizug für den schnellen Aufbruch. Wer weiß, wofür eine Form gemacht
              wurde, wählt nicht mehr nach Geschmack allein.
            </p>
          </Enthuellen>
        </div>

        {katalogStatus === 'loading' && !kapitel.length ? (
          <p className="px-5 lg:px-16 py-16 text-center text-[12px] text-black/30 font-light">
            Modelle werden geladen …
          </p>
        ) : katalogStatus === 'error' && !kapitel.length ? (
          <div className="px-5 lg:px-16 py-12 text-center">
            <p className="text-[12px] text-black/45 font-light">Die Modelle lassen sich gerade nicht laden.</p>
            <button
              type="button"
              onClick={() => initStore?.()}
              className="mt-3 bg-transparent border border-black/15 text-black/70 px-6 h-10 text-[11px] uppercase hover:border-black/40 hover:text-black transition-colors"
              style={{ letterSpacing: '0.16em' }}
            >
              Noch einmal versuchen
            </button>
          </div>
        ) : (
          <div>
            {kapitel.map((schuh, i) => {
              const bildLinks = i % 2 === 0
              const hell = i % 2 === 1
              const nummer = String(i + 1).padStart(2, '0')
              const oeffnen = () => navigate(shoePath(schuh))

              return (
                <article
                  key={schuh.id}
                  className={`lg:flex lg:items-stretch lg:min-h-[640px] ${
                    bildLinks ? '' : 'lg:flex-row-reverse'
                  } ${hell ? 'bg-[#F5F3F0]' : 'bg-white'}`}
                >
                  {/* ── Die Aufnahme, bis an den Seitenrand ────────────── */}
                  <Enthuellen
                    richtung={bildLinks ? 'links' : 'rechts'}
                    className="lg:w-[56%] relative"
                  >
                    <button
                      type="button"
                      onClick={oeffnen}
                      className="group block w-full h-full bg-transparent border-0 p-0 text-left"
                      aria-label={`${schuh.name} ansehen und konfigurieren`}
                    >
                      <div className="relative aspect-[4/3] lg:aspect-auto lg:h-full overflow-hidden bg-[#EDEAE3]">
                        <img
                          src={resolveMediaUrl(schuh.image)}
                          alt={`${schuh.name}, nach Maß gefertigt`}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.05]"
                        />
                        {/* Hier stand die Kapitelnummer auf dem Bild. Sie ist
                            wieder weg: Weiß auf einer hellen Produktaufnahme
                            ist nicht zu lesen, und daneben steht sie ohnehin
                            schon in der Zeile „01 — Loafer". */}
                        {schuh.tag && (
                          <span
                            className="absolute top-5 right-5 lg:top-8 lg:right-8 text-[9px] uppercase text-black bg-white/90 px-2.5 py-1"
                            style={{ letterSpacing: '0.2em' }}
                          >
                            {schuh.tag}
                          </span>
                        )}
                      </div>
                    </button>
                  </Enthuellen>

                  {/* ── Die Geschichte ────────────────────────────────── */}
                  <Enthuellen
                    verzoegerung={140}
                    className="lg:w-[44%] flex items-center px-5 lg:px-14 xl:px-20 py-11 lg:py-20"
                  >
                    <div className="w-full max-w-md">
                      <Kapitelmarke>
                        {`${nummer} — ${String(schuh.category || 'Custom Made').replace(/_/g, ' ')}`}
                      </Kapitelmarke>

                      <h3 className="text-[26px] lg:text-[38px] font-extralight leading-[1.08] tracking-tight mt-3">
                        {schuh.name}
                      </h3>

                      <p className="text-[13px] lg:text-[15px] text-black/55 font-light leading-[1.9] mt-6">
                        {schuh.description}
                      </p>

                      {/* ── Die Angaben ──────────────────────────────────
                          Vier Zeilen, alle aus dem Katalog. Eine Zeile ohne
                          Wert entfällt, statt „—" zu zeigen: Ein leeres Feld
                          in einer Aufstellung sieht nach einem Fehler aus. */}
                      <dl className="mt-8 border-t border-black/[0.09]">
                        {schuh.material && (
                          <div className="flex items-baseline gap-6 py-3 border-b border-black/[0.06]">
                            <dt className="w-24 shrink-0 text-[10px] uppercase tracking-[0.18em] text-black/35">Leder</dt>
                            <dd className="text-[13px] text-black/70 font-light">{schuh.material}</dd>
                          </div>
                        )}
                        {schuh.color && (
                          <div className="flex items-baseline gap-6 py-3 border-b border-black/[0.06]">
                            <dt className="w-24 shrink-0 text-[10px] uppercase tracking-[0.18em] text-black/35">Grundton</dt>
                            <dd className="flex items-center gap-2.5 text-[13px] text-black/70 font-light">
                              <span
                                className="inline-block w-3.5 h-3.5 rounded-full border border-black/15"
                                style={{ background: schuh.color }}
                                aria-hidden="true"
                              />
                              im Konfigurator wählbar
                            </dd>
                          </div>
                        )}
                        <div className="flex items-baseline gap-6 py-3 border-b border-black/[0.06]">
                          <dt className="w-24 shrink-0 text-[10px] uppercase tracking-[0.18em] text-black/35">Fertigung</dt>
                          <dd className="text-[13px] text-black/70 font-light">
                            {Number(schuh.express) === 1
                              ? `rund ${schuh.express_weeks || 2} Wochen`
                              : 'vier bis sechs Wochen'}
                          </dd>
                        </div>
                        <div className="flex items-baseline gap-6 py-3 border-b border-black/[0.06]">
                          <dt className="w-24 shrink-0 text-[10px] uppercase tracking-[0.18em] text-black/35">Ab</dt>
                          <dd className="text-[13px] text-black font-light">{schuh.price || 'auf Anfrage'}</dd>
                        </div>
                      </dl>

                      <button
                        type="button"
                        onClick={oeffnen}
                        className="group mt-8 bg-black text-white border-0 px-8 h-12 text-[11px] uppercase inline-flex items-center gap-3 hover:bg-black/85 transition-colors"
                        style={{ letterSpacing: '0.18em' }}
                      >
                        Konfigurieren
                        <ArrowRight
                          size={15}
                          strokeWidth={1.5}
                          className="transition-transform duration-500 group-hover:translate-x-1"
                        />
                      </button>
                    </div>
                  </Enthuellen>
                </article>
              )
            })}
          </div>
        )}

        {/* Der Rest der Auswahl, klein. Wer bis hierher gelesen hat, will
            nicht noch vier Kapitel, sondern sehen, was es sonst gibt. */}
        {weitere.length > 0 && (
          <div className="px-5 lg:px-16 mt-16 lg:mt-28">
            <Enthuellen>
              <div className="flex items-end justify-between mb-5">
                <Kapitelmarke>Und außerdem</Kapitelmarke>
                <button
                  type="button"
                  onClick={zurKollektion}
                  className="bg-transparent border-0 p-0 text-[11px] text-black/45 hover:text-black transition-colors flex items-center gap-1.5"
                >
                  Alle Modelle
                  <ArrowRight size={13} strokeWidth={1.5} />
                </button>
              </div>
            </Enthuellen>

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-px bg-black/[0.07]">
              {weitere.map((schuh, i) => (
                <Enthuellen key={schuh.id} verzoegerung={Math.min(i, 5) * 60} className="bg-white">
                  <button
                    type="button"
                    onClick={() => navigate(shoePath(schuh))}
                    className="group block w-full bg-transparent border-0 p-0 text-left"
                  >
                    <div className="aspect-[4/5] overflow-hidden bg-[#EDEAE3]">
                      <img
                        src={resolveMediaUrl(schuh.image)}
                        alt={`${schuh.name}, rahmengenäht, nach Maß gefertigt`}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                    </div>
                    <div className="px-3 py-3">
                      <p className="text-[12px] text-black font-normal leading-snug line-clamp-2 min-h-[2.6em]">
                        {schuh.name}
                      </p>
                      <p className="text-[12px] text-black/50 font-light mt-0.5">
                        {schuh.price ? `ab ${schuh.price}` : 'auf Anfrage'}
                      </p>
                    </div>
                  </button>
                </Enthuellen>
              ))}
            </div>
            <PreisFuss className="mt-3" />
          </div>
        )}
      </section>

      {/* ══ 4 · Das Handwerk ══════════════════════════════════════════════
          Der Abschnitt, der den Preis trägt. „Rahmengenäht statt geklebt"
          ist der entscheidende Satz und zugleich der unanschaulichste — was
          ein Rahmen ist, sieht man am fertigen Schuh nicht. Deshalb der
          Schnitt. */}
      <section className="bg-[#111] text-white px-5 lg:px-16 py-16 lg:py-28">
        <div className="max-w-5xl mx-auto">
          <Enthuellen>
            <Kapitelmarke hell>Das Handwerk</Kapitelmarke>
            <h2 className="text-[26px] lg:text-[40px] font-extralight leading-[1.1] tracking-tight mt-3 max-w-2xl">
              Die Sohle hängt an einer Naht,<br className="hidden sm:block" /> nicht an einem Klebstoff.
            </h2>
          </Enthuellen>

          <Enthuellen verzoegerung={150}>
            <div className="mt-12 lg:mt-16 text-white">
              <RahmenSchnitt className="max-w-2xl mx-auto" />
            </div>
          </Enthuellen>

          <div className="grid sm:grid-cols-2 gap-x-14 gap-y-8 mt-12 lg:mt-16 max-w-3xl">
            <Enthuellen verzoegerung={80}>
              <p className="text-[13px] lg:text-[14px] text-white/60 font-light leading-[1.85]">
                Der Schaft wird über den Leisten gezogen und nach innen gezwickt. Eine
                aufgestellte Rippe auf der Brandsohle nimmt die Einstechnaht auf — sie
                fasst Schaft, Futter und den Rahmen, jenen schmalen Lederstreifen, der
                rundherum seitlich heraussteht.
              </p>
            </Enthuellen>
            <Enthuellen verzoegerung={160}>
              <p className="text-[13px] lg:text-[14px] text-white/60 font-light leading-[1.85]">
                Durch den Rahmen läuft die zweite Naht in die Laufsohle. Sie lässt sich
                auftrennen, ohne den Schaft zu berühren. Genau daran hängt der
                Unterschied: Ein geklebter Schuh ist am Ende seiner Sohle am Ende,
                dieser bekommt eine neue und läuft weiter.
              </p>
            </Enthuellen>
          </div>

          <Enthuellen verzoegerung={220}>
            <p className="text-[12px] text-white/35 font-light leading-relaxed mt-10 max-w-2xl">
              Zwischen Brand- und Laufsohle liegt Kork. Er gibt unter dem Gewicht nach
              und nimmt nach einigen Wochen die Form des Fußes an — der Grund, warum ein
              rahmengenähter Schuh mit der Zeit bequemer wird statt ausgelatschter.
            </p>
          </Enthuellen>
        </div>
      </section>

      {/* ══ 5 · Das Leder ═════════════════════════════════════════════════ */}
      <section className="px-5 lg:px-16 py-16 lg:py-28">
        <div className="max-w-5xl mx-auto">
          <Enthuellen>
            <Kapitelmarke>Das Leder</Kapitelmarke>
            <h2 className="text-[26px] lg:text-[40px] font-extralight leading-[1.1] tracking-tight mt-3 max-w-2xl">
              Die Haut entscheidet, wie das Paar altert.
            </h2>
          </Enthuellen>

          <div className="grid sm:grid-cols-3 gap-8 lg:gap-12 mt-12 lg:mt-16">
            {LEDER.map((l, i) => (
              <Enthuellen key={l.name} verzoegerung={i * 90}>
                <div className="aspect-[4/3] overflow-hidden bg-[#EDEAE3]">
                  <img src={l.bild} alt="" aria-hidden="true" loading="lazy" className="w-full h-full object-cover" />
                </div>
                <p className="text-[13px] lg:text-[14px] text-black font-normal mt-5">{l.name}</p>
                <p className="text-[12px] lg:text-[13px] text-black/50 font-light leading-[1.8] mt-2">
                  {l.text}
                </p>
              </Enthuellen>
            ))}
          </div>

          <Enthuellen verzoegerung={140}>
            <p className="text-[12px] text-black/40 font-light mt-10">
              Welche Leder und Farben an welchem Modell zur Wahl stehen, zeigt der
              Konfigurator — die Auswahl unterscheidet sich je nach Machart.
            </p>
          </Enthuellen>
        </div>
      </section>

      {/* ══ 6 · In eigener Sache ══════════════════════════════════════════
          Der Abschnitt, der diese Fassung von jeder anderen trennt. Die
          Offenheit über die Machart war bisher eine Selbstauskunft im
          Kleingedruckten; hier ist sie das Verkaufsargument. Wer „handmade"
          liest und später erfährt, dass Maschinen im Spiel waren, zieht den
          Rest der Zusagen in Zweifel — auch die, die stimmen. */}
      <section className="bg-[#fafaf9] border-y border-black/[0.06] px-5 lg:px-16 py-16 lg:py-28">
        <div className="max-w-2xl mx-auto">
          <Enthuellen>
            <Kapitelmarke>In eigener Sache</Kapitelmarke>
            <h2 className="text-[22px] lg:text-[32px] font-extralight leading-[1.15] tracking-tight mt-3">
              Was wir nicht behaupten
            </h2>
          </Enthuellen>

          <Enthuellen verzoegerung={100}>
            <p className="text-[14px] lg:text-[16px] text-black/60 font-light leading-[1.9] mt-7">
              Wir schreiben nicht „handgefertigt". Der Rahmen wird maschinell genäht, wie
              in fast jeder Manufaktur, die in dieser Preisklasse arbeitet. Von Hand
              kommen Zuschnitt, Zwicken, Finish und die Endkontrolle — über zweihundert
              Arbeitsschritte, von denen wir keinen erfunden haben.
            </p>
          </Enthuellen>

          <Enthuellen verzoegerung={180}>
            <p className="text-[14px] lg:text-[16px] text-black/60 font-light leading-[1.9] mt-5">
              Wir sagen es, weil der Unterschied zwischen einem rahmengenähten und einem
              geklebten Schuh groß genug ist. Er braucht kein Wort, das ihn größer macht.
            </p>
          </Enthuellen>

          <Enthuellen verzoegerung={240}>
            <p className="text-[12px] text-black/35 font-light leading-relaxed mt-8 pt-6 border-t border-black/[0.08]">
              Dasselbe gilt für alles andere auf dieser Seite: Wo eine Zahl steht, ist
              sie nachgehalten. Wo keine steht, haben wir keine.
            </p>
          </Enthuellen>
        </div>
      </section>

      {/* ══ 7 · Der Ablauf ════════════════════════════════════════════════
          Dieselbe Darstellung wie unter der Kollektion und im Firmenbereich.
          Eine eigene Gestaltung nur hier hieße, dieselbe Erklärung an der
          vierten Stelle anders aussehen zu lassen. */}
      <section className="px-5 lg:px-16 py-16 lg:py-28">
        <Enthuellen>
          <Ablauf
            titel="Vom Klick zum Paar"
            intro="Vier Schritte, und du weißt nach jedem, woran du bist."
            breite="max-w-2xl"
            schritte={[
              { titel: 'Modell und Ausführung',
                text: 'Leder, Farbe, Sohle, Absatz, Innenfutter und die Details. Jede Änderung ist sofort am Preis zu sehen. Unterbrechen und später weitermachen geht, der Stand bleibt gespeichert.' },
              { titel: 'Maße statt Größe',
                text: 'Fußlänge und Ballenumfang, ±0,5 cm genügen. Daraus ermitteln wir Leisten und Größe. Eine Größentabelle brauchst du nicht, weil wir nicht raten.' },
              { titel: 'Fertigung',
                text: 'Nach Zahlungseingang geht die Bestellung in die Manufaktur. Du bekommst Nachricht, wenn die Fertigung beginnt und wenn dein Paar in die Endkontrolle geht.' },
              { titel: 'Endkontrolle und Versand',
                text: 'Wir prüfen jedes Paar einzeln, bevor es das Haus verlässt. Mit dem Versand kommt die Sendungsverfolgung.' },
            ]}
            fuss="Vier bis sechs Wochen ab Zahlungseingang. Versand innerhalb Deutschlands ist inbegriffen. Ein Schuh für einen bestimmten Fuß lässt sich nicht zurückgeben — ist etwas mangelhaft, fertigen wir das Paar neu, ohne Kosten für dich. Die Einzelheiten stehen in den AGB."
          />
        </Enthuellen>
      </section>

      {/* ══ 8 · Der Anfang ════════════════════════════════════════════════
          Ein Weg, nicht drei. Wer bis hierher gelesen hat, sucht keine
          Auswahl mehr, sondern die Stelle, an der es losgeht. */}
      <section className="relative overflow-hidden bg-[#111]">
        <img
          src={LIFESTYLE.walking}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-[0.32]"
        />
        <div className="relative px-5 lg:px-16 py-20 lg:py-32 text-center">
          <Enthuellen>
            <h2 className="text-[26px] lg:text-[42px] font-extralight leading-[1.1] tracking-tight text-white max-w-2xl mx-auto">
              Fang mit dem Modell an.<br className="hidden sm:block" /> Die Maße kommen später.
            </h2>
          </Enthuellen>
          <Enthuellen verzoegerung={120}>
            <p className="text-[13px] lg:text-[14px] text-white/55 font-light mt-5 max-w-md mx-auto leading-relaxed">
              Konfigurieren kostet nichts und verpflichtet zu nichts. Erst am Ende stehen
              Preis und Lieferzeit fest.
            </p>
          </Enthuellen>
          <Enthuellen verzoegerung={200}>
            <button
              type="button"
              onClick={zurKollektion}
              className="mt-9 bg-white text-black border-0 px-12 h-12 text-[11px] uppercase inline-flex items-center justify-center gap-2 hover:bg-white/85 transition-colors"
              style={{ letterSpacing: '0.18em' }}
            >
              Schuh konfigurieren
              <ArrowRight size={15} strokeWidth={1.5} />
            </button>
          </Enthuellen>
        </div>
      </section>
    </div>
  )
}
