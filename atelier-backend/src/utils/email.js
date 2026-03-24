/**
 * email.js — Nodemailer transporter + DB-driven order email templates
 *
 * Config via environment variables OR settings table in DB:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   MANUFACTURER_EMAIL, APP_URL
 *
 * Email text (subject/intro/body) is editable via the email_templates table.
 * If SMTP_USER is not set, emails are logged to console only (dev mode).
 */

import nodemailer from 'nodemailer'
import { getDb } from '../db/database.js'

// ─── Config ───────────────────────────────────────────────────────────────────
function getEmailConfig() {
  try {
    const db   = getDb()
    const keys = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_manufacturer_email', 'app_url',
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
      appUrl:     s.app_url                 || process.env.APP_URL                 || 'http://localhost:5173',
      bankIban:   s.bank_iban   || process.env.BANK_IBAN   || 'DE00 0000 0000 0000 0000 00',
      bankBic:    s.bank_bic    || process.env.BANK_BIC    || 'XXXXXXXX',
      bankHolder: s.bank_holder || process.env.BANK_HOLDER || 'ATELIER GmbH',
      bankName:   s.bank_name   || process.env.BANK_NAME   || 'Musterbank',
    }
  } catch {
    return {
      host: 'smtp.gmail.com', port: '587', user: '', pass: '', mfgEmail: '', appUrl: 'http://localhost:5173',
      bankIban: 'DE00 0000 0000 0000 0000 00', bankBic: 'XXXXXXXX', bankHolder: 'ATELIER GmbH', bankName: 'Musterbank',
    }
  }
}

function createTransporter(cfg) {
  if (!cfg.user) return null
  return nodemailer.createTransport({
    host:   cfg.host,
    port:   Number(cfg.port) || 587,
    secure: Number(cfg.port) === 465,
    auth:   { user: cfg.user, pass: cfg.pass },
  })
}

async function send(options) {
  const cfg         = getEmailConfig()
  const transporter = createTransporter(cfg)
  if (!transporter) {
    console.log('\n📧 [EMAIL — dev mode, SMTP not configured]')
    console.log('  To:     ', options.to)
    console.log('  Subject:', options.subject)
    return
  }
  await transporter.sendMail({ from: `ATELIER <${cfg.user}>`, ...options })
}

