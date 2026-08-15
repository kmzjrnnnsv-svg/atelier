/**
 * beleg.js — Rechnung und Gutschrift.
 *
 * ── Warum eine Rechnung nicht optional ist ────────────────────────────────
 *
 * Der Laden hat bisher keine ausgestellt. Für einen Privatkunden fällt das
 * eine Weile nicht auf; für ein Firmenkonto fällt es beim ersten Kauf auf,
 * und für die eigene Buchhaltung spätestens am Jahresende. § 14 UStG verlangt
 * bei Leistungen an Unternehmer eine Rechnung mit bestimmten Pflichtangaben,
 * und eine davon ist eine fortlaufende, einmalig vergebene Nummer.
 *
 * ── Zur Nummer ───────────────────────────────────────────────────────────
 *
 * `RE-2026-0001`, je Jahr von vorn. Vergeben wird sie in einer Transaktion
 * gegen den höchsten bestehenden Wert desselben Jahres, mit einem eindeutigen
 * Index auf der Spalte als letzter Absicherung. Zwei gleichzeitige
 * Zahlungsbuchungen dürfen nicht dieselbe Nummer bekommen — das ist der eine
 * Fehler, den man in dieser Datei nicht machen darf.
 *
 * Vergeben wird bei Zahlungseingang, nicht bei Bestellung: Vorher steht nicht
 * fest, dass es zu einem Umsatz kommt, und eine stornierte Bestellung würde
 * eine Lücke in die Reihe reißen.
 *
 * ── Zur Umsatzsteuer ─────────────────────────────────────────────────────
 *
 * Steht als Einstellung, nicht als Konstante. Wer die Kleinunternehmerregelung
 * nach § 19 UStG in Anspruch nimmt, darf keine Steuer ausweisen — täte er es,
 * schuldete er sie trotzdem. Vorgabe ist deshalb „kein Ausweis", und das
 * Umschalten ist eine bewusste Handlung in der Verwaltung.
 */
import { Dokument, SEITE, SEITENRAND as RAND } from './pdf.js'
import { betragAusText } from './zahlung.js'

