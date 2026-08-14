/**
 * email.js · Nodemailer transporter + DB-driven order email templates
 *
 * Config via environment variables OR settings table in DB:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   MANUFACTURER_EMAIL, APP_URL
 *
 * Email text (subject/intro/body) is editable via the email_templates table.
 * If SMTP_USER is not set, emails are logged to console only (dev mode).
 */

import nodemailer from 'nodemailer'
import net from 'net'
import dns from 'dns/promises'
import { getDb } from '../db/database.js'
import { versendeUeberHttp, pruefeHttp } from './mailHttp.js'

// ─── Config ───────────────────────────────────────────────────────────────────
function getEmailConfig() {
  try {
    const db   = getDb()
    const keys = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_manufacturer_email', 'app_url',
                  'business_inquiry_email',
                  'mail_weg', 'mail_anbieter', 'mail_api_key', 'mail_absender', 'mail_domain', 'mail_region',
                  'bank_iban', 'bank_bic', 'bank_holder', 'bank_name']
    const rows = db.prepare(`SELECT key, value FROM settings WHERE key IN (${keys.map(() => '?').join(',')})`)
      .all(...keys)
    const s = Object.fromEntries(rows.map(r => [r.key, r.value]))
    return {
      host:       s.smtp_host               || process.env.SMTP_HOST               || 'smtp.gmail.com',
      port:       s.smtp_port               || process.env.SMTP_PORT               || '587',
      user:       s.smtp_user               || process.env.SMTP_USER               || '',
      pass:       s.smtp_pass               || process.env.SMTP_PASS               || '',
      mfgEmail:   s.smtp_manufacturer_email || process.env.MANUFACTURER_EMAIL      || '',
      inquiryEmail: s.business_inquiry_email || process.env.BUSINESS_INQUIRY_EMAIL || '',
      // Der Weg hinaus: 'smtp' wie bisher, 'http' über die Schnittstelle eines
      // Maildienstes. Ohne Angabe bleibt alles beim Alten — eine bestehende
      // Einrichtung soll sich durch diese Erweiterung nicht ändern.
      weg:        s.mail_weg      || process.env.MAIL_WEG      || 'smtp',
      provider:   s.mail_anbieter || process.env.MAIL_ANBIETER || 'brevo',
      apiKey:     s.mail_api_key  || process.env.MAIL_API_KEY  || '',
      // Fehlt die Absenderadresse, gilt die des SMTP-Kontos: Wer von SMTP
      // umstellt, hat sie dort bereits stehen.
      from:       s.mail_absender || process.env.MAIL_ABSENDER || s.smtp_user || process.env.SMTP_USER || '',
      fromName:   'Artisan Sole',
      domain:     s.mail_domain   || process.env.MAIL_DOMAIN   || '',
      region:     s.mail_region   || process.env.MAIL_REGION   || 'eu',
      appUrl:     s.app_url                 || process.env.APP_URL                 || 'http://localhost:5173',
      bankIban:   s.bank_iban   || process.env.BANK_IBAN   || 'DE00 0000 0000 0000 0000 00',
      bankBic:    s.bank_bic    || process.env.BANK_BIC    || 'XXXXXXXX',
      bankHolder: s.bank_holder || process.env.BANK_HOLDER || 'Artisan Sole GmbH',
      bankName:   s.bank_name   || process.env.BANK_NAME   || 'Musterbank',
    }
  } catch {
    return {
      host: 'smtp.gmail.com', port: '587', user: '', pass: '', mfgEmail: '', inquiryEmail: '', appUrl: 'http://localhost:5173',
      weg: 'smtp', provider: 'brevo', apiKey: '', from: '', fromName: 'Artisan Sole', domain: '', region: 'eu',
      bankIban: 'DE00 0000 0000 0000 0000 00', bankBic: 'XXXXXXXX', bankHolder: 'Artisan Sole GmbH', bankName: 'Musterbank',
    }
  }
}

/**
 * Die Bankverbindung, wie sie in der Verwaltung hinterlegt ist.
 *
 * Sie lag bislang nur hier, weil nur die Zahlungs-Mail sie brauchte. Jetzt
 * braucht sie auch die Bestellseite — dieselbe Quelle, damit nicht zwei
 * Stellen zwei Konten nennen.
 */
export function bankKonfiguration() {
  const cfg = getEmailConfig()
  return { iban: cfg.bankIban, bic: cfg.bankBic, holder: cfg.bankHolder, bank: cfg.bankName }
}

function createTransporter(cfg) {
  if (!cfg.user) return null
  return nodemailer.createTransport({
    host:   cfg.host,
    port:   Number(cfg.port) || 587,
    secure: Number(cfg.port) === 465,
    auth:   { user: cfg.user, pass: cfg.pass },
    // Zeitgrenzen, damit ein nicht erreichbarer Server auffällt statt zu
    // hängen. Ohne sie wartet nodemailer je nach Phase bis zu zehn Minuten:
    // Die Testnachricht in der Verwaltung stand dann dauerhaft auf „sendet …",
    // ohne dass jemand erfuhr, woran es liegt — und beim Bestellversand
    // blockierte jeder Versuch stillschweigend im Hintergrund.
    connectionTimeout: 10000,
    greetingTimeout:   10000,
    socketTimeout:     20000,
    // Wahl der IP-Version.
    //
    // Hat der Mailserver einen AAAA-Eintrag, ist über IPv6 aber nicht
    // erreichbar, wählt Node genau diesen Weg und wartet, bis das Zeitlimit
    // greift — obwohl IPv4 sofort ginge. Das Fehlerbild ist eine
    // Zeitüberschreitung bei völlig korrekter Konfiguration, und vom eigenen
    // Rechner aus lässt es sich nie nachstellen.
    //
    // Ohne Angabe bleibt alles wie bisher (Node entscheidet). SMTP_FAMILY=4
    // erzwingt IPv4 — das ist die Abhilfe, die die Verbindungsprüfung
    // vorschlägt, wenn sie genau dieses Bild misst.
    ...(process.env.SMTP_FAMILY ? { family: Number(process.env.SMTP_FAMILY) } : {}),
  })
}

/**
 * Fehlt die SMTP-Zugangskennung, wurde bisher stillschweigend nur auf die
 * Konsole geschrieben — auch im Produktivbetrieb. Nach außen sah alles nach
 * Erfolg aus, während nie eine Mail hinausging. Genau daran sind die
 * Einladungen gescheitert.
 *
 * Auf dem Entwicklungsrechner bleibt das Verhalten: Dort ist kein SMTP
 * eingerichtet und soll es auch nicht sein. Im Produktivbetrieb wird daraus
 * ein Fehler, den die aufrufende Stelle weiterreichen kann.
 */
export class EmailNotConfiguredError extends Error {
  constructor() {
    super('SMTP ist nicht eingerichtet — unter Administration › E-Mail / SMTP hinterlegen.')
    this.name = 'EmailNotConfiguredError'
  }
}

/**
 * Ist der Versand über HTTPS eingerichtet?
 *
 * Gefragt wird nach beidem — der ausdrücklichen Wahl und den nötigen Angaben.
 * Ein halb ausgefülltes Formular soll nicht dazu führen, dass gar nichts mehr
 * hinausgeht: Fehlt der Schlüssel, bleibt es beim bisherigen Weg.
 */
const httpVersand = (cfg) => cfg.weg === 'http' && !!cfg.apiKey && !!cfg.from

