import bcrypt from 'bcryptjs'

export async function seedDatabase(db) {
  // Always run article seeding — independent of user seeding so it
  // also populates articles in existing databases on upgrade.
  seedEmailTemplates(db)
  seedArticles(db)
  seedShoeAccessories(db)
  seedAccessoryMaterials(db)
  seedConfiguratorOptions(db)
  seedExtendedCatalog(db)
  seedMatrixModels(db)
  // Eigenstaendige Loafer-Stilmodelle (feste Ausfuehrung) — vor V2, damit
  // der Force-Reset ihnen die vollstaendige Loafer-Konfiguration zuweist.
  seedLoaferVariants(db)
  // V2 LÄUFT ZULETZT — räumt veraltete Templates auf und richtet
  // sie exakt nach der User-Matrix aus, plus force-reset für die
  // 16 Standardmodelle.
  seedMatrixTemplatesV2(db)
  // Passform-Maßtabelle (Leisten × Weite × Größe → Fußlänge + Ballenumfang).
  // Unabhängig & idempotent (INSERT OR IGNORE) — NICHT an V2 koppeln, das
  // category_templates leert.
  seedLastSizeChart(db)
  seedFaqs(db)

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

// seedAccessoryMaterials — ordnet jedes Zubehör seiner passenden Lederart zu
// (Pflege nach Material statt nach Schuhmodell). Im Konfigurator wird Zubehör
// gezeigt, dessen material_keys '*' ist ODER das gewählte Material enthält.
// Idempotent + nicht-destruktiv: setzt NUR Zeilen, deren material_keys noch
// NULL ist — manuelle CMS-Zuordnungen bleiben erhalten.
function seedAccessoryMaterials(db) {
  // Material-Gruppen (aktive + Legacy-Keys).
  const SMOOTH = 'lux_calf,painted_full_grain,patina,box_calf,painted_calf,calfskin'
  const SUEDE  = 'lux_suede,urban_suede,suede'
  const SUEDE_VELVET = 'lux_suede,urban_suede,suede,velvet'

  const PATINA = 'patina,painted_full_grain,painted_calf'
  const CALF   = 'lux_calf,box_calf,painted_calf'

  // Zubehör-Key → material_keys. '*' = bei jedem Material zeigen (universell).
  const MAP = {
    // universell (Formerhalt, Aufbewahrung, Hardware, Sohlenpflege)
    shoetrees: '*', dustbag: '*', shoehorn: '*', belt: '*',
    boot_jack: '*', waxed_laces: '*', buckle_cloth: '*', sole_oil: '*',
    sneaker_kit: '*',
    // Glattleder-Pflege
    carekit: SMOOTH, horsehair_brush: SMOOTH, cream_dark: SMOOTH,
    cream_cognac: SMOOTH, cordovan_balm: SMOOTH, polishing_cloth: SMOOTH,
    // Wildleder/Velours
    suede_brush: SUEDE, suede_eraser: SUEDE, suede_spray: SUEDE_VELVET,
    // Spezialleder ohne aktuelles Material → bleibt verborgen, bis es existiert
    patent_care: 'patent', exotic_care: 'exotic',
    // Neu: Spanner (universell) + Pflege-Kits je Lederart
    shoe_tree_black: '*', shoe_tree_cedar: '*', boot_tree_cedar: '*',
    care_kit_saphir_patina: PATINA, care_kit_suede: SUEDE,
    care_kit_leather: SMOOTH, calf_care_cream: CALF, shoe_cream_black: SMOOTH,
  }

  // Zubehör-Key → color_match (CSV Schlüsselwörter). Nur farb-spezifische Artikel.
  const COLOR_MAP = {
    shoe_tree_black: 'schwarz,black',
    shoe_cream_black: 'schwarz,black',
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
// Konfigurator-Optionen — Last, Sohle, Welt, Heel, Toe, Schnalle,
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
    { key: 'last',              label: 'Schuhform',      ui_type: 'single', required: 1, sort_order: 1,  description: 'Leistenform — bestimmt Zehenform, Taille und Proportion.' },
    { key: 'wholecut_base',     label: 'Base',           ui_type: 'single', required: 1, sort_order: 2,  description: 'Vorderkappen-Verarbeitung (nur Whole Cut).' },
    { key: 'heel',              label: 'Absatz',         ui_type: 'single', required: 1, sort_order: 3,  description: 'Standard- oder erhöhter Absatz.' },
    { key: 'loafer_decoration', label: 'Accessoires',    ui_type: 'single', required: 0, sort_order: 4,  description: 'Dekoration bei Loafer-Modellen.' },
    { key: 'sole',              label: 'Sohle Unten',    ui_type: 'single', required: 1, sort_order: 5,  description: 'Sohlentyp.' },
    { key: 'sole_color',        label: 'Sohlen Color',   ui_type: 'single', required: 0, sort_order: 6,  description: 'Farbe der Außensohle (sichtbarer Rand).' },
    { key: 'welt',              label: 'Welt',           ui_type: 'single', required: 1, sort_order: 7,  description: 'Rahmen — City für glatten Look, Country/Storm für robusten Auftritt.' },
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
    ON CONFLICT(key) DO UPDATE SET
      label = excluded.label,
      description = excluded.description,
      ui_type = excluded.ui_type,
      required = excluded.required,
      sort_order = excluded.sort_order,
      updated_at = datetime('now')
  `)
  GROUPS.forEach(g => insGroup.run(g.key, g.label, g.description, g.ui_type, g.required, g.sort_order))

  const groupId = (key) => db.prepare('SELECT id FROM option_groups WHERE key = ?').get(key)?.id

  // 2) Werte pro Gruppe (alles, was du in den Screenshots gezeigt hast)
  const OPTIONS = [
    // Leisten (Last)
    { group: 'last', key: 'zurigo',    label: 'Zurigo',    description: 'Runde Zehenform für traditionell-englischen Look. Bietet am meisten Platz im Zehenbereich — ideal für breitere Füße oder hohen Spann.', price: 0,  cats: 'OXFORD,WHOLECUT,DERBY,LOAFER,CHELSEA,MONK,DOUBLE_MONK' },
    { group: 'last', key: 'monti',     label: 'Monti',     description: 'Klassische Eleganz mit leicht quadratischer Zehe. Der vielseitige Allrounder — passt zu den meisten Fußformen und jedem Anlass.',     price: 0,  cats: 'OXFORD,WHOLECUT,DERBY,LOAFER,MONK,DOUBLE_MONK' },
    { group: 'last', key: 'savile',    label: 'Savile',    description: 'Schlanker Look mit leichter Chisel-Zehe. Elegant für normale bis schmale Füße.',                                                       price: 0,  cats: 'OXFORD,WHOLECUT,DERBY,LOAFER,CHELSEA,MONK,DOUBLE_MONK' },
    { group: 'last', key: 'belgravia', label: 'Belgravia', description: 'Chisel-Zehe, schmale Taille und kubanischer Absatz. Markantes Statement — am besten für schlanke Füße.',                                price: 0,  cats: 'OXFORD,WHOLECUT,CHELSEA' },

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

// ─────────────────────────────────────────────────────────────────────
// seedExtendedCatalog — vollständiges Material/Farb/Konfig-Setup
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
    { key: 'painted_full_grain',  label: 'Painted Full Grain',  sub: 'Aesthetic', family: 'aesthetic', color: '#5b2c0e', tip: 'Patinierungs-Vollnarbenleder. Robust UND optisch veredelt — die Allzweckwahl.', rating: 'good', sort: 2 },
    { key: 'patina',              label: 'Patina',              sub: 'Aesthetic', family: 'aesthetic', color: '#1c1c1e', tip: 'Speziell handpatiniert.',                        rating: 'neutral', sort: 3 },
    { key: 'velvet',              label: 'Velvet',              sub: 'Aesthetic', family: 'aesthetic', color: '#2d1b3d', tip: 'Samt — exklusiv für Slipper, Boots, Drake.',     rating: 'neutral', sort: 4 },
    // Durable
    { key: 'box_calf',            label: 'Box Calf',            sub: 'Durable',   family: 'durable',   color: '#1c1c1e', tip: 'Klassisches Box-Calf — robust und matt.',        rating: 'good',    sort: 10 },
    { key: 'urban_suede',         label: 'Urban Suede',         sub: 'Durable',   family: 'durable',   color: '#7c3a1e', tip: 'Wetterbeständiges Veloursleder.',                rating: 'good',    sort: 11 },
    { key: 'painted_calf',        label: 'Painted Calf',        sub: 'Durable',   family: 'durable',   color: '#5b2c0e', tip: 'Patinierungs-Kalbleder, alltagstauglich.',       rating: 'good',    sort: 12 },
    // Painted Full Grain (Durable) wurde mit Aesthetic-Variante zusammengeführt
  ]
  const insMat = db.prepare(`
    INSERT INTO shoe_materials (key, label, sub, color, available, tip, rating, sort_order, family)
    VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET label=excluded.label, sub=excluded.sub, color=excluded.color,
      tip=excluded.tip, rating=excluded.rating, sort_order=excluded.sort_order, family=excluded.family,
      updated_at = datetime('now')
  `)
  MATERIALS.forEach(m => insMat.run(m.key, m.label, m.sub, m.color, m.tip, m.rating, m.sort, m.family))

  // Alte/Legacy-Materialien (calfskin, suede, patent, cordovan, exotic,
  // scotch_grain, …) auf available=0 setzen → tauchen nicht mehr in der
  // User-UI auf. Nur Matrix-Materialien sind aktiv.
  const MATRIX_KEYS = MATERIALS.map(m => m.key)
  const placeholders = MATRIX_KEYS.map(() => '?').join(',')
  db.prepare(`UPDATE shoe_materials SET available = 0 WHERE key NOT IN (${placeholders})`).run(...MATRIX_KEYS)

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
    ON CONFLICT(key) DO UPDATE SET hex=excluded.hex, name=excluded.name, rating=excluded.rating,
      sort_order=excluded.sort_order, applicable_materials=excluded.applicable_materials,
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
    ON CONFLICT(key) DO UPDATE SET label=excluded.label, description=excluded.description,
      ui_type=excluded.ui_type, required=excluded.required, sort_order=excluded.sort_order,
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
    ON CONFLICT(group_id, key) DO UPDATE SET label=excluded.label, description=excluded.description,
      default_price_extra=excluded.default_price_extra, applicable_categories=excluded.applicable_categories,
      sort_order=excluded.sort_order, updated_at = datetime('now')
  `)
  NEW_OPTIONS.forEach((o, i) => {
    const gid = groupIdOf(o.group)
    if (gid) insOpt.run(gid, o.key, o.label, o.description, o.price, o.cats, i)
  })

  // Existing sole options auf Matrix-Preise aktualisieren
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
    // DOUBLE_MONK — Sohle Color + Buckle Color
    ['DOUBLE_MONK', 'sole_color:natural', 1], ['DOUBLE_MONK', 'sole_color:black'], ['DOUBLE_MONK', 'sole_color:brown'], ['DOUBLE_MONK', 'sole_color:brick'],
    ['DOUBLE_MONK', 'buckle_color:nickel', 1], ['DOUBLE_MONK', 'buckle_color:gold'], ['DOUBLE_MONK', 'buckle_color:graphite'], ['DOUBLE_MONK', 'buckle_color:copper'],
    ['DOUBLE_MONK', 'inner_color:black', 1], ['DOUBLE_MONK', 'inner_color:brown'], ['DOUBLE_MONK', 'inner_color:tan'],
    ['DOUBLE_MONK', 'sole_bottom_color:natural', 1], ['DOUBLE_MONK', 'sole_bottom_color:black'], ['DOUBLE_MONK', 'sole_bottom_color:brown'],
    // MONK — gleich wie Double Monk
    ['MONK', 'sole_color:natural', 1], ['MONK', 'sole_color:black'], ['MONK', 'sole_color:brown'],
    ['MONK', 'buckle_color:nickel', 1], ['MONK', 'buckle_color:gold'], ['MONK', 'buckle_color:graphite'],
    ['MONK', 'inner_color:black', 1], ['MONK', 'inner_color:brown'],
    ['MONK', 'sole_bottom_color:natural', 1], ['MONK', 'sole_bottom_color:black'],
    // OXFORD + DERBY + LOAFER — Innen + Unterseite
    ['OXFORD', 'inner_color:black', 1], ['OXFORD', 'inner_color:brown'], ['OXFORD', 'inner_color:tan'], ['OXFORD', 'inner_color:cognac'], ['OXFORD', 'inner_color:navy'],
    ['OXFORD', 'sole_bottom_color:natural', 1], ['OXFORD', 'sole_bottom_color:black'], ['OXFORD', 'sole_bottom_color:brown'], ['OXFORD', 'sole_bottom_color:cognac'],
    ['DERBY', 'welt:city', 1], ['DERBY', 'welt:storm'],
    ['DERBY', 'inner_color:brown', 1], ['DERBY', 'inner_color:black'], ['DERBY', 'inner_color:tan'],
    ['DERBY', 'sole_bottom_color:natural', 1], ['DERBY', 'sole_bottom_color:brown'],
    ['LOAFER', 'inner_color:brown', 1], ['LOAFER', 'inner_color:black'], ['LOAFER', 'inner_color:tan'],
    ['LOAFER', 'sole_bottom_color:natural', 1], ['LOAFER', 'sole_bottom_color:brown'],
    ['LOAFER', 'loafer_decoration:ohne', 1], ['LOAFER', 'loafer_decoration:tassels'], ['LOAFER', 'loafer_decoration:albert_tassels'], ['LOAFER', 'loafer_decoration:horsebit'], ['LOAFER', 'loafer_decoration:albert_mask'],
    // CHELSEA / BALMORAL / JODHPUR / CHUKKA — nur Style + Color
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
  // Icons pro Gruppe (Lucide-Names) — für visuelle Akzente
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
    last:              'Die Leistenform bestimmt das Profil des Schuhs. Sie entscheidet über Zehenform, Schmalheit der Taille und Proportion. Wählen Sie eine Form, die zu Ihrem Stil und Anlass passt.',
    sole:              'Die Sohle prägt Tragekomfort und Outdoor-Tauglichkeit. Ledersohle für klassisches Auftreten, Dainite oder Commando für mehr Grip und Wetterfestigkeit.',
    welt:              'Der Rahmen (Welt) verbindet Schaft und Sohle. City ist schmal und elegant, Country breiter und robuster, Storm zusätzlich wassergeschützt.',
    heel:              'Standard-Absatz für die meisten Anlässe. Higher Heel gibt mehr Höhe und einen markanteren Auftritt.',
    toe:               'Die Zehenkappe ist das prägende Detail vorne. Punch Cap mit klassischer Lochung, Plain Toe für minimalistischen Look, Cap Toe mit aufgesetzter Naht.',
    wholecut_base:     'Verarbeitung der Vorderkappe für den nahtlosen Whole-Cut-Schuh.',
    buckle:            'Schnallenform: Rund für klassische Eleganz, eckig für modernen Akzent.',
    buckle_color:      'Metall-Finish der Schnalle. Nickel ist der Klassiker, Gold setzt warme Akzente, Graphite ist diskret-modern, Copper auffällig.',
    inner_color:       'Farbe des Futters — sichtbar nur beim Anziehen. Klassisch farblich abgestimmt oder bewusst kontrastreich.',
    sole_color:        'Farbe des Sohlenrands (außen sichtbar). Natural ist neutral, Black diskret, Brick & Brown setzen Akzente.',
    sole_bottom_color: 'Farbe der Sohlen-Unterseite. Wird nur beim Sitzen oder Übereinanderschlagen der Beine sichtbar — ein subtiles Detail für Kenner.',
    loafer_decoration: 'Dekoration auf dem Spann: Tassels & Albert klassisch, Horsebit als Statement, Bow elegant, Ohne für puristischen Look.',
    beveled_waist:     'Schlanke, geschwungene Taille zwischen Ballen und Absatz. Subtil sichtbar, aber Markenzeichen feinster Maßschuhmacherei (+€19).',
  }
  const upHelper = db.prepare(`
    UPDATE option_groups SET helper_text = ?, updated_at = datetime('now') WHERE key = ?
  `)
  Object.entries(HELPER_TEXT).forEach(([k, t]) => upHelper.run(t, k))

  // ── 8) Empfehlungen (Badge „EMPFOHLEN" im Konfigurator) ────────────────
  const RECOMMENDATIONS = [
    // [group_key, option_key, reason]
    ['last',  'monti',    'Für die meisten Füße die beste Wahl — die leicht quadratische Zehe ist vielseitig und elegant. Breite Füße: lieber Zurigo (mehr Platz). Schmale Füße: Savile oder Belgravia.'],
    ['welt',  'city',     'Klassischer Allrounder — für Business und elegante Anlässe ideal.'],
    ['heel',  'standard', 'Klassische Höhe — passt zu allen Outfits und Anlässen.'],
    ['sole',  'dainite',  'Unser Allwetter-Favorit — sicherer Halt bei Regen und Schnee.'],
    ['toe',   'plain_toe', 'Zeitlos und vielseitig — passt zu jedem Anlass.'],
  ]
  const upRec = db.prepare(`
    UPDATE options SET recommended = 1, recommendation_reason = ?, updated_at = datetime('now')
    WHERE id = (SELECT o.id FROM options o JOIN option_groups g ON g.id = o.group_id WHERE g.key = ? AND o.key = ?)
  `)
  RECOMMENDATIONS.forEach(([gk, ok, reason]) => upRec.run(reason, gk, ok))

  console.log(`✅ Seeded: extended catalog (${MATERIALS.length} materials, ${COLORS.length} colors, ${NEW_GROUPS.length} option groups, ${NEW_OPTIONS.length} options, ${TEMPLATES.length} template entries, ${Object.keys(COLOR_HEX_MAP).length} hex codes, ${Object.keys(HELPER_TEXT).length} helper texts, ${RECOMMENDATIONS.length} recommendations)`)
}