const RECHTS = SEITE.breite - RAND
const euro = (n) => `${(Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
const datum = (s) => {
  const d = s ? new Date(String(s).replace(' ', 'T') + (String(s).includes('Z') ? '' : 'Z')) : new Date()
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Die Angaben über den Aussteller. Alles aus den Einstellungen, mit Rückfall. */
export function firmenAngaben(db) {
  let s = {}
  try {
    s = Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map(r => [r.key, r.value]))
  } catch { s = {} }
  const ust = Number(s.ust_satz)
  return {
    name:        s.firma_name    || s.bank_holder || 'Artisan Sole',
    strasse:     s.firma_strasse || '',
    ort:         s.firma_ort     || '',
    land:        s.firma_land    || 'Deutschland',
    email:       s.firma_email   || s.mail_absender || '',
    telefon:     s.firma_telefon || '',
    ustId:       s.firma_ust_id  || '',
    steuernummer: s.firma_steuernummer || '',
    // '1' = Kleinunternehmer, es wird keine Steuer ausgewiesen.
    kleinunternehmer: String(s.firma_kleinunternehmer ?? '1') === '1',
    ustSatz:     Number.isFinite(ust) ? ust : 19,
    iban:        s.bank_iban  || '',
    bic:         s.bank_bic   || '',
    bank:        s.bank_name  || '',
    inhaber:     s.bank_holder || '',
  }
}

/**
 * Was einer Rechnung noch fehlt, um eine zu sein.
 *
 * § 14 Abs. 4 UStG zählt auf, was daraufstehen muss. Vier davon kann nur der
 * Betreiber liefern, und solange sie fehlen, ist der Beleg formal
 * unbrauchbar — der Empfänger kann daraus keine Vorsteuer ziehen, und bei
 * einem Firmenkunden kommt die Rechnung zurück.
 *
 * Ausgestellt wird trotzdem. Ein Beleg mit Lücken ist besser als gar keiner:
 * Er lässt sich nachbessern, eine fehlende Rechnungsnummer nicht. Die
 * Verwaltung bekommt die Liste stattdessen dort zu sehen, wo sie sie braucht.
 *
 * Die Steuernummer steht auch dann in der Liste, wenn der Kleinunternehmer
 * nach § 19 UStG abrechnet: Er weist keine Steuer aus, seine Steuernummer
 * muss trotzdem auf den Beleg (§ 14 Abs. 4 Nr. 2).
 */
export function pflichtangabenFehlen(firma) {
  const fehlt = []
  if (!firma.name)    fehlt.push({ feld: 'firma_name',    text: 'Name des Unternehmens' })
  if (!firma.strasse) fehlt.push({ feld: 'firma_strasse', text: 'Straße und Hausnummer' })
  if (!firma.ort)     fehlt.push({ feld: 'firma_ort',     text: 'Postleitzahl und Ort' })
  if (!firma.steuernummer && !firma.ustId) {
    fehlt.push({ feld: 'firma_steuernummer', text: 'Steuernummer oder Umsatzsteuer-Identifikationsnummer' })
  }
  return fehlt
}

/**
 * Die nächste Rechnungsnummer, vergeben und gleich an die Bestellung
 * geschrieben. Gibt die bestehende zurück, falls die Bestellung schon eine
 * hat — eine zweite wäre ein Beleg über denselben Umsatz.
 */
export function vergibRechnungsnummer(db, orderId) {
  const vergeben = db.transaction((id) => {
    const order = db.prepare('SELECT id, invoice_no FROM orders WHERE id = ?').get(id)
    if (!order) return null
    if (order.invoice_no) return order.invoice_no

    const jahr = new Date().getFullYear()
    const praefix = `RE-${jahr}-`
    const hoechste = db.prepare(`
      SELECT invoice_no FROM orders
      WHERE invoice_no LIKE ? ORDER BY invoice_no DESC LIMIT 1
    `).get(`${praefix}%`)
    const naechste = (Number(String(hoechste?.invoice_no || '').slice(praefix.length)) || 0) + 1
    const nummer = `${praefix}${String(naechste).padStart(4, '0')}`

    db.prepare("UPDATE orders SET invoice_no = ?, invoice_issued_at = datetime('now') WHERE id = ?")
      .run(nummer, id)
    return nummer
  })
  return vergeben(orderId)
}

/** Dasselbe für die Provisionsgutschrift — eigener Kreis, eigene Reihe. */
export function vergibGutschriftsnummer(db, payoutId) {
  const vergeben = db.transaction((id) => {
    const p = db.prepare('SELECT id, document_no FROM affiliate_payouts WHERE id = ?').get(id)
    if (!p) return null
    if (p.document_no) return p.document_no

    const praefix = `GS-${new Date().getFullYear()}-`
    const hoechste = db.prepare(`
      SELECT document_no FROM affiliate_payouts
      WHERE document_no LIKE ? ORDER BY document_no DESC LIMIT 1
    `).get(`${praefix}%`)
    const naechste = (Number(String(hoechste?.document_no || '').slice(praefix.length)) || 0) + 1
    const nummer = `${praefix}${String(naechste).padStart(4, '0')}`

    db.prepare('UPDATE affiliate_payouts SET document_no = ? WHERE id = ?').run(nummer, id)
    return nummer
  })
  return vergeben(payoutId)
}

// ── Gemeinsamer Kopf ────────────────────────────────────────────────────────

function briefkopf(d, firma, titel, felder) {
  d.text(firma.name, { groesse: 15, fett: true })
  let y = SEITE.hoehe - RAND
  for (const zeile of [firma.strasse, firma.ort, firma.land].filter(Boolean)) {
    y -= 11
    d.text(zeile, { y, groesse: 8.5, grau: true })
  }
  d.y = Math.min(y, SEITE.hoehe - RAND) - 34

  d.zeile(titel, { groesse: 20, fett: true })
  d.luecke(4)

  // Die Kenndaten rechts, damit der Blick sie zuerst findet.
  let ky = d.y + 30
  for (const [name, wert] of felder) {
    if (!wert) continue
    d.text(name, { y: ky, groesse: 8.5, grau: true, rechts: RECHTS - 90 })
    d.text(String(wert), { y: ky, groesse: 8.5, fett: true, rechts: RECHTS })
    ky -= 12
  }
  d.y = Math.min(d.y, ky) - 14
  d.linie().luecke(18)
}

function empfaenger(d, ueberschrift, zeilen) {
  d.zeile(ueberschrift, { groesse: 8, grau: true })
  for (const z of zeilen.filter(Boolean)) d.zeile(z, { groesse: 10 })
  d.luecke(16)
}

function tabellenkopf(d, spalten) {
  d.platz(20)
  for (const [text, x, rechts] of spalten) {
    d.text(text, rechts ? { y: d.y, groesse: 8, grau: true, rechts: x } : { y: d.y, x, groesse: 8, grau: true })
  }
  d.y -= 6
  d.linie().luecke(12)
}

// ── Rechnung ────────────────────────────────────────────────────────────────

/**
 * Die Rechnung zu einer Bestellung.
 *
 * Bemessung: der bezahlte Preis der Bestellung, dazu Versand und Zubehör,
 * soweit vorhanden. Ein Rabatt steht als eigene Zeile — dass er gewährt
 * wurde, gehört auf den Beleg und nicht in eine stillschweigend gekürzte
 * Summe.
 */
export function rechnungPdf(db, order, kunde) {
  const firma = firmenAngaben(db)
  const d = new Dokument({
    fusszeile: [firma.name, firma.ustId && `USt-IdNr. ${firma.ustId}`,
                firma.steuernummer && `Steuernummer ${firma.steuernummer}`,
                firma.email].filter(Boolean).join(' · '),
  })

  briefkopf(d, firma, 'Rechnung', [
    ['Rechnungsnummer', order.invoice_no],
    ['Rechnungsdatum',  datum(order.invoice_issued_at)],
    ['Bestellnummer',   order.order_ref],
    ['Bestelldatum',    datum(order.created_at)],
  ])

  let adresse = {}
  try { adresse = JSON.parse(order.billing_address || order.delivery_address || '{}') } catch { adresse = {} }
  empfaenger(d, 'Rechnungsempfänger', [
    adresse.name || kunde?.name,
    adresse.company,
    adresse.street,
    [adresse.zip, adresse.city].filter(Boolean).join(' '),
    adresse.country,
  ])

  tabellenkopf(d, [['Position', RAND], ['Betrag', RECHTS, true]])

  const posten = []
  const grund = betragAusText(order.original_price) || betragAusText(order.price)
  posten.push({
    text: `${order.shoe_name} — ${order.material}, ${order.color}`,
    zusatz: [order.eu_size && `Größe ${order.eu_size}`, order.sole, order.last_label]
      .filter(Boolean).join(' · '),
    betrag: grund,
  })

  const rabatt = betragAusText(order.discount_amount)
  if (rabatt > 0) {
    posten.push({ text: 'Nachlass', zusatz: order.coupon_code ? `Code ${order.coupon_code}` : '', betrag: -rabatt })
  }

  let zubehoer = []
  try { zubehoer = JSON.parse(order.accessories || '[]') } catch { zubehoer = [] }
  for (const z of zubehoer) {
    posten.push({ text: z.name || 'Zubehör', zusatz: '', betrag: betragAusText(z.price) })
  }

  const versand = betragAusText(order.shipping_cost)
  if (versand > 0) posten.push({ text: 'Versand', zusatz: order.shipping_method || '', betrag: versand })

  for (const p of posten) {
    d.platz(24)
    d.text(p.text, { y: d.y, groesse: 10 })
    d.text(euro(p.betrag), { y: d.y, groesse: 10, rechts: RECHTS })
    d.y -= 12
    if (p.zusatz) { d.text(p.zusatz, { y: d.y, groesse: 8.5, grau: true }); d.y -= 11 }
    d.y -= 4
  }

  const summe = posten.reduce((s, p) => s + p.betrag, 0)

  d.luecke(4).linie().luecke(14)
  if (firma.kleinunternehmer) {
    d.platz(18)
    d.text('Gesamtbetrag', { y: d.y, groesse: 11, fett: true })
    d.text(euro(summe), { y: d.y, groesse: 11, fett: true, rechts: RECHTS })
    d.y -= 22
    d.absatz('Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', { groesse: 8.5, grau: true })
  } else {
    const netto = summe / (1 + firma.ustSatz / 100)
    const steuer = summe - netto
    d.platz(46)
    d.text('Nettobetrag', { y: d.y, groesse: 9.5 })
    d.text(euro(netto), { y: d.y, groesse: 9.5, rechts: RECHTS })
    d.y -= 14
    d.text(`Umsatzsteuer ${firma.ustSatz} %`, { y: d.y, groesse: 9.5 })
    d.text(euro(steuer), { y: d.y, groesse: 9.5, rechts: RECHTS })
    d.y -= 16
    d.text('Gesamtbetrag', { y: d.y, groesse: 11, fett: true })
    d.text(euro(summe), { y: d.y, groesse: 11, fett: true, rechts: RECHTS })
    d.y -= 22
  }

  d.luecke(10)
  if (order.paid_at) {
    d.absatz(`Der Betrag ist am ${datum(order.paid_at)} eingegangen. Diese Rechnung ist bezahlt; bitte überweisen Sie nichts erneut.`, { groesse: 9 })
  } else {
    d.absatz(`Bitte überweisen Sie den Betrag unter Angabe von „${order.payment_ref || order.order_ref}" auf ${firma.iban ? `IBAN ${firma.iban}${firma.bank ? `, ${firma.bank}` : ''}` : 'unser Konto'}.`, { groesse: 9 })
  }

  d.luecke(12)
  d.absatz('Ihr Paar wurde für Sie angefertigt. Es besteht kein Widerrufsrecht (§ 312g Abs. 2 Nr. 1 BGB); die Einzelheiten samt Stornostaffel stehen in Ziffer 7 unserer AGB, die Ihrer Bestellbestätigung beilagen.', { groesse: 8, grau: true })

  return d.buffer()
}