async function send(options) {
  const cfg = getEmailConfig()

  // Der Weg über HTTPS. Er braucht keinen offenen Mail-Port und ist deshalb
  // auf diesem Server der einzige, der zuverlässig hinauskommt.
  if (httpVersand(cfg)) {
    await versendeUeberHttp(cfg, {
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })
    return
  }

  const transporter = createTransporter(cfg)
  if (!transporter) {
    if (process.env.NODE_ENV === 'production') throw new EmailNotConfiguredError()
    console.log('\n📧 [EMAIL · dev mode, SMTP not configured]')
    console.log('  To:     ', options.to)
    console.log('  Subject:', options.subject)
    return
  }
  await transporter.sendMail({ from: `Artisan Sole <${cfg.user}>`, ...options })
}

/**
 * Prüft die SMTP-Einstellungen, ohne etwas zu verschicken, und liefert
 * zusätzlich zurück, ob die Adresse der Anwendung brauchbar ist: Steht dort
 * noch localhost, geht die Mail zwar hinaus, aber der Einladungslink darin
 * führt beim Empfänger ins Leere.
 */
/**
 * Was ein SMTP-Fehler bedeutet — und was er ausschließt.
 *
 * „Connection timeout" ist die unfreundlichste aller Meldungen: Sie sagt, dass
 * etwas nicht ging, aber nicht, wonach man suchen soll. Wer sie liest, prüft
 * zuerst das Passwort — und genau das ist die einzige Sache, die es sicher
 * NICHT sein kann. Eine Zeitüberschreitung entsteht, bevor irgendeine
 * Anmeldung stattfindet: Die Verbindung zum Server kam gar nicht erst
 * zustande.
 *
 * Deshalb steht hier zu jedem Fehlerbild, was es ausschließt und wo man
 * nachsieht. Der Text landet unverändert in der Verwaltung.
 */
function smtpDeutung(e, cfg) {
  const code = e?.code || ''
  const text = String(e?.message || '')
  const ziel = `${cfg.host}:${cfg.port}`

  if (code === 'ETIMEDOUT' || code === 'ECONNECTION' || /timeout/i.test(text)) {
    return `Keine Verbindung zu ${ziel} — die Gegenstelle antwortet nicht. `
      + 'An Benutzername oder Passwort liegt es nicht: Bis zur Anmeldung kommt es gar nicht. '
      + 'Entweder ist der Servername falsch, der Port falsch, oder der Port ist gesperrt. '
      + 'Hetzner sperrt ausgehende Mail-Ports bei neuen Servern standardmäßig; '
      + 'das lässt sich per Support-Anfrage freischalten. Prüfen lässt es sich auf dem '
      + `Server mit: nc -zv -w5 ${cfg.host} ${cfg.port}`
  }
  if (code === 'ECONNREFUSED') {
    return `${ziel} weist die Verbindung aktiv ab — dort nimmt nichts Verbindungen an. `
      + 'Meist ein falscher Port: 587 für STARTTLS, 465 für direktes TLS.'
  }
  if (code === 'EDNS' || code === 'ENOTFOUND' || /getaddrinfo/i.test(text)) {
    return `Der Servername „${cfg.host}" lässt sich nicht auflösen. Vertippt, oder der Eintrag fehlt im DNS.`
  }
  if (code === 'EAUTH') {
    return 'Der Server ist erreichbar, weist aber die Anmeldung zurück. '
      + `Benutzername oder Passwort stimmen nicht — bei „${cfg.user}" ist meist die volle `
      + 'E-Mail-Adresse als Benutzername gefragt, nicht nur der Teil davor.'
  }
  if (code === 'ESOCKET' || /wrong version number|ssl/i.test(text)) {
    return `Verschlüsselung passt nicht zum Port ${cfg.port}. `
      + 'Port 465 spricht von Anfang an TLS, Port 587 beginnt unverschlüsselt und schaltet um. '
      + 'Die beiden lassen sich nicht tauschen.'
  }
  return text || 'Unbekannter Fehler beim Verbindungsaufbau.'
}

export async function verifyEmailSetup() {
  const cfg = getEmailConfig()
  const appUrlOk = /^https?:\/\//.test(cfg.appUrl) && !/localhost|127\.0\.0\.1/.test(cfg.appUrl)

  // Der Weg über HTTPS prüft sich anders: Es gibt keine Verbindung, die man
  // aufbauen und wieder schließen könnte. Stattdessen fragt er den Dienst nach
  // dem eigenen Konto — antwortet der, stimmen Schlüssel und Erreichbarkeit.
  if (cfg.weg === 'http') {
    const r = await pruefeHttp(cfg)
    return { ...r, weg: 'http', anbieter: r.anbieter || cfg.provider, absender: cfg.from, appUrl: cfg.appUrl, appUrlUsable: appUrlOk }
  }

  const transporter = createTransporter(cfg)
  if (!transporter) return { ok: false, weg: 'smtp', reason: 'Kein SMTP-Benutzer hinterlegt.' }
  try {
    await transporter.verify()
  } catch (e) {
    // Host und Port gehören zur Fehlermeldung: Ohne sie sieht niemand, wohin
    // überhaupt verbunden wurde — und der häufigste Fall ist, dass dort noch
    // der Vorgabewert smtp.gmail.com steht.
    return { ok: false, weg: 'smtp', reason: smtpDeutung(e, cfg), code: e?.code || null, host: cfg.host, port: cfg.port, user: cfg.user }
  }
  return { ok: true, weg: 'smtp', host: cfg.host, port: cfg.port, user: cfg.user, appUrl: cfg.appUrl, appUrlUsable: appUrlOk }
}

/**
 * Wo genau es klemmt — ohne SSH-Zugang.
 *
 * Eine Zeitüberschreitung hat bei korrektem Host und Port praktisch immer
 * einen von zwei Gründen, und die Meldung selbst unterscheidet sie nicht:
 *
 *   1. Der Port ist gesperrt. Hetzner sperrt ausgehende Mail-Ports bei neuen
 *      Servern; freischalten geht per Support-Anfrage.
 *   2. Die Sackgasse über IPv6. Hat der Mailserver einen AAAA-Eintrag, ist
 *      aber über IPv6 nicht erreichbar, wählt Node genau diesen Weg und
 *      wartet, bis das Zeitlimit greift. Über IPv4 ginge es sofort. Das ist
 *      der heimtückischere Fall: Nichts ist falsch konfiguriert, und jede
 *      Prüfung vom eigenen Rechner aus gelingt.
 *
 * Diese Prüfung baut deshalb rohe TCP-Verbindungen auf — je Port einmal über
 * IPv4 und einmal über IPv6 — und sagt, welcher Weg offen ist. Aus „geht
 * nicht" wird damit „Port 465 über IPv4 offen, über IPv6 tot".
 *
 * Geprüft wird ausschließlich der hinterlegte Mailserver auf den drei
 * SMTP-Ports. Ein frei wählbares Ziel wäre ein Portscanner mit Anmeldung.
 */
const SMTP_PORTS = [587, 465, 25]

