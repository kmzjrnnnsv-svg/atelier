import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { katalogAnwenden } from './seedExport.js'
import { frischeInstallationVerbrauchen } from './schema.js'
import { GUERTEL_KEY, GUERTEL_ART, GROESSEN } from '../utils/guertel.js'

// Verzeichnis dieser Datei — die Rechtstexte liegen im Wurzelverzeichnis des
// Repositories, nicht neben dem Backend.
const __seedDir = path.dirname(fileURLToPath(import.meta.url))

// Im CMS gelöschte Modelle nicht wieder anlegen.
// Der Seed kennt seine Modelle über den Namen und legte sie bei jedem Start
// neu an, wenn sie fehlten — ein bewusst gelöschter Schuh kam damit beim
// nächsten Neustart zurück. Die Namen auf dem Merkzettel bleiben ausgespart.
function deletedSeedNames(db) {
  try {
    return new Set(db.prepare('SELECT name FROM deleted_seed_shoes').all().map(r => r.name))
  } catch {
    // Tabelle existiert auf sehr altem Schema noch nicht.
    return new Set()
  }
}


export async function seedDatabase(db) {
  // Die exportierte Vorlage (seed-data.json) ist der maßgebliche Katalog.
  //
  // Auf einer frischen Datenbank haben die Migrationen eben erst die Festwerte
  // aus dem Quelltext angelegt — alte Preise, alte Texte. Die werden hier auf
  // den zuletzt exportierten Stand gebracht. Auf einer laufenden Datenbank
  // wird nichts angefasst, was schon da ist; dort entstehen nur fehlende
  // Zeilen.
  try {
    const bilanz = katalogAnwenden(db, { ueberschreiben: frischeInstallationVerbrauchen(db) })
    if (bilanz) {
      const teile = Object.entries(bilanz)
        .map(([t, z]) => {
          const d = [z.neu && `${z.neu} neu`, z.angepasst && `${z.angepasst} angeglichen`, z.entfernt && `${z.entfernt} entfernt`]
          return `${t}: ${d.filter(Boolean).join('/')}`
        })
        .join(', ')
      console.log(`✅ Vorlage übernommen (${teile})`)
    }
  } catch (e) { console.error('[seed-data]', e.message) }

  seedEmailTemplates(db)
  seedShoeAccessories(db)
  seedAccessoryMaterials(db)
  seedConfiguratorOptions(db)
  seedExtendedCatalog(db)
  seedMatrixModels(db)
  // Eigenstaendige Loafer-Stilmodelle (feste Ausfuehrung), vor V2, damit
  // der Force-Reset ihnen die vollstaendige Loafer-Konfiguration zuweist.
  seedLoaferVariants(db)
  // V2 LÄUFT ZULETZT, räumt veraltete Templates auf und richtet
  // sie exakt nach der User-Matrix aus, plus force-reset für die
  // 16 Standardmodelle.
  seedMatrixTemplatesV2(db)
  // Passform-Maßtabelle (Leisten × Weite × Größe → Fußlänge + Ballenumfang).
  // Unabhängig & idempotent (INSERT OR IGNORE), NICHT an V2 koppeln, das
  // category_templates leert.
  seedLastSizeChart(db)
  seedFaqs(db)
  cleanupLegacyWording(db)
  seedShoeDescriptions(db)
  benenneSohlenGruppen(db)
  seedKollektionen(db)
  // Nach der Matrix, nicht davor: Deren Force-Reset räumt jede Kategorie ab,
  // die es kennt. MOCCASIN steht nicht darin — und soll es auch nicht, sonst
  // bekäme der Mokassin bei jedem Start die Dress-Leder zurück.
  seedMokassin(db)
  // Nach den Optionen: Der Gürtel gibt `buckle` und `buckle_color` für sich
  // frei, und die beiden Gruppen entstehen weiter oben.
  seedGuertel(db)
  seedExpressModelle(db)
  seedLegalDocs(db)

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get()
  if (userCount.count > 0) return

  console.log('🌱 Seeding database with defaults...')

  // In Produktion wird niemals ein Admin mit Standardpasswort angelegt: Der
  // Vorgabewert steht im Repository und wäre ein bekannter Zugang. Ohne
  // ausdrücklich gesetztes SEED_ADMIN_PASSWORD bricht der Start hier ab —
  // besser als ein stiller Betrieb mit bekanntem Admin-Login.
  const isProd = process.env.NODE_ENV === 'production'
  if (isProd && !process.env.SEED_ADMIN_PASSWORD) {
    throw new Error(
      'SEED_ADMIN_PASSWORD ist nicht gesetzt — in Produktion wird kein Admin mit ' +
      'Standardpasswort angelegt. Bitte SEED_ADMIN_EMAIL und SEED_ADMIN_PASSWORD setzen.'
    )
  }

  const adminEmail    = process.env.SEED_ADMIN_EMAIL    || 'admin@artisansole.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ArtisanSole@2026!'
  const hash = await bcrypt.hash(adminPassword, 12)

  const seedAll = db.transaction(() => {
    // Admin user
    db.prepare(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, 'admin')
    `).run('Admin', adminEmail, hash)

    // Vorgefertigte Kurator-/Demo-Konten mit bekannten Passwörtern nur außerhalb
    // der Produktion — eine Entwicklungsbequemlichkeit, die in Produktion ein
    // bekannter Zugang wäre.
    if (!isProd) {
      const curatorHash = bcrypt.hashSync('Curator@2026!', 12)
      db.prepare(`
        INSERT INTO users (name, email, password_hash, role)
        VALUES (?, ?, ?, 'curator')
      `).run('Curator', 'curator@artisansole.com', curatorHash)

      // Demo / guest user, for trying the app without a real account
      const demoHash = bcrypt.hashSync('Demo@2026!', 12)
      db.prepare(`
        INSERT INTO users (name, email, password_hash, role)
        VALUES (?, ?, ?, 'user')
      `).run('Demo', 'demo@artisansole.com', demoHash)
    }

    // ── SHOES ──────────────────────────────────────────────────
    const skipNames = deletedSeedNames(db)
    const shoeStmtRaw = db.prepare(`
      INSERT INTO shoes (name, category, price, material, match_pct, color, tag, image_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const shoeStmt = { run: (name, ...rest) => { if (!skipNames.has(name)) shoeStmtRaw.run(name, ...rest) } }
    // Oxford, verified free CDN photos
    shoeStmt.run('The Heritage Oxford',    'OXFORD',  '€ 1.450', 'Full-Grain Calfskin',    '99.4%', '#1f2937', 'BESTSELLER',
      'https://images.unsplash.com/photo-1653868250450-b83e6263d427?w=600&q=85&fit=crop&auto=format')
    shoeStmt.run('The Balmoral Cap-Toe',   'OXFORD',  '€ 1.680', 'Shell Cordovan',         '97.8%', '#3b1f0a', null,
      'https://images.unsplash.com/photo-1653868250624-21d56ad36602?w=600&q=85&fit=crop&auto=format')
    // Loafer
    shoeStmt.run('The Riviera Loafer',     'LOAFER',  '€ 1.280', 'Suede Nubuck',           '97.1%', '#92400e', 'NEW',
      'https://images.unsplash.com/photo-1616406432452-07bc5938759d?w=600&q=85&fit=crop&auto=format')
    shoeStmt.run('The Venetian Penny',     'LOAFER',  '€ 1.190', 'Burnished Calfskin',     '96.5%', '#78350f', null,
      'https://images.unsplash.com/photo-1615979474401-8a6a344de5bd?w=600&q=85&fit=crop&auto=format')
    // Derby
    shoeStmt.run('The Monaco Derby',       'DERBY',   '€ 1.590', 'Patent Leather',         '98.8%', '#111827', null,
      'https://images.unsplash.com/photo-1698234912698-0cb48c13eee4?w=600&q=85&fit=crop&auto=format')
    shoeStmt.run('The Brogue Derby',       'DERBY',   '€ 1.350', 'Pebble-Grain Leather',   '95.2%', '#6b3a2a', null,
      'https://images.unsplash.com/photo-1534233650908-b471f2350922?w=600&q=85&fit=crop&auto=format')
    // Boot
    shoeStmt.run('The Chelsea Boot',       'BOOT',    '€ 1.720', 'Cognac Cordovan',        '96.3%', '#92400e', 'LIMITED',
      'https://images.unsplash.com/photo-1608629601270-a0007becead3?w=600&q=85&fit=crop&auto=format')
    shoeStmt.run('The Jodhpur Boot',       'BOOT',    '€ 1.550', 'Antiqued Calfskin',      '94.9%', '#1c1c1e', null,
      'https://images.unsplash.com/photo-1764966844443-1ad233cdc05d?w=600&q=85&fit=crop&auto=format')
    // Sneaker
    shoeStmt.run('The Artisan Runner',     'SNEAKER', '€ 890',   'Perforated Leather',     '93.7%', '#e5e7eb', 'NEW',
      'https://images.unsplash.com/photo-1583979365152-173a8f14181b?w=600&q=85&fit=crop&auto=format')
    shoeStmt.run('The Court Blanc',        'SNEAKER', '€ 750',   'Full-Grain White Calf',  '92.1%', '#f8f9fa', null,
      'https://images.unsplash.com/photo-1596744271582-1d87e9aae223?w=600&q=85&fit=crop&auto=format')
    // Monk
    shoeStmt.run('The Double Monk',        'MONK',    '€ 1.490', 'Burnished Brown Calf',   '98.1%', '#7c3a1e', null,
      'https://images.unsplash.com/photo-1618207552815-64892ff495a3?w=600&q=85&fit=crop&auto=format')
    shoeStmt.run('The Single Monk Strap',  'MONK',    '€ 1.320', 'Crocodile-Embossed',     '96.8%', '#111827', 'EXCLUSIVE',
      'https://images.unsplash.com/photo-1600109978256-6f387208a070?w=600&q=85&fit=crop&auto=format')

  })

  seedAll()
  seedShoeAccessories(db)
  console.log(`✅ Seeded: admin@artisansole.com / ArtisanSole@2026!`)
  console.log(`✅ Seeded: curator@artisansole.com / Curator@2026!`)
  console.log(`✅ Seeded: 12 shoes`)

  // Noch einmal, jetzt mit vollständigem Katalog. Beim ersten Durchgang weiter
  // oben gab es die Grundmodelle noch nicht — sie entstehen erst hier —, und
  // ohne diesen zweiten Aufruf fehlte die Hälfte der Express-Fassungen.
  seedExpressModelle(db)
}

// ── EMAIL TEMPLATES ────────────────────────────────────────────────────────────
// Runs always so templates are seeded even in existing databases.
function seedEmailTemplates(db) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO email_templates (type, name, description, subject, intro, body)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  db.transaction(() => {
    stmt.run(
      'order_confirmation',
      'Bestellbestätigung',
      'Wird direkt nach Aufgabe der Bestellung an den Kunden gesendet.',
      'Artisan Sole ·Bestellbestätigung #{{order_id}}',
      'Vielen Dank, {{name}}. Ihre Bestellung wurde aufgenommen und wird individuell für Sie angefertigt.',
      'Ihre Schuhe werden custom-made gefertigt und in der Regel rund 4 Wochen nach Zahlungseingang direkt zu Ihnen geliefert.\nDen aktuellen Status Ihrer Bestellung finden Sie jederzeit in der Artisan Sole App unter Meine Bestellungen.'
    )
    stmt.run(
      'payment',
      'Zahlungsanweisung',
      'Enthält Bankdaten und Verwendungszweck, wird gleichzeitig mit der Bestellbestätigung gesendet.',
      'Artisan Sole ·Zahlungsinformationen Bestellung #{{order_id}}',
      'Vielen Dank, {{name}}. Ihre Bestellung wurde erfasst und wartet auf Ihre Zahlung.\nBitte überweisen Sie den folgenden Betrag an das unten angegebene Konto. Verwenden Sie dabei zwingend den angegebenen Verwendungszweck, damit wir Ihre Zahlung korrekt zuordnen können.',
      'Nach Zahlungseingang werden Ihre Schuhe umgehend in die Fertigung gegeben.\nSie erhalten eine Bestätigung, sobald Ihre Zahlung bei uns eingegangen ist.'
    )
    stmt.run(
      'order_confirmed',
      'Zahlung bestätigt',
      'Wird gesendet, wenn der Admin den Zahlungseingang bestätigt und die Fertigung startet.',
      'Artisan Sole ·Zahlung bestätigt & Bestellung in Fertigung #{{order_id}}',
      'Ihre Zahlung wurde bestätigt. Ihre Schuhe {{shoe_name}} sind nun in der Fertigung.',
      'Den aktuellen Status Ihrer Bestellung finden Sie jederzeit in der Artisan Sole App unter Meine Bestellungen.'
    )
    stmt.run(
      'shipping',
      'Versandbestätigung',
      'Wird gesendet, wenn Admin oder Curator die Bestellung als versandt markiert.',
      'Artisan Sole ·Ihre Schuhe sind unterwegs! Bestellung #{{order_id}}',
      '{{shoe_name}} wurden soeben versandt und befinden sich auf dem Weg zu Ihnen.',
      'Den aktuellen Status Ihrer Bestellung finden Sie jederzeit in der Artisan Sole App unter Meine Bestellungen.\nBei Fragen wenden Sie sich an unser Team, wir sind gerne für Sie da.'
    )
    stmt.run(
      'manufacturer',
      'Hersteller-Benachrichtigung',
      'Interne E-Mail an den Hersteller mit Bestelldetails und 3D-Fußmaßen.',
      '[Artisan Sole] Neue Bestellung #{{order_id}} · USER-{{user_id_padded}} · {{shoe_name}}',
      'Neue Bestellung eingegangen. Bitte Fertigung vorbereiten.',
      'STL-Dateien mit Kennung U{{user_id_padded}} im Admin-Panel herunterladen.'
    )
  })()
}

// ── SHOE ↔ ACCESSORY ASSIGNMENTS ────────────────────────────────────────────
// Runs independently, assigns accessories to shoes based on material & category.
function seedShoeAccessories(db) {
  const existing = db.prepare('SELECT COUNT(*) as count FROM shoe_accessories').get()
  if (existing.count > 0) return

  // Build lookup maps
  const shoes = db.prepare('SELECT id, name, material, category, color FROM shoes').all()
  const accs  = db.prepare('SELECT id, key FROM accessories WHERE is_active = 1').all()
  if (!shoes.length || !accs.length) return

  const accByKey = Object.fromEntries(accs.map(a => [a.key, a.id]))
  const ak = (key) => accByKey[key] // shorthand

  // Bei fünf Artikeln braucht es keinen Entscheidungsbaum mehr: Pflegeset
  // nach Lederart, Spanner nach Bauform und Farbe. Vorher standen hier gut
  // hundert Zeilen für Cremes, Bürsten und Gürtel, die es nicht mehr gibt.
  const isSuede   = (m) => /suede|nubuck|velour|wildleder/i.test(m)
  const isSneaker = (c) => /SNEAKER|TRAINER/i.test(c)
  const isBoot    = (c) => ['BOOT', 'CHELSEA', 'CHUKKA', 'JODHPUR', 'BALMORAL', 'WELLINGTON'].includes(c)

  // Schwarz heißt schwarz, nicht bloß dunkel. Ein Test auf „#0–3 an erster
  // Stelle" stufte auch Dunkelbraun (#3b1f0a) als schwarz ein und hätte jedem
  // braunen Schuh den schwarzen Spanner beigelegt. Jetzt zählt entweder die
  // ausdrückliche Bezeichnung oder ein Farbwert, der in allen drei Kanälen
  // nahe Null liegt.
  const isBlack = (s) => {
    if (/schwarz|black|noir/i.test(`${s.material || ''} ${s.name || ''}`)) return true
    const hex = /^#([0-9a-f]{6})$/i.exec(s.color || '')
    if (!hex) return false
    const [r, g, b] = [0, 2, 4].map(i => parseInt(hex[1].substr(i, 2), 16))
    return r <= 0x25 && g <= 0x25 && b <= 0x25
  }

  const stmt = db.prepare('INSERT OR IGNORE INTO shoe_accessories (shoe_id, accessory_id, sort_order) VALUES (?, ?, ?)')

  db.transaction(() => {
    for (const shoe of shoes) {
      const links = []
      const mat = shoe.material || ''
      const cat = shoe.category || ''

      // Pflege richtet sich nach dem Leder, nicht nach der Bauform.
      links.push(isSuede(mat) ? ak('care_kit_suede') : ak('care_kit_leather'))

      // Spanner: Sneaker bekommen keinen, Stiefel den hohen, schwarze Schuhe
      // den schwarzen, alle übrigen den aus Zedernholz.
      if (!isSneaker(cat)) {
        if (isBoot(cat))        links.push(ak('boot_tree_cedar'))
        else if (isBlack(shoe)) links.push(ak('shoe_tree_black'))
        else                    links.push(ak('shoe_tree_cedar'))
      }

      // Insert all links with sort_order
      links.forEach((accId, idx) => {
        if (accId) stmt.run(shoe.id, accId, idx)
      })
    }
  })()

  console.log(`✅ Seeded: shoe-accessory assignments for ${shoes.length} shoes`)
}

// seedAccessoryMaterials, ordnet jedes Zubehör seiner passenden Lederart zu
// (Pflege nach Material statt nach Schuhmodell). Im Konfigurator wird Zubehör
// gezeigt, dessen material_keys '*' ist ODER das gewählte Material enthält.
// Idempotent + nicht-destruktiv: setzt NUR Zeilen, deren material_keys noch
// NULL ist, manuelle CMS-Zuordnungen bleiben erhalten.
function seedAccessoryMaterials(db) {
  // Material-Gruppen (aktive + Legacy-Keys).
  const SMOOTH = 'lux_calf,painted_full_grain,patina,box_calf,painted_calf,calfskin'
  const SUEDE  = 'lux_suede,urban_suede,suede'
  const SUEDE_VELVET = 'lux_suede,urban_suede,suede,velvet'

  // Zubehör-Key → material_keys. '*' = bei jedem Material zeigen (universell).
  // Spanner passen in jeden Schuh, die Pflegesets richten sich nach dem Leder.
  const MAP = {
    shoe_tree_cedar: '*', shoe_tree_black: '*', boot_tree_cedar: '*',
    care_kit_leather: SMOOTH,
    care_kit_suede: SUEDE_VELVET,
  }

  // Zubehör-Key → color_match (CSV Schlüsselwörter). Nur farb-spezifische Artikel.
  const COLOR_MAP = {
    shoe_tree_black: 'schwarz,black',
  }

  const upd = db.prepare('UPDATE accessories SET material_keys = ? WHERE key = ? AND material_keys IS NULL')
  const updColor = db.prepare('UPDATE accessories SET color_match = ? WHERE key = ? AND color_match IS NULL')
  let n = 0
  db.transaction(() => {
    for (const [key, mk] of Object.entries(MAP)) n += upd.run(mk, key).changes
    for (const [key, cm] of Object.entries(COLOR_MAP)) updColor.run(cm, key)
  })()
  if (n) console.log(`✅ Seeded: accessory→material defaults (${n} gesetzt)`)
}

