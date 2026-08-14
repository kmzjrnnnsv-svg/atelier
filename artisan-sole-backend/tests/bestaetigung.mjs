/**
 * bestaetigung.mjs — was in der Bestellbestätigung stehen MUSS.
 *
 * Nicht „sieht hübsch aus", sondern: Im Fernabsatz müssen die
 * Vertragsbestimmungen einschließlich der AGB dem Kunden auf einem
 * dauerhaften Datenträger zugehen (§ 312f BGB), und über das nicht bestehende
 * Widerrufsrecht ist zu belehren. Ein Link auf die Website genügt dafür
 * nicht — was dort steht, lässt sich ändern, und der Kunde hätte nichts in
 * der Hand, das den Stand seines Kaufs festhält.
 *
 * Deshalb prüft dieses Skript den Inhalt der Nachricht und nicht, ob sie
 * hinausging: Es legt ein eigenes `fetch` unter und fängt sie ab.
 *
 *     DB_PATH=/tmp/pruef.db node tests/bestaetigung.mjs
 *
 * Der DB-Pfad zeigt auf dieselbe Wegwerf-Datenbank wie die übrigen
 * Prüfungen — die AGB müssen dort veröffentlicht sein, sonst gibt es nichts
 * beizulegen.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development'
process.env.JWT_ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || 'a'.repeat(32)
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'b'.repeat(32)
// Über den HTTPS-Weg, damit die Nachricht durch `fetch` läuft und sich
// abfangen lässt. Über SMTP käme man nur an einen Netzwerk-Socket.
process.env.MAIL_WEG      = 'http'
process.env.MAIL_ANBIETER = 'brevo'
process.env.MAIL_API_KEY  = 'xkeysib-pruef'
process.env.MAIL_ABSENDER = 'kontakt@artisansole.com'

let ok = 0
const bad = []
const p = (was, bedingung, zusatz = '') => {
  if (bedingung) { ok++; console.log('  OK    ', was, zusatz) }
  else { bad.push(was); console.log('  FEHLER', was, zusatz) }
}

let letzte = null
globalThis.fetch = async (url, init) => {
  letzte = { url, body: JSON.parse(init.body) }
  return { ok: true, status: 200, text: async () => '{}' }
}

const { sendOrderConfirmation } = await import('../src/utils/email.js')

const bestellung = {
  id: 42, order_ref: 'ATL-20260814-ABC123', shoe_name: 'Oxford',
  material: 'Luxe Calf', color: 'Schwarz', price: '€ 1.450', eu_size: 43,
  user_order_number: 1, accessories: '[]',
  delivery_address: JSON.stringify({
    name: 'Qasim Raza', street: 'Musterweg 7', zip: '10115', city: 'Berlin', country: 'DE',
  }),
}
await sendOrderConfirmation(bestellung, { name: 'Qasim Raza', email: 'kunde@beispiel.de' })

const html = letzte?.body?.htmlContent || ''

console.log('\n── 1. Die Bestellung selbst ──────────────────────────────────')
p('Geht an den Besteller', letzte?.body?.to?.[0]?.email === 'kunde@beispiel.de')
p('Bestellnummer steht drin', html.includes('ATL-20260814-ABC123'))
p('Modell und Ausführung', html.includes('Oxford') && html.includes('Luxe Calf'))
p('Lieferadresse', html.includes('Musterweg 7') && html.includes('10115'))

console.log('\n── 2. Belehrung über das Widerrufsrecht ──────────────────────')
p('Als eigener Abschnitt', html.includes('Kein Widerrufsrecht'))
p('Mit Rechtsgrundlage', html.includes('312g'))
p('Express ausdrücklich eingeschlossen', /auch nicht in der\s*Express-Linie/.test(html.replace(/\s+/g, ' ')))
p('Kulanz genannt, samt Frist', html.includes('14 Tagen nach Erhalt'))
p('Stornierung: der Wendepunkt', html.includes('Freigabe an die Werkstatt'))

console.log('\n── 3. Vertragsbedingungen auf dauerhaftem Datenträger ────────')
p('AGB liegen bei', html.includes('Allgemeine Geschäftsbedingungen'))
p('Nicht nur ein Link', html.length > 12000, `${html.length} Zeichen`)
p('Mit der Stornostaffel', html.includes('In Fertigung'))
p('Mit dem Express-Abschnitt', html.includes('Zwei Linien'))
p('Mit der Löschfrist', html.includes('dreißig Tage') || html.includes('30 Tage'))

console.log('\n── 4. Nichts, was dort nicht hingehört ───────────────────────')
p('Kein Skript', !/<script/i.test(html))
p('Keine offenen Platzhalter', !/\{\{|\[[A-ZÄÖÜ]{3,}\]/.test(html))

console.log('\n── Ergebnis ──────────────────────────────────────────────────\n')
console.log(`  ${ok} bestanden, ${bad.length} fehlgeschlagen`)
if (bad.length) { console.log('  ' + bad.join('\n  ')); process.exit(1) }