function tcpVersuch(host, port, family, ms = 4000) {
  return new Promise((fertig) => {
    let erledigt = false
    const schluss = (r) => { if (!erledigt) { erledigt = true; try { s.destroy() } catch { /* schon zu */ } fertig(r) } }
    const s = net.connect({ host, port, family })
    const uhr = setTimeout(() => schluss({ ok: false, grund: 'Zeitüberschreitung' }), ms)
    s.once('connect', () => { clearTimeout(uhr); schluss({ ok: true }) })
    s.once('error', (e) => { clearTimeout(uhr); schluss({ ok: false, grund: e.code || e.message }) })
  })
}

export async function diagnoseSmtp() {
  const cfg = getEmailConfig()
  if (!cfg.host) return { ok: false, reason: 'Kein Mailserver hinterlegt.' }

  const v4 = await dns.resolve4(cfg.host).catch(() => [])
  const v6 = await dns.resolve6(cfg.host).catch(() => [])

  const ports = []
  for (const port of SMTP_PORTS) {
    const eintrag = { port, konfiguriert: Number(cfg.port) === port }
    if (v4.length) eintrag.ipv4 = await tcpVersuch(v4[0], port, 4)
    if (v6.length) eintrag.ipv6 = await tcpVersuch(v6[0], port, 6)
    ports.push(eintrag)
  }

  // Der Satz, der die Sache entscheidet — zusammengesetzt aus dem, was
  // tatsächlich gemessen wurde, nicht aus Vermutungen.
  const offenV4 = ports.filter(p => p.ipv4?.ok).map(p => p.port)
  const offenV6 = ports.filter(p => p.ipv6?.ok).map(p => p.port)
  const konf = ports.find(p => p.konfiguriert)

  let befund
  if (!v4.length && !v6.length) {
    befund = `Der Name „${cfg.host}" lässt sich nicht auflösen. Bitte die Schreibweise prüfen.`
  } else if (!offenV4.length && !offenV6.length) {
    befund = 'Kein einziger Mail-Port ist von diesem Server aus erreichbar — weder 25 noch 465 noch 587. '
      + 'Das ist das Bild einer Sperre beim Rechenzentrum, nicht einer falschen Einstellung. '
      + 'Bei Hetzner lässt sich der ausgehende Mail-Versand per Support-Anfrage freischalten.'
  } else if (konf?.ipv4?.ok && v6.length && !konf?.ipv6?.ok) {
    befund = `Port ${konf.port} ist über IPv4 offen, über IPv6 tot. Genau daher kommt die Zeitüberschreitung: `
      + 'Der Mailserver hat einen IPv6-Eintrag, ist darüber aber nicht erreichbar, und dieser Weg wird zuerst versucht. '
      + 'Abhilfe: SMTP_FAMILY=4 in der Server-Umgebung setzen, dann wird nur noch IPv4 verwendet.'
  } else if (!konf?.ipv4?.ok && !konf?.ipv6?.ok && (offenV4.length || offenV6.length)) {
    befund = `Der eingestellte Port ${cfg.port} ist gesperrt, offen ist dagegen ${[...new Set([...offenV4, ...offenV6])].join(' und ')}. `
      + 'Bitte auf einen offenen Port umstellen — 587 spricht STARTTLS, 465 direktes TLS.'
  } else if (konf?.ipv4?.ok || konf?.ipv6?.ok) {
    befund = `Port ${cfg.port} ist erreichbar. Die Verbindung steht also — scheitert es trotzdem, `
      + 'liegt es an der Anmeldung oder der Verschlüsselung, nicht am Netz.'
  } else {
    befund = 'Uneindeutiges Bild, siehe die einzelnen Ergebnisse unten.'
  }

  return { ok: true, host: cfg.host, port: cfg.port, ipv4: v4[0] || null, ipv6: v6[0] || null, ports, befund }
}

/** Testnachricht an eine Adresse, damit sich der Weg vollständig prüfen lässt. */
export async function sendTestEmail(to) {
  const cfg = getEmailConfig()
  const ueberHttp = httpVersand(cfg)
  const weg = ueberHttp
    ? `${cfg.provider} über HTTPS · Absender ${cfg.from}`
    : `${cfg.host}:${cfg.port}`
  try {
    await send({
      to,
      subject: 'Artisan Sole · Testnachricht',
      html: `<p>Diese Nachricht bestätigt, dass der E-Mail-Versand funktioniert.</p>
             <p style="color:#888;font-size:12px">Weg: ${weg} · Adresse der Anwendung: ${cfg.appUrl}</p>`,
      text: 'Diese Nachricht bestätigt, dass der E-Mail-Versand funktioniert.',
    })
  } catch (e) {
    if (e instanceof EmailNotConfiguredError) throw e
    // Der HTTPS-Weg deutet seine Fehler selbst — die Meldung von dort ist
    // bereits ein ganzer Satz und würde von der SMTP-Deutung nur verfälscht.
    if (ueberHttp) throw e
    // Dieselbe Deutung wie bei der Prüfung. Ohne sie stand hier die nackte
    // Meldung der Bibliothek, und die schickt jeden zuerst zum Passwort.
    const fehler = new Error(smtpDeutung(e, cfg))
    fehler.code = e?.code || null
    throw fehler
  }
}

// ─── Template engine ──────────────────────────────────────────────────────────
const DEFAULTS = {
  order_confirmation: {
    subject: 'Artisan Sole · Bestellbestätigung {{order_ref}}',
    intro:   'Vielen Dank, {{name}}. Ihre Bestellung wurde aufgenommen und wird individuell für Sie angefertigt.',
    body:    'Ihre Schuhe werden custom-made gefertigt und in der Regel rund 4 Wochen nach Zahlungseingang direkt zu Ihnen geliefert.\nDen aktuellen Status Ihrer Bestellung finden Sie jederzeit in der Artisan Sole App unter Meine Bestellungen.',
  },
  payment: {
    subject: 'Artisan Sole · Zahlungsinformationen {{order_ref}}',
    intro:   'Vielen Dank, {{name}}. Ihre Bestellung wurde erfasst und wartet auf Ihre Zahlung.\nBitte überweisen Sie den folgenden Betrag an das unten angegebene Konto. Verwenden Sie dabei zwingend den angegebenen Verwendungszweck, damit wir Ihre Zahlung korrekt zuordnen können.',
    body:    'Nach Zahlungseingang werden Ihre Schuhe umgehend in die Fertigung gegeben.\nSie erhalten eine Bestätigung, sobald Ihre Zahlung bei uns eingegangen ist.',
  },
  order_confirmed: {
    subject: 'Artisan Sole · Zahlung bestätigt & Bestellung in Fertigung {{order_ref}}',
    intro:   'Ihre Zahlung wurde bestätigt. Ihre Schuhe {{shoe_name}} sind nun in der Fertigung.',
    body:    'Den aktuellen Status Ihrer Bestellung finden Sie jederzeit in der Artisan Sole App unter Meine Bestellungen.',
  },
  shipping: {
    subject: 'Artisan Sole · Ihre Schuhe sind unterwegs! {{order_ref}}',
    intro:   '{{shoe_name}} wurden soeben versandt und befinden sich auf dem Weg zu Ihnen.',
    body:    'Den aktuellen Status Ihrer Bestellung finden Sie jederzeit in der Artisan Sole App unter Meine Bestellungen.\nBei Fragen wenden Sie sich an unser Team, wir sind gerne für Sie da.',
  },
  quality_check: {
    subject: 'Artisan Sole · Ihre Schuhe in der Qualitätskontrolle {{order_ref}}',
    intro:   'Ihre Schuhe {{shoe_name}} wurden erfolgreich gefertigt und befinden sich jetzt in unserer Qualitätskontrolle.',
    body:    'Jedes Detail wird geprüft, von der Nahtführung bis zur Passform. Nach bestandener Kontrolle werden Ihre Schuhe umgehend versandt.\nDen aktuellen Status finden Sie jederzeit in der Artisan Sole App.',
  },
  manufacturer: {
    subject: '[Artisan Sole] Neue Bestellung {{order_ref}} · USER-{{user_id_padded}} · {{shoe_name}}',
    intro:   'Neue Bestellung eingegangen. Bitte Fertigung vorbereiten.',
    body:    'STL-Dateien mit Kennung U{{user_id_padded}} im Admin-Panel herunterladen.',
  },
}