// ── Provisionsgutschrift ────────────────────────────────────────────────────

/**
 * Die Gutschrift zu einer Auszahlung.
 *
 * Eine Gutschrift im Sinne des § 14 Abs. 2 UStG: Wir rechnen über die
 * Leistung des Vermittlers ab, nicht er über unsere. Deshalb steht seine
 * Steuernummer darauf und nicht unsere allein, und deshalb muss das Wort
 * „Gutschrift" auf dem Beleg stehen — es ist eine Pflichtangabe.
 */
export function gutschriftPdf(db, payout, affiliate, positionen) {
  const firma = firmenAngaben(db)
  const d = new Dokument({
    fusszeile: [firma.name, firma.ustId && `USt-IdNr. ${firma.ustId}`, firma.email].filter(Boolean).join(' · '),
  })

  briefkopf(d, firma, 'Gutschrift', [
    ['Belegnummer',  payout.document_no],
    ['Datum',        datum(payout.created_at)],
    ['Auszahlung',   payout.reference],
    ['Vermittler',   affiliate.code?.toUpperCase()],
  ])

  empfaenger(d, 'Empfänger der Gutschrift', [
    affiliate.full_name,
    affiliate.street,
    [affiliate.postal_code, affiliate.city].filter(Boolean).join(' '),
    affiliate.country,
    affiliate.vat_id ? `USt-IdNr. ${affiliate.vat_id}` : (affiliate.tax_number ? `Steuernummer ${affiliate.tax_number}` : ''),
  ])

  tabellenkopf(d, [['Vermitteltes Paar', RAND], ['Provision', RECHTS, true]])

  for (const p of positionen) {
    d.platz(24)
    d.text(p.shoe_name || 'Paar', { y: d.y, groesse: 10 })
    d.text(euro(p.amount), { y: d.y, groesse: 10, rechts: RECHTS })
    d.y -= 12
    const zusatz = [p.order_ref, p.delivered_at && `zugestellt ${datum(p.delivered_at)}`,
                    p.benefit_kind === 'gift' ? 'abzüglich Zugabe' : null].filter(Boolean).join(' · ')
    if (zusatz) { d.text(zusatz, { y: d.y, groesse: 8.5, grau: true }); d.y -= 11 }
    d.y -= 4
  }

  d.luecke(4).linie().luecke(14)
  d.platz(20)
  d.text(`Gesamt (${positionen.length} ${positionen.length === 1 ? 'Paar' : 'Paare'})`, { y: d.y, groesse: 11, fett: true })
  d.text(euro(payout.amount), { y: d.y, groesse: 11, fett: true, rechts: RECHTS })
  d.y -= 24

  if (affiliate.tax_status === 'small_business') {
    d.absatz('Der Empfänger nimmt die Kleinunternehmerregelung nach § 19 UStG in Anspruch. Es wird keine Umsatzsteuer ausgewiesen.', { groesse: 8.5, grau: true })
  } else {
    d.absatz(`Der ausgewiesene Betrag versteht sich als Bruttobetrag einschließlich ${firma.ustSatz} % Umsatzsteuer.`, { groesse: 8.5, grau: true })
  }

  d.luecke(10)
  const konto = affiliate.iban ? `IBAN ${affiliate.iban}${affiliate.account_holder ? ` (${affiliate.account_holder})` : ''}` : 'die hinterlegte Bankverbindung'
  d.absatz(payout.paid_at
    ? `Ausgezahlt am ${datum(payout.paid_at)} auf ${konto}.`
    : `Die Auszahlung erfolgt auf ${konto}.`, { groesse: 9 })

  d.luecke(12)
  d.absatz('Diese Gutschrift rechnet über die Vermittlungsleistung des Empfängers ab (§ 14 Abs. 2 UStG). Widersprechen Sie ihr innerhalb von 14 Tagen, wenn eine Angabe nicht zutrifft.', { groesse: 8, grau: true })

  return d.buffer()
}
