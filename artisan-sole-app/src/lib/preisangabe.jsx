/**
 * preisangabe.jsx — was neben einem Preis stehen muss.
 *
 * ── Warum das nicht optional ist ──────────────────────────────────────────
 *
 * Die Preisangabenverordnung verlangt vom Händler gegenüber Verbrauchern den
 * Gesamtpreis: den Betrag, der tatsächlich zu zahlen ist, einschließlich
 * Umsatzsteuer und aller sonstigen Bestandteile (§ 3 PAngV). Und sie verlangt
 * die Angabe, DASS die Umsatzsteuer enthalten ist, sowie ob zusätzlich
 * Versandkosten anfallen (§ 6 Abs. 1 PAngV).
 *
 * Im Laden standen die Beträge bisher nackt da. Sie waren nicht falsch — es
 * sind Bruttopreise, die AGB sagen das in Ziffer 8 —, aber niemand konnte es
 * ihnen ansehen. Ein fehlender Hinweis auf die enthaltene Umsatzsteuer ist
 * einer der am häufigsten abgemahnten Verstöße überhaupt, und er kostet mehr
 * als die Zeile, die ihn behebt.
 *
 * ── Warum eine gemeinsame Datei ───────────────────────────────────────────
 *
 * Preise stehen an sechs Stellen: Kachel, Modellseite, Konfigurator,
 * Zubehör, Warenkorb, Kasse. Stünde der Satz an jeder einzeln, wiche er nach
 * dem dritten Umbau an einer ab — und die eine, an der er fehlt, ist die,
 * die abgemahnt wird. Hier steht er einmal.
 *
 * ── Zur Zuordnung ─────────────────────────────────────────────────────────
 *
 * Der Hinweis muss dem Preis zugeordnet sein. Unmittelbar darunter ist der
 * sichere Weg. Beim Raster mit vielen Kacheln reicht ein Hinweis, der für
 * alle Preise der Seite erkennbar gilt — deshalb `PreisFuss` für ganze
 * Listen und `Preishinweis` für den einzelnen Preis.
 *
 * ── Wohin „Versandkosten" verlinkt ────────────────────────────────────────
 *
 * Auf die AGB, nicht auf die Hilfe. Eine Versandkostenseite gibt es nicht,
 * und die Hilfe beantwortet zum Versand derzeit keine einzige Frage — ein
 * Link dorthin sähe nach Auskunft aus und wäre keine. In den AGB steht die
 * Regelung (Ziffer 8 Abs. 2 und Ziffer 9), die Beträge selbst nennt die
 * Kasse, bevor irgendetwas verbindlich wird.
 */
import { Link } from 'react-router-dom'

/**
 * Der kurze Hinweis unter einem einzelnen Preis.
 *
 * @param {string} [className] Zusätzliche Klassen für den Sitz im Umfeld.
 * @param {boolean} [mitVersandlink] Verlinkt „Versandkosten" auf die AGB.
 *   Auf der Modellseite und im Warenkorb ja; auf einer Kachel nicht, dort
 *   wäre ein Link im Link.
 */
export function Preishinweis({ className = '', mitVersandlink = false }) {
  return (
    <p className={`text-[10px] text-black/35 font-light leading-snug ${className}`}>
      inkl. MwSt., zzgl.{' '}
      {mitVersandlink ? (
        <Link to="/legal/agb" className="underline underline-offset-2 text-black/45 hover:text-black">
          Versandkosten
        </Link>
      ) : (
        'Versand'
      )}
    </p>
  )
}

/**
 * Der Hinweis für eine ganze Liste von Preisen, am Fuß des Rasters.
 *
 * Ausführlicher als der kurze: Wer ihn liest, hat gerade keinen einzelnen
 * Preis vor Augen, sondern zwanzig.
 */
export function PreisFuss({ className = '' }) {
  return (
    <p className={`text-[10px] text-black/30 font-light leading-relaxed text-center ${className}`}>
      Alle Preise in Euro, inkl. gesetzlicher Umsatzsteuer, zzgl.{' '}
      <Link to="/legal/agb" className="underline underline-offset-2 text-black/40 hover:text-black">
        Versandkosten
      </Link>
      .
    </p>
  )
}