function getTemplate(type) {
  try {
    const row = getDb().prepare('SELECT * FROM email_templates WHERE type = ?').get(type)
    if (row) return row
  } catch { /* DB not ready yet */ }
  return DEFAULTS[type]
}

function render(text, vars) {
  return (text || '').replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] !== undefined ? vars[key] : `{{${key}}}`)
}

// Wie render(), escaped aber die eingesetzten Werte — für Templates, die in
// einen HTML-Kontext fließen (intro/body). Der Vorlagentext selbst (vom Admin
// gepflegt) bleibt unangetastet; nur die eingesetzten, teils kundenkontrol-
// lierten Werte ({{name}}, {{shoe_name}} …) werden neutralisiert. Der Betreff
// nutzt weiter render(), da er als Header keine HTML-Escapes verträgt.
function renderHtml(text, vars) {
  return (text || '').replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] !== undefined ? escapeHtml(vars[key]) : `{{${key}}}`)
}

// Frisch geparste Lieferadresse feldweise escapen (die Objekte werden je
// Funktion neu aus JSON gelesen, ein In-Place-Escapen ist daher unbedenklich).
function escAddr(a) {
  if (!a) return null
  return {
    name:    escapeHtml(a.name),
    street:  escapeHtml(a.street),
    zip:     escapeHtml(a.zip),
    city:    escapeHtml(a.city),
    country: escapeHtml(a.country),
    phone:   a.phone ? escapeHtml(a.phone) : '',
  }
}

// Zubehörliste (kundenseitig) feldweise escapen.
function escAcc(list) {
  return (Array.isArray(list) ? list : []).map(a => ({
    name:  escapeHtml(a.name),
    price: escapeHtml(a.price),
  }))
}