// ─── Template engine ──────────────────────────────────────────────────────────
const DEFAULTS = {
  order_confirmation: {
    subject: 'ATELIER — Bestellbestätigung {{order_ref}}',
    intro:   'Vielen Dank, {{name}}. Ihre Bestellung wurde aufgenommen und wird individuell für Sie angefertigt.',
    body:    'Ihre Maßschuhe werden in 6–8 Wochen handgefertigt und direkt zu Ihnen geliefert.\nDen aktuellen Status Ihrer Bestellung finden Sie jederzeit in der ATELIER App unter Meine Bestellungen.',
  },
  payment: {
    subject: 'ATELIER — Zahlungsinformationen {{order_ref}}',
    intro:   'Vielen Dank, {{name}}. Ihre Bestellung wurde erfasst und wartet auf Ihre Zahlung.\nBitte überweisen Sie den folgenden Betrag an das unten angegebene Konto. Verwenden Sie dabei zwingend den angegebenen Verwendungszweck, damit wir Ihre Zahlung korrekt zuordnen können.',
    body:    'Nach Zahlungseingang werden Ihre Maßschuhe umgehend in die Fertigung gegeben.\nSie erhalten eine Bestätigung, sobald Ihre Zahlung bei uns eingegangen ist.',
  },
  order_confirmed: {
    subject: 'ATELIER — Zahlung bestätigt & Bestellung in Fertigung {{order_ref}}',
    intro:   'Ihre Zahlung wurde bestätigt. Ihre Maßschuhe {{shoe_name}} sind nun in der Fertigung.',
    body:    'Den aktuellen Status Ihrer Bestellung finden Sie jederzeit in der ATELIER App unter Meine Bestellungen.',
  },
  shipping: {
    subject: 'ATELIER — Ihre Maßschuhe sind unterwegs! {{order_ref}}',
    intro:   '{{shoe_name}} wurden soeben versandt und befinden sich auf dem Weg zu Ihnen.',
    body:    'Den aktuellen Status Ihrer Bestellung finden Sie jederzeit in der ATELIER App unter Meine Bestellungen.\nBei Fragen wenden Sie sich an unser Team — wir sind gerne für Sie da.',
  },
  quality_check: {
    subject: 'ATELIER — Ihre Maßschuhe in der Qualitätskontrolle {{order_ref}}',
    intro:   'Ihre Maßschuhe {{shoe_name}} wurden erfolgreich gefertigt und befinden sich jetzt in unserer Qualitätskontrolle.',
    body:    'Jedes Detail wird geprüft — von der Nahtführung bis zur Passform. Nach bestandener Kontrolle werden Ihre Schuhe umgehend versandt.\nDen aktuellen Status finden Sie jederzeit in der ATELIER App.',
  },
  manufacturer: {
    subject: '[ATELIER] Neue Bestellung {{order_ref}} — USER-{{user_id_padded}} — {{shoe_name}}',
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

function nl2br(text) {
  return (text || '').replace(/\n/g, '<br>')
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
    eu_size: order.eu_size || '—', user_order_number: order.user_order_number,
  }
  const subject = render(tmpl.subject, vars)
  const intro   = nl2br(render(tmpl.intro, vars))
  const closing = nl2br(render(tmpl.body, vars))

  const addr         = order.delivery_address ? JSON.parse(order.delivery_address) : null
  const accessories  = order.accessories ? JSON.parse(order.accessories) : []
  const accessoryRows = accessories.map(a => `
    <tr>
      <td style="padding:6px 0;font-size:13px;color:#555">${a.name}</td>
      <td style="padding:6px 0;font-size:13px;color:#555;text-align:right">${a.price}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>ATELIER</h1>
    <p>BESTELLBESTÄTIGUNG · ${ref}</p>
  </div>
  <div class="body">
    <p style="font-size:15px;color:#333;margin:0 0 24px">${intro}</p>
    <div class="label">Schuh</div>
    <div class="val">${order.shoe_name}</div>
    <div class="label">Material · Farbe</div>
    <div class="val">${order.material} · ${order.color}</div>
    <div class="label">Ihre Größe (aus 3D-Scan)</div>
    <div class="val">EU ${order.eu_size || '—'}</div>
    <hr class="divider">
    <table>
      <tr>
        <td style="font-size:13px;color:#555">Schuh</td>
        <td style="font-size:13px;color:#555;text-align:right">${order.price}</td>
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
  <div class="footer">ATELIER Bespoke Footwear · Alle Schuhe sind Einzelanfertigungen</div>
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
    reference: order.order_ref || `ATELIER-${order.id}`,
  }
  const subject = render(tmpl.subject, vars)
  const intro   = nl2br(render(tmpl.intro, vars))
  const closing = nl2br(render(tmpl.body, vars))

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
    <h1>ATELIER</h1>
    <p>ZAHLUNGSANWEISUNG · ${ref}</p>
  </div>
  <div class="body">
    <p style="font-size:15px;color:#333;margin:0 0 20px">${intro}</p>
    <div class="bank-box">
      <div class="bank-row">
        <span class="bank-label">Betrag</span>
        <span class="bank-val" style="font-size:18px;color:#059669">${order.price}</span>
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
      <span class="ref-highlight">${order.order_ref || `ATELIER-${order.id}`}</span>
    </div>
    <hr class="divider">
    <div class="label">Bestellte Schuhe</div>
    <div class="val">${order.shoe_name}</div>
    <div class="label">Ihr ${order.user_order_number}. Schuh bei ATELIER</div>
    <hr class="divider">
    <p style="font-size:12px;color:#888;line-height:1.7;margin:0">${closing}</p>
  </div>
  <div class="footer">ATELIER Bespoke Footwear · Alle Schuhe sind Einzelanfertigungen</div>
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
    eu_size: order.eu_size || '—', user_order_number: order.user_order_number,
  }
  const subject = render(tmpl.subject, vars)
  const intro   = nl2br(render(tmpl.intro, vars))
  const closing = nl2br(render(tmpl.body, vars))

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>ATELIER</h1>
    <p>ZAHLUNG BESTÄTIGT · ${ref}</p>
  </div>
  <div class="body" style="text-align:center">
    <div class="badge" style="background:#2dd4bf;color:#0d1a1a">ZAHLUNG EINGEGANGEN</div>
    <p style="font-size:16px;color:#111;margin:0 0 8px;font-weight:600">${intro}</p>
    <div style="text-align:left">
      <div class="label">Bestellnummer</div>
      <div class="val">${ref}</div>
      <div class="label">Ihr ${order.user_order_number}. Schuh bei ATELIER</div>
      <div class="val">${order.shoe_name} · ${order.material} · ${order.color}</div>
      <div class="label">Geschätzte Lieferzeit</div>
      <div class="val">6–8 Wochen</div>
    </div>
    <hr class="divider">
    <p style="font-size:12px;color:#888;line-height:1.7;margin:0;text-align:left">${closing}</p>
  </div>
  <div class="footer">ATELIER Bespoke Footwear · Alle Schuhe sind Einzelanfertigungen</div>
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
    eu_size: order.eu_size || '—', user_order_number: order.user_order_number,
  }
  const subject = render(tmpl.subject, vars)
  const intro   = nl2br(render(tmpl.intro, vars))
  const closing = nl2br(render(tmpl.body, vars))

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>ATELIER</h1>
    <p>QUALITÄTSKONTROLLE · ${ref}</p>
  </div>
  <div class="body" style="text-align:center">
    <div class="badge" style="background:#8b5cf6;color:#fff">✓ QUALITÄTSKONTROLLE</div>
    <p style="font-size:16px;color:#111;margin:0 0 8px;font-weight:600">Ihre Maßschuhe werden geprüft.</p>
    <p style="font-size:14px;color:#555;margin:0 0 24px">${intro}</p>
    <div style="text-align:left">
      <div class="label">Bestellnummer</div>
      <div class="val">${ref}</div>
      <div class="label">Ihr Schuh</div>
      <div class="val">${order.shoe_name} · ${order.material} · ${order.color}</div>
    </div>
    <hr class="divider">
    <p style="font-size:12px;color:#888;line-height:1.7;margin:0;text-align:left">${closing}</p>
  </div>
  <div class="footer">ATELIER Bespoke Footwear · Alle Schuhe sind Einzelanfertigungen</div>
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
    eu_size: order.eu_size || '—', user_order_number: order.user_order_number,
  }
  const subject = render(tmpl.subject, vars)
  const intro   = nl2br(render(tmpl.intro, vars))
  const closing = nl2br(render(tmpl.body, vars))

  const addr = order.delivery_address ? JSON.parse(order.delivery_address) : null

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}
  .addr-box{background:#f8f7f5;border-radius:10px;padding:16px;margin:16px 0}
</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>ATELIER</h1>
    <p>VERSANDBESTÄTIGUNG · ${ref}</p>
  </div>
  <div class="body" style="text-align:center">
    <div class="badge" style="background:#3b82f6;color:#fff">✈ AUF DEM WEG ZU IHNEN</div>
    <p style="font-size:16px;color:#111;margin:0 0 8px;font-weight:600">Ihre Maßschuhe sind unterwegs.</p>
    <p style="font-size:14px;color:#555;margin:0 0 24px">${intro}</p>
    <div style="text-align:left">
      <div class="label">Bestellnummer</div>
      <div class="val">${ref}</div>
      <div class="label">Ihr Schuh</div>
      <div class="val">${order.shoe_name} · ${order.material} · ${order.color}</div>
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
  <div class="footer">ATELIER Bespoke Footwear · Alle Schuhe sind Einzelanfertigungen</div>
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
    eu_size: order.eu_size || '—', user_order_number: order.user_order_number,
    user_id_padded: userIdPadded,
  }
  const subject = render(tmpl.subject, vars)
  const intro   = nl2br(render(tmpl.intro, vars))
  const closing = nl2br(render(tmpl.body, vars))

  const addr        = order.delivery_address ? JSON.parse(order.delivery_address) : null
  const accessories = order.accessories ? JSON.parse(order.accessories) : []

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
    <h1>ATELIER MANUFAKTUR</h1>
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
        <div class="item"><div class="label">Modell</div><div class="val">${order.shoe_name}</div></div>
        <div class="item"><div class="label">Preis</div><div class="val">${order.price}</div></div>
        <div class="item"><div class="label">Material</div><div class="val">${order.material}</div></div>
        <div class="item"><div class="label">Farbe</div><div class="val">${order.color}</div></div>
        <div class="item"><div class="label">EU-Größe</div><div class="val">${order.eu_size || '—'}</div></div>
      </div>
    </div>
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
      <div class="intro-note">${nl2br(order.foot_notes_en)}</div>
      ${order.foot_notes ? `<p style="font-size:10px;color:#aaa;margin:4px 0 0">Original (DE): ${order.foot_notes}</p>` : ''}
    </div>` : ''}
    ${(() => {
      const stats = getUserShoeStats(order.user_id)
      const entries = Object.entries(stats)
      if (!entries.length) return ''
      return `
    <div class="section">
      <div class="section-title">Kundenhistorie — Bestellte vs. Behaltene Schuhe</div>
      <table style="width:100%;border-collapse:collapse;margin-top:8px">
        <thead><tr>
          <th style="font-size:10px;color:#aaa;letter-spacing:.12em;text-transform:uppercase;text-align:left;padding:6px 8px;border-bottom:1px solid #ede9e2">Modell</th>
          <th style="font-size:10px;color:#aaa;letter-spacing:.12em;text-transform:uppercase;text-align:center;padding:6px 8px;border-bottom:1px solid #ede9e2">Bestellt</th>
          <th style="font-size:10px;color:#aaa;letter-spacing:.12em;text-transform:uppercase;text-align:center;padding:6px 8px;border-bottom:1px solid #ede9e2">Behalten</th>
        </tr></thead>
        <tbody>${entries.map(([name, s]) => `
          <tr>
            <td style="font-size:13px;color:#111;padding:6px 8px;border-top:1px solid #f5f3ef">${name}</td>
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
  <div class="footer">ATELIER Manufaktur-System · Vertraulich</div>
</div>
</body></html>`

  await send({ to: cfg.mfgEmail, subject, html })
}

// ─── Promotion invitation email ─────────────────────────────────────────────
export async function sendPromotionInvitation(email, name, inviteToken, discountPct) {
  const cfg = getEmailConfig()
  const link = `${cfg.appUrl}/register-promotion?token=${inviteToken}`
  const discountText = discountPct ? `${discountPct}% Sonderkonditionen` : 'exklusive Sonderkonditionen'

  const subject = 'ATELIER — Ihr exklusiver Promotion-Zugang'
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>ATELIER</h1>
    <p>PROMOTION-EINLADUNG</p>
  </div>
  <div class="body" style="text-align:center">
    <div class="badge" style="background:#d97706;color:#fff">★ PROMOTION</div>
    <p style="font-size:16px;color:#111;margin:0 0 8px;font-weight:600">Willkommen, ${name}!</p>
    <p style="font-size:14px;color:#555;margin:0 0 24px">
      Sie wurden eingeladen, ein ATELIER Promotion-Konto mit ${discountText} zu erstellen.
    </p>
    <a href="${link}" style="display:inline-block;padding:14px 32px;background:#111;color:#fff;text-decoration:none;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 24px">Konto erstellen</a>
    <p style="font-size:11px;color:#999;margin:0">Falls der Button nicht funktioniert, kopieren Sie diesen Link:<br><a href="${link}" style="color:#666">${link}</a></p>
  </div>
  <div class="footer">ATELIER Bespoke Footwear · Vertrauliche Einladung</div>
</div>
</body></html>`

  await send({ to: email, subject, html })
}
