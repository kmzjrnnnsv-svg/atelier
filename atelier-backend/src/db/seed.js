import bcrypt from 'bcryptjs'

export async function seedDatabase(db) {
  // Always run article seeding — independent of user seeding so it
  // also populates articles in existing databases on upgrade.
  seedEmailTemplates(db)
  seedArticles(db)

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get()
  if (userCount.count > 0) return

  console.log('🌱 Seeding database with defaults...')

  const adminEmail    = process.env.SEED_ADMIN_EMAIL    || 'admin@atelier.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Atelier@2026!'
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
    `).run('Curator', 'curator@atelier.com', curatorHash)

    // Demo / guest user — for trying the app without a real account
    const demoHash = bcrypt.hashSync('Demo@2026!', 12)
    db.prepare(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, 'user')
    `).run('Demo', 'demo@atelier.com', demoHash)

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
    shoeStmt.run('The Atelier Runner',     'SNEAKER', '€ 890',   'Perforated Leather',     '93.7%', '#e5e7eb', 'NEW',
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
  console.log(`✅ Seeded: admin@atelier.com / Atelier@2026!`)
  console.log(`✅ Seeded: curator@atelier.com / Curator@2026!`)
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
      'ATELIER — Bestellbestätigung #{{order_id}}',
      'Vielen Dank, {{name}}. Ihre Bestellung wurde aufgenommen und wird individuell für Sie angefertigt.',
      'Ihre Maßschuhe werden in 6–8 Wochen handgefertigt und direkt zu Ihnen geliefert.\nDen aktuellen Status Ihrer Bestellung finden Sie jederzeit in der ATELIER App unter Meine Bestellungen.'
    )
    stmt.run(
      'payment',
      'Zahlungsanweisung',
      'Enthält Bankdaten und Verwendungszweck — wird gleichzeitig mit der Bestellbestätigung gesendet.',
      'ATELIER — Zahlungsinformationen Bestellung #{{order_id}}',
      'Vielen Dank, {{name}}. Ihre Bestellung wurde erfasst und wartet auf Ihre Zahlung.\nBitte überweisen Sie den folgenden Betrag an das unten angegebene Konto. Verwenden Sie dabei zwingend den angegebenen Verwendungszweck, damit wir Ihre Zahlung korrekt zuordnen können.',
      'Nach Zahlungseingang werden Ihre Maßschuhe umgehend in die Fertigung gegeben.\nSie erhalten eine Bestätigung, sobald Ihre Zahlung bei uns eingegangen ist.'
    )
    stmt.run(
      'order_confirmed',
      'Zahlung bestätigt',
      'Wird gesendet, wenn der Admin den Zahlungseingang bestätigt und die Fertigung startet.',
      'ATELIER — Zahlung bestätigt & Bestellung in Fertigung #{{order_id}}',
      'Ihre Zahlung wurde bestätigt. Ihre Maßschuhe {{shoe_name}} sind nun in der Fertigung.',
      'Den aktuellen Status Ihrer Bestellung finden Sie jederzeit in der ATELIER App unter Meine Bestellungen.'
    )
    stmt.run(
      'shipping',
      'Versandbestätigung',
      'Wird gesendet, wenn Admin oder Curator die Bestellung als versandt markiert.',
      'ATELIER — Ihre Maßschuhe sind unterwegs! Bestellung #{{order_id}}',
      '{{shoe_name}} wurden soeben versandt und befinden sich auf dem Weg zu Ihnen.',
      'Den aktuellen Status Ihrer Bestellung finden Sie jederzeit in der ATELIER App unter Meine Bestellungen.\nBei Fragen wenden Sie sich an unser Team — wir sind gerne für Sie da.'
    )
    stmt.run(
      'manufacturer',
      'Hersteller-Benachrichtigung',
      'Interne E-Mail an den Hersteller mit Bestelldetails und 3D-Fußmaßen.',
      '[ATELIER] Neue Bestellung #{{order_id}} — USER-{{user_id_padded}} — {{shoe_name}}',
      'Neue Bestellung eingegangen. Bitte Fertigung vorbereiten.',
      'STL-Dateien mit Kennung U{{user_id_padded}} im Admin-Panel herunterladen.'
    )
  })()
}
