/**
 * mailwege.mjs — der Versand über HTTPS, ohne eine einzige Mail zu verschicken.
 *
 * Die anderen Prüfungen sprechen mit einem laufenden Server. Diese nicht: Sie
 * ruft das Modul unmittelbar auf und legt ein eigenes `fetch` unter, das die
 * Anfrage festhält, statt sie hinauszugeben.
 *
 * Anders ginge es nicht sinnvoll. Gegen die echten Dienste zu prüfen hieße,
 * vier Konten zu unterhalten, bei jedem Lauf Schlüssel zu hinterlegen und
 * Nachrichten in fremde Postfächer zu schicken. Was hier zählt, ist ohnehin
 * etwas anderes: dass jede Anfrage genau die Form hat, die der jeweilige
 * Dienst erwartet — und dass eine abschlägige Antwort in einen Satz übersetzt
 * wird, der sagt, was zu tun ist.
 *
 *     node tests/mailwege.mjs
 */
import { versendeUeberHttp, pruefeHttp, fehlendeAngaben, anbieterListe } from '../src/utils/mailHttp.js'

let ok = 0
const bad = []
const p = (was, bedingung, zusatz = '') => {
  if (bedingung) { ok++; console.log('  OK    ', was, zusatz) }
  else { bad.push(was); console.log('  FEHLER', was, zusatz) }
}

const echtesFetch = globalThis.fetch
let letzte = null

/** Legt ein `fetch` unter, das die Anfrage festhält und die Antwort vorgibt. */
function stelleAntwort({ status = 200, koerper = '{}' } = {}) {
  globalThis.fetch = async (url, init) => {
    letzte = { url, init }
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => koerper,
    }
  }
}

const NACHRICHT = { to: 'kunde@beispiel.de', subject: 'Betreff', html: '<p>Inhalt</p>', text: 'Inhalt' }
const basis = { from: 'kontakt@artisansole.com', fromName: 'Artisan Sole', apiKey: 'schluessel-123' }

console.log('\n── 1. Brevo ──────────────────────────────────────────────────')
stelleAntwort()
await versendeUeberHttp({ ...basis, provider: 'brevo' }, NACHRICHT)
p('Adresse stimmt', letzte.url === 'https://api.brevo.com/v3/smtp/email', letzte.url)
p('Schlüssel im eigenen Kopf', letzte.init.headers['api-key'] === 'schluessel-123')
{
  const b = JSON.parse(letzte.init.body)
  p('Absender als Objekt', b.sender?.email === 'kontakt@artisansole.com' && b.sender?.name === 'Artisan Sole')
  p('Empfänger als Liste', Array.isArray(b.to) && b.to[0].email === 'kunde@beispiel.de')
  p('Inhalt unter htmlContent', b.htmlContent === '<p>Inhalt</p>' && b.textContent === 'Inhalt')
}

console.log('\n── 2. Resend ─────────────────────────────────────────────────')
stelleAntwort()
await versendeUeberHttp({ ...basis, provider: 'resend' }, NACHRICHT)
p('Adresse stimmt', letzte.url === 'https://api.resend.com/emails', letzte.url)
p('Schlüssel als Bearer', letzte.init.headers.authorization === 'Bearer schluessel-123')
{
  const b = JSON.parse(letzte.init.body)
  p('Absender mit Namen davor', b.from === 'Artisan Sole <kontakt@artisansole.com>', b.from)
  p('Empfänger als Liste', Array.isArray(b.to) && b.to[0] === 'kunde@beispiel.de')
}

console.log('\n── 3. Postmark ───────────────────────────────────────────────')
stelleAntwort()
await versendeUeberHttp({ ...basis, provider: 'postmark' }, NACHRICHT)
p('Adresse stimmt', letzte.url === 'https://api.postmarkapp.com/email', letzte.url)
p('Server-Token im eigenen Kopf', letzte.init.headers['X-Postmark-Server-Token'] === 'schluessel-123')
{
  const b = JSON.parse(letzte.init.body)
  p('Großgeschriebene Felder', b.From && b.To === 'kunde@beispiel.de' && b.HtmlBody === '<p>Inhalt</p>')
  p('Strom benannt', b.MessageStream === 'outbound')
}

console.log('\n── 4. Mailgun ────────────────────────────────────────────────')
stelleAntwort()
await versendeUeberHttp({ ...basis, provider: 'mailgun', domain: 'mg.artisansole.com', region: 'eu' }, NACHRICHT)
p('EU-Endpunkt', letzte.url === 'https://api.eu.mailgun.net/v3/mg.artisansole.com/messages', letzte.url)
p('Anmeldung als Basic', letzte.init.headers.authorization === 'Basic ' + Buffer.from('api:schluessel-123').toString('base64'))
p('Formularfelder statt JSON', letzte.init.headers['content-type'] === 'application/x-www-form-urlencoded')
{
  const b = new URLSearchParams(letzte.init.body)
  p('Empfänger im Formular', b.get('to') === 'kunde@beispiel.de')
  p('Absender im Formular', b.get('from') === 'Artisan Sole <kontakt@artisansole.com>')
}
stelleAntwort()
await versendeUeberHttp({ ...basis, provider: 'mailgun', domain: 'mg.artisansole.com', region: 'us' }, NACHRICHT)
p('US-Endpunkt getrennt', letzte.url.startsWith('https://api.mailgun.net/'), letzte.url)