// ─────────────────────────────────────────────────────────────────────
// Konfigurator-Optionen, Last, Sohle, Welt, Heel, Toe, Schnalle,
// Loafer-Dekor, Beveled Waist + Vorlagen pro Kategorie.
// Idempotent: läuft bei jedem Start, fügt nur fehlende Einträge ein.
// ─────────────────────────────────────────────────────────────────────
function seedConfiguratorOptions(db) {
  // 1) Option-Gruppen
  // Reihenfolge gemäß User-Vorgabe (Schritt-für-Schritt im Konfigurator):
  //   Schuhform → Base → Heel → Accessoires → Sohle Unten → Sohlen Color
  //   → Welt → Buckle → Buckel Farbe → Farbe innen → Sohle Farbe Unten
  // Color (Außenfarbe) bleibt eigenes Picker-UI vor diesen Gruppen.
  const GROUPS = [
    { key: 'last',              label: 'Schuhform',      ui_type: 'single', required: 1, sort_order: 1,  description: 'Leistenform, bestimmt Zehenform, Taille und Proportion.' },
    { key: 'wholecut_base',     label: 'Base',           ui_type: 'single', required: 1, sort_order: 2,  description: 'Vorderkappen-Verarbeitung (nur Whole Cut).' },
    { key: 'heel',              label: 'Absatz',         ui_type: 'single', required: 1, sort_order: 3,  description: 'Standard- oder erhöhter Absatz.' },
    { key: 'loafer_decoration', label: 'Accessoires',    ui_type: 'single', required: 0, sort_order: 4,  description: 'Dekoration bei Loafer-Modellen.' },
    { key: 'sole',              label: 'Sohlen-Art',     ui_type: 'single', required: 1, sort_order: 5,  description: 'Art der Sohle, z. B. Leder, Gummi, Dainite oder Crepe.' },
    { key: 'sole_color',        label: 'Sohlen Color',   ui_type: 'single', required: 0, sort_order: 6,  description: 'Farbe der Außensohle (sichtbarer Rand).' },
    { key: 'welt',              label: 'Welt',           ui_type: 'single', required: 1, sort_order: 7,  description: 'Rahmen, City für glatten Look, Country/Storm für robusten Auftritt.' },
    { key: 'buckle',            label: 'Buckle',         ui_type: 'single', required: 1, sort_order: 8,  description: 'Schnallenform (für Monk-Modelle).' },
    { key: 'buckle_color',      label: 'Buckle Farbe',   ui_type: 'single', required: 0, sort_order: 9,  description: 'Material der Schnalle (nur Monk).' },
    { key: 'inner_color',       label: 'Farbe Innen',    ui_type: 'single', required: 0, sort_order: 10, description: 'Farbe des Futters.' },
    { key: 'sole_bottom_color', label: 'Sohle Farbe Unten', ui_type: 'single', required: 0, sort_order: 11, description: 'Farbe der Sohlen-Unterseite.' },
    { key: 'toe',               label: 'Zehenkappe',     ui_type: 'single', required: 0, sort_order: 12, description: 'Zehenkappenform.' },
    { key: 'beveled_waist',     label: 'Beveled Waist',  ui_type: 'toggle', required: 0, sort_order: 13, description: 'Schlanke Taille für eleganteren Look.' },
  ]
  const insGroup = db.prepare(`
    INSERT INTO option_groups (key, label, description, ui_type, required, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
    -- Nur technische Felder werden nachgezogen. Alles, was der Betreiber im
    -- CMS pflegt — Bezeichnung, Beschreibung, Farbwert, Sortierung —, bleibt
    -- unangetastet: Ein Serverstart darf eingetragene Werte nicht zurueck-
    -- schreiben.
    ON CONFLICT(key) DO UPDATE SET
      ui_type = excluded.ui_type,
      required = excluded.required,
      updated_at = datetime('now')
  `)
  GROUPS.forEach(g => insGroup.run(g.key, g.label, g.description, g.ui_type, g.required, g.sort_order))

  const groupId = (key) => db.prepare('SELECT id FROM option_groups WHERE key = ?').get(key)?.id

  // 2) Werte pro Gruppe (alles, was du in den Screenshots gezeigt hast)
  const OPTIONS = [
    // Leisten (Last)
    { group: 'last', key: 'zurigo',    label: 'Zurigo',    description: 'Runde Zehenform für traditionell-englischen Look. Bietet am meisten Platz im Zehenbereich, ideal für breitere Füße oder hohen Spann.', price: 0,  cats: 'OXFORD,WHOLECUT,DERBY,LOAFER,CHELSEA,MONK,DOUBLE_MONK' },
    { group: 'last', key: 'monti',     label: 'Monti',     description: 'Klassische Eleganz mit leicht quadratischer Zehe. Der vielseitige Allrounder, passt zu den meisten Fußformen und jedem Anlass.',     price: 0,  cats: 'OXFORD,WHOLECUT,DERBY,LOAFER,MONK,DOUBLE_MONK' },
    { group: 'last', key: 'savile',    label: 'Savile',    description: 'Schlanker Look mit leichter Chisel-Zehe. Elegant für normale bis schmale Füße.',                                                       price: 0,  cats: 'OXFORD,WHOLECUT,DERBY,LOAFER,CHELSEA,MONK,DOUBLE_MONK' },
    { group: 'last', key: 'belgravia', label: 'Belgravia', description: 'Chisel-Zehe, schmale Taille und kubanischer Absatz. Markantes Statement, am besten für schlanke Füße.',                                price: 0,  cats: 'OXFORD,WHOLECUT,CHELSEA' },

    // Sohle, Beschreibungen mit Anwendungs-Hinweis (wann was sinnvoll ist)
    { group: 'sole', key: 'leather',          label: 'Leather',          description: 'Klassische Ledersohle, elegant für Business, Anzug und drinnen. Die richtige Wahl für die meisten Anlässe.', price: 0,  cats: '*' },
    { group: 'sole', key: 'leather_mountain', label: 'Leather Mountain', description: 'Leder mit Bergprofil, etwas mehr Grip bei trockenem Wetter, behält den eleganten Charakter.',              price: 0,  cats: '*' },
    { group: 'sole', key: 'leather_buttons',  label: 'Leather Buttons',  description: 'Leder mit eingelassenen Noppen, dezent griffiger als glattes Leder, gut für den Alltag.',                  price: 0,  cats: '*' },
    { group: 'sole', key: 'leather_rubber',   label: 'Leather + Rubber', description: 'Leder mit Gummi-Mittelsteg, eleganter Look mit alltagstauglichem Halt. Guter Mittelweg.',                  price: 0,  cats: '*' },
    { group: 'sole', key: 'dainite',          label: 'Dainite',          description: 'Stollen-Gummisohle, robust und rutschsicher bei Nässe. Ideal für draußen und Regenwetter.',               price: 5,  cats: '*' },
    { group: 'sole', key: 'commando',         label: 'Commando',         description: 'Grobes Profil, maximaler Grip. Für Outdoor, Winter und raues Gelände.',                                   price: 0,  cats: '*' },
    { group: 'sole', key: 'crepe',            label: 'Crepe',            description: 'Naturkautschuk, weich, leise und leger. Perfekt für entspannte, sommerliche Anlässe.',                     price: 5,  cats: 'LOAFER,DERBY,SNEAKER' },
    { group: 'sole', key: 'rubber',           label: 'Rubber',           description: 'Glatte Gummisohle, unauffälliger Allrounder mit etwas Grip für den Alltag.',                              price: 0,  cats: '*' },
    { group: 'sole', key: 'dots',             label: 'Dots',             description: 'Gummi mit feinen Noppen, dezenter Grip, unauffällig im Alltag.',                                          price: 0,  cats: '*' },
    { group: 'sole', key: 'rocky',            label: 'Rocky',            description: 'Robuste Outdoor-Sohle, für Stiefel und raues Gelände bei jedem Wetter.',                                  price: 0,  cats: 'CHELSEA,BOOT,DERBY' },
    { group: 'sole', key: 'beveled_waist',    label: 'Beveled Waist',    description: 'Schlanke, geschwungene Taille, Markenzeichen feinster Schuhmacherkunst, rein optisch.',                    price: 35, cats: 'OXFORD,WHOLECUT,DERBY,MONK,DOUBLE_MONK' },
    { group: 'sole', key: 'art',              label: 'Art',              description: 'Handbemalte Spezialsohle, auffälliges Einzelstück für Individualisten.',                                  price: 17, cats: '*' },

    // Welt (Rahmen), in den meisten Fällen reicht City
    { group: 'welt', key: 'city',    label: 'City',    description: 'Schmaler, eleganter Rahmen, für Business, Anzug und Alltag. Für die meisten Anlässe die richtige Wahl.', price: 0, cats: '*' },
    { group: 'welt', key: 'country', label: 'Country', description: 'Breiterer, robusterer Rahmen, für legere Outfits und kräftigere Schuhe.',                              price: 0, cats: '*' },
    { group: 'welt', key: 'storm',   label: 'Storm',   description: 'Wasserabweisender Rahmen, schützt bei Regen und Outdoor.',                                            price: 0, cats: '*' },

    // Heel (Absatz)
    { group: 'heel', key: 'standard',    label: 'Standard',    description: 'Klassische Absatzhöhe.',  price: 0, cats: '*' },
    { group: 'heel', key: 'higher_heel', label: 'Higher Heel', description: 'Erhöhter Absatz.',         price: 0, cats: '*' },

    // Toe (Zehenkappe)
    { group: 'toe', key: 'plain_toe',  label: 'Plain Toe', description: 'Glatte Zehenkappe ohne Verzierung.', price: 0, cats: '*' },
    { group: 'toe', key: 'punch_cap',  label: 'Punch Cap', description: 'Klassische Punch-Cap-Lochung.',     price: 0, cats: 'OXFORD,DERBY' },
    { group: 'toe', key: 'cap_toe',    label: 'Cap Toe',   description: 'Aufgesetzte Zehenkappe mit Naht.',  price: 0, cats: 'OXFORD,DERBY,CHELSEA' },
    { group: 'toe', key: 'bare',       label: 'Bare',      description: 'Komplett unverziert.',               price: 0, cats: 'OXFORD,WHOLECUT' },

    // Schnalle (für Monk)
    { group: 'buckle', key: 'round_buckle',  label: 'Round Buckle',  description: 'Klassisch runde Schnalle.',    price: 0, cats: 'MONK,DOUBLE_MONK' },
    { group: 'buckle', key: 'square_buckle', label: 'Square Buckle', description: 'Eckige Schnalle, modern.',     price: 0, cats: 'MONK,DOUBLE_MONK' },

    // Loafer-Dekor
    { group: 'loafer_decoration', key: 'tassels',      label: 'Tassels',      description: 'Klassische Quasten.',           price: 0, cats: 'LOAFER' },
    { group: 'loafer_decoration', key: 'albert_mask',  label: 'Albert Mask',  description: 'Verzierte Maske auf dem Spann.', price: 0, cats: 'LOAFER' },
    { group: 'loafer_decoration', key: 'metal_bit',    label: 'Metal Bit',   description: 'Pferdetrense aus Metall.',       price: 0, cats: 'LOAFER' },
    { group: 'loafer_decoration', key: 'bow',          label: 'Bow',          description: 'Schleife auf dem Spann.',        price: 0, cats: 'LOAFER' },
    { group: 'loafer_decoration', key: 'bare',         label: 'Bare',         description: 'Ohne Dekoration.',               price: 0, cats: 'LOAFER' },

    // Beveled Waist (Yes/No-Toggle)
    { group: 'beveled_waist', key: 'no',  label: 'Nein', description: 'Standard-Taille.',                    price: 0,  cats: '*' },
    { group: 'beveled_waist', key: 'yes', label: 'Ja',   description: 'Schlanke Taille (+19 €).',           price: 19, cats: '*' },
  ]
  const insOpt = db.prepare(`
    INSERT OR IGNORE INTO options (group_id, key, label, description, default_price_extra, applicable_categories, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  OPTIONS.forEach((o, i) => {
    const gid = groupId(o.group)
    if (!gid) return
    insOpt.run(gid, o.key, o.label, o.description, o.price, o.cats, i)
  })

  const optId = (groupKey, optKey) => db.prepare(`
    SELECT o.id FROM options o JOIN option_groups g ON g.id = o.group_id
    WHERE g.key = ? AND o.key = ?
  `).get(groupKey, optKey)?.id

  // 3) Vorlagen pro Kategorie: welche Optionen werden bei einem neuen
  //    Schuh dieser Kategorie automatisch aktiviert, was ist Default?
  const TEMPLATES = [
    // category, group/option, is_default
    // OXFORD
    ['OXFORD', 'last:zurigo', 1], ['OXFORD', 'last:monti'], ['OXFORD', 'last:savile'], ['OXFORD', 'last:belgravia'],
    ['OXFORD', 'sole:leather', 1], ['OXFORD', 'sole:dainite'], ['OXFORD', 'sole:beveled_waist'], ['OXFORD', 'sole:commando'],
    ['OXFORD', 'welt:city', 1], ['OXFORD', 'welt:country'],
    ['OXFORD', 'heel:standard', 1], ['OXFORD', 'heel:higher_heel'],
    ['OXFORD', 'toe:punch_cap', 1], ['OXFORD', 'toe:plain_toe'], ['OXFORD', 'toe:bare'],
    ['OXFORD', 'beveled_waist:no', 1], ['OXFORD', 'beveled_waist:yes'],
    // WHOLECUT
    ['WHOLECUT', 'last:zurigo', 1], ['WHOLECUT', 'last:monti'], ['WHOLECUT', 'last:savile'], ['WHOLECUT', 'last:belgravia'],
    ['WHOLECUT', 'sole:leather', 1], ['WHOLECUT', 'sole:dainite'], ['WHOLECUT', 'sole:beveled_waist'],
    ['WHOLECUT', 'welt:city', 1], ['WHOLECUT', 'welt:country'],
    ['WHOLECUT', 'heel:standard', 1], ['WHOLECUT', 'heel:higher_heel'],
    ['WHOLECUT', 'beveled_waist:no', 1], ['WHOLECUT', 'beveled_waist:yes'],
    // DERBY
    ['DERBY', 'last:zurigo', 1], ['DERBY', 'last:monti'], ['DERBY', 'last:savile'],
    ['DERBY', 'sole:leather', 1], ['DERBY', 'sole:dainite'], ['DERBY', 'sole:commando'], ['DERBY', 'sole:rocky'],
    ['DERBY', 'welt:city', 1], ['DERBY', 'welt:country'], ['DERBY', 'welt:storm'],
    ['DERBY', 'heel:standard', 1], ['DERBY', 'heel:higher_heel'],
    ['DERBY', 'toe:plain_toe', 1], ['DERBY', 'toe:punch_cap'], ['DERBY', 'toe:cap_toe'],
    // LOAFER
    ['LOAFER', 'last:zurigo', 1], ['LOAFER', 'last:monti'], ['LOAFER', 'last:savile'],
    ['LOAFER', 'sole:leather', 1], ['LOAFER', 'sole:dainite'], ['LOAFER', 'sole:crepe'], ['LOAFER', 'sole:commando'],
    ['LOAFER', 'welt:city', 1], ['LOAFER', 'welt:country'],
    ['LOAFER', 'heel:standard', 1], ['LOAFER', 'heel:higher_heel'],
    ['LOAFER', 'loafer_decoration:bare', 1], ['LOAFER', 'loafer_decoration:tassels'], ['LOAFER', 'loafer_decoration:metal_bit'], ['LOAFER', 'loafer_decoration:bow'], ['LOAFER', 'loafer_decoration:albert_mask'],
    // CHELSEA (Boot)
    ['CHELSEA', 'last:zurigo', 1], ['CHELSEA', 'last:savile'], ['CHELSEA', 'last:belgravia'],
    ['CHELSEA', 'sole:leather', 1], ['CHELSEA', 'sole:dainite'], ['CHELSEA', 'sole:commando'], ['CHELSEA', 'sole:rocky'],
    ['CHELSEA', 'welt:city'], ['CHELSEA', 'welt:country', 1], ['CHELSEA', 'welt:storm'],
    ['CHELSEA', 'heel:standard', 1], ['CHELSEA', 'heel:higher_heel'],
    ['CHELSEA', 'toe:plain_toe', 1], ['CHELSEA', 'toe:cap_toe'],
    // MONK / DOUBLE_MONK
    ['MONK', 'last:zurigo', 1], ['MONK', 'last:monti'], ['MONK', 'last:savile'],
    ['MONK', 'sole:leather', 1], ['MONK', 'sole:dainite'], ['MONK', 'sole:beveled_waist'],
    ['MONK', 'welt:city', 1], ['MONK', 'welt:country'],
    ['MONK', 'heel:standard', 1], ['MONK', 'heel:higher_heel'],
    ['MONK', 'buckle:square_buckle', 1], ['MONK', 'buckle:round_buckle'],
    ['DOUBLE_MONK', 'last:zurigo', 1], ['DOUBLE_MONK', 'last:monti'], ['DOUBLE_MONK', 'last:savile'],
    ['DOUBLE_MONK', 'sole:leather', 1], ['DOUBLE_MONK', 'sole:dainite'], ['DOUBLE_MONK', 'sole:beveled_waist'],
    ['DOUBLE_MONK', 'welt:city', 1], ['DOUBLE_MONK', 'welt:country'],
    ['DOUBLE_MONK', 'heel:standard', 1], ['DOUBLE_MONK', 'heel:higher_heel'],
    ['DOUBLE_MONK', 'buckle:square_buckle', 1], ['DOUBLE_MONK', 'buckle:round_buckle'],
    // BOOT (Allzweck-Stiefel)
    ['BOOT', 'last:zurigo', 1], ['BOOT', 'last:savile'],
    ['BOOT', 'sole:commando', 1], ['BOOT', 'sole:dainite'], ['BOOT', 'sole:rocky'], ['BOOT', 'sole:rubber'],
    ['BOOT', 'welt:country', 1], ['BOOT', 'welt:storm'],
    ['BOOT', 'heel:standard', 1], ['BOOT', 'heel:higher_heel'],
    // SNEAKER
    ['SNEAKER', 'sole:rubber', 1], ['SNEAKER', 'sole:crepe'], ['SNEAKER', 'sole:dots'],
  ]
  const insTpl = db.prepare(`
    INSERT OR IGNORE INTO category_templates (category, option_id, is_default, sort_order)
    VALUES (?, ?, ?, ?)
  `)
  TEMPLATES.forEach((tpl, i) => {
    const [cat, ref, isDefault] = tpl
    const [gk, ok] = ref.split(':')
    const oid = optId(gk, ok)
    if (oid) insTpl.run(cat, oid, isDefault ? 1 : 0, i)
  })

  console.log(`✅ Seeded: configurator options (${GROUPS.length} groups, ${OPTIONS.length} options, ${TEMPLATES.length} template entries)`)
}

// ─────────────────────────────────────────────────────────────────────
// seedExtendedCatalog, vollständiges Material/Farb/Konfig-Setup
// gemäß Matrix mit Familie (Aesthetic/Durable), Material-Typen und
// allen Optionsgruppen für jedes Schuhmodell.
// Idempotent: aktualisiert nur fehlende Datensätze.
// ─────────────────────────────────────────────────────────────────────
export function seedExtendedCatalog(db) {
  // ── 1) Material-Familien + Typen ────────────────────────────────
  const MATERIALS = [
    // Aesthetic
    { key: 'lux_calf',            label: 'Lux Calf',            sub: 'Aesthetic', family: 'aesthetic', color: '#3b1f0a', tip: 'Hochglanz-Kalbsleder.',                          rating: 'good',    sort: 0 },
    { key: 'lux_suede',           label: 'Lux Suede',           sub: 'Aesthetic', family: 'aesthetic', color: '#7c3a1e', tip: 'Premium-Veloursleder.',                          rating: 'good',    sort: 1 },
    { key: 'painted_full_grain',  label: 'Painted Full Grain',  sub: 'Aesthetic', family: 'aesthetic', color: '#5b2c0e', tip: 'Patinierungs-Vollnarbenleder. Robust UND optisch veredelt, die Allzweckwahl.', rating: 'good', sort: 2 },
    { key: 'patina',              label: 'Patina',              sub: 'Aesthetic', family: 'aesthetic', color: '#1c1c1e', tip: 'Speziell handpatiniert.',                        rating: 'neutral', sort: 3 },
    { key: 'velvet',              label: 'Velvet',              sub: 'Aesthetic', family: 'aesthetic', color: '#2d1b3d', tip: 'Samt, exklusiv für Slipper, Boots, Drake.',     rating: 'neutral', sort: 4 },
    // Durable
    { key: 'box_calf',            label: 'Box Calf',            sub: 'Durable',   family: 'durable',   color: '#1c1c1e', tip: 'Klassisches Box-Calf, robust und matt.',        rating: 'good',    sort: 10 },
    { key: 'urban_suede',         label: 'Urban Suede',         sub: 'Durable',   family: 'durable',   color: '#7c3a1e', tip: 'Wetterbeständiges Veloursleder.',                rating: 'good',    sort: 11 },
    { key: 'painted_calf',        label: 'Painted Calf',        sub: 'Durable',   family: 'durable',   color: '#5b2c0e', tip: 'Patinierungs-Kalbleder, alltagstauglich.',       rating: 'good',    sort: 12 },
    // Painted Full Grain (Durable) wurde mit Aesthetic-Variante zusammengeführt
  ]
  const insMat = db.prepare(`
    INSERT INTO shoe_materials (key, label, sub, color, available, tip, rating, sort_order, family)
    VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
    -- Nur technische Felder werden nachgezogen. Alles, was der Betreiber im
    -- CMS pflegt — Bezeichnung, Beschreibung, Farbwert, Sortierung —, bleibt
    -- unangetastet: Ein Serverstart darf eingetragene Werte nicht zurueck-
    -- schreiben.
    ON CONFLICT(key) DO UPDATE SET family=excluded.family,
      updated_at = datetime('now')
  `)
  MATERIALS.forEach(m => insMat.run(m.key, m.label, m.sub, m.color, m.tip, m.rating, m.sort, m.family))

  // Die abgelösten Lederarten stilllegen — beim Namen genannt.
  //
  // Hier stand `WHERE key NOT IN (Matrix)`: Alles, was diese Liste nicht
  // kennt, wurde bei JEDEM Serverstart abgeschaltet. Gemeint waren die
  // Altlasten aus der ersten Fassung; getroffen wurde jede Lederart, die
  // später dazukam — die drei des Mokassins ebenso wie eine, die jemand im
  // CMS anlegt. Sie erschienen einmal und waren nach dem nächsten Neustart
  // stillschweigend weg, ohne dass irgendwo etwas davon stand.
  //
  // Eine Liste dessen, was stillgelegt gehört, ist länger als eine Liste
  // dessen, was bleiben darf — aber sie trifft nur, was sie meint.
  const ABGELOEST = ['calfskin', 'suede', 'patent', 'cordovan', 'exotic', 'scotch_grain',
                     'painted_full_grain_durable']
  db.prepare(
    `UPDATE shoe_materials SET available = 0 WHERE key IN (${ABGELOEST.map(() => '?').join(',')})`
  ).run(...ABGELOEST)

  // Painted Full Grain (Durable) entfernen: Farben, die darauf zeigten,
  // jetzt auf 'painted_full_grain' (Aesthetic) umleiten.
  db.prepare(`
    UPDATE shoe_colors
       SET applicable_materials = REPLACE(applicable_materials, 'painted_full_grain_durable', 'painted_full_grain')
     WHERE applicable_materials LIKE '%painted_full_grain_durable%'
  `).run()
  // ggf. Material selber löschen (CASCADE löscht abhängige shoe_material_options)
  db.prepare(`DELETE FROM shoe_materials WHERE key = 'painted_full_grain_durable'`).run()

  // ── 2) Farben mit Material-Verknüpfung ──────────────────────────
  // Format: { key, name, hex, materials: [keys], rating, sort }
  const COLORS = [
    // Grundfarben (für die meisten Aesthetic + Durable Leder verfügbar)
    { key: 'black',         name: 'Black',          hex: '#000000', materials: 'lux_calf,lux_suede,painted_full_grain,patina,box_calf,urban_suede,painted_calf,painted_full_grain_durable,velvet', rating: 'good',    sort: 0 },
    { key: 'dark_brown',    name: 'Dark Brown',     hex: '#3b1f0a', materials: 'lux_calf,lux_suede,painted_full_grain,box_calf,urban_suede,painted_calf,painted_full_grain_durable',                rating: 'good',    sort: 1 },
    { key: 'medium_brown',  name: 'Medium Brown',   hex: '#5b3a1d', materials: 'lux_calf,lux_suede,painted_full_grain,urban_suede,painted_calf,painted_full_grain_durable',                          rating: 'good',    sort: 2 },
    { key: 'light_brown',   name: 'Light Brown',    hex: '#a0734a', materials: 'lux_calf,lux_suede',                                                                                                  rating: 'neutral', sort: 3 },
    { key: 'cognac',        name: 'Cognac',         hex: '#92400e', materials: 'lux_calf,lux_suede,painted_full_grain,box_calf,urban_suede,painted_calf,painted_full_grain_durable',                rating: 'good',    sort: 4 },
    { key: 'oxblood',       name: 'Oxblood',        hex: '#7b1e1e', materials: 'lux_calf,lux_suede',                                                                                                  rating: 'good',    sort: 5 },
    { key: 'burgundy',      name: 'Burgundy',       hex: '#4f1d24', materials: 'lux_calf,lux_suede,painted_full_grain,box_calf,urban_suede,painted_calf,painted_full_grain_durable',                rating: 'good',    sort: 6 },
    { key: 'red',           name: 'Red',            hex: '#a01c1c', materials: 'lux_calf,lux_suede,painted_full_grain,painted_calf,painted_full_grain_durable,velvet',                              rating: 'neutral', sort: 7 },
    { key: 'navy',          name: 'Navy',           hex: '#1e3a5f', materials: 'painted_full_grain,box_calf,urban_suede,painted_calf,painted_full_grain_durable,velvet',                            rating: 'good',    sort: 8 },
    { key: 'olive',         name: 'Olive',          hex: '#3d3c1f', materials: 'painted_full_grain,painted_calf,painted_full_grain_durable',                                                         rating: 'neutral', sort: 9 },
    { key: 'sand',          name: 'Sand',           hex: '#d4b896', materials: 'lux_suede',                                                                                                          rating: 'neutral', sort: 10 },
    { key: 'camel',         name: 'Camel',          hex: '#c8a97e', materials: 'lux_suede',                                                                                                          rating: 'neutral', sort: 11 },
    { key: 'taupe',         name: 'Taupe',          hex: '#705c4a', materials: 'urban_suede',                                                                                                        rating: 'neutral', sort: 12 },
    // Velvet-only
    { key: 'velvet_beige',     name: 'Beige',       hex: '#c8b89a', materials: 'velvet', rating: 'neutral', sort: 20 },
    { key: 'velvet_darkgrey',  name: 'Dark Grey',   hex: '#3a3a3a', materials: 'velvet', rating: 'neutral', sort: 21 },
    { key: 'velvet_khaki',     name: 'Khaki',       hex: '#8a8a4a', materials: 'velvet', rating: 'neutral', sort: 22 },
    { key: 'velvet_makeup',    name: 'MakeUp',      hex: '#d6b4a0', materials: 'velvet', rating: 'neutral', sort: 23 },
    { key: 'velvet_mustard',   name: 'Mustard',     hex: '#c8a020', materials: 'velvet', rating: 'neutral', sort: 24 },
    { key: 'velvet_purple',    name: 'Purple',      hex: '#5a2d6d', materials: 'velvet', rating: 'neutral', sort: 25 },
    { key: 'velvet_royal',     name: 'Royal Blue',  hex: '#1d3d9d', materials: 'velvet', rating: 'neutral', sort: 26 },
  ]
  const insCol = db.prepare(`
    INSERT INTO shoe_colors (key, hex, name, available, rating, sort_order, applicable_materials)
    VALUES (?, ?, ?, 1, ?, ?, ?)
    -- Nur technische Felder werden nachgezogen. Alles, was der Betreiber im
    -- CMS pflegt — Bezeichnung, Beschreibung, Farbwert, Sortierung —, bleibt
    -- unangetastet: Ein Serverstart darf eingetragene Werte nicht zurueck-
    -- schreiben.
    ON CONFLICT(key) DO UPDATE SET applicable_materials=excluded.applicable_materials,
      updated_at = datetime('now')
  `)
  COLORS.forEach(c => insCol.run(c.key, c.hex, c.name, c.rating, c.sort, c.materials))

  // ── 3) Erweiterte Option-Gruppen ────────────────────────────────
  const NEW_GROUPS = [
    { key: 'wholecut_base',     label: 'Base',                 ui_type: 'single', required: 1, sort_order: 4, description: 'Vorderkappen-Verarbeitung (nur Whole Cut).' },
    { key: 'sole_color',        label: 'Sohlenfarbe',          ui_type: 'single', required: 0, sort_order: 8, description: 'Farbe der Außensohle (sichtbarer Rand).' },
    { key: 'buckle_color',      label: 'Schnallen-Farbe',      ui_type: 'single', required: 0, sort_order: 9, description: 'Material der Schnalle (nur Monk).' },
    { key: 'inner_color',       label: 'Innen­farbe',          ui_type: 'single', required: 0, sort_order: 10, description: 'Farbe des Futters.' },
    { key: 'sole_bottom_color', label: 'Sohle Unterseite',     ui_type: 'single', required: 0, sort_order: 11, description: 'Farbe der Sohlen-Unterseite.' },
  ]
  const insGroup = db.prepare(`
    INSERT INTO option_groups (key, label, description, ui_type, required, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
    -- Nur technische Felder werden nachgezogen. Alles, was der Betreiber im
    -- CMS pflegt — Bezeichnung, Beschreibung, Farbwert, Sortierung —, bleibt
    -- unangetastet: Ein Serverstart darf eingetragene Werte nicht zurueck-
    -- schreiben.
    ON CONFLICT(key) DO UPDATE SET ui_type=excluded.ui_type, required=excluded.required,
      updated_at = datetime('now')
  `)
  NEW_GROUPS.forEach(g => insGroup.run(g.key, g.label, g.description, g.ui_type, g.required, g.sort_order))

  const groupIdOf = (key) => db.prepare('SELECT id FROM option_groups WHERE key = ?').get(key)?.id

  // ── 4) Werte der neuen Gruppen ─────────────────────────────────
  const NEW_OPTIONS = [
    // Whole-Cut Base
    { group: 'wholecut_base', key: 'punched_cap',  label: 'Punched Cap',   description: 'Klassische Lochkappe.',              price: 0, cats: 'WHOLECUT' },
    { group: 'wholecut_base', key: 'full_punched', label: 'Full Punched',  description: 'Komplette Vorderkappen-Lochung.',     price: 0, cats: 'WHOLECUT' },
    { group: 'wholecut_base', key: 'plain',        label: 'Plain',          description: 'Glatte Vorderkappe.',                price: 0, cats: 'WHOLECUT' },

    // Sohlenfarbe (Außenrand)
    { group: 'sole_color', key: 'black',   label: 'Black',   description: '',  price: 0, cats: '*' },
    { group: 'sole_color', key: 'brown',   label: 'Brown',   description: '',  price: 0, cats: '*' },
    { group: 'sole_color', key: 'brick',   label: 'Brick',   description: '',  price: 0, cats: 'MONK,DOUBLE_MONK' },
    { group: 'sole_color', key: 'natural', label: 'Natural', description: '',  price: 0, cats: '*' },

    // Buckle-Farbe
    { group: 'buckle_color', key: 'gold',     label: 'Gold',     description: '', price: 0, cats: 'MONK,DOUBLE_MONK' },
    { group: 'buckle_color', key: 'graphite', label: 'Graphite', description: '', price: 0, cats: 'MONK,DOUBLE_MONK' },
    { group: 'buckle_color', key: 'nickel',   label: 'Nickel',   description: '', price: 0, cats: 'MONK,DOUBLE_MONK' },
    { group: 'buckle_color', key: 'copper',   label: 'Copper',   description: '', price: 0, cats: 'MONK,DOUBLE_MONK' },

    // Innenfarbe
    { group: 'inner_color', key: 'black',  label: 'Black',  description: '', price: 0, cats: '*' },
    { group: 'inner_color', key: 'brown',  label: 'Brown',  description: '', price: 0, cats: '*' },
    { group: 'inner_color', key: 'tan',    label: 'Tan',    description: '', price: 0, cats: '*' },
    { group: 'inner_color', key: 'beige',  label: 'Beige',  description: '', price: 0, cats: '*' },
    { group: 'inner_color', key: 'red',    label: 'Red',    description: '', price: 0, cats: '*' },
    { group: 'inner_color', key: 'orange', label: 'Orange', description: '', price: 0, cats: '*' },
    { group: 'inner_color', key: 'navy',   label: 'Navy',   description: '', price: 0, cats: '*' },
    { group: 'inner_color', key: 'white',  label: 'White',  description: '', price: 0, cats: '*' },
    { group: 'inner_color', key: 'lila',   label: 'Lila',   description: '', price: 0, cats: '*' },
    { group: 'inner_color', key: 'ochre',  label: 'Ochre',  description: '', price: 0, cats: '*' },

    // Sohle Unterseite
    { group: 'sole_bottom_color', key: 'black',         label: 'Black',         description: '', price: 0, cats: '*' },
    { group: 'sole_bottom_color', key: 'brown',         label: 'Brown',         description: '', price: 0, cats: '*' },
    { group: 'sole_bottom_color', key: 'cognac',        label: 'Cognac',        description: '', price: 0, cats: '*' },
    { group: 'sole_bottom_color', key: 'dark_red',      label: 'Dark Red',      description: '', price: 0, cats: '*' },
    { group: 'sole_bottom_color', key: 'forest_green',  label: 'Forest Green',  description: '', price: 0, cats: '*' },
    { group: 'sole_bottom_color', key: 'lila',          label: 'Lila',          description: '', price: 0, cats: '*' },
    { group: 'sole_bottom_color', key: 'natural',       label: 'Natural',       description: '', price: 0, cats: '*' },
    { group: 'sole_bottom_color', key: 'orange',        label: 'Orange',        description: '', price: 0, cats: '*' },
    { group: 'sole_bottom_color', key: 'white',         label: 'Weiß',          description: 'Klassisch weiß (Sneaker).', price: 0, cats: 'SNEAKER,SNEAKER_LACED,SNEAKER_BOOT' },

    // Erweiterte Sohlen aus Matrix (falls noch nicht vorhanden)
    { group: 'sole', key: 'gummy_sole',     label: 'Gummy Sole',      description: 'Glatte Gummisohle (Loafer-Stil).', price: 0,  cats: '*' },

    // Erweiterte Loafer-Accessoires
    { group: 'loafer_decoration', key: 'albert_tassels', label: 'Albert Tassels', description: 'Tasseln im Albert-Stil.',  price: 0, cats: 'LOAFER,BELGIAN_SLIPPER,WELLINGTON,DRAKE' },
    { group: 'loafer_decoration', key: 'horsebit',       label: 'Horsebit',        description: 'Pferdetrense (Metal Bit).', price: 0, cats: 'LOAFER,BELGIAN_SLIPPER,WELLINGTON,DRAKE' },
    { group: 'loafer_decoration', key: 'ohne',           label: 'Ohne',           description: 'Ohne Dekoration.',          price: 0, cats: 'LOAFER,BELGIAN_SLIPPER,WELLINGTON,DRAKE' },
    { group: 'loafer_decoration', key: 'bow',            label: 'Bow',             description: 'Schleife.',                 price: 0, cats: 'LOAFER,BELGIAN_SLIPPER' },
  ]
  const insOpt = db.prepare(`
    INSERT INTO options (group_id, key, label, description, default_price_extra, applicable_categories, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    -- default_price_extra steht bewusst NICHT in dieser Liste: Aufpreise
    -- pflegt der Betreiber im CMS, und ein Serverstart darf sie nicht
    -- zurueckschreiben.
    -- Nur technische Felder werden nachgezogen. Alles, was der Betreiber im
    -- CMS pflegt — Bezeichnung, Beschreibung, Farbwert, Sortierung —, bleibt
    -- unangetastet: Ein Serverstart darf eingetragene Werte nicht zurueck-
    -- schreiben.
    ON CONFLICT(group_id, key) DO UPDATE SET applicable_categories=excluded.applicable_categories,
      updated_at = datetime('now')
  `)
  NEW_OPTIONS.forEach((o, i) => {
    const gid = groupIdOf(o.group)
    if (gid) insOpt.run(gid, o.key, o.label, o.description, o.price, o.cats, i)
  })

  // Sohlen-Aufpreise: genau einmal nachtragen, danach nie wieder anfassen.
  //
  // Vorher lief dieses UPDATE bedingungslos bei jedem Serverstart und schrieb
  // die im CMS gepflegten Aufpreise mit den hier stehenden Werten zurück. Für
  // den Betreiber sah es aus, als würde nicht gespeichert — gespeichert wurde,
  // nur beim nächsten Start wieder überschrieben. Ein Vermerk in settings hält
  // fest, dass der Nachtrag erledigt ist.
  const NACHTRAG = 'seed_sole_prices_done'
  const erledigt = db.prepare('SELECT 1 FROM settings WHERE key = ?').get(NACHTRAG)
  if (!erledigt) {
    const SOLE_PRICE_UPDATES = [
      { key: 'dainite',        price: 10 },
      { key: 'crepe',          price: 10 },
      { key: 'beveled_waist',  price: 50 },
    ]
    const upSole = db.prepare(`
      UPDATE options SET default_price_extra = ?, updated_at = datetime('now')
      WHERE group_id = (SELECT id FROM option_groups WHERE key='sole') AND key = ?
    `)
    SOLE_PRICE_UPDATES.forEach(s => upSole.run(s.price, s.key))
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, '1', datetime('now'))").run(NACHTRAG)
  }

  // ── 5) Erweiterte Kategorie-Vorlagen ───────────────────────────
  const optIdOf = (groupKey, optKey) => db.prepare(`
    SELECT o.id FROM options o JOIN option_groups g ON g.id = o.group_id
    WHERE g.key = ? AND o.key = ?
  `).get(groupKey, optKey)?.id

  const TEMPLATES = [
    // WHOLECUT
    ['WHOLECUT', 'last:zurigo', 1], ['WHOLECUT', 'last:monti'], ['WHOLECUT', 'last:savile'], ['WHOLECUT', 'last:belgravia'],
    ['WHOLECUT', 'wholecut_base:plain', 1], ['WHOLECUT', 'wholecut_base:punched_cap'], ['WHOLECUT', 'wholecut_base:full_punched'],
    ['WHOLECUT', 'sole:leather', 1], ['WHOLECUT', 'sole:dainite'], ['WHOLECUT', 'sole:leather_mountain'], ['WHOLECUT', 'sole:leather_buttons'], ['WHOLECUT', 'sole:leather_rubber'], ['WHOLECUT', 'sole:commando'], ['WHOLECUT', 'sole:crepe'], ['WHOLECUT', 'sole:gummy_sole'], ['WHOLECUT', 'sole:beveled_waist'],
    ['WHOLECUT', 'welt:city', 1], ['WHOLECUT', 'welt:country'], ['WHOLECUT', 'welt:storm'],
    ['WHOLECUT', 'heel:standard', 1], ['WHOLECUT', 'heel:higher_heel'],
    ['WHOLECUT', 'inner_color:black', 1], ['WHOLECUT', 'inner_color:brown'], ['WHOLECUT', 'inner_color:tan'], ['WHOLECUT', 'inner_color:cognac'],
    ['WHOLECUT', 'sole_bottom_color:natural', 1], ['WHOLECUT', 'sole_bottom_color:black'], ['WHOLECUT', 'sole_bottom_color:brown'], ['WHOLECUT', 'sole_bottom_color:cognac'],
    // DOUBLE_MONK, Sohle Color + Buckle Color
    ['DOUBLE_MONK', 'sole_color:natural', 1], ['DOUBLE_MONK', 'sole_color:black'], ['DOUBLE_MONK', 'sole_color:brown'], ['DOUBLE_MONK', 'sole_color:brick'],
    ['DOUBLE_MONK', 'buckle_color:nickel', 1], ['DOUBLE_MONK', 'buckle_color:gold'], ['DOUBLE_MONK', 'buckle_color:graphite'], ['DOUBLE_MONK', 'buckle_color:copper'],
    ['DOUBLE_MONK', 'inner_color:black', 1], ['DOUBLE_MONK', 'inner_color:brown'], ['DOUBLE_MONK', 'inner_color:tan'],
    ['DOUBLE_MONK', 'sole_bottom_color:natural', 1], ['DOUBLE_MONK', 'sole_bottom_color:black'], ['DOUBLE_MONK', 'sole_bottom_color:brown'],
    // MONK, gleich wie Double Monk
    ['MONK', 'sole_color:natural', 1], ['MONK', 'sole_color:black'], ['MONK', 'sole_color:brown'],
    ['MONK', 'buckle_color:nickel', 1], ['MONK', 'buckle_color:gold'], ['MONK', 'buckle_color:graphite'],
    ['MONK', 'inner_color:black', 1], ['MONK', 'inner_color:brown'],
    ['MONK', 'sole_bottom_color:natural', 1], ['MONK', 'sole_bottom_color:black'],
    // OXFORD + DERBY + LOAFER, Innen + Unterseite
    ['OXFORD', 'inner_color:black', 1], ['OXFORD', 'inner_color:brown'], ['OXFORD', 'inner_color:tan'], ['OXFORD', 'inner_color:cognac'], ['OXFORD', 'inner_color:navy'],
    ['OXFORD', 'sole_bottom_color:natural', 1], ['OXFORD', 'sole_bottom_color:black'], ['OXFORD', 'sole_bottom_color:brown'], ['OXFORD', 'sole_bottom_color:cognac'],
    ['DERBY', 'welt:city', 1], ['DERBY', 'welt:storm'],
    ['DERBY', 'inner_color:brown', 1], ['DERBY', 'inner_color:black'], ['DERBY', 'inner_color:tan'],
    ['DERBY', 'sole_bottom_color:natural', 1], ['DERBY', 'sole_bottom_color:brown'],
    ['LOAFER', 'inner_color:brown', 1], ['LOAFER', 'inner_color:black'], ['LOAFER', 'inner_color:tan'],
    ['LOAFER', 'sole_bottom_color:natural', 1], ['LOAFER', 'sole_bottom_color:brown'],
    ['LOAFER', 'loafer_decoration:ohne', 1], ['LOAFER', 'loafer_decoration:tassels'], ['LOAFER', 'loafer_decoration:albert_tassels'], ['LOAFER', 'loafer_decoration:horsebit'], ['LOAFER', 'loafer_decoration:albert_mask'],
    // CHELSEA / BALMORAL / JODHPUR / CHUKKA, nur Style + Color
    ['CHELSEA',  'inner_color:black', 1], ['CHELSEA',  'inner_color:brown'], ['CHELSEA',  'sole_bottom_color:black', 1], ['CHELSEA',  'sole_bottom_color:brown'],
    ['BALMORAL', 'last:zurigo', 1], ['BALMORAL', 'last:monti'], ['BALMORAL', 'last:savile'], ['BALMORAL', 'last:belgravia'],
    ['BALMORAL', 'inner_color:black', 1], ['BALMORAL', 'inner_color:brown'],
    ['JODHPUR',  'last:zurigo', 1], ['JODHPUR',  'last:monti'], ['JODHPUR',  'last:savile'], ['JODHPUR',  'last:belgravia'],
    ['JODHPUR',  'inner_color:black', 1], ['JODHPUR',  'inner_color:brown'],
    ['CHUKKA',   'last:zurigo', 1], ['CHUKKA',   'last:monti'], ['CHUKKA',   'last:savile'], ['CHUKKA',   'last:belgravia'],
    ['CHUKKA',   'inner_color:brown', 1], ['CHUKKA',   'inner_color:black'],
    // Slipper-Familie: Belgian Slipper, Wellington, Drake
    ['BELGIAN_SLIPPER', 'loafer_decoration:ohne', 1], ['BELGIAN_SLIPPER', 'loafer_decoration:tassels'], ['BELGIAN_SLIPPER', 'loafer_decoration:bow'],
    ['BELGIAN_SLIPPER', 'inner_color:black', 1], ['BELGIAN_SLIPPER', 'inner_color:brown'],
    ['WELLINGTON', 'loafer_decoration:ohne', 1], ['WELLINGTON', 'loafer_decoration:tassels'], ['WELLINGTON', 'loafer_decoration:albert_tassels'], ['WELLINGTON', 'loafer_decoration:albert_mask'], ['WELLINGTON', 'loafer_decoration:horsebit'],
    ['WELLINGTON', 'inner_color:black', 1], ['WELLINGTON', 'inner_color:brown'],
    ['DRAKE', 'loafer_decoration:ohne', 1], ['DRAKE', 'loafer_decoration:tassels'], ['DRAKE', 'loafer_decoration:albert_tassels'], ['DRAKE', 'loafer_decoration:albert_mask'], ['DRAKE', 'loafer_decoration:horsebit'],
    ['DRAKE', 'inner_color:black', 1], ['DRAKE', 'inner_color:brown'],
    // Sneaker-Familie (Mov Flex, Laceless Trainer)
    ['SNEAKER_LACED', 'inner_color:black', 1], ['SNEAKER_LACED', 'inner_color:white'], ['SNEAKER_LACED', 'inner_color:brown'],
    ['SNEAKER_LACED', 'sole_bottom_color:white', 1],
    ['SNEAKER_BOOT',  'inner_color:black', 1], ['SNEAKER_BOOT',  'inner_color:white'],
    ['SNEAKER_BOOT',  'sole_bottom_color:white', 1],
  ]
  const insTpl = db.prepare(`
    INSERT INTO category_templates (category, option_id, is_default, sort_order)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(category, option_id) DO UPDATE SET is_default=excluded.is_default, sort_order=excluded.sort_order
  `)
  TEMPLATES.forEach((tpl, i) => {
    const [cat, ref, isDefault] = tpl
    const [gk, ok] = ref.split(':')
    const oid = optIdOf(gk, ok)
    if (oid) insTpl.run(cat, oid, isDefault ? 1 : 0, i)
  })

  // ── 6) Hex-Farben für Farb-Options (Innen, Unterseite, Sohlenfarbe, Buckle) ──
  // Damit die Picker echte Swatches zeigen statt Buchstaben-Platzhalter.
  const COLOR_HEX_MAP = {
    // inner_color
    'inner_color:black':  '#0a0a0a',
    'inner_color:brown':  '#5b3a1d',
    'inner_color:tan':    '#a0734a',
    'inner_color:beige':  '#d4c4a0',
    'inner_color:red':    '#a01c1c',
    'inner_color:orange': '#d97706',
    'inner_color:navy':   '#1e3a5f',
    'inner_color:white':  '#f5f5f0',
    'inner_color:lila':   '#5a2d6d',
    'inner_color:ochre':  '#b8860b',
    // sole_bottom_color
    'sole_bottom_color:black':        '#0a0a0a',
    'sole_bottom_color:brown':        '#5b3a1d',
    'sole_bottom_color:cognac':       '#92400e',
    'sole_bottom_color:dark_red':     '#5a1818',
    'sole_bottom_color:forest_green': '#1f3d1f',
    'sole_bottom_color:lila':         '#5a2d6d',
    'sole_bottom_color:natural':      '#d4b896',
    'sole_bottom_color:orange':       '#d97706',
    'sole_bottom_color:white':        '#f5f5f0',
    // sole_color (Außenrand)
    'sole_color:black':   '#0a0a0a',
    'sole_color:brown':   '#5b3a1d',
    'sole_color:brick':   '#8b3a2a',
    'sole_color:natural': '#d4b896',
    // buckle_color (Metall-Töne)
    'buckle_color:gold':     '#c9a85e',
    'buckle_color:graphite': '#3a3a3a',
    'buckle_color:nickel':   '#a8a8a8',
    'buckle_color:copper':   '#b5704c',
  }
  // Icons pro Gruppe (Lucide-Names), für visuelle Akzente
  const ICON_MAP = {
    last:               'Footprints',
    sole:               'Layers',
    welt:               'CircleDashed',
    heel:               'ChevronUp',
    toe:                'Diamond',
    wholecut_base:      'CircleDot',
    buckle:             'Square',
    buckle_color:       'Gem',
    inner_color:        'Palette',
    sole_color:         'Palette',
    sole_bottom_color:  'Palette',
    loafer_decoration:  'Sparkles',
    beveled_waist:      'ArrowRightLeft',
  }
  const upHex = db.prepare(`
    UPDATE options SET color_hex = ?, updated_at = datetime('now')
    WHERE id = (SELECT o.id FROM options o JOIN option_groups g ON g.id = o.group_id WHERE g.key = ? AND o.key = ?)
  `)
  Object.entries(COLOR_HEX_MAP).forEach(([k, hex]) => {
    const [gk, ok] = k.split(':')
    upHex.run(hex, gk, ok)
  })
  // Icon auf option_groups (eine pro Gruppe, wird neben dem Step-Label
  // im Konfigurator gerendert)
  const upGroupIcon = db.prepare(`
    UPDATE option_groups SET icon = ?, updated_at = datetime('now') WHERE key = ?
  `)
  Object.entries(ICON_MAP).forEach(([gk, icon]) => upGroupIcon.run(icon, gk))

  // ── 7) Helper-Texte pro Optionsgruppe (Schritt-für-Schritt-Erklärung) ──
  const HELPER_TEXT = {
    last:              'Die Leistenform bestimmt das Profil des Schuhs (Zehenform, Taille, Proportion). Monti ist vielseitig und passt den meisten Füßen; Zurigo gibt breiten Füßen mehr Platz; Savile und Belgravia sind schlanker für schmale Füße.',
    sole:              'Die Sohle bestimmt Anlass und Wetter-Tauglichkeit. Leder (Leather/Buttons) ist klassisch-elegant für Business und drinnen. Dainite & Commando sind griffig und wetterfest für draußen. Crepe ist weich und leger. Leather + Rubber ist der elegante Mittelweg.',
    welt:              'Der Rahmen (Welt) verbindet Schaft und Sohle. In den meisten Fällen genügt die schmale, elegante City-Naht (Business, Anzug, Alltag). Country ist breiter und robuster für legere Outfits, Storm zusätzlich wasserabweisend für Regen und Outdoor.',
    heel:              'Standard-Absatz passt zu allen Outfits und Anlässen. Higher Heel gibt etwas mehr Höhe und einen markanteren Auftritt.',
    toe:               'Die Zehenkappe ist das prägende Detail vorne. Punch Cap mit klassischer Lochung, Plain Toe für minimalistischen Look, Cap Toe mit aufgesetzter Naht.',
    wholecut_base:     'Verarbeitung der Vorderkappe für den nahtlosen Whole-Cut-Schuh.',
    buckle:            'Schnallenform: Rund für klassische Eleganz, eckig für modernen Akzent.',
    buckle_color:      'Metall-Finish der Schnalle. Nickel ist der Klassiker, Gold setzt warme Akzente, Graphite ist diskret-modern, Copper auffällig.',
    inner_color:       'Farbe des Futters, sichtbar nur beim Anziehen. Klassisch farblich abgestimmt oder bewusst kontrastreich.',
    sole_color:        'Farbe des Sohlenrands (außen sichtbar). Natural ist neutral, Black diskret, Brick & Brown setzen Akzente.',
    sole_bottom_color: 'Farbe der Sohlen-Unterseite. Wird nur beim Sitzen oder Übereinanderschlagen der Beine sichtbar, ein subtiles Detail für Kenner.',
    loafer_decoration: 'Dekoration auf dem Spann: Tassels & Albert klassisch, Horsebit als Statement, Bow elegant, Ohne für puristischen Look.',
    beveled_waist:     'Schlanke, geschwungene Taille zwischen Ballen und Absatz. Subtil sichtbar, aber Markenzeichen feinster Schuhmacherkunst (+€19).',
  }
  const upHelper = db.prepare(`
    UPDATE option_groups SET helper_text = ?, updated_at = datetime('now') WHERE key = ?
  `)
  Object.entries(HELPER_TEXT).forEach(([k, t]) => upHelper.run(t, k))

  // ── 8) Empfehlungen entfernt (User-Wunsch) ─────────────────────────────
  // Statt „EMPFOHLEN"-Badges erklären jetzt die Helper-Texte je Gruppe und die
  // Options-Beschreibungen, wann welche Wahl sinnvoll ist. Bestehende DBs
  // bereinigen, damit keine alten Empfehlungs-Flags zurückbleiben.
  db.prepare(`UPDATE options SET recommended = 0, recommendation_reason = NULL WHERE recommended = 1 OR recommendation_reason IS NOT NULL`).run()

  console.log(`✅ Seeded: extended catalog (${MATERIALS.length} materials, ${COLORS.length} colors, ${NEW_GROUPS.length} option groups, ${NEW_OPTIONS.length} options, ${TEMPLATES.length} template entries, ${Object.keys(COLOR_HEX_MAP).length} hex codes, ${Object.keys(HELPER_TEXT).length} helper texts)`)
}

// ─────────────────────────────────────────────────────────────────────
// seedMatrixModels, stellt sicher, dass für jedes Modell aus der
// Konfigurator-Matrix mindestens ein Schuh in der Datenbank existiert.
// Idempotent: legt nur fehlende Modelle an, vorhandene bleiben unangetastet.
// ─────────────────────────────────────────────────────────────────────
export function seedMatrixModels(db) {
  // Modelle gemäß User-Matrix mit passender Kategorie
  const MATRIX_MODELS = [
    { name: 'Oxford',             category: 'OXFORD',          price: '€ 1.450', material: 'Lux Calf' },
    { name: 'Whole Cut',          category: 'WHOLECUT',        price: '€ 1.580', material: 'Lux Calf' },
    { name: 'Loafer',             category: 'LOAFER',          price: '€ 1.280', material: 'Lux Calf' },
    { name: 'Derby',              category: 'DERBY',           price: '€ 1.350', material: 'Lux Calf' },
    { name: 'Double Monk',        category: 'DOUBLE_MONK',     price: '€ 1.490', material: 'Lux Calf' },
    { name: 'Chelsea Boot',       category: 'CHELSEA',         price: '€ 1.720', material: 'Lux Calf' },
    { name: 'Balmoral Boot',      category: 'BALMORAL',        price: '€ 1.780', material: 'Lux Calf' },
    { name: 'Jodhpur Boot',       category: 'JODHPUR',         price: '€ 1.620', material: 'Lux Calf' },
    { name: 'Chukka',             category: 'CHUKKA',          price: '€ 1.420', material: 'Lux Calf' },
    { name: 'Belgian Slipper',    category: 'BELGIAN_SLIPPER', price: '€ 1.180', material: 'Lux Calf' },
    { name: 'Wellington',         category: 'WELLINGTON',      price: '€ 1.220', material: 'Lux Calf' },
    { name: 'Drake',              category: 'DRAKE',           price: '€ 1.190', material: 'Lux Calf' },
    { name: 'Mov Flex Sport',     category: 'SNEAKER',         price: '€ 890',   material: 'Lux Suede' },
    { name: 'Mov Flex Sport Laced Boot', category: 'SNEAKER_LACED', price: '€ 950', material: 'Lux Suede' },
    { name: 'Mov Flex Sport Boot', category: 'SNEAKER_BOOT',   price: '€ 920',   material: 'Lux Suede' },
    { name: 'Laceless Trainer',   category: 'LACELESS_TRAINER', price: '€ 850',  material: 'Lux Suede' },
  ]

  // Nur einfügen, was nicht schon (per Name) existiert.
  const exists = db.prepare('SELECT 1 FROM shoes WHERE name = ?')
  const insert = db.prepare(`
    INSERT INTO shoes (name, category, price, material, color, tag, image_data)
    VALUES (?, ?, ?, ?, '#1f2937', NULL, NULL)
  `)
  const skipMatrix = deletedSeedNames(db)
  let added = 0
  for (const m of MATRIX_MODELS) {
    if (skipMatrix.has(m.name)) continue
    if (!exists.get(m.name)) {
      insert.run(m.name, m.category, m.price, m.material)
      added++
    }
  }
  if (added > 0) {
    console.log(`✅ Seeded: ${added} matrix model(s) added (16 total in matrix)`)
  }

  // ── Material-Whitelist pro Kategorie (gemäß Matrix) ────────────────
  const MATRIX_MATERIALS = {
    OXFORD:           ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    WHOLECUT:         ['lux_calf', 'lux_suede', 'painted_full_grain', 'patina', 'box_calf', 'urban_suede', 'painted_calf'],
    LOAFER:           ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    DERBY:            ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    DOUBLE_MONK:      ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    MONK:             ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    CHELSEA:          ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    BOOT:             ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    BALMORAL:         ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    JODHPUR:          ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    CHUKKA:           ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    BELGIAN_SLIPPER:  ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    WELLINGTON:       ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    DRAKE:            ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    SNEAKER:          ['lux_suede'],
    SNEAKER_LACED:    ['lux_suede'],
    SNEAKER_BOOT:     ['lux_suede'],
    LACELESS_TRAINER: ['lux_suede'],
  }

  // Für jeden Schuh ohne shoe_material_options-Einträge die Matrix-
  // Whitelist anwenden. Vorhandene Whitelists bleiben unangetastet
  // (Admin kann pro Schuh feinjustieren).
  const allShoes = db.prepare('SELECT id, category FROM shoes').all()
  const hasOptions = db.prepare('SELECT COUNT(*) c FROM shoe_material_options WHERE shoe_id = ?')
  const insMatOpt = db.prepare('INSERT INTO shoe_material_options (shoe_id, material_key, sort_order) VALUES (?, ?, ?)')
  let matApplied = 0
  for (const s of allShoes) {
    if (hasOptions.get(s.id).c > 0) continue
    const matKeys = MATRIX_MATERIALS[s.category]
    if (!matKeys) continue
    matKeys.forEach((k, i) => { try { insMatOpt.run(s.id, k, i) } catch {} })
    matApplied++
  }

  // Konfigurator-Optionen aus category_templates auf Schuhe übertragen,
  // wenn der Schuh noch keine shoe_options hat. Toe-Gruppe wird
  // bewusst übersprungen (steht nicht in der Matrix).
  const hasShoeOpts = db.prepare('SELECT COUNT(*) c FROM shoe_options WHERE shoe_id = ?')
  const tplRows = db.prepare(`
    SELECT ct.category, ct.option_id, ct.is_default, ct.sort_order, g.key as group_key
    FROM category_templates ct
    JOIN options o ON o.id = ct.option_id
    JOIN option_groups g ON g.id = o.group_id
    WHERE g.key NOT IN ('toe', 'beveled_waist')
  `).all()
  const tplByCat = {}
  for (const r of tplRows) {
    if (!tplByCat[r.category]) tplByCat[r.category] = []
    tplByCat[r.category].push(r)
  }
  const insShoeOpt = db.prepare('INSERT INTO shoe_options (shoe_id, option_id, price_override, is_default, sort_order) VALUES (?, ?, NULL, ?, ?)')
  let optApplied = 0
  for (const s of allShoes) {
    if (hasShoeOpts.get(s.id).c > 0) continue
    const rows = tplByCat[s.category]
    if (!rows) continue
    rows.forEach((r, i) => { try { insShoeOpt.run(s.id, r.option_id, r.is_default, i) } catch {} })
    optApplied++
  }

  console.log(`✅ Seeded: matrix mappings, ${matApplied} shoes got material whitelists, ${optApplied} shoes got option configs`)
}

// ─────────────────────────────────────────────────────────────────────
// seedLoaferVariants, eigenstaendige Loafer-Stilmodelle (Horsebit,
// Tassel, Albert) mit fest gesetzter Ausfuehrung. Der Ausfuehrungs-
// Selektor wird im Frontend ueber shoes.locked_decoration ausgeblendet.
// Idempotent: legt nur an, was per Name noch fehlt; vorhandene Modelle
// werden nur um eine fehlende locked_decoration ergaenzt.
// ─────────────────────────────────────────────────────────────────────
export function seedLoaferVariants(db) {
  const VARIANTS = [
    { name: 'The Horsebit Loafer', deco: 'horsebit', price: '€ 1.320', color: '#3b1f0a', tag: 'NEW',
      material: 'Lux Calf', image: 'https://images.unsplash.com/photo-1616406432452-07bc5938759d?w=600&q=85&fit=crop&auto=format',
      tagline: 'Ikonische Metalltrense.',
      description: 'Der Horsebit-Loafer vereint italienische Lässigkeit mit klassischer Eleganz. Die handgesetzte Metalltrense ist das unverwechselbare Detail, der Rest folgt Ihrer Konfiguration: Leder, Farbe, Sohle und Innenfutter.' },
    { name: 'The Tassel Loafer', deco: 'tassels', price: '€ 1.290', color: '#78350f', tag: null,
      material: 'Lux Calf', image: 'https://images.unsplash.com/photo-1615979474401-8a6a344de5bd?w=600&q=85&fit=crop&auto=format',
      tagline: 'Quasten mit Charakter.',
      description: 'Ein Klassiker der gehobenen Garderobe: der Tassel-Loafer mit fein gearbeiteten Quasten. Zeitlos zum Anzug wie zur Chino, gefertigt aus Ihrem Wunschleder mit durchgenähter Konstruktion.' },
    { name: 'The Albert Loafer', deco: 'albert_mask', price: '€ 1.350', color: '#1c1c1e', tag: null,
      material: 'Lux Calf', image: 'https://images.unsplash.com/photo-1616406432452-07bc5938759d?w=600&q=85&fit=crop&auto=format',
      tagline: 'Verzierte Albert-Maske.',
      description: 'Der Albert-Loafer mit dekorativer Maske auf dem Spann setzt ein elegantes Statement. Abendtauglich und dennoch alltagsfähig, individuell konfiguriert nach Ihren Vorstellungen.' },
  ]
  const findByName = db.prepare('SELECT id, locked_decoration FROM shoes WHERE name = ?')
  const ins = db.prepare(`
    INSERT INTO shoes (name, category, price, material, match_pct, color, tag, image_data, tagline, description, locked_decoration)
    VALUES (?, 'LOAFER', ?, ?, '98.0%', ?, ?, ?, ?, ?, ?)
  `)
  const setDeco = db.prepare("UPDATE shoes SET locked_decoration = ? WHERE id = ? AND (locked_decoration IS NULL OR locked_decoration = '')")
  const skipLoafer = deletedSeedNames(db)
  let created = 0
  for (const v of VARIANTS) {
    if (skipLoafer.has(v.name)) continue
    const existing = findByName.get(v.name)
    if (existing) { setDeco.run(v.deco, existing.id); continue }
    try {
      ins.run(v.name, v.price, v.material, v.color, v.tag, v.image, v.tagline, v.description, v.deco)
      created++
    } catch { /* z. B. fehlende tagline/description-Spalte auf altem Schema */ }
  }
  console.log(`✅ Seeded: Loafer-Stilmodelle, ${created} neu angelegt, ${VARIANTS.length - created} bereits vorhanden`)
}

// ─────────────────────────────────────────────────────────────────────
// seedMatrixTemplatesV2, Hard-Reset der Konfigurator-Vorlagen exakt
// gemäß User-Matrix. Bereinigt veraltete Templates UND wendet sie auf
// alle Schuhe an, deren Name aus den 16 Matrix-Standardmodellen kommt.
// User-spezifische Schuhe (z. B. „The Heritage Oxford") bleiben
// unangetastet.
// ─────────────────────────────────────────────────────────────────────
export function seedMatrixTemplatesV2(db) {
  // Hilfsfunktion: option_id aus (group_key, option_key) holen
  const optId = (gk, ok) => db.prepare(`
    SELECT o.id FROM options o JOIN option_groups g ON g.id = o.group_id
    WHERE g.key = ? AND o.key = ?
  `).get(gk, ok)?.id

  // Helper für vollständige Farb-Sets (Matrix)
  const INNER_FULL  = ['black', 'brown', 'tan', 'beige', 'red', 'orange', 'navy', 'white', 'lila', 'ochre']
  const BOTTOM_FULL = ['black', 'brown', 'cognac', 'dark_red', 'forest_green', 'lila', 'natural', 'orange']
  const SOLE_COLOR_FULL = ['black', 'brown', 'brick', 'natural']
  const LAST_FULL  = ['zurigo', 'monti', 'savile', 'belgravia']
  const HEEL_FULL  = ['standard', 'higher_heel']
  const BUCKLE     = ['square_buckle', 'round_buckle']
  const BUCKLE_COL = ['nickel', 'gold', 'graphite', 'copper']

  // Hilfsfunktion: Liste in TEMPLATES-Entries umwandeln mit Default beim 1.
  const mk = (cat, group, keys) => keys.map((k, i) => [cat, `${group}:${k}`, i === 0 ? 1 : 0])

  // Sohlen-Art (group 'sole') je Kategorie DATENGETRIEBEN aus
  // options.applicable_categories ableiten: eine Sohle gilt, wenn sie '*'
  // ist oder die Kategorie explizit nennt. So bietet jede Kategorie genau
  // die Sohlen-Arten an, die das System für sie freigibt. Erste = Default.
  const soleRows = db.prepare(`
    SELECT o.key, o.applicable_categories AS cats
    FROM options o JOIN option_groups g ON g.id = o.group_id
    WHERE g.key = 'sole'
    ORDER BY o.sort_order ASC, o.id ASC
  `).all()
  const soleForCat = (cat) => {
    const keys = soleRows
      .filter(r => r.cats === '*' || r.cats.split(',').map(s => s.trim()).includes(cat))
      .map(r => r.key)
    return keys.map((k, i) => [cat, `sole:${k}`, i === 0 ? 1 : 0])
  }

  // Vollständige Matrix-Templates pro Schuhkategorie
  const M = {
    OXFORD: [
      ...mk('OXFORD', 'last', LAST_FULL),
      ...mk('OXFORD', 'heel', HEEL_FULL),
      ...mk('OXFORD', 'welt', ['city', 'country', 'storm']),
      ...soleForCat('OXFORD'),
      ...mk('OXFORD', 'sole_color', SOLE_COLOR_FULL),
      ...mk('OXFORD', 'inner_color', INNER_FULL),
      ...mk('OXFORD', 'sole_bottom_color', BOTTOM_FULL),
    ],
    WHOLECUT: [
      ...mk('WHOLECUT', 'last', LAST_FULL),
      ...mk('WHOLECUT', 'wholecut_base', ['plain', 'punched_cap', 'full_punched']),
      ...mk('WHOLECUT', 'heel', HEEL_FULL),
      ...soleForCat('WHOLECUT'),
      ...mk('WHOLECUT', 'sole_color', SOLE_COLOR_FULL),
      ...mk('WHOLECUT', 'welt', ['city', 'country', 'storm']),
      ...mk('WHOLECUT', 'inner_color', INNER_FULL),
      ...mk('WHOLECUT', 'sole_bottom_color', BOTTOM_FULL),
    ],
    LOAFER: [
      ...mk('LOAFER', 'last', LAST_FULL),
      ...mk('LOAFER', 'heel', HEEL_FULL),
      ...mk('LOAFER', 'loafer_decoration', ['ohne', 'tassels', 'albert_tassels', 'albert_mask', 'horsebit']),
      ...soleForCat('LOAFER'),
      ...mk('LOAFER', 'sole_color', SOLE_COLOR_FULL),
      ...mk('LOAFER', 'welt', ['city', 'country', 'storm']),
      ...mk('LOAFER', 'inner_color', INNER_FULL),
      ...mk('LOAFER', 'sole_bottom_color', BOTTOM_FULL),
    ],
    DERBY: [
      ...mk('DERBY', 'last', LAST_FULL),
      ...mk('DERBY', 'heel', HEEL_FULL),
      ...soleForCat('DERBY'),
      ...mk('DERBY', 'sole_color', SOLE_COLOR_FULL),
      ...mk('DERBY', 'welt', ['city', 'storm']), // Matrix: nur City + Storm
      ...mk('DERBY', 'inner_color', INNER_FULL),
      ...mk('DERBY', 'sole_bottom_color', BOTTOM_FULL),
    ],
    DOUBLE_MONK: [
      ...mk('DOUBLE_MONK', 'last', LAST_FULL),
      ...mk('DOUBLE_MONK', 'heel', HEEL_FULL),
      ...soleForCat('DOUBLE_MONK'),
      ...mk('DOUBLE_MONK', 'sole_color', SOLE_COLOR_FULL),
      ...mk('DOUBLE_MONK', 'welt', ['city', 'country', 'storm']),
      ...mk('DOUBLE_MONK', 'buckle', BUCKLE),
      ...mk('DOUBLE_MONK', 'buckle_color', BUCKLE_COL),
      ...mk('DOUBLE_MONK', 'inner_color', INNER_FULL),
      ...mk('DOUBLE_MONK', 'sole_bottom_color', BOTTOM_FULL),
    ],
    // Monk identisch zu Double Monk (eine Schnalle, sonst gleich)
    MONK: [
      ...mk('MONK', 'last', LAST_FULL),
      ...mk('MONK', 'heel', HEEL_FULL),
      ...soleForCat('MONK'),
      ...mk('MONK', 'sole_color', SOLE_COLOR_FULL),
      ...mk('MONK', 'welt', ['city', 'country', 'storm']),
      ...mk('MONK', 'buckle', BUCKLE),
      ...mk('MONK', 'buckle_color', BUCKLE_COL),
      ...mk('MONK', 'inner_color', INNER_FULL),
      ...mk('MONK', 'sole_bottom_color', BOTTOM_FULL),
    ],
    // Stiefel-Familie (Last + Sohlen-Art + Farben pro Matrix)
    CHELSEA:  [...mk('CHELSEA',  'last', LAST_FULL), ...soleForCat('CHELSEA'),  ...mk('CHELSEA',  'inner_color', INNER_FULL), ...mk('CHELSEA',  'sole_bottom_color', INNER_FULL)],
    BOOT:     [...mk('BOOT',     'last', LAST_FULL), ...soleForCat('BOOT'),     ...mk('BOOT',     'inner_color', INNER_FULL), ...mk('BOOT',     'sole_bottom_color', INNER_FULL)],
    BALMORAL: [...mk('BALMORAL', 'last', LAST_FULL), ...soleForCat('BALMORAL'), ...mk('BALMORAL', 'inner_color', INNER_FULL), ...mk('BALMORAL', 'sole_bottom_color', INNER_FULL)],
    JODHPUR:  [...mk('JODHPUR',  'last', LAST_FULL), ...soleForCat('JODHPUR'),  ...mk('JODHPUR',  'inner_color', INNER_FULL), ...mk('JODHPUR',  'sole_bottom_color', INNER_FULL)],
    CHUKKA:   [...mk('CHUKKA',   'last', LAST_FULL), ...soleForCat('CHUKKA'),   ...mk('CHUKKA',   'inner_color', INNER_FULL), ...mk('CHUKKA',   'sole_bottom_color', INNER_FULL)],
    // Slipper-Familie (Accessoires + Sohlen-Art + Innen)
    BELGIAN_SLIPPER: [
      ...mk('BELGIAN_SLIPPER', 'loafer_decoration', ['ohne', 'tassels', 'bow']),
      ...soleForCat('BELGIAN_SLIPPER'),
      ...mk('BELGIAN_SLIPPER', 'inner_color', INNER_FULL),
    ],
    WELLINGTON: [
      ...mk('WELLINGTON', 'loafer_decoration', ['ohne', 'tassels', 'albert_tassels', 'albert_mask', 'horsebit']),
      ...soleForCat('WELLINGTON'),
      ...mk('WELLINGTON', 'inner_color', INNER_FULL),
    ],
    DRAKE: [
      ...mk('DRAKE', 'loafer_decoration', ['ohne', 'tassels', 'albert_tassels', 'albert_mask', 'horsebit']),
      ...soleForCat('DRAKE'),
      ...mk('DRAKE', 'inner_color', INNER_FULL),
    ],
    // Sneaker-Familie (nur Farbe innen + Sohle weiß)
    SNEAKER:          [...mk('SNEAKER',          'inner_color', INNER_FULL), ['SNEAKER',          'sole_bottom_color:white', 1]],
    SNEAKER_LACED:    [...mk('SNEAKER_LACED',    'inner_color', INNER_FULL), ['SNEAKER_LACED',    'sole_bottom_color:white', 1]],
    SNEAKER_BOOT:     [...mk('SNEAKER_BOOT',     'inner_color', INNER_FULL), ['SNEAKER_BOOT',     'sole_bottom_color:white', 1]],
    LACELESS_TRAINER: [...mk('LACELESS_TRAINER', 'inner_color', INNER_FULL), ['LACELESS_TRAINER', 'sole_bottom_color:white', 1]],
  }

  // 1) Templates ersetzen — aber nur die Kategorien, die diese Matrix führt.
  //
  // Hier stand `DELETE FROM category_templates` ohne Bedingung. Das war
  // richtig, solange die Matrix alles war, was es gab: Sie ist für ihre
  // Kategorien die maßgebliche Quelle und baut sie bei jedem Start neu auf.
  //
  // Mit dem Mokassin gibt es die erste Kategorie außerhalb der Matrix. Ihre
  // Vorlage wurde von diesem DELETE beim zweiten Start mitgenommen — beim
  // ersten Lauf war sie noch da (der Mokassin-Seed läuft später), beim
  // zweiten war sie weg, und der Mokassin-Seed hatte sich in den
  // Einstellungen bereits als erledigt vermerkt. Ergebnis: eine leere
  // Kategorie-Vorlage, die niemand wieder aufbaut.
  //
  // Was die Matrix nicht kennt, räumt sie deshalb auch nicht ab.
  const gefuehrteKategorien = Object.keys(M)
  db.prepare(
    `DELETE FROM category_templates WHERE category IN (${gefuehrteKategorien.map(() => '?').join(',')})`
  ).run(...gefuehrteKategorien)
  const insTpl = db.prepare(`
    INSERT INTO category_templates (category, option_id, is_default, sort_order)
    VALUES (?, ?, ?, ?)
  `)
  let inserted = 0
  for (const [cat, rows] of Object.entries(M)) {
    rows.forEach((entry, i) => {
      const [c, ref, isDef] = entry
      const [gk, ok] = ref.split(':')
      const oid = optId(gk, ok)
      if (oid) {
        insTpl.run(c, oid, isDef ? 1 : 0, i)
        inserted++
      }
    })
  }

  // 2) Für alle 16 Matrix-Standardmodelle (exakter Name) Force-Re-Apply
  const MATRIX_NAMES = [
    'Oxford', 'Whole Cut', 'Loafer', 'Derby', 'Double Monk',
    'Chelsea Boot', 'Balmoral Boot', 'Jodhpur Boot', 'Chukka',
    'Belgian Slipper', 'Wellington', 'Drake',
    'Mov Flex Sport', 'Mov Flex Sport Laced Boot', 'Mov Flex Sport Boot', 'Laceless Trainer',
  ]
  const findShoe = db.prepare('SELECT id, category FROM shoes WHERE name = ?')
  const clearOpts = db.prepare('DELETE FROM shoe_options WHERE shoe_id = ?')
  const tplsForCat = (cat) => db.prepare(`
    SELECT option_id, is_default, sort_order
    FROM category_templates
    WHERE category = ?
    ORDER BY sort_order ASC
  `).all(cat)
  const insSO = db.prepare(`
    INSERT INTO shoe_options (shoe_id, option_id, price_override, is_default, sort_order)
    VALUES (?, ?, NULL, ?, ?)
  `)
  let resetCount = 0
  for (const name of MATRIX_NAMES) {
    const shoe = findShoe.get(name)
    if (!shoe) continue
    clearOpts.run(shoe.id)
    const tpl = tplsForCat(shoe.category)
    tpl.forEach(r => { try { insSO.run(shoe.id, r.option_id, r.is_default, r.sort_order) } catch {} })
    resetCount++
  }

  // 3) ALLE Schuhe ohne shoe_options bekommen jetzt, mit den korrigierten
  //    Matrix-Templates, automatisch eine Konfiguration anhand ihrer
  //    Kategorie. So profitieren auch User-Schuhe wie „The Heritage Oxford"
  //    von der Matrix.
  const allShoes = db.prepare('SELECT id, category FROM shoes').all()
  const hasShoeOpts = db.prepare('SELECT COUNT(*) c FROM shoe_options WHERE shoe_id = ?')
  let fillCount = 0
  for (const s of allShoes) {
    if (hasShoeOpts.get(s.id).c > 0) continue
    const rows = tplsForCat(s.category)
    if (!rows.length) continue
    rows.forEach(r => { try { insSO.run(s.id, r.option_id, r.is_default, r.sort_order) } catch {} })
    fillCount++
  }

  // 4) Material-Whitelist: alle Schuhe mit leerer shoe_material_options
  //    bekommen die Matrix-Whitelist gemäß Kategorie. Existierende
  //    Whitelists bleiben unangetastet (Admin-Customization respektiert).
  const MATRIX_MATERIALS_V2 = {
    OXFORD:           ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    WHOLECUT:         ['lux_calf', 'lux_suede', 'painted_full_grain', 'patina', 'box_calf', 'urban_suede', 'painted_calf'],
    LOAFER:           ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    DERBY:            ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    DOUBLE_MONK:      ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    MONK:             ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    CHELSEA:          ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    BOOT:             ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    BALMORAL:         ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    JODHPUR:          ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    CHUKKA:           ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    BELGIAN_SLIPPER:  ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    WELLINGTON:       ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    DRAKE:            ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    SNEAKER:          ['lux_suede'],
    SNEAKER_LACED:    ['lux_suede'],
    SNEAKER_BOOT:     ['lux_suede'],
    LACELESS_TRAINER: ['lux_suede'],
  }
  // Force-Reset Material-Whitelist auch für MATRIX_NAMES-Schuhe, damit
  // falsche Velvet/Patina-Einträge auf Oxford raus sind.
  const clearMatOpt = db.prepare('DELETE FROM shoe_material_options WHERE shoe_id = ?')
  const insMatOptV2 = db.prepare('INSERT INTO shoe_material_options (shoe_id, material_key, sort_order) VALUES (?, ?, ?)')
  let matResetCount = 0
  for (const name of MATRIX_NAMES) {
    const shoe = findShoe.get(name)
    if (!shoe) continue
    const keys = MATRIX_MATERIALS_V2[shoe.category]
    if (!keys) continue
    clearMatOpt.run(shoe.id)
    keys.forEach((k, i) => { try { insMatOptV2.run(shoe.id, k, i) } catch {} })
    matResetCount++
  }
  // Fill-if-empty für alle anderen Schuhe
  const hasMatOpts = db.prepare('SELECT COUNT(*) c FROM shoe_material_options WHERE shoe_id = ?')
  let matFillCount = 0
  for (const s of allShoes) {
    if (hasMatOpts.get(s.id).c > 0) continue
    const keys = MATRIX_MATERIALS_V2[s.category]
    if (!keys) continue
    keys.forEach((k, i) => { try { insMatOptV2.run(s.id, k, i) } catch {} })
    matFillCount++
  }

  // 5) AGGRESSIVES FORCE-RESET: alle Schuhe, deren Kategorie in der Matrix
  //    steht, bekommen ihre shoe_options + shoe_material_options KOMPLETT
  //    neu aus der Matrix gesetzt. Wischt vorherige (falsche) Einträge
  //    weg. Notwendig, weil ältere Seed-Läufe schon falsche Templates
  //    angewendet haben können. Admin-Customizations werden überschrieben
  //    (User-Wunsch: Matrix ist Single Source of Truth).
  //
  //    Die Express-Linie bleibt außen vor. Ihre Modelle sind bewusst enger
  //    geschnitten — ein Leder, ausgewählte Gruppen —, und dieses Force-Reset
  //    setzte ihnen bei JEDEM Neustart die volle Matrix zurück. Der Kunde sah
  //    daraufhin sechs Lederarten an einem Schuh, für den nur eines
  //    vorbereitet vorliegt. Aufgefallen ist es erst, als die Familienwahl
  //    („Aesthetic oder Durable") an einem Modell auftauchte, an dem es
  //    nichts zu wählen gibt.
  const matrixCats = Object.keys(MATRIX_MATERIALS_V2)
  const matrixCatsPlaceholders = matrixCats.map(() => '?').join(',')
  const shoesWithMatrixCat = db.prepare(
    `SELECT id, category, name FROM shoes
     WHERE category IN (${matrixCatsPlaceholders}) AND collection = 'standard'`
  ).all(...matrixCats)

  let forceResetCount = 0
  for (const s of shoesWithMatrixCat) {
    // shoe_options reset
    clearOpts.run(s.id)
    const tpl = tplsForCat(s.category)
    tpl.forEach(r => { try { insSO.run(s.id, r.option_id, r.is_default, r.sort_order) } catch {} })
    // material whitelist reset
    const keys = MATRIX_MATERIALS_V2[s.category]
    if (keys) {
      clearMatOpt.run(s.id)
      keys.forEach((k, i) => { try { insMatOptV2.run(s.id, k, i) } catch {} })
    }
    forceResetCount++
  }

  console.log(`✅ Seeded: matrix templates V2, ${inserted} tpl rows, ${resetCount} matrix shoes reset, ${fillCount} empty shoes filled, ${matResetCount} matrix material whitelists reset, ${matFillCount} empty material whitelists filled, ${forceResetCount} TOTAL force-reset by category`)
}

// ─────────────────────────────────────────────────────────────────────
// seedLastSizeChart, Passform-Maßtabelle (Leisten × Weite × Größe →
// Fußlänge + Ballenumfang in mm), 1:1 aus den Hersteller-Tabellen.
//
// Aufbau (alle Reihen sind arithmetisch):
//  • Fußlänge je Größe ist über alle Herren-Leisten identisch (eigene Reihe für
//    Damen), daher als exakte Arrays hinterlegt (FOOT_MEN/FOOT_LADIES).
//  • Ballenumfang steigt +2,25 mm je Halbgröße (= +4,5 je ganze Größe); je
//    Leisten×Weite ist nur der Anker an der Referenzgröße nötig
//    (Herren-Ref = EU42, Damen-Ref = EU39).
//  • Penny Loafer: nur US-Größen, eigene Werte.
//
// Versioniert: bei Versionssprung wird die Tabelle einmalig autoritativ neu
// aufgebaut (DELETE + Insert); danach bleiben CMS-Edits über Deploys erhalten.
// ─────────────────────────────────────────────────────────────────────
export const LAST_SIZE_CHART_VERSION = '2'
const GIRTH_STEP = 2.25
const round1 = (n) => Math.round(n * 10) / 10

// EU-Halbgrößen-Raster + exakte Fußlängen (mm) aus der Tabelle.
const EU_MEN = ['38','38.5','39','39.5','40','40.5','41','41.5','42','42.5','43','43.5','44','44.5','45','45.5','46','46.5','47','47.5','48','48.5','49','49.5','50']
const FOOT_MEN = [238.4,241.7,245.0,248.4,251.7,255.0,258.3,261.7,265.0,268.3,271.7,275.0,278.3,281.7,285.0,288.3,291.6,295.0,298.3,301.6,305.0,308.3,311.6,315.0,318.3]
const EU_LADIES = ['35','35.5','36','36.5','37','37.5','38','38.5','39','39.5','40','40.5','41','41.5','42']
const FOOT_LADIES = [226.7,230.0,233.3,236.7,240.0,243.3,246.7,250.0,253.3,256.7,260.0,263.3,266.6,270.0,273.3]

// Penny Loafer, nur US-Größen. [US-Label, foot_length, ball_girth]
const PENNY_US = [
  ['7', 256.5, 242.7], ['8', 260.8, 245.9], ['9', 265.0, 249.1],
  ['10', 273.5, 255.5], ['11', 282.0, 261.8], ['12', 290.4, 268.2],
  ['13', 298.9, 274.5], ['14', 307.4, 280.9], ['15', 315.9, 287.3],
]

// Spec je Leiste. widths: [width, anchorGirthAtRef, optionalRange]
// optionalRange überschreibt den Default-Bereich (Herren 38 bis 50, Damen 35 bis 42).
const LAST_CHART_SPEC = [
  // Herren, Dress-Leisten (D/EE/EEE)
  { key: 'monti',     gender: 'men', widths: [['D', 246.0], ['EE', 255.0], ['EEE', 268.5]] },
  { key: 'zurigo',    gender: 'men', widths: [['D', 250.0], ['EE', 259.0], ['EEE', 272.5]] },
  { key: 'savile',    gender: 'men', widths: [['D', 244.5], ['EE', 253.5], ['EEE', 267.0]] },
  { key: 'belgravia', gender: 'men', widths: [['D', 248.0], ['EE', 257.0]] },
  // Herren, Modell-spezifische Leisten
  { key: 'wellington', gender: 'men', widths: [['D', 244.0], ['EE', 253.0]] },
  { key: 'drake',      gender: 'men', widths: [['D', 245.0]] },
  { key: 'venetian',   gender: 'men', widths: [['D', 247.0]] },
  { key: 'drivers',    gender: 'men', range: ['38', '48'], widths: [['D', 246.0]] },
  { key: 'sneaker',    gender: 'men', fullOnly: true, widths: [['D', 248.0, ['38', '49']], ['EE', 257.0, ['39', '49']]] },
  { key: 'moc_sport',  gender: 'men', range: ['39', '46'], widths: [['D', 244.0]] },
  { key: 'chunky',     gender: 'men', range: ['39', '48'], widths: [['D', 250.0], ['EE', 259.0]] },
  // Damen-Leisten (noch keiner Kategorie zugeordnet, nur Daten/CMS)
  { key: 'audrey_rose', gender: 'ladies', widths: [['D', 224.0]] },
  { key: 'chenoa',      gender: 'ladies', widths: [['D', 225.0]] },
  { key: 'carola',      gender: 'ladies', fullOnly: true, widths: [['D', 230.0]] },
]

// Baut alle Zeilen exakt nach Spec (deterministisch, für Seed + Reset).
export function buildLastSizeChartRows() {
  const rows = []
  for (const spec of LAST_CHART_SPEC) {
    const ladies = spec.gender === 'ladies'
    const grid = ladies ? EU_LADIES : EU_MEN
    const foot = ladies ? FOOT_LADIES : FOOT_MEN
    const refIdx = grid.indexOf(ladies ? '39' : '42')
    const defRange = spec.range || (ladies ? ['35', '42'] : ['38', '50'])
    for (const [width, anchor, wRange] of spec.widths) {
      const range = wRange || defRange
      const startIdx = grid.indexOf(range[0])
      const endIdx = grid.indexOf(range[1])
      for (let i = startIdx; i <= endIdx; i++) {
        const label = grid[i]
        if (spec.fullOnly && label.includes('.5')) continue
        rows.push({
          last_key: spec.key, width, size_system: 'EU', size_label: label,
          foot_length_mm: foot[i], ball_girth_mm: round1(anchor + (i - refIdx) * GIRTH_STEP),
        })
      }
    }
  }
  for (const [label, len, girth] of PENNY_US) {
    rows.push({ last_key: 'penny_loafer', width: 'D', size_system: 'US', size_label: label, foot_length_mm: len, ball_girth_mm: girth })
  }
  return rows
}

// Autoritativer (Re-)Aufbau: leert die Tabelle und spielt alle Zeilen neu ein.
// Wird vom Seed (Versionssprung) und vom CMS-Reset-Endpoint genutzt.
export function applyLastSizeChartSeed(db) {
  const rows = buildLastSizeChartRows()
  const del = db.prepare('DELETE FROM last_size_chart')
  const ins = db.prepare(`
    INSERT INTO last_size_chart
      (last_key, width, size_system, size_label, foot_length_mm, ball_girth_mm)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  db.transaction(() => {
    del.run()
    for (const r of rows) ins.run(r.last_key, r.width, r.size_system, r.size_label, r.foot_length_mm, r.ball_girth_mm)
  })()
  return rows.length
}

function seedLastSizeChart(db) {
  const cur = db.prepare("SELECT value FROM settings WHERE key = 'last_size_chart_seed_version'").get()
  if (cur?.value === LAST_SIZE_CHART_VERSION) return  // aktuell, CMS-Edits bewahren
  const n = applyLastSizeChartSeed(db)
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES ('last_size_chart_seed_version', ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(LAST_SIZE_CHART_VERSION)
  console.log(`✅ Seeded: last_size_chart autoritativ neu aufgebaut → v${LAST_SIZE_CHART_VERSION} (${n} Zeilen)`)
}

// Kategorie → verfügbare Leisten (für den Matcher). Dress-Modelle nutzen die
// 4 Dress-Leisten; Modell-spezifische Kategorien ihre eigenen.
export const CATEGORY_LASTS = {
  OXFORD:           ['monti', 'zurigo', 'savile', 'belgravia'],
  WHOLECUT:         ['monti', 'zurigo', 'savile', 'belgravia'],
  DERBY:            ['monti', 'zurigo', 'savile'],
  MONK:             ['monti', 'zurigo', 'savile'],
  DOUBLE_MONK:      ['monti', 'zurigo', 'savile'],
  CHELSEA:          ['zurigo', 'savile', 'belgravia'],
  BOOT:             ['zurigo', 'savile'],
  BALMORAL:         ['zurigo', 'savile', 'belgravia'],
  JODHPUR:          ['zurigo', 'savile'],
  CHUKKA:           ['zurigo', 'savile'],
  LOAFER:           ['venetian', 'penny_loafer', 'drivers'],
  BELGIAN_SLIPPER:  ['drivers', 'venetian'],
  // Der Mokassin läuft nur auf dem Drivers-Leisten — der einzige, der die
  // Machart trägt. Die Maßtabelle führt ihn bereits (EU 38 bis 48, Weite D).
  MOCCASIN:         ['drivers'],
  WELLINGTON:       ['wellington'],
  DRAKE:            ['drake'],
  SNEAKER:          ['sneaker', 'moc_sport', 'chunky'],
  SNEAKER_LACED:    ['sneaker', 'chunky'],
  SNEAKER_BOOT:     ['sneaker', 'chunky'],
  LACELESS_TRAINER: ['moc_sport', 'sneaker'],
}

// ── FAQ-Standardeinträge ──────────────────────────────────────────────────
// Idempotent: fügt jede Frage nur ein, wenn sie noch nicht existiert.
// Erklärt die Passform (Fußlänge + Ballenumfang) sowie Produktion/Umtausch,
// damit diese Details nicht prominent auf jeder Seite stehen müssen.
function seedFaqs(db) {
  const FAQS = [
    { q: 'Woher wisst ihr, welche Größe und Passform ich brauche?',
      a: 'Wir fertigen jeden Schuh anhand von zwei Maßen: Ihrer Fußlänge und Ihrem Ballenumfang. Daraus bestimmen wir Länge und Weite automatisch, sodass der Schuh dem Fuß ein passendes Bett gibt. Sie wählen keine Konfektionsgröße; die richtige Passform ermitteln wir für Sie.',
      category: 'Passform', sort_order: 0 },
    { q: 'Wie messe ich Fußlänge und Ballenumfang richtig?',
      a: 'Fußlänge: Stellen Sie sich auf ein Blatt Papier und messen Sie vom äußersten Fersenpunkt bis zur längsten Zehe. Ballenumfang: Legen Sie ein Maßband einmal um den breitesten Teil des Vorfußes (über den Ballen). Messen Sie beide Füße und geben Sie die Werte in Millimetern in der Kollektion unter „Passform" ein.',
      category: 'Passform', sort_order: 1 },
    { q: 'Was ist, wenn meine Füße unterschiedlich groß sind?',
      a: 'Das ist völlig normal. Geben Sie beide Füße getrennt an. Für die Fertigung verwenden wir den jeweils größeren Wert, damit nichts drückt.',
      category: 'Passform', sort_order: 2 },
    { q: 'Wie lange dauert die Produktion?',
      a: 'Da wir jedes Paar einzeln auf Bestellung in unserer Manufaktur in Spanien fertigen, dauert die Produktion bei Firmenbestellungen rund 8 Wochen. Die genaue Lieferzeit nennen wir Ihnen mit der Bestellbestätigung.',
      category: 'Bestellung & Produktion', sort_order: 3 },
    { q: 'Kann ich umtauschen, wenn die Passform nicht stimmt?',
      a: 'Da jeder Schuh individuell nach Ihren Maßen gefertigt wird, ist ein klassischer Größentausch nicht nötig. Sollte dennoch etwas nicht passen, melden Sie sich bei uns; wir finden gemeinsam eine Lösung.',
      category: 'Bestellung & Produktion', sort_order: 4 },
    { q: 'Was bedeutet Custom Made bei Artisan Sole?',
      a: 'Custom made heißt: kein Schuh von der Stange. Wir fertigen Ihr Paar custom-made und erst auf Bestellung, abgestimmt auf Ihre Maße und Ihre Konfiguration aus Leder, Farbe und Sohle.',
      category: 'Bestellung & Produktion', sort_order: 5 },
    { q: 'Wie nachhaltig wird produziert?',
      a: 'Wir fertigen jedes Paar erst, nachdem Sie bestellt haben (made to order). Dadurch entsteht keine Überproduktion und kein Lagerüberschuss: Jeder Schuh wird gezielt für einen Kunden gefertigt.',
      category: 'Bestellung & Produktion', sort_order: 6 },
    { q: 'Wie lange dauert es, bis mein Schuh bei mir ist?',
      a: 'In der Regel rund 4 Wochen nach Zahlungseingang, von der Produktion bis zur Lieferung zu Ihnen. Da wir custom-made und erst auf Bestellung fertigen, gibt es keine Lagerhaltung.',
      category: 'Bestellung & Produktion', sort_order: 7 },
    { q: 'Wie lösche ich mein Konto?',
      a: 'Schreiben Sie uns über den Nachrichtenbereich in der App (das Sprechblasen-Symbol oben) oder an kontakt@artisansole.com. Wir sperren Ihr Konto daraufhin sofort und löschen es nach dreißig Tagen endgültig. Die Frist ist Ihre Sicherheit: Überlegen Sie es sich anders, holen wir das Konto mit allen Bestellungen zurück. Auf ausdrücklichen Wunsch löschen wir auch sofort. Dasselbe gilt für Firmen- und Affiliate-Konten.',
      category: 'Konto & Daten', sort_order: 20 },
    { q: 'Was passiert mit meinen Fußmaßen, wenn ich mein Konto lösche?',
      a: 'Ihre Maße und Passformen werden mit dem Konto gelöscht. Was bleibt, sind anonymisierte Maß- und Formdaten, mit denen wir unser Passform-Verfahren weiterentwickeln — ohne Namen, Anschrift, E-Mail oder irgendeine Kennung, über die sich ein Bezug zu Ihnen herstellen ließe. Sie sind damit keine personenbezogenen Daten mehr und lassen sich Ihnen auch nicht wieder zuordnen.',
      category: 'Konto & Daten', sort_order: 21 },
    { q: 'Bleiben meine Bestellungen nach der Löschung erhalten?',
      a: 'Die Bestellungen selbst ja — sie unterliegen handels- und steuerrechtlichen Aufbewahrungsfristen und dürfen nicht mit dem Konto verschwinden. Ihre Verbindung zu Ihnen verlieren sie aber: Anschrift, Maße und Notizen werden entfernt. Was bleibt, ist eine Bestellung ohne Person dahinter.',
      category: 'Konto & Daten', sort_order: 22 },
    { q: 'Wie genau ist die Passform?',
      a: 'Nach der Vermessung Ihres Fußes wählen wir aus hunderten Leisten die exakt passende aus. So erreichen wir eine Passform von bis zu 100 % auf den Fuß, ganz ohne klassische Konfektionsgröße.',
      category: 'Passform', sort_order: 8 },
  ]
  const exists = db.prepare('SELECT 1 FROM faqs WHERE question = ? LIMIT 1')
  const ins = db.prepare('INSERT INTO faqs (question, answer, category, sort_order) VALUES (?, ?, ?, ?)')
  let added = 0
  for (const f of FAQS) {
    if (!exists.get(f.q)) { ins.run(f.q, f.a, f.category, f.sort_order); added++ }
  }
  if (added) console.log(`✅ Seeded: ${added} FAQ-Einträge`)
}

// ── Einmalige, idempotente Bereinigung bestehender DB-Texte ────────────────
// Stellt bereits geseedete Inhalte (E-Mail-Templates, Konfigurator-Optionen,
// Artikel, FAQ, Material-/Farb-Tipps) auf die neue Sprache um: "Maßschuh/
// Maßanfertigung/Bespoke" → "Custom Made", Lieferzeit → "ca. 4 Wochen nach
// Zahlungseingang" und entfernt Gedankenstriche. "maßgefertigt" bleibt.
// Achtung: überschreibt entsprechende Stellen auch bei manuellen CMS-Edits.
function cleanLegacyText(s, isSubject) {
  if (s == null) return s
  return String(s)
    .replace(/Maßschuhmacherei/g, 'Schuhmacherkunst')
    .replace(/Maßschuhen/g, 'Schuhen')
    .replace(/Maßschuhe/g, 'Schuhe')
    .replace(/Maßschuh\b/g, 'Custom-made Schuh')
    .replace(/Maßanfertigungen/g, 'Custom-Made-Anfertigungen')
    .replace(/Maßanfertigung/g, 'Custom Made')
    .replace(/Bespoke Footwear/g, 'Custom Made Footwear')
    .replace(/Bespoke/g, 'Custom Made')
    .replace(/6\s*[–-]\s*8\s*Wochen/g, 'ca. 4 Wochen nach Zahlungseingang')
    .replace(/(\d)\s*–\s*(\d)/g, '$1 bis $2')
    .replace(/\s[–—]\s/g, isSubject ? ' · ' : ', ')
}

function cleanupLegacyWording(db) {
  const TARGETS = [
    { table: 'email_templates', pk: 'type', cols: ['name', 'description', 'subject', 'intro', 'body'], subjectCols: ['subject'] },
    { table: 'faqs',            pk: 'id',   cols: ['question', 'answer'] },
    { table: 'options',         pk: 'id',   cols: ['label', 'description'] },
    { table: 'shoe_materials',  pk: 'id',   cols: ['label', 'sub', 'tip'] },
    { table: 'shoe_colors',     pk: 'id',   cols: ['name', 'tip', 'pairs_with'] },
  ]
  let changed = 0
  const tableExists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")
  for (const t of TARGETS) {
    if (!tableExists.get(t.table)) continue
    const rows = db.prepare(`SELECT ${t.pk}, ${t.cols.join(', ')} FROM ${t.table}`).all()
    const setSql = t.cols.map(c => `${c} = ?`).join(', ')
    const upd = db.prepare(`UPDATE ${t.table} SET ${setSql} WHERE ${t.pk} = ?`)
    db.transaction(() => {
      for (const row of rows) {
        const next = t.cols.map(c => cleanLegacyText(row[c], (t.subjectCols || []).includes(c)))
        if (next.some((v, i) => v !== row[t.cols[i]])) {
          upd.run(...next, row[t.pk])
          changed++
        }
      }
    })()
  }
  if (changed) console.log(`✅ Bereinigt: ${changed} DB-Texte (Custom-Made-Wording, keine Gedankenstriche)`)
}

// ── Modellbeschreibungen ─────────────────────────────────────────────────────
//
// Bis hierher trug jede Produktseite denselben Satz, nur mit eingesetztem
// Namen: „Jeder <Modell> wird in unserer Manufaktur von Hand gefertigt …".
// Er stimmt für alle und sagt deshalb über keines etwas aus. Ein Kunde, der
// zwischen Oxford und Derby schwankt, findet dort nichts, was ihm die
// Entscheidung abnimmt.
//
// Deshalb zwei Ebenen: ein eigener Text je Modell und, wo keiner hinterlegt
// ist, einer je Machart. Auch ein erst im CMS angelegtes Modell bekommt so
// etwas Zutreffendes statt der Schablone.
//
// Der Ton ist bewusst erklärend statt anpreisend — was ein Schuh ist, überzeugt
// mehr als das Versprechen, dass er gut sei.
//
// Geschrieben wird ausschließlich in leere Felder. Was in der Verwaltung
// eingetragen wurde, bleibt unangetastet — auch nach jedem weiteren Ausrollen.
// (Nebenwirkung, dieselbe wie beim Zubehör: Wer ein Feld absichtlich leert, um
// den Standardtext zurückzuholen, findet nach dem nächsten Ausrollen wieder den
// Text von hier vor.)

const MODELL_BESCHREIBUNGEN = {
  'heritage oxford':
    'Der Oxford trägt seine Schnürung geschlossen: Die Laschen sind unter dem Blatt vernäht, dadurch liegt der Schaft glatt am Fuß und die Linie bleibt ruhig. Vollnarbiges Kalbsleder ist die dichteste Schicht der Haut — es nimmt mit den Jahren die Bewegung Ihres Fußes an, statt sich abzunutzen. Ein Paar, das Sie nicht ersetzen, sondern begleiten werden.',
  'balmoral cap-toe':
    'Die umlaufende Naht über dem Rist gibt dem Balmoral seine klare Zäsur, die Kappe darüber fasst die Spitze. Shell Cordovan stammt aus einer besonders dichten Lederschicht: Es knittert nicht, es legt sich in weiche Wellen und gewinnt dabei an Tiefe. Ein Schuh für die Anlässe, an die Sie sich später erinnern.',
  'riviera loafer':
    'Ein Loafer kommt ohne Schnürung aus — er hält allein über die Passform, weshalb an ihm nichts ungefähr sein darf. Genau dafür nehmen wir Ihre Maße. Weiches Nubuk nimmt dem Auftritt die Strenge und macht ihn leicht: für Tage, an denen Sorgfalt nicht nach Anstrengung aussehen soll.',
  'venetian penny':
    'Der Penny trägt einen schmalen Riegel über dem Blatt, sonst nichts — der venezianische Schnitt verzichtet auf jede weitere Zutat. Brüniertes Kalbsleder wird an Spitze und Ferse von Hand nachgedunkelt, dadurch bekommt die Farbe Tiefe statt Fläche. Ein Schuh, der leiser spricht und länger bleibt.',
  'monaco derby':
    'Beim Derby sitzen die Schnürlaschen offen auf dem Blatt: Das gibt dem Spann Raum und macht den Schuh auch für kräftigere Füße bequem. Lackleder fängt das Licht des Abends ein, ohne aufdringlich zu werden. Für den festlichen Auftritt, der Ihnen leichtfallen darf.',
  'brogue derby':
    'Die Lochmuster des Brogue stammen aus dem irischen Hochland, wo sie das Wasser aus dem Leder ließen; heute sind sie Zierde und brechen die Strenge der Form auf. Genarbtes Leder verzeiht Regen und Alltag, ohne müde zu wirken. Ein Begleiter, der schöner wird, je öfter Sie ihn tragen.',
  'chelsea boot':
    'Der Chelsea hat keinen Verschluss — zwei elastische Einsätze halten ihn, ein Zug an der hinteren Lasche genügt. Cognacfarbenes Cordovan gibt dem knappen Schaft Wärme und einen Glanz, der von innen zu kommen scheint. Angezogen in Sekunden, getragen über Jahre.',
  'jodhpur boot':
    'Der Riemen um den Knöchel kommt aus dem Reitsport Rajasthans: Er hält den Schaft dort, wo ein Reißverschluss ihn nur öffnen würde. Antikisiertes Kalbsleder wird von Hand schattiert, deshalb gleicht kein Paar dem anderen. Für alle, die eine Spur eigenwilliger auftreten möchten.',
  'artisan runner':
    'Ein Sneaker aus der Rahmenwerkstatt: gefertigt wie ein Herrenschuh, gedacht für lange Wege. Die Perforation lässt den Fuß atmen, die leichte Sohle federt jeden Schritt ab. Er zeigt, dass Bequemlichkeit keine Ausrede sein muss.',
  'court blanc':
    'Weiß ist der ehrlichste Ton, den ein Schuh tragen kann — er zeigt jede Naht, deshalb muss jede sitzen. Vollnarbiges weißes Kalbsleder lässt sich reinigen und altert würdig, statt zu vergilben. Der Schuh, der zu fast allem passt, ohne beliebig zu werden.',
  'double monk':
    'Zwei Schnallen statt Schnürsenkel: Der Double Monk stammt aus den Klöstern der Alpen, wo Schuhe schnell sitzen und lange halten mussten. Brüniertes Kalbsleder bringt Bewegung in die geschlossene Fläche. Wer ihn trägt, hat sich entschieden — und das sieht man ihm an.',
  'single monk strap':
    'Eine Schnalle, ein Riemen, eine klare Linie — der einfache Monk ist die zurückhaltendere Form des doppelten. Die geprägte Narbung fängt das Licht in feinen Kanten, ohne zu glänzen. Für den Auftritt, der Aufmerksamkeit verdient und nicht darum bittet.',
  'belgian slipper':
    'Der Belgian Slipper ist der weichste Schuh im Haus: keine Schnürung, kaum Aufbau, ein flacher Schaft, der sich um den Fuß legt statt ihn zu fassen. Aus den Wohnräumen kam er in die Stadt und hat sich seine Leichtigkeit bewahrt. Schlicht, mit Schleife oder mit Quasten — für Abende, an denen nichts drücken soll.',
  'wellington':
    'Ein Schlupfschuh mit ruhiger, geschlossener Linie: Der Wellington kommt ohne Schnürung aus und hält allein über die Passform — deshalb zählen hier Ihre Maße besonders. Schlicht bleibt er streng, mit Quasten, Albert-Maske oder Zierspange wird er festlich. Ein Schuh, der sich dem Abend anpasst.',
  'drake':
    'Kein Verschluss, keine Ösen: Beim Drake steigen Sie hinein und gehen los. Was ihn ausmacht, entscheiden Sie — glatt belassen, mit Quasten, mit Maske oder mit Zierspange. Der unkomplizierteste Weg, gut angezogen zu sein.',
  'laceless trainer':
    'Ein Sneaker ohne Schnürung: Die Form allein hält ihn am Fuß, weshalb hier jeder Millimeter zählt. Weiches Veloursleder macht ihn leicht, gefertigt wird er dennoch wie ein Herrenschuh. Für Wege, auf denen es schnell gehen darf, ohne nachlässig zu wirken.',
  'mov flex sport':
    'Ein Sneaker aus der Rahmenwerkstatt: die Machart eines Herrenschuhs, das Gewicht eines Sportschuhs. Weiches Veloursleder und eine nachgiebige Sohle nehmen dem Tag seine Länge. Für alle, die viel unterwegs sind und trotzdem gut angezogen sein wollen.',
  'mov flex sport boot':
    'Die hohe Form der Mov-Flex-Familie: Der Schaft reicht über den Knöchel und gibt ihm Halt, die leichte Sohle bleibt die eines Sneakers. Weiches Veloursleder hält die Silhouette weich statt klobig. Für kühlere Tage, an denen Sie auf Bequemlichkeit nicht verzichten möchten.',
  'mov flex sport laced boot':
    'Dieselbe hohe Form, hier mit Schnürung: Über die Ösen legen Sie den Schaft genau an den Knöchel, fester oder lockerer, je nach Tag. Veloursleder und leichte Sohle halten ihn dabei sportlich. Der Stiefel für lange Wege, die bequem bleiben sollen.',
}

const KATEGORIE_BESCHREIBUNGEN = {
  OXFORD:
    'Der Oxford trägt seine Schnürung geschlossen: Die Laschen sind unter dem Blatt vernäht, der Schaft liegt glatt am Fuß, die Linie bleibt ruhig. Das ist die formellste Machart des Schuhbaus — und die, die am meisten von einer genauen Passform lebt. Ein Paar, das mit den Jahren Ihre Bewegung annimmt.',
  BALMORAL:
    'Die umlaufende Naht über dem Rist trennt Vorder- von Hinterschaft und gibt dem Balmoral seine klare Zäsur. Diese eine Linie streckt den Fuß und lässt ihn schlanker wirken. Ein Schuh für die Anlässe, an die Sie sich später erinnern.',
  WHOLECUT:
    'Ein Wholecut ist aus einem einzigen Stück Leder gearbeitet — eine Naht an der Ferse, sonst keine. Das gelingt nur mit einer makellosen Haut, weshalb dafür wenige überhaupt infrage kommen. Die ruhigste Linie, die ein Schuh haben kann.',
  DERBY:
    'Beim Derby liegen die Schnürlaschen offen auf dem Blatt. Das gibt dem Spann Raum, macht den Schuh auch für kräftigere Füße bequem und lässt sich über den Tag nachjustieren. Formell genug für das Büro, gelassen genug für alles danach.',
  LOAFER:
    'Ein Loafer hält ohne Schnürung — allein über die Passform, weshalb an ihm nichts ungefähr sein darf. Genau dafür nehmen wir Ihre Maße. Für Tage, an denen Sorgfalt nicht nach Anstrengung aussehen soll.',
  MONK:
    'Statt Schnürsenkeln hält den Monk eine Schnalle. Die Form stammt aus den Klöstern der Alpen, wo Schuhe schnell sitzen und lange halten mussten. Ein Schuh, der auffällt, ohne laut zu sein.',
  DOUBLE_MONK:
    'Zwei Schnallen, ein Riemenpaar, kein Schnürsenkel: Der Double Monk sitzt fest, sobald er geschlossen ist, und lässt sich dabei fein justieren. Er trägt mehr Charakter als der Oxford, ohne dessen Form zu verlassen. Wer ihn trägt, hat sich entschieden.',
  CHELSEA:
    'Der Chelsea kommt ohne Verschluss aus: Zwei elastische Einsätze halten ihn, ein Zug an der hinteren Lasche genügt. Der knappe Schaft setzt die Linie des Beins fort, statt sie zu unterbrechen. Angezogen in Sekunden, getragen über Jahre.',
  CHUKKA:
    'Der Chukka ist der leichteste unter den Stiefeln: zwei oder drei Ösenpaare, ein knapper Schaft, sonst nichts. Er entstand für die Pausen zwischen den Spielabschnitten des Polos und hat sich deren Gelassenheit bewahrt. Der Schuh für die Übergänge — zwischen den Jahreszeiten wie zwischen den Anlässen.',
  BOOT:
    'Ein Stiefel schützt den Knöchel, ohne ihn festzustellen: Der Schaft endet dort, wo die Bewegung beginnt. Durchgenähte Konstruktion und kräftigeres Leder machen ihn wetterfest, ohne ihn schwer wirken zu lassen. Für die Jahreszeit, in der man den Weg nicht immer aussucht.',
  SNEAKER:
    'Ein Sneaker aus der Rahmenwerkstatt: gefertigt wie ein Herrenschuh, gedacht für lange Wege. Leichte Sohle, weiches Futter, dieselbe Sorgfalt an jeder Naht. Er zeigt, dass Bequemlichkeit keine Ausrede sein muss.',
  JODHPUR:
    'Der Riemen um den Knöchel kommt aus dem Reitsport Rajasthans: Er hält den Schaft dort, wo ein Reißverschluss ihn nur öffnen würde. Der Schnitt bleibt knapp und lässt den Fuß schlank wirken. Für alle, die eine Spur eigenwilliger auftreten möchten.',
  BELGIAN_SLIPPER:
    'Der Belgian Slipper ist die weichste Machart des Hauses: keine Schnürung, kaum Aufbau, ein flacher Schaft, der sich um den Fuß legt statt ihn zu fassen. Aus den Wohnräumen kam er in die Stadt und hat sich seine Leichtigkeit bewahrt. Für Abende, an denen nichts drücken soll.',
  WELLINGTON:
    'Ein Schlupfschuh mit ruhiger, geschlossener Linie: ohne Schnürung, gehalten allein von der Passform — deshalb zählen hier Ihre Maße besonders. Schlicht bleibt er streng, mit Quasten, Maske oder Zierspange wird er festlich. Ein Schuh, der sich dem Abend anpasst.',
  DRAKE:
    'Kein Verschluss, keine Ösen: Sie steigen hinein und gehen los. Wie viel Schmuck er trägt, entscheiden Sie — glatt, mit Quasten, mit Maske oder mit Zierspange. Der unkomplizierteste Weg, gut angezogen zu sein.',
  LACELESS_TRAINER:
    'Ein Sneaker ohne Schnürung: Die Form allein hält ihn am Fuß, weshalb hier jeder Millimeter zählt. Weiches Leder macht ihn leicht, gefertigt wird er dennoch wie ein Herrenschuh. Für Wege, auf denen es schnell gehen darf, ohne nachlässig zu wirken.',
  SNEAKER_BOOT:
    'Die hohe Form des Sneakers: Der Schaft reicht über den Knöchel und gibt ihm Halt, die leichte Sohle bleibt sportlich. Weiches Leder hält die Silhouette weich statt klobig. Für kühlere Tage, an denen Sie auf Bequemlichkeit nicht verzichten möchten.',
  SNEAKER_LACED:
    'Dieselbe hohe Form, hier mit Schnürung: Über die Ösen legen Sie den Schaft genau an den Knöchel, fester oder lockerer, je nach Tag. Leichte Sohle, weiches Leder, die Machart eines Herrenschuhs. Der Stiefel für lange Wege, die bequem bleiben sollen.',
}

/** Vergleichsform des Namens: „The Heritage Oxford" und „Heritage Oxford"
 *  sollen dasselbe treffen — der Artikel wurde in der Verwaltung vielfach
 *  entfernt, der Schuh ist derselbe geblieben. */
function beschreibungsSchluessel(name) {
  return String(name || '').trim().toLowerCase().replace(/^the\s+/, '').replace(/\s+/g, ' ')
}

function seedShoeDescriptions(db) {
  let spalte
  try {
    spalte = db.prepare('PRAGMA table_info(shoes)').all().some(c => c.name === 'description')
  } catch { return }
  if (!spalte) return

  const offen = db.prepare(
    "SELECT id, name, category FROM shoes WHERE description IS NULL OR TRIM(description) = ''"
  ).all()
  if (!offen.length) return

  const schreiben = db.prepare("UPDATE shoes SET description = ?, updated_at = datetime('now') WHERE id = ?")
  let nachModell = 0, nachKategorie = 0

  db.transaction(() => {
    for (const schuh of offen) {
      const eigener = MODELL_BESCHREIBUNGEN[beschreibungsSchluessel(schuh.name)]
      const text = eigener || KATEGORIE_BESCHREIBUNGEN[String(schuh.category || '').toUpperCase()]
      if (!text) continue
      schreiben.run(text, schuh.id)
      if (eigener) nachModell++; else nachKategorie++
    }
  })()

  if (nachModell || nachKategorie) {
    console.log(`✅ Seeded: Modellbeschreibungen, ${nachModell} nach Modell, ${nachKategorie} nach Machart`)
  }
}

// ── Rechtstexte auf die Seite bringen ────────────────────────────────────────
//
// AGB, Datenschutz und Impressum lagen als Dateien im Repository, kamen aber
// nie in die Datenbank — und nur von dort holt sie die Seite. Wer im Laden auf
// „AGB" tippte, las „Noch nicht verfügbar". Für einen Shop ist das keine
// Kleinigkeit: Ein fehlendes Impressum ist abmahnfähig.
//
// Zwei Vorsichtsmaßnahmen:
//
//   • Unfertige Texte bleiben liegen. Enthält eine Datei noch einen Platzhalter
//     in eckigen Klammern, wird sie NICHT veröffentlicht. Ein Impressum mit
//     „[STRASSE UND HAUSNUMMER]" ist schlimmer als gar keines — es belegt, dass
//     jemand es gesehen und trotzdem so gelassen hat.
//
//   • Geschrieben wird nur in leere Einträge. Was in der Verwaltung unter
//     „Rechtliches" steht, bleibt unangetastet.

const RECHTSTEXTE = [
  { type: 'agb',          datei: 'AGB.md',                    titel: 'Allgemeine Geschäftsbedingungen' },
  { type: 'datenschutz',  datei: 'Datenschutzerklaerung.md',  titel: 'Datenschutzerklärung' },
  { type: 'impressum',    datei: 'Impressum.md',              titel: 'Impressum' },
]

/**
 * Noch offene Platzhalter.
 *
 * Zwei Formen, und die zweite hat mich einmal erwischt: Neben kurzen Marken
 * wie [STRASSE] gibt es Entscheidungsblöcke — „[**Variante Kleinunternehmer:**
 * … ]" —, die über mehrere Zeilen laufen. Eine Obergrenze von 80 Zeichen ließ
 * sie durch, und im veröffentlichten Impressum standen beide Steuervarianten
 * untereinander. Deshalb ohne Längengrenze und zusätzlich auf die
 * Entscheidungsmarken geprüft.
 */
function offenePlatzhalter(text) {
  const marken = text.match(/\[\*\*(Variante|Nur behalten|Nur aufnehmen)[^\]]*\]/gs) || []
  const kurz = (text.match(/\[[^\]\n]{2,120}\]/g) || [])
    // Markdown-Links [Text](url) sind keine Platzhalter.
    .filter(m => !text.includes(`${m}(`))
  return [...marken, ...kurz]
}

/**
 * Ein Rechtstext aus der Datei — geputzt und auf Platzhalter geprüft.
 *
 * Ausgelagert, weil es zwei Aufrufer gibt: den Seed beim Start, der nur leere
 * Einträge füllt, und die Verwaltung, die einen Text ausdrücklich aus der
 * Datei neu einlesen darf.
 */
export function rechtstextAusDatei(datei) {
  let pfad
  try {
    pfad = path.join(__seedDir, '..', '..', '..', 'rechtstexte', datei)
    if (!fs.existsSync(pfad)) return { fehler: 'Datei nicht gefunden' }
  } catch { return { fehler: 'Datei nicht lesbar' } }

  let roh
  try { roh = fs.readFileSync(pfad, 'utf8') } catch { return { fehler: 'Datei nicht lesbar' } }

  // Der Hinweiskasten am Kopf ist eine Anweisung an uns, nicht an den Kunden.
  const text = roh
    .replace(/^#[^\n]*\n/, '')
    .replace(/^>[^\n]*\n/gm, '')
    .replace(/^---\s*$/gm, '')
    .trim()

  const offen = offenePlatzhalter(text)
  if (offen.length) return { fehler: `${offen.length} Platzhalter noch offen`, offen }
  return { text }
}

/** Welche Datei zu welchem Typ gehört — für die Verwaltung. */
export const rechtstextDatei = (type) => RECHTSTEXTE.find(r => r.type === type) || null

/**
 * Die Kollektionen — die Angebote, in die der Katalog zerfällt.
 *
 * Nur anlegen, was fehlt. Beschriftungen, die jemand in der Verwaltung
 * geändert hat, bleiben stehen.
 */
export function seedKollektionen(db) {
  const vorgabe = [
    { key: 'standard', label: 'Maßanfertigung', sort_order: 1,
      description: 'Von Grund auf für Sie gefertigt, volle Auswahl, 4 bis 6 Wochen.' },
    { key: 'express',  label: 'Express',        sort_order: 2,
      description: 'Aus vorbereiteten Bauteilen auf Ihren Leisten vollendet, rund 2 Wochen.' },
  ]
  const einfuegen = db.prepare(`
    INSERT OR IGNORE INTO collections (key, label, description, sort_order) VALUES (?, ?, ?, ?)
  `)
  let neu = 0
  for (const k of vorgabe) {
    const vorher = db.prepare('SELECT key FROM collections WHERE key = ?').get(k.key)
    einfuegen.run(k.key, k.label, k.description, k.sort_order)
    if (!vorher) neu++
  }
  if (neu) console.log(`✅ Seeded: ${neu} Kollektion(en)`)
}

/* ══════════════════════════════════════════════════════════════════════════
 * Der Mokassin.
 *
 * ── Was hier abgebildet wird ─────────────────────────────────────────────
 *
 * Der Driver der Manufaktur wird nach anderen Regeln konfiguriert als ein
 * Rahmengenähter. Er hat keinen Rahmen, keinen Absatz und keine Zehenkappe;
 * dafür hat er Teile, die es sonst nirgends gibt: ein Vorderteil, eine
 * sichtbare Naht, ein Weichfutter und einen Kragen. Und er läuft auf drei
 * eigenen Ledern — Calf Suede, Nappa, Fullgrain —, die mit den Ledern der
 * Dress-Linie nichts zu tun haben.
 *
 * ── Warum eine eigene Kategorie ──────────────────────────────────────────
 *
 * Weil die Kategorie im ganzen System der Schlüssel ist, an dem hängt, was
 * wählbar ist: Leisten (CATEGORY_LASTS), Optionsgruppen
 * (options.applicable_categories), Vorlagen (category_templates). Den
 * Mokassin unter LOAFER zu führen hieße, jede dieser Listen mit
 * Ausnahmen zu durchsetzen — und der Loafer bekäme ein Vorderteil, das er
 * nicht hat.
 *
 * ── Warum eigene Farben ──────────────────────────────────────────────────
 *
 * Die Farbzeilen sind global und tragen je EINEN Namen. Die Töne der
 * Dress-Linie heißen inzwischen „Espresso Heritage" und „Midnight Black" —
 * Namen, die für Luxe Calf vergeben wurden. Hinge der Mokassin an denselben
 * Zeilen, würde jede spätere Umbenennung dort seine Farben mit umbenennen.
 * Deshalb ein eigener Satz mit dem Präfix `moc_`, so wie es die Velvet-Töne
 * schon vormachen.
 *
 * Die drei Leder teilen sich diesen Satz: `applicable_materials` sagt je
 * Farbe, an welchem Leder es sie gibt. 22 Zeilen statt 37, und die
 * Schnittmenge steht an einer Stelle statt dreimal.
 * ══════════════════════════════════════════════════════════════════════════ */

/** Die drei Leder des Mokassins. Eine Familie, damit die Wahl in einem Schritt bleibt. */
const MOKASSIN_LEDER = [
  { key: 'calf_suede', label: 'Calf Suede', color: '#8a7f76',
    tip: 'Fein geschliffenes Kalbsveloursleder, weich im Griff. Der klassische Fahrer-Schuh, am besten bei trockenem Wetter.' },
  { key: 'nappa',      label: 'Nappa',      color: '#b98a5e',
    tip: 'Vollnarbiges Nappaleder, glatt und nachgiebig. Legt sich schnell an den Fuß und bleibt weich.' },
  { key: 'fullgrain',  label: 'Fullgrain',  color: '#6b4423',
    tip: 'Unkorrigierte Vollnarbe mit sichtbarer Struktur. Das robusteste der drei, entwickelt Patina.' },
]

/**
 * Die Farbpalette des Mokassins.
 *
 * `an` nennt die Leder, an denen es die Farbe gibt — genau die Aufteilung
 * aus dem Konfigurator der Manufaktur: 17 Töne in Calf Suede, 13 in Nappa,
 * 7 in Fullgrain.
 */
const MOKASSIN_FARBEN = [
  { key: 'moc_black',        name: 'Black',        hex: '#14110f', an: ['calf_suede', 'nappa', 'fullgrain'] },
  { key: 'moc_dark_brown',   name: 'Dark Brown',   hex: '#3b2314', an: ['calf_suede', 'nappa', 'fullgrain'] },
  { key: 'moc_medium_brown', name: 'Medium Brown', hex: '#7a4a24', an: ['calf_suede'] },
  { key: 'moc_tan',          name: 'Tan',          hex: '#b07a45', an: ['nappa', 'fullgrain'] },
  { key: 'moc_camel',        name: 'Camel',        hex: '#c19a6b', an: ['calf_suede'] },
  { key: 'moc_honey',        name: 'Honey',        hex: '#d99a3c', an: ['nappa'] },
  { key: 'moc_nude',         name: 'Nude',         hex: '#e0c3a8', an: ['nappa'] },
  { key: 'moc_sand',         name: 'Sand',         hex: '#d8c9a8', an: ['fullgrain'] },
  { key: 'moc_white',        name: 'White',        hex: '#f4f2ed', an: ['calf_suede', 'nappa', 'fullgrain'] },
  { key: 'moc_grey',         name: 'Grey',         hex: '#8b8b88', an: ['calf_suede'] },
  { key: 'moc_navy',         name: 'Navy',         hex: '#1e2f4d', an: ['calf_suede', 'nappa', 'fullgrain'] },
  { key: 'moc_light_blue',   name: 'Light Blue',   hex: '#8fb3d9', an: ['calf_suede', 'nappa'] },
  { key: 'moc_turquoise',    name: 'Turquoise',    hex: '#2fa39b', an: ['calf_suede'] },
  { key: 'moc_green',        name: 'Green',        hex: '#3f7d43', an: ['calf_suede'] },
  { key: 'moc_light_green',  name: 'Light Green',  hex: '#9cc08a', an: ['nappa'] },
  { key: 'moc_dark_green',   name: 'Dark Green',   hex: '#1f4029', an: ['calf_suede'] },
  { key: 'moc_khaki',        name: 'Khaki',        hex: '#7c7554', an: ['calf_suede', 'nappa'] },
  { key: 'moc_yellow',       name: 'Yellow',       hex: '#e3b325', an: ['calf_suede'] },
  { key: 'moc_orange',       name: 'Orange',       hex: '#d2691e', an: ['calf_suede', 'nappa'] },
  { key: 'moc_red',          name: 'Red',          hex: '#a4232a', an: ['calf_suede', 'nappa', 'fullgrain'] },
  { key: 'moc_pink',         name: 'Pink',         hex: '#dfa0b0', an: ['calf_suede', 'nappa'] },
  { key: 'moc_velvet',       name: 'Velvet',       hex: '#6d2740', an: ['calf_suede'] },
]

/** Die zehn Futtertöne der Manufaktur — dieselbe Reihe wie bei `inner_color`. */
const MOKASSIN_FUTTER = [
  ['black', 'Black', '#0a0a0a'], ['brown', 'Brown', '#5b3a1d'], ['tan', 'Tan', '#a0734a'],
  ['beige', 'Beige', '#d4c4a0'], ['red', 'Red', '#a01c1c'],     ['orange', 'Orange', '#d97706'],
  ['navy', 'Navy', '#1e3a5f'],   ['white', 'White', '#f5f5f0'], ['lila', 'Lila', '#5a2d6d'],
  ['ochre', 'Ochre', '#b8860b'],
]

/**
 * Die Schritte, die es nur am Mokassin gibt.
 *
 * `inner_color` (Futter) steht nicht dabei: Die Gruppe gilt bereits für alle
 * Kategorien und trägt genau diese zehn Töne. Sie ein zweites Mal anzulegen
 * hieße, dieselbe Liste an zwei Stellen zu pflegen.
 *
 * Der Kragen führt die Fullgrain-Palette, weil er in der Fertigung aus
 * Fullgrain geschnitten wird — sieben Töne, nicht die zweiundzwanzig des
 * Schafts.
 */
const MOKASSIN_GRUPPEN = [
  {
    key: 'moccasin_front', label: 'Vorderteil', sort_order: 4, required: 0,
    beschreibung: 'Das Teil über dem Spann: schlicht, mit Schleife oder mit Maske.',
    werte: [
      { key: 'bare', label: 'Bare', hex: null, beschreibung: 'Ohne Aufsatz, durchgehende Fläche.' },
      { key: 'bow',  label: 'Bow',  hex: null, beschreibung: 'Schleife aus demselben Leder.' },
      { key: 'mask', label: 'Mask', hex: null, beschreibung: 'Aufgesetzte Maske über dem Spann.' },
    ],
  },
  {
    key: 'stitching_color', label: 'Nahtfarbe', sort_order: 6, required: 0,
    beschreibung: 'Die sichtbare Naht rundum. Ton in Ton oder als Kontrast.',
    werte: [
      { key: 'black',  label: 'Black',  hex: '#0a0a0a' },
      { key: 'grey',   label: 'Grey',   hex: '#8b8b88' },
      { key: 'brown',  label: 'Brown',  hex: '#5b3a1d' },
      { key: 'red',    label: 'Red',    hex: '#a01c1c' },
      { key: 'green',  label: 'Green',  hex: '#2f6b3a' },
      { key: 'blue',   label: 'Blue',   hex: '#24487d' },
      { key: 'yellow', label: 'Yellow', hex: '#e3b325' },
      { key: 'white',  label: 'White',  hex: '#f5f5f0' },
    ],
  },
  {
    key: 'soft_lining_color', label: 'Weichfutter', sort_order: 10, required: 0,
    beschreibung: 'Die gepolsterte Lage unter dem Futter, dort wo der Fuß aufliegt.',
    werte: MOKASSIN_FUTTER.map(([key, label, hex]) => ({ key, label, hex })),
  },
  {
    key: 'collar_color', label: 'Kragen', sort_order: 10, required: 0,
    beschreibung: 'Der umlaufende Rand am Einstieg, aus Fullgrain.',
    werte: [
      ['black', 'Black', '#14110f'], ['dark_brown', 'Dark Brown', '#3b2314'],
      ['tan', 'Tan', '#b07a45'],     ['sand', 'Sand', '#d8c9a8'],
      ['white', 'White', '#f4f2ed'], ['navy', 'Navy', '#1e2f4d'],
      ['red', 'Red', '#a4232a'],
    ].map(([key, label, hex]) => ({ key, label, hex })),
  },
]

/** Die Sohlen, die unter einen Fahrer-Schuh gehören. Erste ist Vorgabe. */
const MOKASSIN_SOHLEN = ['dots', 'gummy_sole', 'rubber']

/**
 * Das Modell selbst.
 *
 * Preis und Einstandspreis sind zwei verschiedene Dinge: 105 € ist, was die
 * Manufaktur für die Einzelanfertigung nimmt (aus ihrem Back Office), 890 €
 * der Verkaufspreis. Er ist an der Freizeit-Linie ausgerichtet — zwischen
 * Sneaker (890 €) und Belgian Slipper (1.180 €) — und im CMS jederzeit
 * änderbar.
 *
 * Ohne Bild: Für den Driver liegt keine Aufnahme vor, und ein
 * fremdes Foto wäre eine Behauptung über ein Produkt, das anders aussieht.
 * Die Karte bleibt bis zum Upload im CMS ohne Motiv — so wie bei den übrigen
 * Matrix-Modellen auch.
 */
const MOKASSIN_MODELL = {
  name: 'Driver',
  slug: 'driver',
  price: '€ 890',
  cost_price: 105,
  material: 'Calf Suede',
  color: '#3b2314',
  tag: 'NEW',
  tagline: 'Der Fahrer-Mokassin, weich gearbeitet.',
  description: 'Ungefütterter Mokassin mit umlaufender Naht und Noppensohle — der Schuh für alles, was kein Anzug ist. Sie wählen das Leder aus Calf Suede, Nappa oder Fullgrain, dazu Farbe, Nahtfarbe, Futter, Weichfutter, Kragen und das Vorderteil: schlicht, mit Schleife oder mit Maske. Gefertigt auf dem Drivers-Leisten in Ihrer Länge und Weite.',
}

/**
 * Stand der Mokassin-Einrichtung.
 *
 * Eine Nummer statt eines Zeitstempels, damit sich ein Nachtrag ausrollen
 * lässt: Wer die alte Nummer stehen hat, läuft einmal durch und bekommt, was
 * dazugekommen ist. Alles ist `INSERT OR IGNORE`, ein zweiter Lauf legt also
 * nichts doppelt an — er ergänzt nur, was fehlt.
 */
const MOKASSIN_STAND = '2'

/**
 * Den Mokassin einrichten: Leder, Farben, Schritte, Vorlage, Modell.
 *
 * Sonst einmalig, wie die Express-Linie: Der Vermerk in den Einstellungen
 * verhindert, dass ein im CMS gelöschtes Modell oder eine abgewählte Farbe
 * beim nächsten Start zurückkommt.
 */
export function seedMokassin(db) {
  const stand = db.prepare("SELECT value FROM settings WHERE key = 'mokassin_konfiguration'").get()
  if (stand?.value === MOKASSIN_STAND) return

  const KAT = 'MOCCASIN'
  const lederKeys = MOKASSIN_LEDER.map(l => l.key)

  const einrichten = db.transaction(() => {
    // ── 1. Leder ────────────────────────────────────────────────────────
    // Hinter der Dress-Linie einsortiert (sort_order ab 20), damit sie in
    // der CMS-Liste als eigener Block stehen und sich nicht dazwischen
    // schieben.
    const insLeder = db.prepare(`
      INSERT OR IGNORE INTO shoe_materials (key, label, sub, color, available, tip, rating, sort_order, family)
      VALUES (?, ?, 'Aesthetic', ?, 1, ?, 'good', ?, 'aesthetic')
    `)
    MOKASSIN_LEDER.forEach((l, i) => insLeder.run(l.key, l.label, l.color, l.tip, 20 + i))

    // ── 2. Farben ───────────────────────────────────────────────────────
    const insFarbe = db.prepare(`
      INSERT OR IGNORE INTO shoe_colors (key, hex, name, available, rating, sort_order, applicable_materials)
      VALUES (?, ?, ?, 1, 'neutral', ?, ?)
    `)
    MOKASSIN_FARBEN.forEach((f, i) => insFarbe.run(f.key, f.hex, f.name, 100 + i, f.an.join(',')))

    // Drei Farbzeilen aus der ersten Fassung — „Schwarz", „Tan", „Forest" —
    // stehen noch auf `*` und gelten damit für jedes Leder, das es je geben
    // wird. Am Mokassin wären sie drei Töne zu viel, und „Tan" stünde dort
    // zweimal: einmal als Altbestand, einmal als eigene Nappa-Farbe.
    //
    // Statt sie zu löschen (jemand hat sie vielleicht schon bestellt) werden
    // sie an die Leder gebunden, an denen sie bisher schon standen. Für die
    // Dress-Linie ändert das nichts — sie bietet genau diese Leder an. Wer
    // die Bindung im CMS bereits selbst gesetzt hat, behält sie.
    // Beim Schlüssel genannt, nicht über `WHERE applicable_materials = '*'`:
    // Eine Farbe, die jemand im CMS bewusst für alle Leder angelegt hat, ist
    // kein Altbestand und wird nicht mit eingesammelt.
    const DRESS_LEDER = ['lux_calf', 'lux_suede', 'painted_full_grain', 'patina', 'velvet',
                         'box_calf', 'urban_suede', 'painted_calf']
    const ALTBESTAND = ['schwarz', 'tan', 'forest']
    db.prepare(`
      UPDATE shoe_colors SET applicable_materials = ?, updated_at = datetime('now')
      WHERE key IN (${ALTBESTAND.map(() => '?').join(',')}) AND applicable_materials = '*'
    `).run(DRESS_LEDER.join(','), ...ALTBESTAND)

    // ── 3. Schritte ─────────────────────────────────────────────────────
    const insGruppe = db.prepare(`
      INSERT OR IGNORE INTO option_groups (key, label, description, ui_type, required, sort_order)
      VALUES (?, ?, ?, 'single', ?, ?)
    `)
    const gruppeId = db.prepare('SELECT id FROM option_groups WHERE key = ?')
    const insWert = db.prepare(`
      INSERT OR IGNORE INTO options (group_id, key, label, description, default_price_extra, applicable_categories, sort_order, color_hex)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?)
    `)
    for (const g of MOKASSIN_GRUPPEN) {
      insGruppe.run(g.key, g.label, g.beschreibung, g.required, g.sort_order)
      const gid = gruppeId.get(g.key)?.id
      if (!gid) continue
      g.werte.forEach((w, i) => insWert.run(gid, w.key, w.label, w.beschreibung || null, KAT, i, w.hex))
    }

    // ── 4. Vorlage für die Kategorie ────────────────────────────────────
    // Woraus sie besteht: die vier eigenen Schritte, das Futter aus der
    // allgemeinen Gruppe und die drei Sohlen. Kein Rahmen, kein Absatz,
    // keine Zehenkappe — die hat der Schuh nicht.
    //
    // Auch keine Sohlenfarben: `dots` ist eine durchgehende Gummisohle, und
    // die Regel in sohlenRegel.js blendet Rand und Lauffläche dort ohnehin
    // aus. Was nie erscheint, muss auch nicht in der Vorlage stehen.
    const optId = db.prepare(`
      SELECT o.id FROM options o JOIN option_groups g ON g.id = o.group_id
      WHERE g.key = ? AND o.key = ?
    `)
    const insVorlage = db.prepare(`
      INSERT OR IGNORE INTO category_templates (category, option_id, is_default, sort_order)
      VALUES (?, ?, ?, ?)
    `)
    const vorlage = []
    for (const g of MOKASSIN_GRUPPEN) vorlage.push([g.key, g.werte.map(w => w.key)])
    vorlage.push(['inner_color', MOKASSIN_FUTTER.map(([k]) => k)])
    vorlage.push(['sole', MOKASSIN_SOHLEN])

    let lfd = 0
    for (const [gruppe, keys] of vorlage) {
      keys.forEach((k, i) => {
        const id = optId.get(gruppe, k)?.id
        if (id) insVorlage.run(KAT, id, i === 0 ? 1 : 0, lfd++)
      })
    }

    // ── 5. Das Modell ───────────────────────────────────────────────────
    if (deletedSeedNames(db).has(MOKASSIN_MODELL.name)) return
    let schuh = db.prepare('SELECT id FROM shoes WHERE name = ?').get(MOKASSIN_MODELL.name)
    if (!schuh) {
      const m = MOKASSIN_MODELL
      const info = db.prepare(`
        INSERT INTO shoes (name, category, price, material, match_pct, color, tag,
                           tagline, description, cost_price, slug, collection)
        VALUES (?, ?, ?, ?, '97.0%', ?, ?, ?, ?, ?, ?, 'standard')
      `).run(m.name, KAT, m.price, m.material, m.color, m.tag,
             m.tagline, m.description, m.cost_price, m.slug)
      schuh = { id: info.lastInsertRowid }
    }

    // Leder und Schritte an das Modell hängen. Die Kategorie-Vorlage greift
    // im Konfigurator nur, solange am Modell nichts steht — hier steht
    // etwas, damit die Verwaltung es je Modell verengen kann.
    const insModellLeder = db.prepare(
      'INSERT OR IGNORE INTO shoe_material_options (shoe_id, material_key, sort_order) VALUES (?, ?, ?)')
    lederKeys.forEach((k, i) => insModellLeder.run(schuh.id, k, i))

    db.prepare(`
      INSERT OR IGNORE INTO shoe_options (shoe_id, option_id, price_override, is_default, sort_order)
      SELECT ?, option_id, NULL, is_default, sort_order FROM category_templates WHERE category = ?
    `).run(schuh.id, KAT)
  })

  einrichten()
  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('mokassin_konfiguration', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(MOKASSIN_STAND)
  console.log(`✅ Seeded: Mokassin (${MOKASSIN_LEDER.length} Leder, ${MOKASSIN_FARBEN.length} Farben, ${MOKASSIN_GRUPPEN.length} eigene Schritte)`)
}

/* ══════════════════════════════════════════════════════════════════════════
 * Der Gürtel.
 *
 * ── Was ihn von allem anderen Zubehör unterscheidet ──────────────────────
 *
 * Ein Pflegeset ist ein Pflegeset. Der Gürtel dagegen wird gefertigt wie ein
 * Schuh: aus einer Lederart, in einer Farbe, mit einer Schließe in einem
 * Metallton, in einer Länge. Fünf Angaben, und die ersten beiden sollen zu
 * den Schuhen passen, zu denen er getragen wird.
 *
 * Deshalb steht er zwar im Zubehörbestand — mit Preis, Beschreibung und
 * Bildern, alles im CMS zu pflegen —, trägt aber drei Felder, die sonst
 * niemand hat:
 *
 *   config_kind = 'belt'   Vor dem Warenkorb kommt eine Maske.
 *   price_with_shoe        Zusammen mit einem Paar günstiger, weil er im
 *                          selben Karton hinausgeht.
 *   ships_alone = 1        Er darf allein reisen. Für Pflegesets gilt das
 *                          nicht: Deren Porto kostet mehr als der Artikel.
 *
 * ── Warum keine eigenen Schließen-Optionen ───────────────────────────────
 *
 * Form und Metall kommen aus `buckle` und `buckle_color` — denselben
 * Gruppen, aus denen der Monk seine Schnalle bekommt. Das ist der Grund,
 * warum die Übernahme vom Schuh funktioniert: Steht am Double Monk schon
 * „Nickel", ist das derselbe Wert aus derselben Tabelle, und der Gürtel
 * übernimmt ihn wortwörtlich. Eine eigene Liste hätte eine
 * Übersetzungstabelle gebraucht, und jede Übersetzungstabelle ist eine
 * Stelle, an der später etwas nicht mehr zusammenpasst.
 * ══════════════════════════════════════════════════════════════════════════ */

const GUERTEL_BESCHREIBUNG = [
  'Gürtel aus demselben Leder wie Ihre Schuhe, in derselben Farbe — 3,5 cm breit, von Hand',
  'auf Länge geschnitten und an den Kanten gebrannt.',
  '',
  'Sie wählen die Form der Schließe (eckig oder rund), den Metallton und die Länge. Bestellen',
  'Sie ihn zu einem Paar Schuhe, übernimmt er Lederart und Farbe von dort; bei Modellen mit',
  'Schnalle — Monk und Double Monk — auch den Metallton, damit Schuh und Gürtel dasselbe',
  'Metall tragen.',
  '',
  'Die Länge wird von der Befestigung des Dorns bis zum mittleren Loch gemessen. Nach beiden',
  'Seiten bleiben zwei weitere Löcher, je 3 cm — eine Größe daneben ist also noch zu tragen.',
].join(' ').replace(/\s+/g, ' ').replace(/ {2,}/g, ' ').trim()

export function seedGuertel(db) {
  const STAND = '1'
  const vermerk = db.prepare("SELECT value FROM settings WHERE key = 'guertel_zubehoer'").get()
  if (vermerk?.value === STAND) return

  // Im CMS gelöscht heißt gelöscht. Ein Seed, der einen bewusst entfernten
  // Artikel beim nächsten Start zurückholt, ist keine Hilfe.
  const geloescht = db.prepare('SELECT 1 FROM deleted_seed_accessories WHERE key = ?').get(GUERTEL_KEY)
  if (geloescht) return

  db.transaction(() => {
    db.prepare(`
      INSERT OR IGNORE INTO accessories
        (key, name, description, price, price_with_shoe, config_kind, ships_alone,
         material_keys, is_active, sort_order)
      VALUES (?, ?, ?, 150, 125, ?, 1, '*', 1, 10)
    `).run(GUERTEL_KEY, 'Gürtel Hamptons', GUERTEL_BESCHREIBUNG, GUERTEL_ART)

    // Schließe und Metall gelten bisher nur für Monk und Double Monk. Ohne
    // diese Zeile stünden dem Gürtel beide Gruppen offen, aber keiner ihrer
    // Werte — die Maske wäre leer.
    for (const gruppe of ['buckle', 'buckle_color']) {
      const werte = db.prepare(`
        SELECT o.id, o.applicable_categories FROM options o
        JOIN option_groups g ON g.id = o.group_id WHERE g.key = ?
      `).all(gruppe)
      for (const w of werte) {
        const kat = String(w.applicable_categories || '')
        if (kat === '*' || kat.split(',').map(s => s.trim()).includes('BELT')) continue
        db.prepare('UPDATE options SET applicable_categories = ? WHERE id = ?')
          .run(kat ? `${kat},BELT` : 'BELT', w.id)
      }
    }
  })()

  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('guertel_zubehoer', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(STAND)
  console.log(`✅ Seeded: Gürtel (${GROESSEN.length} Längen, 150 € einzeln / 125 € zum Paar)`)
}

/**
 * Die Express-Fassungen der Modelle, die sich so fertigen lassen.
 *
 * ── Warum Zweitfassungen und keine Umschaltung am Modell ─────────────────
 *
 * Dieselbe Machart gibt es in beiden Linien: den Oxford von Grund auf in
 * sechs Wochen, und den Oxford aus vorbereiteten Bauteilen in zweien. Das
 * sind zwei Angebote mit verschiedenem Preis, verschiedener Auswahl und
 * verschiedener Lieferzeit — also zwei Einträge. Ein Schalter am selben
 * Eintrag müsste Preis, Auswahl und Zusage gleichzeitig doppelt führen; die
 * Kollektionsansicht könnte weder das eine noch das andere anzeigen, ohne
 * zu lügen.
 *
 * ── Warum nur einmal ─────────────────────────────────────────────────────
 *
 * Der Lauf merkt sich in den Einstellungen, dass er getan ist. Sonst käme
 * bei jedem Start ein Modell zurück, das jemand aus gutem Grund gelöscht
 * hat — und das gelöschte Modell wäre nie loszuwerden.
 *
 * ── Welche Modelle ───────────────────────────────────────────────────────
 *
 * Express geht nur auf dem Zurigo-Leisten. Deshalb steht hier eine Liste von
 * Namen und nicht von Kategorien: In BOOT und MONK liegen je zwei Modelle,
 * von denen nur eines gemeint ist.
 */
const EXPRESS_MODELLE = [
  // Loafer, alle Varianten
  'Loafer', 'The Horsebit Loafer', 'The Tassel Loafer',
  'The Albert Loafer', 'The Riviera Loafer', 'The Venetian Penny',
  // Oxford
  'Oxford', 'The Heritage Oxford', 'The Balmoral Cap-Toe',
  // Derby
  'Derby', 'The Monaco Derby', 'The Brogue Derby',
  // Monk
  'Double Monk', 'The Double Monk',
  // Chelsea
  'Chelsea Boot', 'The Chelsea Boot',
]

/** Was am Express-Schuh wählbar bleibt. Alles andere legt das Bauteil fest. */
const EXPRESS_GRUPPEN = ['sole', 'sole_color', 'sole_bottom_color', 'buckle', 'buckle_color']

/** Aufpreis in Euro für die kürzere Wartezeit. */
const EXPRESS_AUFPREIS = 100

/**
 * Einmalige Reparatur der Leder-Beschränkung.
 *
 * Das Force-Reset der Matrix hat den Express-Modellen bei jedem Neustart die
 * volle Kategorie-Auswahl zurückgesetzt — sechs Lederarten an einem Schuh, für
 * den nur eines vorbereitet vorliegt. Das Reset nimmt die Express-Linie jetzt
 * aus; was es bis dahin angerichtet hat, räumt diese Funktion einmal auf.
 *
 * Einmal, und dann nie wieder: Wer später bewusst ein zweites Leder freigibt,
 * soll es beim nächsten Start nicht wieder verlieren.
 */
function repariereExpressLeder(db) {
  const erledigt = db.prepare("SELECT value FROM settings WHERE key = 'express_leder_repariert'").get()
  if (erledigt?.value) return

  const modelle = db.prepare("SELECT id FROM shoes WHERE collection = 'express'").all()
  let repariert = 0
  for (const m of modelle) {
    const jetzt = db.prepare('SELECT material_key FROM shoe_material_options WHERE shoe_id = ?').all(m.id)
    if (jetzt.length === 1 && jetzt[0].material_key === 'lux_calf') continue
    db.prepare('DELETE FROM shoe_material_options WHERE shoe_id = ?').run(m.id)
    db.prepare('INSERT OR IGNORE INTO shoe_material_options (shoe_id, material_key, sort_order) VALUES (?, ?, 0)')
      .run(m.id, 'lux_calf')
    repariert++
  }

  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('express_leder_repariert', datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run()
  if (repariert) console.log(`✅ Repariert: ${repariert} Express-Modell(e) wieder auf Luxe Calf`)
}

export function seedExpressModelle(db) {
  const erledigt = db.prepare("SELECT value FROM settings WHERE key = 'express_grundbestand'").get()
  if (erledigt?.value) { repariereExpressLeder(db); return }

  // Zurigo ist der Leisten der Express-Linie. Für BOOT und MONK war er noch
  // nicht freigegeben, obwohl dort je ein Modell dazugehört — ohne diese
  // Zeile stünde der Kunde vor einem Express-Schuh ohne wählbare Schuhform.
  const zurigo = db.prepare("SELECT id, applicable_categories FROM options WHERE key = 'zurigo'").get()
  if (zurigo) {
    const kat = new Set(String(zurigo.applicable_categories || '').split(',').map(s => s.trim()).filter(Boolean))
    const vorher = kat.size
    kat.add('BOOT'); kat.add('MONK')
    if (kat.size !== vorher) {
      db.prepare('UPDATE options SET applicable_categories = ? WHERE id = ?')
        .run([...kat].join(','), zurigo.id)
    }
  }

  const preisZahl = (t) => {
    const n = parseFloat(String(t ?? '').replace(/[^0-9.,]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  let angelegt = 0
  let unauffindbar = 0
  const anlegen = db.transaction(() => {
    for (const name of EXPRESS_MODELLE) {
      const quelle = db.prepare("SELECT * FROM shoes WHERE name = ? AND collection = 'standard'").get(name)
      if (!quelle) { unauffindbar++; continue }

      const expressName = `${name} Express`
      if (db.prepare('SELECT id FROM shoes WHERE name = ?').get(expressName)) continue

      // Der Preis trägt den Aufpreis bereits. Er wird an keiner weiteren
      // Stelle addiert — sonst gäbe es zwei Quellen für einen Betrag.
      const grund = preisZahl(quelle.price)
      const preis = grund != null
        ? `€ ${Math.round(grund + EXPRESS_AUFPREIS).toLocaleString('de-DE')}`
        : quelle.price

      const info = db.prepare(`
        INSERT INTO shoes (
          name, category, price, material, color, tag, tagline, description,
          image_data, hover_image_data, default_images, model_3d,
          cost_price, locked_decoration, slug, collection,
          express, express_surcharge, express_weeks, express_groups
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'express', 1, ?, 2, ?)
      `).run(
        expressName, quelle.category, preis, quelle.material, quelle.color, quelle.tag,
        quelle.tagline, quelle.description,
        quelle.image_data, quelle.hover_image_data, quelle.default_images, quelle.model_3d,
        quelle.cost_price, quelle.locked_decoration,
        `${(quelle.slug || expressName.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/-express$/, '')}-express`,
        EXPRESS_AUFPREIS, JSON.stringify(EXPRESS_GRUPPEN),
      )

      // Freigegebene Optionen und Farben übernehmen: Die Auswahl wird über
      // express_groups eingeschränkt, nicht dadurch, dass unten nichts liegt.
      db.prepare('INSERT INTO shoe_options (shoe_id, option_id, price_override, is_default, sort_order) SELECT ?, option_id, price_override, is_default, sort_order FROM shoe_options WHERE shoe_id = ?')
        .run(info.lastInsertRowid, quelle.id)
      // Farbvarianten nur aus Luxe Calf: Was an anderen Ledern hängt, gibt es
      // in dieser Linie nicht, und ein Farbfeld ohne zugehöriges Leder wäre
      // eine Auswahl, die ins Leere führt.
      db.prepare(`
        INSERT INTO shoe_color_variants (shoe_id, hex, name, images, sort_order, material_key)
        SELECT ?, hex, name, images, sort_order, material_key
        FROM shoe_color_variants
        WHERE shoe_id = ? AND (material_key = 'lux_calf' OR material_key IS NULL)
      `).run(info.lastInsertRowid, quelle.id)

      // Leder: In der Express-Linie nur Luxe Calf. Die Beschränkung sitzt am
      // Zweitmodell, damit die Maßanfertigung ihre volle Auswahl behält.
      db.prepare('DELETE FROM shoe_material_options WHERE shoe_id = ?').run(info.lastInsertRowid)
      db.prepare('INSERT OR IGNORE INTO shoe_material_options (shoe_id, material_key, sort_order) VALUES (?, ?, 0)')
        .run(info.lastInsertRowid, 'lux_calf')

      angelegt++
    }
  })
  anlegen()

  // Erst vermerken, wenn wirklich jedes Modell der Liste eine Fassung hat.
  // Fehlt eines, war der Katalog zum Zeitpunkt des Laufs noch unvollständig —
  // dann soll der nächste Start es nachholen dürfen. Ein Vermerk, der zu früh
  // gesetzt wird, macht die fehlende Hälfte dauerhaft unerreichbar.
  if (!unauffindbar) {
    db.prepare(`
      INSERT INTO settings (key, value) VALUES ('express_grundbestand', datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run()
  }

  if (angelegt) console.log(`✅ Seeded: ${angelegt} Express-Modell(e) angelegt${unauffindbar ? ` (${unauffindbar} noch ohne Vorlage)` : ''}`)
}

/**
 * Die beiden Sohlenfarben so benennen, dass man sie auseinanderhält.
 *
 * ── Warum ────────────────────────────────────────────────────────────────
 *
 * Es gibt zwei Farbangaben an der Sohle, und ihre bisherigen Namen sagten
 * nicht, welche welche ist:
 *
 *   „Sohlenfarbe"      — vier Töne, gemeint war der sichtbare RAND
 *   „Sohle Unterseite" — neun Töne, gemeint war die LAUFFLÄCHE
 *
 * „Sohlenfarbe" klingt nach beidem. Wer den Rand färben will, greift zur
 * falschen Gruppe, sieht am Modell keine Änderung und wählt noch einmal —
 * bis am Ende beides anders ist als gedacht. Im 3D-Konfigurator heißt der
 * Rand zudem „Outsole", was ihn vollends zur Laufsohle macht.
 *
 * Deshalb: „Sohlenrand" und „Laufsohle". Zwei Wörter, die einander
 * ausschließen — man kann sie nicht verwechseln, weil das eine die Kante
 * benennt und das andere die Fläche.
 *
 * ── Warum nur die alten Namen ────────────────────────────────────────────
 *
 * Umbenannt wird ausschließlich, was noch die bekannten Vorgabewerte trägt.
 * Hat jemand in der Verwaltung eine eigene Bezeichnung vergeben, bleibt sie
 * stehen — ein Seed, der bei jedem Start die Beschriftung überschreibt, ist
 * kein Seed, sondern ein Rückschritt in Endlosschleife.
 */
function benenneSohlenGruppen(db) {
  const umbenennungen = [
    {
      key: 'sole_color',
      alt: ['Sohlenfarbe', 'Sohlen Color', 'Outsole'],
      label: 'Sohlenrand',
      description: 'Die Kante der Sohle — das, was man von der Seite sieht.',
    },
    {
      key: 'sole_bottom_color',
      alt: ['Sohle Unterseite', 'Sohle Farbe Unten', 'Leather Sole'],
      label: 'Laufsohle',
      description: 'Die Unterseite, auf der Sie gehen.',
    },
  ]

  let geaendert = 0
  for (const { key, alt, label, description } of umbenennungen) {
    const da = db.prepare('SELECT id, label FROM option_groups WHERE key = ?').get(key)
    if (!da || !alt.includes(da.label)) continue
    db.prepare("UPDATE option_groups SET label = ?, description = ?, updated_at = datetime('now') WHERE id = ?")
      .run(label, description, da.id)
    geaendert++
  }
  if (geaendert) console.log(`✅ Umbenannt: ${geaendert} Sohlengruppe(n) — Sohlenrand und Laufsohle`)
}

export function seedLegalDocs(db) {
  let veroeffentlicht = 0
  let nachgezogen = 0
  const zurueckgehalten = []
  const unveraendert = []

  for (const { type, datei, titel } of RECHTSTEXTE) {
    const { text, fehler, offen } = rechtstextAusDatei(datei)
    if (fehler) {
      if (offen?.length) zurueckgehalten.push(`${datei} (${offen.length} Platzhalter)`)
      continue
    }

    const vorhanden = db.prepare('SELECT content FROM legal_docs WHERE type = ?').get(type)

    // ── Nachziehen, solange niemand von Hand eingegriffen hat ────────────
    //
    // Bisher galt: Steht etwas drin, wird nichts geschrieben. Richtig gedacht
    // — eine Änderung aus der Verwaltung darf ein Neustart nicht wegwischen.
    // Nur hatte es eine Kehrseite, die erst auffiel, als sich die AGB
    // wirklich änderten: Die neue Fassung lag in der Datei, wurde ausgerollt,
    // und auf der Website stand weiter die alte. Ohne Fehler, ohne Meldung.
    //
    // Die Auflösung ist ein Fingerabdruck. Beim Veröffentlichen merken wir
    // uns, WAS wir veröffentlicht haben. Steht in der Datenbank noch genau
    // das, hat niemand eingegriffen — dann darf eine neue Fassung nachziehen.
    // Weicht sie ab, hat jemand die Hand angelegt, und wir rühren nichts an.
    //
    // Das ist der Unterschied zwischen „ist belegt" und „ist bearbeitet". Nur
    // das zweite ist ein Grund, die Finger davonzulassen.
    if (vorhanden?.content && vorhanden.content.trim()) {
      const zuletzt = db.prepare('SELECT value FROM settings WHERE key = ?').get(`legal_seed_${type}`)
      const fingerabdruck = (t) => crypto.createHash('sha256').update(String(t).trim()).digest('hex')

      if (!zuletzt?.value || zuletzt.value !== fingerabdruck(vorhanden.content)) {
        // Entweder von Hand geändert, oder von einem Stand vor dieser Zählung.
        // In beiden Fällen: nicht anfassen. Der Weg über die Verwaltung
        // („Fassung aus dem Projekt prüfen") bleibt offen.
        if (fingerabdruck(vorhanden.content) !== fingerabdruck(text)) unveraendert.push(datei)
        continue
      }
      if (fingerabdruck(vorhanden.content) === fingerabdruck(text)) continue
      db.prepare(`
        UPDATE legal_docs SET title = ?, content = ?, updated_at = datetime('now') WHERE type = ?
      `).run(titel, text, type)
      db.prepare(`
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(`legal_seed_${type}`, fingerabdruck(text))
      nachgezogen++
      continue
    }
    db.prepare(`
      INSERT INTO legal_docs (type, title, content)
      VALUES (?, ?, ?)
      ON CONFLICT(type) DO UPDATE SET title = excluded.title, content = excluded.content
    `).run(type, titel, text)
    db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(`legal_seed_${type}`, crypto.createHash('sha256').update(text.trim()).digest('hex'))
    veroeffentlicht++
  }

  if (veroeffentlicht) console.log(`✅ Seeded: ${veroeffentlicht} Rechtstexte veröffentlicht`)
  if (nachgezogen) console.log(`✅ Nachgezogen: ${nachgezogen} Rechtstext(e) auf den Stand des Projekts`)
  if (unveraendert.length) {
    console.warn(`ℹ️  Rechtstexte weichen ab, wurden aber NICHT überschrieben: ${unveraendert.join(', ')}`)
    console.warn('    Sie wurden in der Verwaltung bearbeitet. Dort unter Rechtliches vergleichen und ggf. übernehmen.')
  }
  if (zurueckgehalten.length) {
    console.warn(`⚠️  Rechtstexte NICHT veröffentlicht, es fehlen noch Angaben: ${zurueckgehalten.join(', ')}`)
    console.warn('    Platzhalter in rechtstexte/ ausfüllen — dann erscheinen sie beim nächsten Start.')
  }
}