function nl2br(text) {
  return (text || '').replace(/\n/g, '<br>')
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// ─── Shared HTML chrome ────────────────────────────────────────────────────────
const CSS = `
  body{font-family:'Georgia',serif;background:#f8f7f5;margin:0;padding:0}
  .wrap{max-width:580px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,.08)}
  .header{background:#0d1a1a;padding:32px;text-align:center}
  .header h1{color:#fff;font-size:22px;letter-spacing:.25em;margin:0;font-weight:400}
  .header p{color:rgba(255,255,255,.5);font-size:11px;letter-spacing:.2em;margin:6px 0 0}
  .body{padding:32px}
  .label{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#999;margin-bottom:4px}
  .val{font-size:15px;color:#111;font-weight:600;margin-bottom:18px}
  .divider{border:none;border-top:1px solid #f0ede8;margin:20px 0}
  .footer{background:#f8f7f5;padding:20px 32px;font-size:11px;color:#aaa;text-align:center;letter-spacing:.08em}
  .badge{display:inline-block;font-size:10px;font-weight:800;padding:4px 12px;border-radius:20px;letter-spacing:.15em;margin-bottom:20px}
  table{width:100%;border-collapse:collapse}
`

// ─── Customer confirmation email ───────────────────────────────────────────────
export async function sendOrderConfirmation(order, user) {
  const tmpl = getTemplate('order_confirmation')
  const ref  = order.order_ref || `#${order.id}`
  const vars = {
    name: user.name, order_id: order.id, order_ref: ref, shoe_name: order.shoe_name,
    material: order.material, color: order.color, price: order.price,
    eu_size: order.eu_size || '-', user_order_number: order.user_order_number,
  }
  const subject = render(tmpl.subject, vars)
  const intro   = nl2br(renderHtml(tmpl.intro, vars))
  const closing = nl2br(renderHtml(tmpl.body, vars))

  const addr         = escAddr(order.delivery_address ? JSON.parse(order.delivery_address) : null)
  const accessories  = escAcc(order.accessories ? JSON.parse(order.accessories) : [])
  const accessoryRows = accessories.map(a => `
    <tr>
      <td style="padding:6px 0;font-size:13px;color:#555">${a.name}</td>
      <td style="padding:6px 0;font-size:13px;color:#555;text-align:right">${a.price}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>ARTISAN SOLE</h1>
    <p>BESTELLBESTÄTIGUNG · ${ref}</p>
  </div>
  <div class="body">
    <p style="font-size:15px;color:#333;margin:0 0 24px">${intro}</p>
    <div class="label">Schuh</div>
    <div class="val">${escapeHtml(order.shoe_name)}</div>
    <div class="label">Material · Farbe</div>
    <div class="val">${escapeHtml(order.material)} · ${escapeHtml(order.color)}</div>
    <div class="label">Ihre Größe (aus 3D-Scan)</div>
    <div class="val">EU ${order.eu_size || '-'}</div>
    <hr class="divider">
    <table>
      <tr>
        <td style="font-size:13px;color:#555">Schuh</td>
        <td style="font-size:13px;color:#555;text-align:right">${escapeHtml(order.price)}</td>
      </tr>
      ${accessoryRows}
    </table>
    ${addr ? `
    <hr class="divider">
    <div class="label">Lieferadresse</div>
    <div style="font-size:13px;color:#555;line-height:1.7">
      ${addr.name}<br>${addr.street}<br>${addr.zip} ${addr.city}<br>${addr.country}
    </div>` : ''}
    <hr class="divider">
    <p style="font-size:12px;color:#888;line-height:1.7;margin:0">${closing}</p>
  </div>
  <div class="footer">Artisan Sole Custom Made Footwear · Alle Schuhe sind Einzelanfertigungen</div>
</div>
</body></html>`

  await send({ to: user.email, subject, html })
}

// ─── Payment instructions email ────────────────────────────────────────────────
export async function sendPaymentInstructions(order, user) {
  const cfg  = getEmailConfig()
  const tmpl = getTemplate('payment')
  const ref  = order.order_ref || `#${order.id}`
  const vars = {
    name: user.name, order_id: order.id, order_ref: ref, shoe_name: order.shoe_name,
    price: order.price, user_order_number: order.user_order_number,
    bank_iban: cfg.bankIban, bank_bic: cfg.bankBic,
    bank_holder: cfg.bankHolder, bank_name: cfg.bankName,
    reference: order.order_ref || `ARTISANSOLE-${order.id}`,
  }
  const subject = render(tmpl.subject, vars)
  const intro   = nl2br(renderHtml(tmpl.intro, vars))
  const closing = nl2br(renderHtml(tmpl.body, vars))

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}
  .bank-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin:20px 0}
  .bank-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #d1fae5}
  .bank-row:last-child{border-bottom:none}
  .bank-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#6b7280}
  .bank-val{font-size:13px;color:#111;font-weight:700;font-family:monospace}
  .ref-highlight{background:#0d1a1a;color:#fff;padding:8px 16px;border-radius:6px;font-family:monospace;font-size:15px;font-weight:800;letter-spacing:.1em;display:inline-block}
</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>ARTISAN SOLE</h1>
    <p>ZAHLUNGSANWEISUNG · ${ref}</p>
  </div>
  <div class="body">
    <p style="font-size:15px;color:#333;margin:0 0 20px">${intro}</p>
    <div class="bank-box">
      <div class="bank-row">
        <span class="bank-label">Betrag</span>
        <span class="bank-val" style="font-size:18px;color:#059669">${escapeHtml(order.price)}</span>
      </div>
      <div class="bank-row">
        <span class="bank-label">Kontoinhaber</span>
        <span class="bank-val">${cfg.bankHolder}</span>
      </div>
      <div class="bank-row">
        <span class="bank-label">Bank</span>
        <span class="bank-val">${cfg.bankName}</span>
      </div>
      <div class="bank-row">
        <span class="bank-label">IBAN</span>
        <span class="bank-val">${cfg.bankIban}</span>
      </div>
      <div class="bank-row">
        <span class="bank-label">BIC</span>
        <span class="bank-val">${cfg.bankBic}</span>
      </div>
    </div>
    <p style="font-size:12px;color:#555;margin:16px 0 8px;font-weight:600">Verwendungszweck (bitte exakt angeben):</p>
    <div style="text-align:center;margin:8px 0 20px">
      <span class="ref-highlight">${order.order_ref || `ARTISANSOLE-${order.id}`}</span>
    </div>
    <hr class="divider">
    <div class="label">Bestellte Schuhe</div>
    <div class="val">${escapeHtml(order.shoe_name)}</div>
    <div class="label">Ihr ${order.user_order_number}. Schuh bei Artisan Sole</div>
    <hr class="divider">
    <p style="font-size:12px;color:#888;line-height:1.7;margin:0">${closing}</p>
  </div>
  <div class="footer">Artisan Sole Custom Made Footwear · Alle Schuhe sind Einzelanfertigungen</div>
</div>
</body></html>`

  await send({ to: user.email, subject, html })
}

// ─── Order confirmed (payment received) email ──────────────────────────────────
export async function sendOrderConfirmed(order, user) {
  const tmpl = getTemplate('order_confirmed')
  const ref  = order.order_ref || `#${order.id}`
  const vars = {
    name: user.name, order_id: order.id, order_ref: ref, shoe_name: order.shoe_name,
    material: order.material, color: order.color, price: order.price,
    eu_size: order.eu_size || '-', user_order_number: order.user_order_number,
  }
  const subject = render(tmpl.subject, vars)
  const intro   = nl2br(renderHtml(tmpl.intro, vars))
  const closing = nl2br(renderHtml(tmpl.body, vars))

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>ARTISAN SOLE</h1>
    <p>ZAHLUNG BESTÄTIGT · ${ref}</p>
  </div>
  <div class="body" style="text-align:center">
    <div class="badge" style="background:#2dd4bf;color:#0d1a1a">ZAHLUNG EINGEGANGEN</div>
    <p style="font-size:16px;color:#111;margin:0 0 8px;font-weight:600">${intro}</p>
    <div style="text-align:left">
      <div class="label">Bestellnummer</div>
      <div class="val">${ref}</div>
      <div class="label">Ihr ${order.user_order_number}. Schuh bei Artisan Sole</div>
      <div class="val">${escapeHtml(order.shoe_name)} · ${escapeHtml(order.material)} · ${escapeHtml(order.color)}</div>
      <div class="label">Geschätzte Lieferzeit</div>
      <div class="val">ca. 4 Wochen nach Zahlungseingang</div>
    </div>
    <hr class="divider">
    <p style="font-size:12px;color:#888;line-height:1.7;margin:0;text-align:left">${closing}</p>
  </div>
  <div class="footer">Artisan Sole Custom Made Footwear · Alle Schuhe sind Einzelanfertigungen</div>
</div>
</body></html>`

  await send({ to: user.email, subject, html })
}

// ─── Quality check notification email ──────────────────────────────────────────
export async function sendQualityCheckNotification(order, user) {
  const tmpl = getTemplate('quality_check')
  const ref  = order.order_ref || `#${order.id}`
  const vars = {
    name: user.name, order_id: order.id, order_ref: ref, shoe_name: order.shoe_name,
    material: order.material, color: order.color, price: order.price,
    eu_size: order.eu_size || '-', user_order_number: order.user_order_number,
  }
  const subject = render(tmpl.subject, vars)
  const intro   = nl2br(renderHtml(tmpl.intro, vars))
  const closing = nl2br(renderHtml(tmpl.body, vars))

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>ARTISAN SOLE</h1>
    <p>QUALITÄTSKONTROLLE · ${ref}</p>
  </div>
  <div class="body" style="text-align:center">
    <div class="badge" style="background:#8b5cf6;color:#fff">✓ QUALITÄTSKONTROLLE</div>
    <p style="font-size:16px;color:#111;margin:0 0 8px;font-weight:600">Ihre Schuhe werden geprüft.</p>
    <p style="font-size:14px;color:#555;margin:0 0 24px">${intro}</p>
    <div style="text-align:left">
      <div class="label">Bestellnummer</div>
      <div class="val">${ref}</div>
      <div class="label">Ihr Schuh</div>
      <div class="val">${escapeHtml(order.shoe_name)} · ${escapeHtml(order.material)} · ${escapeHtml(order.color)}</div>
    </div>
    <hr class="divider">
    <p style="font-size:12px;color:#888;line-height:1.7;margin:0;text-align:left">${closing}</p>
  </div>
  <div class="footer">Artisan Sole Custom Made Footwear · Alle Schuhe sind Einzelanfertigungen</div>
</div>
</body></html>`

  await send({ to: user.email, subject, html })
}

// ─── Shipping notification email ───────────────────────────────────────────────
export async function sendShippingNotification(order, user) {
  const tmpl = getTemplate('shipping')
  const ref  = order.order_ref || `#${order.id}`
  const vars = {
    name: user.name, order_id: order.id, order_ref: ref, shoe_name: order.shoe_name,
    material: order.material, color: order.color, price: order.price,
    eu_size: order.eu_size || '-', user_order_number: order.user_order_number,
  }
  const subject = render(tmpl.subject, vars)
  const intro   = nl2br(renderHtml(tmpl.intro, vars))
  const closing = nl2br(renderHtml(tmpl.body, vars))

  const addr = escAddr(order.delivery_address ? JSON.parse(order.delivery_address) : null)

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}
  .addr-box{background:#f8f7f5;border-radius:10px;padding:16px;margin:16px 0}
</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>ARTISAN SOLE</h1>
    <p>VERSANDBESTÄTIGUNG · ${ref}</p>
  </div>
  <div class="body" style="text-align:center">
    <div class="badge" style="background:#3b82f6;color:#fff">✈ AUF DEM WEG ZU IHNEN</div>
    <p style="font-size:16px;color:#111;margin:0 0 8px;font-weight:600">Ihre Schuhe sind unterwegs.</p>
    <p style="font-size:14px;color:#555;margin:0 0 24px">${intro}</p>
    <div style="text-align:left">
      <div class="label">Bestellnummer</div>
      <div class="val">${ref}</div>
      <div class="label">Ihr Schuh</div>
      <div class="val">${escapeHtml(order.shoe_name)} · ${escapeHtml(order.material)} · ${escapeHtml(order.color)}</div>
      ${addr ? `
      <div class="label">Lieferadresse</div>
      <div class="addr-box">
        <p style="margin:0;font-size:13px;color:#555;line-height:1.8">
          ${addr.name}<br>${addr.street}<br>${addr.zip} ${addr.city}<br>${addr.country}
          ${addr.phone ? `<br>${addr.phone}` : ''}
        </p>
      </div>` : ''}
    </div>
    <hr class="divider">
    <p style="font-size:12px;color:#888;line-height:1.7;margin:0;text-align:left">${closing}</p>
  </div>
  <div class="footer">Artisan Sole Custom Made Footwear · Alle Schuhe sind Einzelanfertigungen</div>
</div>
</body></html>`

  await send({ to: user.email, subject, html })
}

// ─── Helper: compute user shoe stats (ordered vs kept) ───────────────────────
function getUserShoeStats(userId) {
  const db = getDb()
  const rows = db.prepare('SELECT shoe_name, status FROM orders WHERE user_id = ?').all(userId)
  const stats = {}
  for (const r of rows) {
    if (!stats[r.shoe_name]) stats[r.shoe_name] = { ordered: 0, kept: 0 }
    stats[r.shoe_name].ordered++
    if (r.status !== 'cancelled') stats[r.shoe_name].kept++
  }
  return stats
}

// ─── Manufacturer notification email ──────────────────────────────────────────
export async function sendManufacturerNotification(order, user, scan) {
  const cfg  = getEmailConfig()
  if (!cfg.mfgEmail) return

  const tmpl = getTemplate('manufacturer')
  const ref  = order.order_ref || `#${order.id}`
  const userIdPadded = String(user.id).padStart(5, '0')
  const vars = {
    name: user.name, order_id: order.id, order_ref: ref, shoe_name: order.shoe_name,
    material: order.material, color: order.color, price: order.price,
    eu_size: order.eu_size || '-', user_order_number: order.user_order_number,
    user_id_padded: userIdPadded,
  }
  const subject = render(tmpl.subject, vars)
  const intro   = nl2br(renderHtml(tmpl.intro, vars))
  const closing = nl2br(renderHtml(tmpl.body, vars))

  const addr        = escAddr(order.delivery_address ? JSON.parse(order.delivery_address) : null)
  const accessories = escAcc(order.accessories ? JSON.parse(order.accessories) : [])

  // B2B-Firmencode-Bestellung: Firma, Logo (für die Sohle) und Code beilegen.
  let biz = null, bizCode = null
  if (order.business_id) {
    try {
      biz = getDb().prepare('SELECT name, logo_data FROM businesses WHERE id = ?').get(order.business_id)
      if (order.business_code_id) bizCode = getDb().prepare('SELECT code FROM business_codes WHERE id = ?').get(order.business_code_id)
    } catch { /* ignore */ }
  }
  const coverageLabel = order.business_coverage === 'full' ? 'Voll gedeckt (Firma)' : (order.business_coverage === 'discount' ? 'Firmen-Rabatt' : '-')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body{font-family:'Georgia',serif;background:#f8f7f5;margin:0;padding:0}
  .wrap{max-width:620px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,.08)}
  .header{background:#0d1a1a;padding:28px 32px;display:flex;align-items:baseline;gap:16px}
  .header h1{color:#fff;font-size:18px;letter-spacing:.2em;margin:0;font-weight:400}
  .header .badge{background:#2dd4bf;color:#0d1a1a;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:.12em}
  .body{padding:32px}
  .intro-note{background:#f8f7f5;border-radius:8px;padding:12px 16px;margin-bottom:24px;font-size:13px;color:#555}
  .section{margin-bottom:24px}
  .section-title{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#999;border-bottom:1px solid #f0ede8;padding-bottom:6px;margin-bottom:12px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .item .label{font-size:10px;color:#aaa;letter-spacing:.1em;text-transform:uppercase}
  .item .val{font-size:14px;color:#111;font-weight:600;margin-top:2px}
  .meas{background:#f8f7f5;border-radius:8px;padding:14px}
  .meas table{width:100%;border-collapse:collapse}
  .meas th{font-size:9px;color:#aaa;letter-spacing:.15em;text-transform:uppercase;text-align:left;padding:4px 8px}
  .meas td{font-size:13px;color:#111;font-weight:600;padding:6px 8px;border-top:1px solid #ede9e2}
  .stl-link{display:inline-block;margin-top:8px;padding:10px 20px;background:#0d1a1a;color:#fff;border-radius:8px;font-size:11px;letter-spacing:.15em;text-decoration:none}
  .footer{background:#f8f7f5;padding:16px 32px;font-size:11px;color:#aaa;text-align:center}
</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>ARTISAN SOLE MANUFAKTUR</h1>
    <span class="badge">NEUE BESTELLUNG</span>
  </div>
  <div class="body">
    <div class="intro-note">${intro}</div>
    <div class="section">
      <div class="section-title">Auftragsidentifikation</div>
      <div class="grid">
        <div class="item"><div class="label">Bestell-Ref.</div><div class="val">${ref}</div></div>
        <div class="item"><div class="label">Kunden-Bestellung Nr.</div><div class="val">${order.user_order_number}. Schuh dieses Kunden</div></div>
        <div class="item"><div class="label">Kunden-ID</div><div class="val">USER-${userIdPadded}</div></div>
        <div class="item"><div class="label">STL-Dateinamen</div><div class="val">U${userIdPadded}_right · U${userIdPadded}_left</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Schuhmodell</div>
      <div class="grid">
        <div class="item"><div class="label">Modell</div><div class="val">${escapeHtml(order.shoe_name)}</div></div>
        <div class="item"><div class="label">Preis</div><div class="val">${escapeHtml(order.price)}</div></div>
        <div class="item"><div class="label">Material</div><div class="val">${escapeHtml(order.material)}</div></div>
        <div class="item"><div class="label">Farbe</div><div class="val">${escapeHtml(order.color)}</div></div>
        <div class="item"><div class="label">EU-Größe</div><div class="val">${order.eu_size || '-'}</div></div>
      </div>
    </div>
    ${biz ? `
    <div class="section">
      <div class="section-title">Firmenbestellung · Branding</div>
      <div class="grid">
        <div class="item"><div class="label">Unternehmen</div><div class="val">${escapeHtml(biz.name)}</div></div>
        <div class="item"><div class="label">Deckung</div><div class="val">${coverageLabel}</div></div>
        ${bizCode ? `<div class="item"><div class="label">Einmal-Code</div><div class="val">${escapeHtml(bizCode.code)}</div></div>` : ''}
      </div>
      ${biz.logo_data ? `<div style="margin-top:14px"><div class="label" style="font-size:10px;color:#aaa;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px">Logo für die Sohle</div><img src="${biz.logo_data}" alt="Firmenlogo" style="max-width:200px;max-height:90px;background:#f8f7f5;padding:8px;border-radius:6px" /></div>` : ''}
    </div>` : ''}
    ${scan ? `
    <div class="section">
      <div class="section-title">3D-Fußmaße (Scan-ID: ${scan.id})</div>
      <div class="meas">
        <table>
          <thead><tr>
            <th></th><th>Länge</th><th>Breite</th><th>Gewölbe</th>
          </tr></thead>
          <tbody>
            <tr>
              <td style="color:#888;font-size:11px">Rechts</td>
              <td>${Number(scan.right_length).toFixed(1)} mm</td>
              <td>${Number(scan.right_width).toFixed(1)} mm</td>
              <td>${Number(scan.right_arch).toFixed(1)} mm</td>
            </tr>
            <tr>
              <td style="color:#888;font-size:11px">Links</td>
              <td>${Number(scan.left_length).toFixed(1)} mm</td>
              <td>${Number(scan.left_width).toFixed(1)} mm</td>
              <td>${Number(scan.left_arch).toFixed(1)} mm</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style="font-size:11px;color:#aaa;margin:10px 0 0">${closing}</p>
      <a href="${cfg.appUrl}/cms/scans" class="stl-link">STL herunterladen → Admin Panel</a>
    </div>` : `
    <div class="section">
      <p style="font-size:12px;color:#888;margin:0">${closing}</p>
    </div>
    `}
    ${order.foot_notes_en ? `
    <div class="section">
      <div class="section-title">Customer Foot Notes</div>
      <div class="intro-note">${nl2br(escapeHtml(order.foot_notes_en))}</div>
      ${order.foot_notes ? `<p style="font-size:10px;color:#aaa;margin:4px 0 0">Original (DE): ${escapeHtml(order.foot_notes)}</p>` : ''}
    </div>` : ''}
    ${(() => {
      const stats = getUserShoeStats(order.user_id)
      const entries = Object.entries(stats)
      if (!entries.length) return ''
      return `
    <div class="section">
      <div class="section-title">Kundenhistorie: Bestellte vs. Behaltene Schuhe</div>
      <table style="width:100%;border-collapse:collapse;margin-top:8px">
        <thead><tr>
          <th style="font-size:10px;color:#aaa;letter-spacing:.12em;text-transform:uppercase;text-align:left;padding:6px 8px;border-bottom:1px solid #ede9e2">Modell</th>
          <th style="font-size:10px;color:#aaa;letter-spacing:.12em;text-transform:uppercase;text-align:center;padding:6px 8px;border-bottom:1px solid #ede9e2">Bestellt</th>
          <th style="font-size:10px;color:#aaa;letter-spacing:.12em;text-transform:uppercase;text-align:center;padding:6px 8px;border-bottom:1px solid #ede9e2">Behalten</th>
        </tr></thead>
        <tbody>${entries.map(([name, s]) => `
          <tr>
            <td style="font-size:13px;color:#111;padding:6px 8px;border-top:1px solid #f5f3ef">${escapeHtml(name)}</td>
            <td style="font-size:13px;color:#555;text-align:center;padding:6px 8px;border-top:1px solid #f5f3ef">${s.ordered}</td>
            <td style="font-size:13px;color:#111;font-weight:600;text-align:center;padding:6px 8px;border-top:1px solid #f5f3ef">${s.kept}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`
    })()}
    ${accessories.length ? `
    <div class="section">
      <div class="section-title">Zubehör</div>
      ${accessories.map(a => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f5f3ef;font-size:13px"><span style="color:#555">${a.name}</span><span style="color:#111;font-weight:600">${a.price}</span></div>`).join('')}
    </div>` : ''}
    ${addr ? `
    <div class="section">
      <div class="section-title">Lieferadresse</div>
      <p style="font-size:13px;color:#555;line-height:1.8;margin:0">
        ${addr.name}<br>${addr.street}<br>${addr.zip} ${addr.city}<br>${addr.country}
        ${addr.phone ? `<br>${addr.phone}` : ''}
      </p>
    </div>` : ''}
  </div>
  <div class="footer">Artisan Sole Manufaktur-System · Vertraulich</div>
</div>
</body></html>`

  await send({ to: cfg.mfgEmail, subject, html })
}

// ─── Promotion invitation email ─────────────────────────────────────────────
export async function sendPromotionInvitation(email, name, inviteToken, discountPct) {
  const cfg = getEmailConfig()
  const link = `${cfg.appUrl}/register-promotion?token=${inviteToken}`
  const discountText = discountPct ? `${discountPct}% Sonderkonditionen` : 'exklusive Sonderkonditionen'

  const subject = 'Artisan Sole · Ihr exklusiver Promotion-Zugang'
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>ARTISAN SOLE</h1>
    <p>PROMOTION-EINLADUNG</p>
  </div>
  <div class="body" style="text-align:center">
    <div class="badge" style="background:#d97706;color:#fff">★ PROMOTION</div>
    <p style="font-size:16px;color:#111;margin:0 0 8px;font-weight:600">Willkommen, ${name}!</p>
    <p style="font-size:14px;color:#555;margin:0 0 24px">
      Sie wurden eingeladen, ein Artisan Sole Promotion-Konto mit ${discountText} zu erstellen.
    </p>
    <a href="${link}" style="display:inline-block;padding:14px 32px;background:#111;color:#fff;text-decoration:none;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 24px">Konto erstellen</a>
    <p style="font-size:11px;color:#999;margin:0">Falls der Button nicht funktioniert, kopieren Sie diesen Link:<br><a href="${link}" style="color:#666">${link}</a></p>
  </div>
  <div class="footer">Artisan Sole Custom Made Footwear · Vertrauliche Einladung</div>
</div>
</body></html>`

  await send({ to: email, subject, html })
}

export async function sendEmailVerification(email, name, token) {
  const cfg = getEmailConfig()
  const link = `${cfg.appUrl}/verify-email?token=${token}`
  const subject = 'Artisan Sole · E-Mail bestätigen'
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="wrap">
  <div class="header"><h1>ARTISAN SOLE</h1><p>E-MAIL BESTÄTIGEN</p></div>
  <div class="body" style="text-align:center">
    <p style="font-size:15px;color:#111;margin:0 0 8px;font-weight:600">Hallo${name ? ` ${name}` : ''},</p>
    <p style="font-size:14px;color:#555;margin:0 0 24px">bitte bestätigen Sie Ihre E-Mail-Adresse, um an Firmen-Aktionen teilnehmen zu können.</p>
    <a href="${link}" style="display:inline-block;padding:14px 32px;background:#111;color:#fff;text-decoration:none;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 24px">E-Mail bestätigen</a>
    <p style="font-size:11px;color:#999;margin:0">Falls der Button nicht funktioniert:<br><a href="${link}" style="color:#666">${link}</a></p>
  </div>
  <div class="footer">Artisan Sole Custom Made Footwear</div>
</div>
</body></html>`
  await send({ to: email, subject, html })
}

export async function sendBusinessInvitation(email, companyName, inviteToken) {
  const cfg = getEmailConfig()
  const link = `${cfg.appUrl}/register-business?token=${inviteToken}`

  const subject = 'Artisan Sole für Unternehmen · Ihr Firmenkonto'
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>ARTISAN SOLE</h1>
    <p>FÜR UNTERNEHMEN</p>
  </div>
  <div class="body" style="text-align:center">
    <div class="badge" style="background:#111;color:#fff">FIRMENKONTO</div>
    <p style="font-size:16px;color:#111;margin:0 0 8px;font-weight:600">Willkommen${companyName ? `, ${companyName}` : ''}!</p>
    <p style="font-size:14px;color:#555;margin:0 0 24px">
      Wir haben ein Firmenkonto für Sie eingerichtet. Hier verwalten Sie Ihr
      Profil, Ihr Logo und Ihre Einmal-Codes. Legen Sie jetzt Ihr Passwort fest.
    </p>
    <a href="${link}" style="display:inline-block;padding:14px 32px;background:#111;color:#fff;text-decoration:none;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 24px">Konto aktivieren</a>
    <p style="font-size:11px;color:#999;margin:0">Falls der Button nicht funktioniert, kopieren Sie diesen Link:<br><a href="${link}" style="color:#666">${link}</a></p>
  </div>
  <div class="footer">Artisan Sole Custom Made Footwear · Vertrauliche Einladung</div>
</div>
</body></html>`

  await send({ to: email, subject, html })
}

// ─── Anfrage (custom_requests): Benachrichtigung an Betreiber + Bestätigung ─────
function inquiryRows(request) {
  const rows = [
    ['Name', request.customer_name],
    ['E-Mail', request.customer_email],
    ['Telefon', request.customer_phone],
    ['Betreff', request.shoe_name],
  ]
  return rows
    .filter(([, v]) => v)
    .map(([label, v]) => `<div class="label">${label}</div><div class="val">${escapeHtml(v)}</div>`)
    .join('')
}

export async function sendInquiryNotification(request) {
  const cfg = getEmailConfig()
  const to  = cfg.inquiryEmail || cfg.mfgEmail || cfg.user
  if (!to) { console.log('📧 [Anfrage] kein Empfänger konfiguriert, übersprungen'); return }

  const subject = `Neue Anfrage${request.shoe_name ? ` · ${request.shoe_name}` : ''}`
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="wrap">
  <div class="header"><h1>ARTISAN SOLE</h1><p>NEUE ANFRAGE</p></div>
  <div class="body">
    <p style="font-size:14px;color:#555;margin:0 0 24px">Es ist eine neue Anfrage eingegangen.</p>
    ${inquiryRows(request)}
    ${request.notes ? `<hr class="divider"><div class="label">Nachricht</div><div style="font-size:14px;color:#333;line-height:1.6">${nl2br(escapeHtml(request.notes))}</div>` : ''}
    <hr class="divider">
    <p style="font-size:12px;color:#999;margin:0">Details und Status verwalten Sie im CMS unter <strong>Anfragen</strong> (<a href="${cfg.appUrl}/cms" style="color:#666">${cfg.appUrl}/cms</a>).</p>
  </div>
  <div class="footer">Artisan Sole Custom Made Footwear</div>
</div>
</body></html>`

  await send({ to, subject, html })
}

export async function sendInquiryAck(request) {
  if (!request.customer_email) return
  const name = request.customer_name ? ` ${escapeHtml(request.customer_name)}` : ''
  const subject = 'Artisan Sole · Ihre Anfrage ist eingegangen'
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="wrap">
  <div class="header"><h1>ARTISAN SOLE</h1><p>ANFRAGE EINGEGANGEN</p></div>
  <div class="body" style="text-align:center">
    <p style="font-size:16px;color:#111;margin:0 0 8px;font-weight:600">Vielen Dank${name}!</p>
    <p style="font-size:14px;color:#555;margin:0 0 8px;line-height:1.6">
      Ihre Anfrage ist bei uns eingegangen. Wir melden uns in Kürze persönlich mit
      einem passenden Vorschlag bei Ihnen, unverbindlich.
    </p>
  </div>
  <div class="footer">Artisan Sole Custom Made Footwear · Made in Spain</div>
</div>
</body></html>`

  await send({ to: request.customer_email, subject, html })
}

// ─── Kampagnen-Einladung ────────────────────────────────────────────────────
/**
 * Lädt eine Person in eine Firmen-Kampagne ein.
 *
 * Der Link führt auf die Beitrittsseite der Kampagne. Wer noch kein Konto hat,
 * legt dort eins an; wer eins hat, ist mit einem Klick dabei. Der Rabatt greift
 * danach automatisch im Konfigurator.
 */
export async function sendCampaignInvitation(email, campaign, businessName) {
  const cfg = getEmailConfig()
  const link = `${cfg.appUrl}/kampagne/${campaign.slug}`
  const rabatt = campaign.discount_pct ? `${String(campaign.discount_pct).replace('.', ',')} %` : null

  const subject = `Artisan Sole · Einladung zu ${campaign.name}`
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="wrap">
  <div class="header"><h1>ARTISAN SOLE</h1><p>EINLADUNG</p></div>
  <div class="body" style="text-align:center">
    <p style="font-size:16px;color:#111;margin:0 0 8px;font-weight:600">${escapeHtml(campaign.name)}</p>
    <p style="font-size:14px;color:#555;margin:0 0 24px">
      ${businessName ? `${escapeHtml(businessName)} lädt Sie ein` : 'Sie sind eingeladen'}, an dieser Aktion
      teilzunehmen${rabatt ? ` — mit ${rabatt} auf Ihr maßgefertigtes Paar` : ''}.
    </p>
    <a href="${link}" style="display:inline-block;padding:14px 32px;background:#111;color:#fff;text-decoration:none;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 24px">Jetzt teilnehmen</a>
    <p style="font-size:11px;color:#999;margin:0">Falls der Button nicht funktioniert:<br><a href="${link}" style="color:#666">${link}</a></p>
  </div>
  <div class="footer">Artisan Sole Custom Made Footwear</div>
</div>
</body></html>`

  await send({ to: email, subject, html })
}

// ─── Affiliate-Einladung ───────────────────────────────────────────────────
/**
 * Lädt einen Affiliate in sein eigenes Konto ein.
 *
 * Der Zugang liegt auf einer eigenen Adresse — dort sieht er seinen Link,
 * seinen QR-Code, die vermittelten Paare und den Stand der Auszahlungen. Der
 * Laden gehört nicht dazu; sein Verhältnis zum Haus ist ein anderes.
 */
export async function sendAffiliateInvitation(email, name, inviteToken, code) {
  const cfg = getEmailConfig()
  const link = `${cfg.appUrl}/affiliate-konto?token=${inviteToken}`

  const subject = 'Artisan Sole · Ihr Affiliate-Zugang'
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="wrap">
  <div class="header"><h1>ARTISAN SOLE</h1><p>AFFILIATE</p></div>
  <div class="body" style="text-align:center">
    <p style="font-size:16px;color:#111;margin:0 0 8px;font-weight:600">Willkommen${name ? `, ${escapeHtml(name)}` : ''}!</p>
    <p style="font-size:14px;color:#555;margin:0 0 8px">
      Ihr Affiliate-Konto steht bereit. Legen Sie jetzt Ihr Passwort fest — danach
      finden Sie dort Ihren persönlichen Link, den QR-Code zum Weitergeben und die
      Übersicht Ihrer vermittelten Paare.
    </p>
    ${code ? `<p style="font-size:13px;color:#111;margin:0 0 24px">Ihr Code: <strong>${escapeHtml(code)}</strong></p>` : '<div style="height:16px"></div>'}
    <a href="${link}" style="display:inline-block;padding:14px 32px;background:#111;color:#fff;text-decoration:none;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 24px">Konto aktivieren</a>
    <p style="font-size:11px;color:#999;margin:0">Falls der Button nicht funktioniert:<br><a href="${link}" style="color:#666">${link}</a></p>
  </div>
  <div class="footer">Artisan Sole Custom Made Footwear · Vertrauliche Einladung</div>
</div>
</body></html>`

  await send({ to: email, subject, html })
}