console.log('\n── 5. Was fehlt, wird benannt ────────────────────────────────')
p('Ohne Schlüssel', fehlendeAngaben({ provider: 'brevo', from: 'a@b.de' }).length === 1)
p('Mailgun ohne Domain', fehlendeAngaben({ provider: 'mailgun', from: 'a@b.de', apiKey: 'x' }).includes('Domain'))
p('Brevo ohne Domain ist vollständig', fehlendeAngaben({ provider: 'brevo', from: 'a@b.de', apiKey: 'x' }).length === 0)
try {
  await versendeUeberHttp({ ...basis, apiKey: '', provider: 'brevo' }, NACHRICHT)
  p('Unvollständig wird abgewiesen', false)
} catch (e) {
  p('Unvollständig wird abgewiesen', /Es fehlt noch/.test(e.message), e.message)
}

console.log('\n── 6. Abschlägige Antworten werden übersetzt ─────────────────')
const fehlerText = async (cfg, antwort) => {
  stelleAntwort(antwort)
  try { await versendeUeberHttp(cfg, NACHRICHT); return null }
  catch (e) { return e.message }
}
{
  const m = await fehlerText({ ...basis, provider: 'brevo' }, { status: 401, koerper: '{"message":"Key not found"}' })
  p('401 zeigt auf den Schlüssel', /Schlüssel zurück/.test(m), m?.slice(0, 60))
}
{
  const m = await fehlerText({ ...basis, provider: 'postmark' }, { status: 422, koerper: '{"Message":"Sender signature not confirmed"}' })
  p('Unbestätigter Absender wird erkannt', /Absenderadresse/.test(m), m?.slice(0, 70))
}
{
  const m = await fehlerText({ ...basis, provider: 'mailgun', domain: 'falsch.de' }, { status: 404, koerper: 'Domain not found' })
  p('404 zeigt auf Domain und Region', /Domain/.test(m) && /Region/.test(m), m?.slice(0, 70))
}
{
  const m = await fehlerText({ ...basis, provider: 'brevo' }, { status: 429, koerper: '{}' })
  p('429 nennt das Kontingent', /Kontingent/.test(m), m?.slice(0, 60))
}
{
  const m = await fehlerText({ ...basis, provider: 'brevo' }, { status: 503, koerper: 'oops' })
  p('5xx entlastet die eigene Einstellung', /nicht an unserer Einstellung|eigenen Seite/.test(m), m?.slice(0, 60))
}

console.log('\n── 7. Prüfen ohne zu senden ──────────────────────────────────')
stelleAntwort({ status: 200, koerper: '{"email":"konto@beispiel.de"}' })
{
  const r = await pruefeHttp({ ...basis, provider: 'brevo' })
  p('Konto abgefragt statt Mail geschickt', letzte.url === 'https://api.brevo.com/v3/account', letzte.url)
  p('Antwortet der Dienst, ist es gut', r.ok === true && r.anbieter === 'Brevo')
  p('Hinweis auf die offene Frage', /Absenderadresse/.test(r.hinweis || ''))
}
stelleAntwort({ status: 401, koerper: '{}' })
{
  const r = await pruefeHttp({ ...basis, provider: 'resend' })
  p('Schlechter Schlüssel fällt hier schon auf', r.ok === false && /Schlüssel/.test(r.reason))
}
{
  const r = await pruefeHttp({ ...basis, apiKey: '', provider: 'brevo' })
  p('Ohne Schlüssel wird nichts gefragt', r.ok === false && /Es fehlt noch/.test(r.reason))
}

console.log('\n── 8. Netz und Zeitgrenze ────────────────────────────────────')
globalThis.fetch = async () => { const e = new Error('abgebrochen'); e.name = 'AbortError'; throw e }
{
  const r = await pruefeHttp({ ...basis, provider: 'brevo' })
  p('Zeitüberschreitung wird benannt', r.ok === false && r.code === 'ZEITGRENZE', r.reason)
}
globalThis.fetch = async () => { throw new Error('getaddrinfo ENOTFOUND') }
{
  const r = await pruefeHttp({ ...basis, provider: 'brevo' })
  p('Unerreichbarer Dienst wird benannt', r.ok === false && r.code === 'NETZ', r.reason)
}

console.log('\n── 9. Liste für die Verwaltung ───────────────────────────────')
{
  const liste = anbieterListe()
  p('Alle vier Dienste', liste.length === 4, liste.map(a => a.name).join(', '))
  p('Ohne Funktionen', liste.every(a => typeof a.senden === 'undefined'))
  p('Jeder mit Hinweis und Feldnamen', liste.every(a => a.hinweis && a.schluesselFeld))
  p('Jeder mit vier Einrichtungsschritten', liste.every(a => a.einrichtung?.length === 4),
    liste.map(a => `${a.name}:${a.einrichtung.length}`).join(' '))
  p('Kein Schritt bleibt eine Überschrift', liste.every(a => a.einrichtung.every(s => s.length > 40)))
}

globalThis.fetch = echtesFetch

console.log('\n── Ergebnis ──────────────────────────────────────────────────\n')
console.log(`  ${ok} bestanden, ${bad.length} fehlgeschlagen`)
if (bad.length) { console.log('  ' + bad.join('\n  ')); process.exit(1) }