// ─────────────────────────────────────────────────────────────────────
// seedMatrixModels — stellt sicher, dass für jedes Modell aus der
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
  let added = 0
  for (const m of MATRIX_MODELS) {
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

  console.log(`✅ Seeded: matrix mappings — ${matApplied} shoes got material whitelists, ${optApplied} shoes got option configs`)
}

// ─────────────────────────────────────────────────────────────────────
// seedLoaferVariants — eigenstaendige Loafer-Stilmodelle (Horsebit,
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
  let created = 0
  for (const v of VARIANTS) {
    const existing = findByName.get(v.name)
    if (existing) { setDeco.run(v.deco, existing.id); continue }
    try {
      ins.run(v.name, v.price, v.material, v.color, v.tag, v.image, v.tagline, v.description, v.deco)
      created++
    } catch { /* z. B. fehlende tagline/description-Spalte auf altem Schema */ }
  }
  console.log(`✅ Seeded: Loafer-Stilmodelle — ${created} neu angelegt, ${VARIANTS.length - created} bereits vorhanden`)
}

// ─────────────────────────────────────────────────────────────────────
// seedMatrixTemplatesV2 — Hard-Reset der Konfigurator-Vorlagen exakt
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
  const SOLE_TYPES = ['leather', 'leather_mountain', 'leather_buttons', 'leather_rubber', 'commando', 'crepe', 'gummy_sole', 'dainite', 'beveled_waist']
  const LAST_FULL  = ['zurigo', 'monti', 'savile', 'belgravia']
  const HEEL_FULL  = ['standard', 'higher_heel']
  const BUCKLE     = ['square_buckle', 'round_buckle']
  const BUCKLE_COL = ['nickel', 'gold', 'graphite', 'copper']

  // Hilfsfunktion: Liste in TEMPLATES-Entries umwandeln mit Default beim 1.
  const mk = (cat, group, keys) => keys.map((k, i) => [cat, `${group}:${k}`, i === 0 ? 1 : 0])

  // Vollständige Matrix-Templates pro Schuhkategorie
  const M = {
    OXFORD: [
      ...mk('OXFORD', 'last', LAST_FULL),
      ...mk('OXFORD', 'heel', HEEL_FULL),
      ...mk('OXFORD', 'welt', ['city', 'country', 'storm']),
      ...mk('OXFORD', 'sole_color', SOLE_COLOR_FULL),
      ...mk('OXFORD', 'inner_color', INNER_FULL),
      ...mk('OXFORD', 'sole_bottom_color', BOTTOM_FULL),
    ],
    WHOLECUT: [
      ...mk('WHOLECUT', 'last', LAST_FULL),
      ...mk('WHOLECUT', 'wholecut_base', ['plain', 'punched_cap', 'full_punched']),
      ...mk('WHOLECUT', 'heel', HEEL_FULL),
      ...mk('WHOLECUT', 'sole', SOLE_TYPES),
      ...mk('WHOLECUT', 'sole_color', SOLE_COLOR_FULL),
      ...mk('WHOLECUT', 'welt', ['city', 'country', 'storm']),
      ...mk('WHOLECUT', 'inner_color', INNER_FULL),
      ...mk('WHOLECUT', 'sole_bottom_color', BOTTOM_FULL),
    ],
    LOAFER: [
      ...mk('LOAFER', 'last', LAST_FULL),
      ...mk('LOAFER', 'heel', HEEL_FULL),
      ...mk('LOAFER', 'loafer_decoration', ['ohne', 'tassels', 'albert_tassels', 'albert_mask', 'horsebit']),
      ...mk('LOAFER', 'sole_color', SOLE_COLOR_FULL),
      ...mk('LOAFER', 'welt', ['city', 'country', 'storm']),
      ...mk('LOAFER', 'inner_color', INNER_FULL),
      ...mk('LOAFER', 'sole_bottom_color', BOTTOM_FULL),
    ],
    DERBY: [
      ...mk('DERBY', 'last', LAST_FULL),
      ...mk('DERBY', 'heel', HEEL_FULL),
      ...mk('DERBY', 'sole', SOLE_TYPES),
      ...mk('DERBY', 'sole_color', SOLE_COLOR_FULL),
      ...mk('DERBY', 'welt', ['city', 'storm']), // Matrix: nur City + Storm
      ...mk('DERBY', 'inner_color', INNER_FULL),
      ...mk('DERBY', 'sole_bottom_color', BOTTOM_FULL),
    ],
    DOUBLE_MONK: [
      ...mk('DOUBLE_MONK', 'last', LAST_FULL),
      ...mk('DOUBLE_MONK', 'heel', HEEL_FULL),
      ...mk('DOUBLE_MONK', 'sole', SOLE_TYPES.filter(s => s !== 'beveled_waist')), // Matrix: ohne Beveled Waist
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
      ...mk('MONK', 'sole', SOLE_TYPES.filter(s => s !== 'beveled_waist')),
      ...mk('MONK', 'sole_color', SOLE_COLOR_FULL),
      ...mk('MONK', 'welt', ['city', 'country', 'storm']),
      ...mk('MONK', 'buckle', BUCKLE),
      ...mk('MONK', 'buckle_color', BUCKLE_COL),
      ...mk('MONK', 'inner_color', INNER_FULL),
      ...mk('MONK', 'sole_bottom_color', BOTTOM_FULL),
    ],
    // Stiefel-Familie (nur Last + Farben pro Matrix)
    CHELSEA:  [...mk('CHELSEA',  'last', LAST_FULL), ...mk('CHELSEA',  'inner_color', INNER_FULL), ...mk('CHELSEA',  'sole_bottom_color', INNER_FULL)],
    BOOT:     [...mk('BOOT',     'last', LAST_FULL), ...mk('BOOT',     'inner_color', INNER_FULL), ...mk('BOOT',     'sole_bottom_color', INNER_FULL)],
    BALMORAL: [...mk('BALMORAL', 'last', LAST_FULL), ...mk('BALMORAL', 'inner_color', INNER_FULL), ...mk('BALMORAL', 'sole_bottom_color', INNER_FULL)],
    JODHPUR:  [...mk('JODHPUR',  'last', LAST_FULL), ...mk('JODHPUR',  'inner_color', INNER_FULL), ...mk('JODHPUR',  'sole_bottom_color', INNER_FULL)],
    CHUKKA:   [...mk('CHUKKA',   'last', LAST_FULL), ...mk('CHUKKA',   'inner_color', INNER_FULL), ...mk('CHUKKA',   'sole_bottom_color', INNER_FULL)],
    // Slipper-Familie (Accessoires + Innen)
    BELGIAN_SLIPPER: [
      ...mk('BELGIAN_SLIPPER', 'loafer_decoration', ['ohne', 'tassels', 'bow']),
      ...mk('BELGIAN_SLIPPER', 'inner_color', INNER_FULL),
    ],
    WELLINGTON: [
      ...mk('WELLINGTON', 'loafer_decoration', ['ohne', 'tassels', 'albert_tassels', 'albert_mask', 'horsebit']),
      ...mk('WELLINGTON', 'inner_color', INNER_FULL),
    ],
    DRAKE: [
      ...mk('DRAKE', 'loafer_decoration', ['ohne', 'tassels', 'albert_tassels', 'albert_mask', 'horsebit']),
      ...mk('DRAKE', 'inner_color', INNER_FULL),
    ],
    // Sneaker-Familie (nur Farbe innen + Sohle weiß)
    SNEAKER:          [...mk('SNEAKER',          'inner_color', INNER_FULL), ['SNEAKER',          'sole_bottom_color:white', 1]],
    SNEAKER_LACED:    [...mk('SNEAKER_LACED',    'inner_color', INNER_FULL), ['SNEAKER_LACED',    'sole_bottom_color:white', 1]],
    SNEAKER_BOOT:     [...mk('SNEAKER_BOOT',     'inner_color', INNER_FULL), ['SNEAKER_BOOT',     'sole_bottom_color:white', 1]],
    LACELESS_TRAINER: [...mk('LACELESS_TRAINER', 'inner_color', INNER_FULL), ['LACELESS_TRAINER', 'sole_bottom_color:white', 1]],
  }

  // 1) Templates komplett ersetzen
  db.prepare('DELETE FROM category_templates').run()
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

  // 3) ALLE Schuhe ohne shoe_options bekommen jetzt — mit den korrigierten
  //    Matrix-Templates — automatisch eine Konfiguration anhand ihrer
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
  const matrixCats = Object.keys(MATRIX_MATERIALS_V2)
  const matrixCatsPlaceholders = matrixCats.map(() => '?').join(',')
  const shoesWithMatrixCat = db.prepare(
    `SELECT id, category, name FROM shoes WHERE category IN (${matrixCatsPlaceholders})`
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

  console.log(`✅ Seeded: matrix templates V2 — ${inserted} tpl rows, ${resetCount} matrix shoes reset, ${fillCount} empty shoes filled, ${matResetCount} matrix material whitelists reset, ${matFillCount} empty material whitelists filled, ${forceResetCount} TOTAL force-reset by category`)
}

