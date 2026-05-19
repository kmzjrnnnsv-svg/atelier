import bcrypt from 'bcryptjs'

export async function seedDatabase(db) {
  // Always run article seeding — independent of user seeding so it
  // also populates articles in existing databases on upgrade.
  seedEmailTemplates(db)
  seedArticles(db)
  seedShoeAccessories(db)
  seedConfiguratorOptions(db)

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get()
  if (userCount.count > 0) return

  console.log('🌱 Seeding database with defaults...')

  const adminEmail    = process.env.SEED_ADMIN_EMAIL    || 'admin@artisansole.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ArtisanSole@2026!'
  const hash = await bcrypt.hash(adminPassword, 12)

  const seedAll = db.transaction(() => {
    // Admin user
    db.prepare(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, 'admin')
    `).run('Admin', adminEmail, hash)

    // Default curator
    const curatorHash = bcrypt.hashSync('Curator@2026!', 12)
    db.prepare(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, 'curator')
    `).run('Curator', 'curator@artisansole.com', curatorHash)

    // Demo / guest user — for trying the app without a real account
    const demoHash = bcrypt.hashSync('Demo@2026!', 12)
    db.prepare(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, 'user')
    `).run('Demo', 'demo@artisansole.com', demoHash)

    // ── SHOES ──────────────────────────────────────────────────
    const shoeStmt = db.prepare(`
      INSERT INTO shoes (name, category, price, material, match_pct, color, tag, image_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    // Oxford — verified free CDN photos
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

    // ── CURATED ITEMS ──────────────────────────────────────────
    const curatedStmt = db.prepare(`
      INSERT INTO curated_items (name, color, badge, sort_order) VALUES (?, ?, ?, ?)
    `)
    curatedStmt.run('Oxblood',     '#7b1e1e', 'Limited Edition', 0)
    curatedStmt.run('Cognac',      '#92400e', 'Classic',         1)
    curatedStmt.run('Midnight',    '#0f172a', 'New Season',      2)
    curatedStmt.run('Ivory Cream', '#faf7f0', 'Seasonal',        3)
    curatedStmt.run('Forest',      '#14532d', 'Exclusive',       4)

    // ── WARDROBE ───────────────────────────────────────────────
    const wardrobeStmt = db.prepare(`
      INSERT INTO wardrobe_items (name, color, sort_order) VALUES (?, ?, ?)
    `)
    wardrobeStmt.run('Charcoal Suit',    '#374151', 0)
    wardrobeStmt.run('Navy Blazer',      '#1e3a5f', 1)
    wardrobeStmt.run('White Dress Shirt','#f9fafb', 2)
    wardrobeStmt.run('Cream Chinos',     '#f5f0e8', 3)
    wardrobeStmt.run('Dark Jeans',       '#1e293b', 4)
    wardrobeStmt.run('Linen Shirt',      '#ecfdf5', 5)
    wardrobeStmt.run('Camel Overcoat',   '#c8a97e', 6)
    wardrobeStmt.run('Black Turtleneck', '#111827', 7)

    // ── OUTFITS ────────────────────────────────────────────────
    const outfitStmt = db.prepare(`
      INSERT INTO outfits (style, description, top, bottom, shoe, shoe_color, bg_color)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    outfitStmt.run('Modern Business',  'Power Meeting Look', 'Charcoal Suit',  'Slim Trousers', 'Heritage Oxford', '#111827', '#f8f9fa')
    outfitStmt.run('Classic Elegance', 'Black Tie Optional', 'Navy Blazer',    'Cream Chinos',  'Monaco Derby',    '#92400e', '#fef9f0')
    outfitStmt.run('Weekend Casual',   'Smart Weekend',      'Linen Shirt',    'Dark Jeans',    'Riviera Loafer',  '#78350f', '#f0f4f8')
    outfitStmt.run('Winter Formal',    'Season Staple',      'Camel Overcoat', 'Slim Trousers', 'Chelsea Boot',    '#92400e', '#1c1917')
  })

  seedAll()
  seedShoeAccessories(db)
  console.log(`✅ Seeded: admin@artisansole.com / ArtisanSole@2026!`)
  console.log(`✅ Seeded: curator@artisansole.com / Curator@2026!`)
  console.log(`✅ Seeded: 12 shoes, 5 curated items, 8 wardrobe items, 4 outfits`)
}

// ── ARTICLES ─────────────────────────────────────────────────────────────────
// Runs independently so it also seeds existing databases on upgrade.
function seedArticles(db) {
  const articleCount = db.prepare('SELECT COUNT(*) as count FROM articles').get()
  if (articleCount.count > 0) return

  const stmt = db.prepare(`
    INSERT INTO articles (title, slug, excerpt, content, category, featured, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  db.transaction(() => {
    stmt.run(
      'Kurzfristige Folgen falschen Schuhwerks',
      'kurzfristige-folgen',
      'Falsch sitzende Schuhe verursachen schon nach wenigen Wochen spürbare Beschwerden — von Blasen bis zu akuten Schmerzen.',
      `Was passiert in den ersten 0–4 Wochen?

Blasen & Druckstellen
Enger Zehenraum oder ein harter Absatz erzeugt Reibung an empfindlichen Stellen. Das Ergebnis: schmerzhafte Hautschäden, die sich schnell zu offenen Wunden entwickeln können.

Muskelermüdung
Fehlt die richtige Dämpfung, müssen Bein- und Fußmuskeln permanent überkompensieren. Die Folge ist eine deutlich schnellere Erschöpfung — besonders bei langen Gehstrecken.

Akute Schmerzen
Schuhe ohne ausreichende Stütze belasten Ferse, Spann und Zehen direkt. Der Schmerz setzt oft schon nach wenigen Stunden ein und verschwindet erst nach dem Ausziehen der Schuhe.

Fazit: Der Körper sendet klare Warnsignale. Wer sie ignoriert, riskiert dauerhafte Schäden.`,
      'Gesundheit', 1, 0
    )

    stmt.run(
      'Mittelfristige Schäden: Schleichende Veränderungen',
      'mittelfristige-schaeden',
      'Nach 1–12 Monaten dauerhafter Fehlbelastung beginnen sich Gelenke und die Körperhaltung nachweislich zu verändern.',
      `Was passiert zwischen 1 und 12 Monaten?

Fehlstellungen
Dauerhafter Druck auf die falschen Stellen führt zu strukturellen Veränderungen: Hallux valgus (Ballenzeh), Hammerzehen und Spreizfuß entstehen nicht über Nacht, sondern durch anhaltende Fehlbelastung.

Gelenkschmerzen
Knie und Sprunggelenk passen ihre Bewegungsmechanik an die veränderte Fußbelastung an — ein Prozess, der Entzündungen auslöst und chronische Schmerzen fördert.

Haltungsschäden
Die Wirbelsäule kompensiert jede Veränderung der Fußstellung. Was klein beginnt, verschiebt schrittweise das gesamte Körpergleichgewicht — mit weitreichenden Folgen für Rücken und Schultern.

Gut zu wissen: Viele dieser Veränderungen sind in diesem Stadium noch reversibel — wenn man rechtzeitig handelt.`,
      'Gesundheit', 1, 1
    )

    stmt.run(
      'Langfristige Folgen: Chronische Schäden',
      'langfristige-folgen',
      'Jahrelange Fehlbelastung kann irreversible Schäden an Füßen, Gelenken und der Wirbelsäule verursachen.',
      `Was passiert nach mehr als einem Jahr?

Chronische Fußprobleme
Plantarfasziitis, Metatarsalgie und das Morton-Neurom (Nervenschmerz im Vorderfuß) zählen zu den häufigsten Langzeitfolgen. In schweren Fällen können diese Beschwerden dauerhaft bleiben.

Knie- und Rückenprobleme
Arthrose in Knie und Hüfte sowie Bandscheibenvorfälle entstehen nicht zufällig. Jahrelange Fehlbelastung durch falsches Schuhwerk ist ein anerkannter Risikofaktor.

Systemische Haltungsschäden
Skoliose, Beckenschiefstand und chronische Rückenschmerzen können direkte Langzeitfolgen dauerhafter Fußfehlstellungen sein.

Der einzige echte Schutz: passgenaues Schuhwerk — gefertigt nach deinen individuellen Maßen.`,
      'Gesundheit', 0, 2
    )

    stmt.run(
      'Tipps für die richtige Schuhwahl',
      'tipps-schuhwahl',
      'Sechs praktische Regeln, die du sofort umsetzen kannst — für gesündere Füße und mehr Wohlbefinden.',
      `6 Regeln für gesundes Schuhwerk

1. Fußlänge regelmäßig nachmessen
Füße verändern sich im Laufe des Lebens — besonders durch Schwangerschaft, Gewichtsveränderungen oder das Alter. Lass deine Füße mindestens einmal jährlich nachmessen.

2. Ausreichend Spielraum
Mindestens 1 cm Platz vor der großen Zehe — beim Stehen, nicht beim Sitzen. Schuhe, die im Geschäft "gerade noch passen", werden spätestens am Nachmittag zu eng.

3. Schuhwerk dem Zweck anpassen
Ein Oxford-Derby ist kein Joggingschuh. Für Sport, Büro und Freizeit braucht es unterschiedliche Schuhe mit passendem Support.

4. Schuhe täglich wechseln
Material braucht Zeit zum Lüften und Zurückformen. Wer täglich in denselben Schuhen läuft, beschleunigt den Verschleiß und reduziert die Stützwirkung.

5. Hochhackige Schuhe begrenzen
High Heels oder stark erhöhte Absätze sollten maximal 2–3 Stunden täglich getragen werden. Danach: flache, stützende Schuhe.

6. 3D-Fußscan für Maßfertigung
Die präziseste Lösung: ein digitaler Fußscan, der deine exakten Maße erfasst. Maßgefertigte Schuhe eliminieren Kompromisse bei der Passform — für maximalen Komfort und langfristige Gesundheit.`,
      'Tipps', 0, 3
    )

    stmt.run(
      'Woraus bestehen hochwertige Schuhe?',
      'materialien-hochwertige-schuhe',
      'Full-Grain Leder, Shell Cordovan, Suede — was steckt wirklich in einem Qualitätsschuh? Ein Überblick für anspruchsvolle Träger.',
      `Materialien, die den Unterschied machen

Full-Grain Calfskin (Vollnarbiges Kalbsleder)
Das hochwertigste konventionelle Leder — die Narbenschicht ist vollständig erhalten, was maximale Festigkeit und Atmungsaktivität garantiert. Mit der Zeit entwickelt es eine charakteristische Patina.

Shell Cordovan
Aus der Rumpfschicht des Pferdes gefertigt, ist Cordovan das Edelste der Lederwelt. Seine dichte Faserstruktur macht es extrem langlebig, wasserabweisend und nahezu unverwüstlich.

Suede & Nubuck
Suede entsteht durch Schleifen der Fleischseite, Nubuck durch Schleifen der Narbenseite. Beide Materialien sind weicher und mattierter — erfordern aber mehr Pflege als glatte Leder.

Burnished Leather
Durch maschinelles oder handwerkliches Bürsten entsteht ein charakteristischer Zweiton-Effekt, der vintage-inspirierte Eleganz verleiht.

Was schlechte Schuhe verrät
Synthetische Innensohlen, Klebverbindungen statt Welt- oder Rahmennähtung und dünne Laufsohlen aus Plastik sind klassische Zeichen eines minderwertigen Schuhs — unabhängig vom Preis.`,
      'Wissen', 0, 4
    )
  })()

  console.log('✅ Seeded: 5 Learn articles')
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
      'Artisan Sole — Bestellbestätigung #{{order_id}}',
      'Vielen Dank, {{name}}. Ihre Bestellung wurde aufgenommen und wird individuell für Sie angefertigt.',
      'Ihre Maßschuhe werden in 6–8 Wochen handgefertigt und direkt zu Ihnen geliefert.\nDen aktuellen Status Ihrer Bestellung finden Sie jederzeit in der Artisan Sole App unter Meine Bestellungen.'
    )
    stmt.run(
      'payment',
      'Zahlungsanweisung',
      'Enthält Bankdaten und Verwendungszweck — wird gleichzeitig mit der Bestellbestätigung gesendet.',
      'Artisan Sole — Zahlungsinformationen Bestellung #{{order_id}}',
      'Vielen Dank, {{name}}. Ihre Bestellung wurde erfasst und wartet auf Ihre Zahlung.\nBitte überweisen Sie den folgenden Betrag an das unten angegebene Konto. Verwenden Sie dabei zwingend den angegebenen Verwendungszweck, damit wir Ihre Zahlung korrekt zuordnen können.',
      'Nach Zahlungseingang werden Ihre Maßschuhe umgehend in die Fertigung gegeben.\nSie erhalten eine Bestätigung, sobald Ihre Zahlung bei uns eingegangen ist.'
    )
    stmt.run(
      'order_confirmed',
      'Zahlung bestätigt',
      'Wird gesendet, wenn der Admin den Zahlungseingang bestätigt und die Fertigung startet.',
      'Artisan Sole — Zahlung bestätigt & Bestellung in Fertigung #{{order_id}}',
      'Ihre Zahlung wurde bestätigt. Ihre Maßschuhe {{shoe_name}} sind nun in der Fertigung.',
      'Den aktuellen Status Ihrer Bestellung finden Sie jederzeit in der Artisan Sole App unter Meine Bestellungen.'
    )
    stmt.run(
      'shipping',
      'Versandbestätigung',
      'Wird gesendet, wenn Admin oder Curator die Bestellung als versandt markiert.',
      'Artisan Sole — Ihre Maßschuhe sind unterwegs! Bestellung #{{order_id}}',
      '{{shoe_name}} wurden soeben versandt und befinden sich auf dem Weg zu Ihnen.',
      'Den aktuellen Status Ihrer Bestellung finden Sie jederzeit in der Artisan Sole App unter Meine Bestellungen.\nBei Fragen wenden Sie sich an unser Team — wir sind gerne für Sie da.'
    )
    stmt.run(
      'manufacturer',
      'Hersteller-Benachrichtigung',
      'Interne E-Mail an den Hersteller mit Bestelldetails und 3D-Fußmaßen.',
      '[Artisan Sole] Neue Bestellung #{{order_id}} — USER-{{user_id_padded}} — {{shoe_name}}',
      'Neue Bestellung eingegangen. Bitte Fertigung vorbereiten.',
      'STL-Dateien mit Kennung U{{user_id_padded}} im Admin-Panel herunterladen.'
    )
  })()
}

// ── SHOE ↔ ACCESSORY ASSIGNMENTS ────────────────────────────────────────────
// Runs independently — assigns accessories to shoes based on material & category.
function seedShoeAccessories(db) {
  const existing = db.prepare('SELECT COUNT(*) as count FROM shoe_accessories').get()
  if (existing.count > 0) return

  // Build lookup maps
  const shoes = db.prepare('SELECT id, name, material, category, color FROM shoes').all()
  const accs  = db.prepare('SELECT id, key FROM accessories WHERE is_active = 1').all()
  if (!shoes.length || !accs.length) return

  const accByKey = Object.fromEntries(accs.map(a => [a.key, a.id]))
  const ak = (key) => accByKey[key] // shorthand

  // Material / category detection helpers
  const isSuede    = (m) => /suede|nubuck|velour/i.test(m)
  const isCordovan = (m) => /cordovan/i.test(m)
  const isPatent   = (m) => /patent|lack/i.test(m)
  const isExotic   = (m) => /croc|krokodil|exotic|embossed|strauss|python/i.test(m)
  const isDark     = (s) => /schwarz|black|midnight|dark|antiqued/i.test(s.material + s.name) || /^#[0-3][0-9a-f]/i.test(s.color)
  const isBoot     = (cat) => cat === 'BOOT'
  const isSneaker  = (cat) => cat === 'SNEAKER'
  const isMonk     = (cat) => cat === 'MONK'
  const hasLaces   = (cat) => cat === 'OXFORD' || cat === 'DERBY'

  const stmt = db.prepare('INSERT OR IGNORE INTO shoe_accessories (shoe_id, accessory_id, sort_order) VALUES (?, ?, ?)')

  db.transaction(() => {
    for (const shoe of shoes) {
      const links = []
      const mat = shoe.material || ''
      const cat = shoe.category || ''

      if (isSneaker(cat)) {
        // ── Sneaker: minimal care ──
        if (ak('dustbag'))     links.push(ak('dustbag'))
        if (ak('sneaker_kit')) links.push(ak('sneaker_kit'))
      } else if (isSuede(mat)) {
        // ── Suede / Nubuck: specific care ──
        if (ak('shoetrees'))    links.push(ak('shoetrees'))
        if (ak('dustbag'))      links.push(ak('dustbag'))
        if (ak('shoehorn'))     links.push(ak('shoehorn'))
        if (ak('suede_brush'))  links.push(ak('suede_brush'))
        if (ak('suede_spray'))  links.push(ak('suede_spray'))
        if (ak('suede_eraser')) links.push(ak('suede_eraser'))
        if (hasLaces(cat) && ak('waxed_laces')) links.push(ak('waxed_laces'))
      } else if (isCordovan(mat)) {
        // ── Shell / Cognac Cordovan ──
        if (ak('shoetrees'))       links.push(ak('shoetrees'))
        if (ak('dustbag'))         links.push(ak('dustbag'))
        if (ak('shoehorn'))        links.push(ak('shoehorn'))
        if (ak('belt'))            links.push(ak('belt'))
        if (ak('horsehair_brush')) links.push(ak('horsehair_brush'))
        if (ak('cordovan_balm'))   links.push(ak('cordovan_balm'))
        if (ak('polishing_cloth')) links.push(ak('polishing_cloth'))
        if (ak('sole_oil'))        links.push(ak('sole_oil'))
        if (isBoot(cat) && ak('boot_jack')) links.push(ak('boot_jack'))
        if (hasLaces(cat) && ak('waxed_laces')) links.push(ak('waxed_laces'))
      } else if (isPatent(mat)) {
        // ── Patent Leather ──
        if (ak('shoetrees'))       links.push(ak('shoetrees'))
        if (ak('dustbag'))         links.push(ak('dustbag'))
        if (ak('shoehorn'))        links.push(ak('shoehorn'))
        if (ak('belt'))            links.push(ak('belt'))
        if (ak('patent_care'))     links.push(ak('patent_care'))
        if (ak('polishing_cloth')) links.push(ak('polishing_cloth'))
        if (hasLaces(cat) && ak('waxed_laces')) links.push(ak('waxed_laces'))
      } else if (isExotic(mat)) {
        // ── Crocodile-Embossed / Exotic ──
        if (ak('shoetrees'))       links.push(ak('shoetrees'))
        if (ak('dustbag'))         links.push(ak('dustbag'))
        if (ak('shoehorn'))        links.push(ak('shoehorn'))
        if (ak('belt'))            links.push(ak('belt'))
        if (ak('exotic_care'))     links.push(ak('exotic_care'))
        if (ak('polishing_cloth')) links.push(ak('polishing_cloth'))
        if (ak('sole_oil'))        links.push(ak('sole_oil'))
        if (isMonk(cat) && ak('buckle_cloth')) links.push(ak('buckle_cloth'))
      } else {
        // ── Smooth leather (Calfskin, Pebble-Grain, etc.) ──
        if (ak('shoetrees'))       links.push(ak('shoetrees'))
        if (ak('dustbag'))         links.push(ak('dustbag'))
        if (ak('shoehorn'))        links.push(ak('shoehorn'))
        if (ak('belt'))            links.push(ak('belt'))
        if (ak('horsehair_brush')) links.push(ak('horsehair_brush'))
        // Color-matched shoe cream
        if (isDark(shoe)) {
          if (ak('cream_dark')) links.push(ak('cream_dark'))
        } else {
          if (ak('cream_cognac')) links.push(ak('cream_cognac'))
        }
        if (ak('polishing_cloth')) links.push(ak('polishing_cloth'))
        if (ak('sole_oil'))        links.push(ak('sole_oil'))
        if (isBoot(cat) && ak('boot_jack'))     links.push(ak('boot_jack'))
        if (isMonk(cat) && ak('buckle_cloth'))  links.push(ak('buckle_cloth'))
        if (hasLaces(cat) && ak('waxed_laces')) links.push(ak('waxed_laces'))
      }

      // Insert all links with sort_order
      links.forEach((accId, idx) => {
        if (accId) stmt.run(shoe.id, accId, idx)
      })
    }
  })()

  console.log(`✅ Seeded: shoe-accessory assignments for ${shoes.length} shoes`)
}

// ─────────────────────────────────────────────────────────────────────
// Konfigurator-Optionen — Last, Sohle, Welt, Heel, Toe, Schnalle,
// Loafer-Dekor, Beveled Waist + Vorlagen pro Kategorie.
// Idempotent: läuft bei jedem Start, fügt nur fehlende Einträge ein.
// ─────────────────────────────────────────────────────────────────────
function seedConfiguratorOptions(db) {
  // 1) Option-Gruppen
  const GROUPS = [
    { key: 'last',              label: 'Leisten',        ui_type: 'single', required: 1, sort_order: 0, description: 'Leistenform — bestimmt Zehenform, Taille und Proportion.' },
    { key: 'sole',              label: 'Sohle',          ui_type: 'single', required: 1, sort_order: 1, description: 'Sohlentyp.' },
    { key: 'welt',              label: 'Welt',           ui_type: 'single', required: 1, sort_order: 2, description: 'Rahmen — City für glatten Look, Country/Storm für robusten Auftritt.' },
    { key: 'heel',              label: 'Absatz',         ui_type: 'single', required: 1, sort_order: 3, description: 'Standard- oder erhöhter Absatz.' },
    { key: 'toe',               label: 'Zehenkappe',     ui_type: 'single', required: 0, sort_order: 4, description: 'Zehenkappenform.' },
    { key: 'buckle',            label: 'Schnalle',       ui_type: 'single', required: 1, sort_order: 5, description: 'Schnallenform (für Monk-Modelle).' },
    { key: 'loafer_decoration', label: 'Loafer-Dekor',   ui_type: 'single', required: 0, sort_order: 6, description: 'Dekoration bei Loafer-Modellen.' },
    { key: 'beveled_waist',     label: 'Beveled Waist',  ui_type: 'toggle', required: 0, sort_order: 7, description: 'Schlanke Taille für eleganteren Look.' },
  ]
  const insGroup = db.prepare(`
    INSERT OR IGNORE INTO option_groups (key, label, description, ui_type, required, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  GROUPS.forEach(g => insGroup.run(g.key, g.label, g.description, g.ui_type, g.required, g.sort_order))

  const groupId = (key) => db.prepare('SELECT id FROM option_groups WHERE key = ?').get(key)?.id

  // 2) Werte pro Gruppe (alles, was du in den Screenshots gezeigt hast)
  const OPTIONS = [
    // Leisten (Last)
    { group: 'last', key: 'zurigo',    label: 'Zurigo',    description: 'Runde Zehenform für klassisch-englischen Look.',            price: 0,  cats: 'OXFORD,WHOLECUT,DERBY,LOAFER,CHELSEA,MONK,DOUBLE_MONK' },
    { group: 'last', key: 'monti',     label: 'Monti',     description: 'Klassische Eleganz mit leicht quadratischer Zehe.',         price: 0,  cats: 'OXFORD,WHOLECUT,DERBY,LOAFER,MONK,DOUBLE_MONK' },
    { group: 'last', key: 'savile',    label: 'Savile',    description: 'Schlanker Look mit leichter Chisel-Zehe.',                  price: 0,  cats: 'OXFORD,WHOLECUT,DERBY,LOAFER,CHELSEA,MONK,DOUBLE_MONK' },
    { group: 'last', key: 'belgravia', label: 'Belgravia', description: 'Chisel-Zehe, schmale Taille und kubanischer Absatz.',       price: 0,  cats: 'OXFORD,WHOLECUT,CHELSEA' },

    // Sohle
    { group: 'sole', key: 'leather',          label: 'Leather',          description: 'Klassische Ledersohle.',                                price: 0,  cats: '*' },
    { group: 'sole', key: 'leather_mountain', label: 'Leather Mountain', description: 'Leder mit Bergprofil für mehr Grip.',                   price: 0,  cats: '*' },
    { group: 'sole', key: 'leather_buttons',  label: 'Leather Buttons',  description: 'Leder mit Noppen-Einsatz.',                             price: 0,  cats: '*' },
    { group: 'sole', key: 'leather_rubber',   label: 'Leather + Rubber', description: 'Leder mit Gummi-Mittelsteg.',                           price: 0,  cats: '*' },
    { group: 'sole', key: 'dainite',          label: 'Dainite',          description: 'Klassische Stollen-Gummisohle.',                        price: 5,  cats: '*' },
    { group: 'sole', key: 'commando',         label: 'Commando',         description: 'Grobes Profil — maximaler Grip.',                       price: 0,  cats: '*' },
    { group: 'sole', key: 'crepe',            label: 'Crepe',            description: 'Naturkautschuk, sehr komfortabel.',                     price: 5,  cats: 'LOAFER,DERBY,SNEAKER' },
    { group: 'sole', key: 'rubber',           label: 'Rubber',           description: 'Glatte Gummisohle.',                                    price: 0,  cats: '*' },
    { group: 'sole', key: 'dots',             label: 'Dots',             description: 'Gummi mit feinen Noppen.',                              price: 0,  cats: '*' },
    { group: 'sole', key: 'rocky',            label: 'Rocky',            description: 'Robuste Outdoor-Sohle.',                                price: 0,  cats: 'CHELSEA,BOOT,DERBY' },
    { group: 'sole', key: 'beveled_waist',    label: 'Beveled Waist',    description: 'Schlanke, gewölbte Taille.',                            price: 35, cats: 'OXFORD,WHOLECUT,DERBY,MONK,DOUBLE_MONK' },
    { group: 'sole', key: 'art',              label: 'Art',              description: 'Handbemalte Spezialsohle.',                             price: 17, cats: '*' },

    // Welt (Rahmen)
    { group: 'welt', key: 'city',    label: 'City',    description: 'Schmaler Rahmen für eleganten Look.', price: 0, cats: '*' },
    { group: 'welt', key: 'country', label: 'Country', description: 'Breiterer Rahmen, robuster Look.',     price: 0, cats: '*' },
    { group: 'welt', key: 'storm',   label: 'Storm',   description: 'Wasserdichter Rahmen für Outdoor.',    price: 0, cats: '*' },

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
