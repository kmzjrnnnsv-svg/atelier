/**
 * vermittlerPreis.js — was ein Paar mit Empfehlung kostet.
 *
 * ── Warum das eine eigene Datei ist ───────────────────────────────────────
 *
 * Derselbe Betrag muss an vier Stellen herauskommen: auf der Kachel in der
 * Kollektion, auf der Produktseite, im Konfigurator und im Warenkorb. Rechnet
 * eine davon anders, sieht der Kunde einen Preis, den die Kasse nicht
 * bestätigt — und das ist der Moment, in dem er abbricht.
 *
 * ── Der Deckel ist der Punkt ──────────────────────────────────────────────
 *
 * Der Nachlass ist kein Rabatt des Hauses. Der Vermittler zahlt ihn aus
 * seiner Provision, und die ist je Paar gedeckelt. Zehn Prozent auf ein Paar
 * für 1.450 € wären 145 € — mehr, als der Topf hergibt. Gedeckelt bei 34 €
 * bleiben 34 €.
 *
 * Deshalb hängt der Nachlass am Preis des Modells und lässt sich nicht als
 * „10 %" über den Katalog schreiben: Beim günstigen Paar greift der
 * Prozentsatz, beim teuren der Deckel.
 */

/** „€ 1.450" → 1450. Deutsche Schreibweise: Punkt trennt Tausender. */
export function zahlAusPreis(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const sauber = String(v ?? '')
    .replace(/[^0-9,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const n = parseFloat(sauber)
  return Number.isFinite(n) ? n : 0
}

/** 1305 → „€ 1.305". Ohne Nachkommastellen, wie im ganzen Laden. */
export function alsPreis(n) {
  return `€ ${Math.round(Number(n) || 0).toLocaleString('de-DE')}`
}

/**
 * Was der Vermittlervorteil an diesem Preis ändert.
 *
 * Gibt `null` zurück, wenn nichts zu ändern ist — kein Code, keine Zusage,
 * eine Zugabe statt eines Nachlasses, oder ein Prozentsatz von null. Die
 * aufrufende Stelle zeigt dann einfach den Preis, den sie ohnehin hätte.
 *
 * `null` und nicht ein Objekt mit `rabatt: 0`: Der Unterschied zwischen
 * „kein Nachlass" und „Nachlass von null" ist an der Anzeige derselbe, aber
 * eine durchgestrichene Null wäre eine Behauptung, die niemandem nützt.
 */
export function vermittlerPreis(preis, affiliate) {
  const grund = zahlAusPreis(preis)
  if (!grund || !affiliate) return null

  const satz = Number(affiliate.customer_discount_pct) || 0
  if (satz <= 0) return null

  const deckel = Number(affiliate.discount_cap) || 0
  const roh = grund * satz / 100
  // Ohne Deckel gäbe es nichts zu begrenzen — dann gilt der Prozentsatz.
  const rabatt = Math.round((deckel > 0 ? Math.min(roh, deckel) : roh) * 100) / 100
  if (rabatt <= 0) return null

  const neu = Math.round((grund - rabatt) * 100) / 100
  return {
    grund,
    rabatt,
    neu,
    // Was tatsächlich ankommt — nach dem Deckel oft weniger als der Satz
    // verspricht. Die Anzeige nennt lieber den Betrag als den Prozentsatz.
    satzEffektiv: Math.round((rabatt / grund) * 1000) / 10,
    gedeckelt: deckel > 0 && roh > deckel,
    text: { grund: alsPreis(grund), neu: alsPreis(neu), rabatt: alsPreis(rabatt) },
  }
}