// ─────────────────────────────────────────────────────────────────────
// seedLastSizeChart — Passform-Maßtabelle (Leisten × Weite × Größe →
// Fußlänge + Ballenumfang in mm), 1:1 aus den Hersteller-Tabellen.
//
// Aufbau (alle Reihen sind arithmetisch):
//  • Fußlänge je Größe ist über alle Herren-Leisten identisch (eigene Reihe für
//    Damen) — daher als exakte Arrays hinterlegt (FOOT_MEN/FOOT_LADIES).
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

// Penny Loafer — nur US-Größen. [US-Label, foot_length, ball_girth]
const PENNY_US = [
  ['7', 256.5, 242.7], ['8', 260.8, 245.9], ['9', 265.0, 249.1],
  ['10', 273.5, 255.5], ['11', 282.0, 261.8], ['12', 290.4, 268.2],
  ['13', 298.9, 274.5], ['14', 307.4, 280.9], ['15', 315.9, 287.3],
]

// Spec je Leiste. widths: [width, anchorGirthAtRef, optionalRange]
// optionalRange überschreibt den Default-Bereich (Herren 38–50, Damen 35–42).
const LAST_CHART_SPEC = [
  // Herren — Dress-Leisten (D/EE/EEE)
  { key: 'monti',     gender: 'men', widths: [['D', 246.0], ['EE', 255.0], ['EEE', 268.5]] },
  { key: 'zurigo',    gender: 'men', widths: [['D', 250.0], ['EE', 259.0], ['EEE', 272.5]] },
  { key: 'savile',    gender: 'men', widths: [['D', 244.5], ['EE', 253.5], ['EEE', 267.0]] },
  { key: 'belgravia', gender: 'men', widths: [['D', 248.0], ['EE', 257.0]] },
  // Herren — Modell-spezifische Leisten
  { key: 'wellington', gender: 'men', widths: [['D', 244.0], ['EE', 253.0]] },
  { key: 'drake',      gender: 'men', widths: [['D', 245.0]] },
  { key: 'venetian',   gender: 'men', widths: [['D', 247.0]] },
  { key: 'drivers',    gender: 'men', range: ['38', '48'], widths: [['D', 246.0]] },
  { key: 'sneaker',    gender: 'men', fullOnly: true, widths: [['D', 248.0, ['38', '49']], ['EE', 257.0, ['39', '49']]] },
  { key: 'moc_sport',  gender: 'men', range: ['39', '46'], widths: [['D', 244.0]] },
  { key: 'chunky',     gender: 'men', range: ['39', '48'], widths: [['D', 250.0], ['EE', 259.0]] },
  // Damen-Leisten (noch keiner Kategorie zugeordnet — nur Daten/CMS)
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
  if (cur?.value === LAST_SIZE_CHART_VERSION) return  // aktuell — CMS-Edits bewahren
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
  ]
  const exists = db.prepare('SELECT 1 FROM faqs WHERE question = ? LIMIT 1')
  const ins = db.prepare('INSERT INTO faqs (question, answer, category, sort_order) VALUES (?, ?, ?, ?)')
  let added = 0
  for (const f of FAQS) {
    if (!exists.get(f.q)) { ins.run(f.q, f.a, f.category, f.sort_order); added++ }
  }
  if (added) console.log(`✅ Seeded: ${added} FAQ-Einträge`)
}
