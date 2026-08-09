import { uniqueShoeSlug } from '../utils/slug.js'

export function runMigrations(db) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'user'
                    CHECK(role IN ('admin','curator','user')),
      is_active     INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  TEXT    NOT NULL UNIQUE,
      expires_at  TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shoes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT 'OXFORD',
      price       TEXT NOT NULL,
      material    TEXT NOT NULL,
      match_pct   TEXT,
      color       TEXT NOT NULL DEFAULT '#1f2937',
      tag         TEXT,
      image_data  TEXT,
      created_by  INTEGER REFERENCES users(id),
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS curated_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      color       TEXT NOT NULL,
      badge       TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_by  INTEGER REFERENCES users(id),
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wardrobe_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      color       TEXT NOT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_by  INTEGER REFERENCES users(id),
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS outfits (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      style       TEXT NOT NULL,
      description TEXT NOT NULL,
      top         TEXT NOT NULL,
      bottom      TEXT NOT NULL,
      shoe        TEXT NOT NULL,
      shoe_color  TEXT NOT NULL DEFAULT '#111827',
      bg_color    TEXT NOT NULL DEFAULT '#f8f9fa',
      created_by  INTEGER REFERENCES users(id),
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS foot_scans (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reference_type  TEXT    NOT NULL DEFAULT 'card',   -- 'card' | 'a4' | 'lidar'
      ppm             REAL,                               -- pixels per mm from calibration
      right_length    REAL    NOT NULL,
      right_width     REAL    NOT NULL,
      right_arch      REAL    NOT NULL,
      left_length     REAL    NOT NULL,
      left_width      REAL    NOT NULL,
      left_arch       REAL    NOT NULL,
      eu_size         TEXT    NOT NULL,
      uk_size         TEXT    NOT NULL,
      us_size         TEXT    NOT NULL,
      accuracy        REAL    NOT NULL DEFAULT 97.0,
      notes           TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS articles (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      slug        TEXT,
      excerpt     TEXT,
      content     TEXT    NOT NULL,
      category    TEXT    NOT NULL DEFAULT 'Allgemein',
      featured    INTEGER NOT NULL DEFAULT 0,
      image_data  TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_by  INTEGER REFERENCES users(id),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_refresh_user    ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_exp     ON refresh_tokens(expires_at);
    CREATE INDEX IF NOT EXISTS idx_scans_user      ON foot_scans(user_id);
    CREATE INDEX IF NOT EXISTS idx_articles_feat   ON articles(featured);
    CREATE INDEX IF NOT EXISTS idx_articles_cat    ON articles(category);

    CREATE TABLE IF NOT EXISTS favorites (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      shoe_id    INTEGER NOT NULL REFERENCES shoes(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, shoe_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      shoe_id    INTEGER REFERENCES shoes(id) ON DELETE SET NULL,
      shoe_name  TEXT NOT NULL,
      material   TEXT NOT NULL,
      color      TEXT NOT NULL,
      price      TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'pending_payment'
                 CHECK(status IN ('pending_payment','pending','processing','quality_check','shipped','delivered','cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      shoe_id    INTEGER NOT NULL REFERENCES shoes(id) ON DELETE CASCADE,
      rating     INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment    TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, shoe_id)
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      question   TEXT NOT NULL,
      answer     TEXT NOT NULL,
      category   TEXT NOT NULL DEFAULT 'Allgemein',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS legal_docs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      type       TEXT NOT NULL UNIQUE
                 CHECK(type IN ('datenschutz','agb','impressum')),
      title      TEXT NOT NULL,
      content    TEXT NOT NULL,
      updated_by INTEGER REFERENCES users(id),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_fav_user   ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_fav_shoe   ON favorites(shoe_id);
    CREATE INDEX IF NOT EXISTS idx_orders_usr ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_rev_shoe   ON reviews(shoe_id);
    CREATE INDEX IF NOT EXISTS idx_faq_cat    ON faqs(category);
  `)

  // ── Settings table ─────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_by INTEGER REFERENCES users(id),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('bank_iban',   'DE00 0000 0000 0000 0000 00'),
      ('bank_bic',    'XXXXXXXX'),
      ('bank_holder', 'Artisan Sole GmbH'),
      ('bank_name',   'Musterbank'),
      ('loyalty_expiry_days', '365'),
      ('shipping_to_warehouse', '0'),
      ('shipping_to_customer', '0'),
      ('packaging_cost', '0'),
      ('customs_cost', '0'),
      ('promotion_scan_tolerance_pct', '10'),
      ('whatsapp_business_number', '+4915126936500');
  `)

  // ── Checkout columns (added after initial schema) ─────────────────────────
  const colMigrations = [
    // users, MFA
    `ALTER TABLE users ADD COLUMN mfa_secret  TEXT`,
    `ALTER TABLE users ADD COLUMN mfa_enabled INTEGER NOT NULL DEFAULT 0`,
    // orders, checkout
    `ALTER TABLE orders ADD COLUMN user_order_number INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE orders ADD COLUMN delivery_address  TEXT`,
    `ALTER TABLE orders ADD COLUMN billing_address   TEXT`,
    `ALTER TABLE orders ADD COLUMN accessories       TEXT NOT NULL DEFAULT '[]'`,
    `ALTER TABLE orders ADD COLUMN scan_id           INTEGER REFERENCES foot_scans(id)`,
    `ALTER TABLE orders ADD COLUMN eu_size           TEXT`,
    // orders, human-readable reference (ATL-YYYYMMDD-XXXXXX)
    `ALTER TABLE orders ADD COLUMN order_ref         TEXT`,
    // foot_scans, extended girth measurements (v2 model)
    `ALTER TABLE foot_scans ADD COLUMN right_ball_girth   REAL`,
    `ALTER TABLE foot_scans ADD COLUMN right_instep_girth REAL`,
    `ALTER TABLE foot_scans ADD COLUMN right_heel_girth   REAL`,
    `ALTER TABLE foot_scans ADD COLUMN right_waist_girth  REAL`,
    `ALTER TABLE foot_scans ADD COLUMN right_ankle_girth  REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_ball_girth    REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_instep_girth  REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_heel_girth    REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_waist_girth   REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_ankle_girth   REAL`,
    // foot_scans, foot height (needed for accurate girth recomputation)
    `ALTER TABLE foot_scans ADD COLUMN right_foot_height  REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_foot_height   REAL`,
    // users, loyalty points
    `ALTER TABLE users ADD COLUMN loyalty_points INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN loyalty_tier   TEXT NOT NULL DEFAULT 'bronze'`,
    // users, persistent foot notes (user-level, not per-scan)
    `ALTER TABLE users ADD COLUMN foot_notes TEXT`,
    // orders, translated foot notes included with order
    `ALTER TABLE orders ADD COLUMN foot_notes    TEXT`,
    `ALTER TABLE orders ADD COLUMN foot_notes_en TEXT`,
    // foot_scans, long heel + short heel girth (manufacturer-required measurements)
    `ALTER TABLE foot_scans ADD COLUMN right_long_heel_girth  REAL`,
    `ALTER TABLE foot_scans ADD COLUMN right_short_heel_girth REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_long_heel_girth   REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_short_heel_girth  REAL`,
    // users, track last order date for loyalty point expiration
    `ALTER TABLE users ADD COLUMN last_order_at TEXT`,
    // foot_scans, scan with socks (measurements include sock thickness)
    `ALTER TABLE foot_scans ADD COLUMN scanned_with_socks INTEGER NOT NULL DEFAULT 1`,
    // scan_training_data, track which user uploaded the training images
    `ALTER TABLE scan_training_data ADD COLUMN user_id INTEGER REFERENCES users(id)`,
    // users, saved addresses & cart (JSON)
    `ALTER TABLE users ADD COLUMN saved_delivery_address TEXT`,
    `ALTER TABLE users ADD COLUMN saved_billing_address  TEXT`,
    `ALTER TABLE users ADD COLUMN saved_cart             TEXT`,
    // foot_scans, extended LiDAR girth measurements (toe, preball, midinstep, upper instep)
    `ALTER TABLE foot_scans ADD COLUMN right_toe_girth          REAL`,
    `ALTER TABLE foot_scans ADD COLUMN right_preball_girth      REAL`,
    `ALTER TABLE foot_scans ADD COLUMN right_midinstep_girth    REAL`,
    `ALTER TABLE foot_scans ADD COLUMN right_upper_instep_girth REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_toe_girth           REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_preball_girth       REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_midinstep_girth     REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_upper_instep_girth  REAL`,
    // foot_scans, preferred shoe type for last generation
    `ALTER TABLE foot_scans ADD COLUMN shoe_type TEXT DEFAULT 'oxford'`,
    // foot_scans, bespoke (Maßschuh) measurements from direct LiDAR 3D measurement
    `ALTER TABLE foot_scans ADD COLUMN right_ball_width           REAL`,
    `ALTER TABLE foot_scans ADD COLUMN right_heel_width           REAL`,
    `ALTER TABLE foot_scans ADD COLUMN right_heel_height          REAL`,
    `ALTER TABLE foot_scans ADD COLUMN right_ankle_width          REAL`,
    `ALTER TABLE foot_scans ADD COLUMN right_ankle_height_medial  REAL`,
    `ALTER TABLE foot_scans ADD COLUMN right_ankle_height_lateral REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_ball_width            REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_heel_width            REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_heel_height           REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_ankle_width           REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_ankle_height_medial   REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_ankle_height_lateral  REAL`,
    // orders, shipping
    `ALTER TABLE orders ADD COLUMN shipping_method TEXT`,
    `ALTER TABLE orders ADD COLUMN shipping_cost   TEXT`,
    // orders, coupons
    `ALTER TABLE orders ADD COLUMN coupon_code      TEXT`,
    `ALTER TABLE orders ADD COLUMN discount_amount   TEXT`,
    `ALTER TABLE orders ADD COLUMN original_price    TEXT`,
    // users, promotion accounts
    `ALTER TABLE users ADD COLUMN is_promotion            INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN promotion_discount_pct  REAL DEFAULT NULL`,
    `ALTER TABLE users ADD COLUMN promotion_max_orders    INTEGER DEFAULT NULL`,
    `ALTER TABLE users ADD COLUMN promotion_orders_used   INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN promotion_invited_by    INTEGER REFERENCES users(id)`,
    `ALTER TABLE users ADD COLUMN promotion_invite_token  TEXT`,
    // shoes, Produktseiten-Texte (pro Schuh)
    `ALTER TABLE shoes ADD COLUMN tagline     TEXT`,
    `ALTER TABLE shoes ADD COLUMN description TEXT`,
    // shoes, cost pricing
    `ALTER TABLE shoes ADD COLUMN cost_price       REAL DEFAULT NULL`,
    `ALTER TABLE shoes ADD COLUMN promotion_price   TEXT DEFAULT NULL`,
    // accessories, shoe recommendations (JSON arrays of category strings)
    `ALTER TABLE accessories ADD COLUMN recommended_for TEXT DEFAULT '[]'`,
    `ALTER TABLE accessories ADD COLUMN not_recommended_for TEXT DEFAULT '[]'`,
    // orders, size type (standard = EU 39-46, custom = 3D scan)
    `ALTER TABLE orders ADD COLUMN size_type TEXT DEFAULT 'standard'`,
    // shoe_color_variants, optional Material-Bindung (suede, calfskin, …)
    `ALTER TABLE shoe_color_variants ADD COLUMN material_key TEXT`,
    // shoe_materials, Familie (Aesthetic / Durable)
    `ALTER TABLE shoe_materials ADD COLUMN family TEXT`,
    // shoe_colors, auf welche Materialien anwendbar (CSV der material_keys)
    `ALTER TABLE shoe_colors ADD COLUMN applicable_materials TEXT NOT NULL DEFAULT '*'`,
    // options, Hex-Farbe für visuelle Vorschau (Innen-/Unter-/Sohlen-/Buckle-Farben)
    `ALTER TABLE options ADD COLUMN color_hex TEXT`,
    // options, Icon-Name (Lucide), für visuelle Akzente in der Liste
    `ALTER TABLE options ADD COLUMN icon TEXT`,
    // option_groups, Helper-Text für Schritt-für-Schritt-Erklärung
    `ALTER TABLE option_groups ADD COLUMN helper_text TEXT`,
    // options, Empfehlung (Badge „EMPFOHLEN" + optionaler Grund)
    `ALTER TABLE options ADD COLUMN recommended INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE options ADD COLUMN recommendation_reason TEXT`,
    // option_groups, Icon (Lucide-Name) für visuelle Akzente im Konfigurator
    `ALTER TABLE option_groups ADD COLUMN icon TEXT`,
    // users, Fußmaße + Passform-Anpassung + gespeicherte Passform (JSON)
    `ALTER TABLE users ADD COLUMN foot_measurements TEXT`,
    // orders, automatisch ermittelte Passform (Leisten/Weite) + verwendete Maße
    `ALTER TABLE orders ADD COLUMN last_key   TEXT`,
    `ALTER TABLE orders ADD COLUMN last_label TEXT`,
    `ALTER TABLE orders ADD COLUMN last_width TEXT`,
    `ALTER TABLE orders ADD COLUMN fit_measurements TEXT`,
    // accessories, Zuordnung nach Lederart (CSV der material_keys; '*'/NULL = alle)
    `ALTER TABLE accessories ADD COLUMN material_keys TEXT`,
    // accessories, optionale Farb-Zuordnung (CSV Schlüsselwörter, z. B. 'schwarz,black')
    `ALTER TABLE accessories ADD COLUMN color_match TEXT`,
    // orders, B2B-Firmencode-Einlösung
    `ALTER TABLE orders ADD COLUMN business_id          INTEGER REFERENCES businesses(id)`,
    `ALTER TABLE orders ADD COLUMN business_code_id     INTEGER REFERENCES business_codes(id)`,
    `ALTER TABLE orders ADD COLUMN business_coverage    TEXT`,
    `ALTER TABLE orders ADD COLUMN business_campaign_id INTEGER REFERENCES business_campaigns(id)`,
    // users, E-Mail-Verifizierung (für Kampagnen-Beitritt per Domain)
    `ALTER TABLE users ADD COLUMN email_verified     INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN email_verify_token TEXT`,
    // users, gespeicherte Schuh-Konfigurationen (JSON-Array, nur eingeloggt)
    `ALTER TABLE users ADD COLUMN saved_configurations TEXT`,
    // shoes, fest gesetzte Loafer-Ausfuehrung (option_key), blendet den
    // Ausfuehrungs-Selektor fuer eigenstaendige Stil-Produkte aus
    `ALTER TABLE shoes ADD COLUMN locked_decoration TEXT`,
    // shoes, zweite Standardansicht. image_data ist das erste Bild auf der
    // Kollektionsseite, dieses hier wird beim Überfahren eingeblendet.
    // Bewusst nicht in GET /api/shoes: beide sind base64-Data-URLs, die
    // Liste würde sich sonst verdoppeln. Auslieferung über
    // GET /api/shoes/:id/hover-image, erst wenn eine Kachel berührt wird.
    `ALTER TABLE shoes ADD COLUMN hover_image_data TEXT`,
    // shoes, Standard-Bilderstrecke des Modells (JSON-Array von Data-URLs).
    // Gilt, solange die gewählte Farbe keine eigenen Bilder mitbringt.
    // [0] steht auf der Kollektionsseite, [1] erscheint beim Überfahren,
    // alle zusammen bilden die Slideshow auf der Produktseite.
    // image_data und hover_image_data bleiben als Einzelfelder gespiegelt,
    // damit Warenkorb, Wunschliste und Bestellungen unverändert weiterlaufen.
    `ALTER TABLE shoes ADD COLUMN default_images TEXT`,
    // shoes, sprechender URL-Bestandteil. /schuhe/heritage-oxford statt
    // /customize?id=13 — lesbar, teilbar und für Suchmaschinen brauchbar.
    // Kein UNIQUE-Index: SQLite kann das per ALTER TABLE nicht nachrüsten,
    // die Eindeutigkeit stellt slugForShoe() beim Schreiben sicher.
    // accessories, Einkaufspreis. Nötig, seit ein Vermittler seinem Kunden
    // eine Zugabe schenken kann: Verrechnet wird der Einkaufspreis, nicht der
    // Ladenpreis. Beim Schuhspanner (45 € im Verkauf) läge der Ladenpreis über
    // der Provision selbst — der Vermittler zahlte drauf.
    `ALTER TABLE accessories ADD COLUMN cost_price REAL`,
    // orders, Rückgabe und Reklamation nach Zustellung. Der Statuswert
    // 'cancelled' meint eine Stornierung VOR Lieferung; was danach passiert,
    // ließ sich bisher nirgends festhalten.
    `ALTER TABLE orders ADD COLUMN returned_at    TEXT`,
    `ALTER TABLE orders ADD COLUMN return_reason  TEXT`,
    `ALTER TABLE orders ADD COLUMN delivered_at   TEXT`,
    // orders, vermittelnder Code (Kleinschreibung, wie in affiliates.code)
    `ALTER TABLE orders ADD COLUMN affiliate_code TEXT`,
    `CREATE INDEX IF NOT EXISTS idx_orders_affiliate ON orders(affiliate_code)`,
    `ALTER TABLE shoes ADD COLUMN slug TEXT`,
    `CREATE INDEX IF NOT EXISTS idx_shoes_slug ON shoes(slug)`,
    // shoes, optionales 3D-Modell (.glb/.gltf) als Pfad unter /uploads.
    // Kein base64 wie bei den Bildern — solche Dateien sind um Größenordnungen
    // schwerer und haben in einer Datenbankspalte nichts verloren.
    `ALTER TABLE shoes ADD COLUMN model_3d TEXT`,
  ]

  // ── Backfill default WhatsApp Business number when empty ─────────────────
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'whatsapp_business_number'").get()
    if (!row || !row.value) {
      db.prepare(`
        INSERT INTO settings (key, value, updated_at) VALUES ('whatsapp_business_number', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
      `).run('+4915126936500')
    }
  } catch (e) { console.error('[migrate whatsapp_business_number]', e.message) }

  // ── Ensure accessories exist with full data (upsert) ─────────────────────
  try {
    const accData = [
      { key: 'shoetrees',       name: 'Zedernholz Schuhspanner',    desc: 'Formerhalt & Feuchtigkeitskontrolle. Zedernholz absorbiert Feuchtigkeit und hält Ihren Schuh in perfekter Form.', price: 45,  sort: 0,  rec: '["OXFORD","DERBY","LOAFER","MONK","BOOT"]', not: '["SNEAKER"]' },
      { key: 'carekit',         name: 'Lederpflege-Set',             desc: 'Komplett-Set mit Creme, Rosshaar-Bürste & Poliertuch für die optimale Pflege von Glattleder.',                   price: 35,  sort: 1,  rec: '["OXFORD","DERBY","LOAFER","MONK"]', not: '["SNEAKER"]' },
      { key: 'dustbag',         name: 'Samtbeutel',                  desc: 'Schutzaufbewahrung aus weicher Baumwolle. Bewahrt den Glanz und schützt vor Staub und Kratzern.',                price: 25,  sort: 2,  rec: '["OXFORD","DERBY","LOAFER","MONK","BOOT","SNEAKER"]', not: '[]' },
      { key: 'shoehorn',        name: 'Messing-Schuhlöffel',         desc: 'Handgravierter Schuhlöffel aus massivem Messing, 38 cm. Schont die Fersenkappe beim Anziehen.',                  price: 20,  sort: 3,  rec: '["OXFORD","DERBY","LOAFER","MONK"]', not: '["SNEAKER"]' },
      { key: 'belt',            name: 'Passendes Ledergürtel',       desc: 'Maßgefertigter Gürtel aus derselben Haut & Farbe wie Ihr Schuh. Das perfekte Ensemble.',                        price: 180, sort: 4,  rec: '["OXFORD","DERBY","LOAFER","MONK"]', not: '["SNEAKER","BOOT"]' },
      { key: 'horsehair_brush', name: 'Rosshaar-Bürste',             desc: 'Weiche Naturborsten für das tägliche Polieren von Glattleder. Entfernt Staub und bringt den natürlichen Glanz zurück.', price: 28, sort: 5, rec: '["OXFORD","DERBY","LOAFER","MONK"]', not: '["SNEAKER"]' },
      { key: 'suede_brush',     name: 'Wildleder-Kreppbürste',       desc: 'Krepp- & Messingborsten für Velours und Nubuk. Richtet das Flor auf und entfernt hartnäckige Flecken.',           price: 32,  sort: 6,  rec: '["DERBY","LOAFER","BOOT"]', not: '["OXFORD","SNEAKER"]' },
      { key: 'suede_spray',     name: 'Imprägnierspray',             desc: 'Nano-Schutz gegen Feuchtigkeit & Flecken, 250 ml. Unverzichtbar für empfindliche Leder und Wildleder.',          price: 18,  sort: 7,  rec: '["DERBY","BOOT","LOAFER"]', not: '[]' },
      { key: 'suede_eraser',    name: 'Wildleder-Radierer',          desc: 'Entfernt trockene Flecken & Salzränder schonend, ohne das Material zu beschädigen.',                              price: 12,  sort: 8,  rec: '["DERBY","LOAFER","BOOT"]', not: '["OXFORD","SNEAKER"]' },
      { key: 'cream_dark',      name: 'Schuhcreme Schwarz',          desc: 'Pigmentierte Pflegecreme für schwarzes Glattleder. Nährt das Leder und frischt die Farbe auf.',                  price: 15,  sort: 9,  rec: '["OXFORD","DERBY","MONK"]', not: '["SNEAKER","BOOT"]' },
      { key: 'cream_cognac',    name: 'Schuhcreme Cognac',           desc: 'Pigmentierte Pflegecreme für braunes & cognacfarbenes Leder. Perfekt für warme Brauntöne.',                       price: 15,  sort: 10, rec: '["OXFORD","DERBY","LOAFER","MONK"]', not: '["SNEAKER"]' },
      { key: 'cordovan_balm',   name: 'Cordovan-Balsam',             desc: 'Spezialwachs für Shell Cordovan. Nährt das edle Pferdeleder und schützt vor Austrocknung.',                      price: 38,  sort: 11, rec: '["OXFORD","DERBY","MONK"]', not: '["SNEAKER","BOOT","LOAFER"]' },
      { key: 'patent_care',     name: 'Lackleder-Pflege',            desc: 'Reinigung & Glanzerhalt für Patentleder. Entfernt Fingerabdrücke und kleine Kratzer.',                            price: 22,  sort: 12, rec: '["OXFORD","DERBY"]', not: '["SNEAKER","BOOT","LOAFER"]' },
      { key: 'boot_jack',       name: 'Stiefelknecht',               desc: 'Massives Buchenholz mit Gummischutz. Erleichtert das Ausziehen von hohen Chelsea Boots.',                        price: 35,  sort: 13, rec: '["BOOT"]', not: '["OXFORD","DERBY","LOAFER","SNEAKER","MONK"]' },
      { key: 'waxed_laces',     name: 'Gewachste Schnürsenkel',      desc: 'Rundes Profil, 75 cm, passend gefärbt. Halten besser und sehen eleganter aus.',                                  price: 12,  sort: 14, rec: '["OXFORD","DERBY"]', not: '["LOAFER","BOOT","SNEAKER","MONK"]' },
      { key: 'sneaker_kit',     name: 'Sneaker-Reinigungsset',       desc: 'Spezialschaum, Mikrofasertuch & Sohlenbürste. Speziell für Glattleder-Sneaker entwickelt.',                      price: 28,  sort: 15, rec: '["SNEAKER"]', not: '["OXFORD","DERBY","BOOT","MONK","LOAFER"]' },
      { key: 'buckle_cloth',    name: 'Schnallen-Poliertuch',        desc: 'Anti-Anlauf-Tuch für Messing- & Silberschnallen. Hält Schnallen und Metallteile glänzend.',                       price: 15,  sort: 16, rec: '["MONK","LOAFER"]', not: '["SNEAKER","OXFORD","DERBY"]' },
      { key: 'sole_oil',        name: 'Ledersohlen-Balsam',          desc: 'Pflegt & imprägniert offenporige Ledersohlen. Verlängert die Lebensdauer der Sohle erheblich.',                  price: 18,  sort: 17, rec: '["OXFORD","DERBY","LOAFER","MONK"]', not: '["SNEAKER"]' },
      { key: 'exotic_care',     name: 'Exotenleder-Pflege',          desc: 'Spezialcreme für Kroko-Prägung & strukturierte Leder. Erhält die einzigartige Textur.',                          price: 42,  sort: 18, rec: '["OXFORD","LOAFER","MONK"]', not: '["SNEAKER","BOOT"]' },
      { key: 'polishing_cloth', name: 'Poliertuch',                  desc: 'Doppellagiges Baumwollflanell für Hochglanz-Finish. Unverzichtbar für Mirror-Shine-Liebhaber.',                  price: 12,  sort: 19, rec: '["OXFORD","DERBY","MONK","LOAFER"]', not: '["SNEAKER"]' },
      // ── Neu: Spanner & Pflege-Kits (Zuordnung nach Lederart bzw. Farbe) ──
      { key: 'shoe_tree_black',       name: 'Schuhspanner Schwarz (Labeled)',        desc: 'Eleganter lackierter Schuhspanner in Schwarz, passend zu schwarzen Schuhen. Formerhalt & Feuchtigkeitskontrolle.', price: 22.0,  sort: 20, rec: '[]', not: '["SNEAKER"]' },
      { key: 'shoe_tree_cedar',       name: 'Zedernholz-Schuhspanner (Labeled)',     desc: 'Schuhspanner aus aromatischem Zedernholz. Absorbiert Feuchtigkeit und hält den Schuh in perfekter Form.',          price: 21.0,  sort: 21, rec: '[]', not: '["SNEAKER"]' },
      { key: 'boot_tree_cedar',       name: 'Zedernholz-Stiefelspanner (Private Labeled)', desc: 'Hoher Spanner aus Zedernholz, speziell für Stiefel & Boots. Bewahrt Schaft und Form.',                       price: 29.0,  sort: 22, rec: '["BOOT"]', not: '["SNEAKER"]' },
      { key: 'care_kit_saphir_patina', name: 'Schuhpflege-Set Saphir Patina',        desc: 'Premium-Set von Saphir Médaille d’Or für patinierte Leder: Creme, Bürste & Applikator. Erhält Tiefe und Glanz der Patina.', price: 38.0, sort: 23, rec: '[]', not: '["SNEAKER"]' },
      { key: 'care_kit_suede',        name: 'Schuhpflege-Set Wildleder (1 Unit)',    desc: 'Komplett-Set für Velours & Nubuk: Krepp-/Messingbürste, Imprägnierung & Radierer. Richtet das Flor auf und schützt.', price: 25.25, sort: 24, rec: '[]', not: '[]' },
      { key: 'care_kit_leather',      name: 'Schuhpflege-Set Glattleder (1 Unit)',   desc: 'Komplett-Set für Glattleder: Creme, Bürsten & Poliertuch. Nährt, schützt und bringt den Glanz zurück.',           price: 23.7,  sort: 25, rec: '[]', not: '["SNEAKER"]' },
      { key: 'calf_care_cream',       name: 'Luxe Calf Leather Care Cream',          desc: 'Hochwertige Pflegecreme für feines Kalbsleder. Spendet Feuchtigkeit und frischt die Farbe schonend auf.',          price: 6.9,   sort: 26, rec: '[]', not: '["SNEAKER"]' },
      { key: 'shoe_cream_black',      name: 'Schuhcreme-Set Schwarz',                desc: 'Pigmentierte Pflegecreme-Set in Schwarz für schwarzes Glattleder. Nährt das Leder und vertieft die Farbe.',        price: 6.9,   sort: 27, rec: '[]', not: '["SNEAKER"]' },
    ]
    const upsert = db.prepare(`
      INSERT INTO accessories (key, name, description, price, sort_order, is_active, recommended_for, not_recommended_for)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        price = excluded.price,
        sort_order = excluded.sort_order,
        is_active = 1,
        recommended_for = excluded.recommended_for,
        not_recommended_for = excluded.not_recommended_for
    `)
    for (const a of accData) {
      upsert.run(a.key, a.name, a.desc, a.price, a.sort, a.rec, a.not)
    }
  } catch { /* table may not exist yet on first run */ }

  // ── Migrate orders: add pending_payment to status CHECK ───────────────────
  try {
    const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'").get()
    if (row && !row.sql.includes('pending_payment')) {
      db.exec(`
        CREATE TABLE orders_new (
          id                INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          shoe_id           INTEGER REFERENCES shoes(id) ON DELETE SET NULL,
          shoe_name         TEXT NOT NULL,
          material          TEXT NOT NULL,
          color             TEXT NOT NULL,
          price             TEXT NOT NULL,
          status            TEXT NOT NULL DEFAULT 'pending_payment'
                            CHECK(status IN ('pending_payment','pending','processing','shipped','delivered','cancelled')),
          created_at        TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
          user_order_number INTEGER NOT NULL DEFAULT 0,
          delivery_address  TEXT,
          billing_address   TEXT,
          accessories       TEXT NOT NULL DEFAULT '[]',
          scan_id           INTEGER REFERENCES foot_scans(id),
          eu_size           TEXT
        );
        INSERT INTO orders_new
          SELECT id,user_id,shoe_id,shoe_name,material,color,price,status,
                 created_at,updated_at,user_order_number,delivery_address,
                 billing_address,accessories,scan_id,eu_size
          FROM orders;
        DROP TABLE orders;
        ALTER TABLE orders_new RENAME TO orders;
        CREATE INDEX IF NOT EXISTS idx_orders_usr ON orders(user_id);
      `)
    }
  } catch (e) { console.error('[migrate orders pending_payment]', e.message) }

  // ── Migrate orders: add quality_check to status CHECK ────────────────────
  try {
    const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'").get()
    if (row && !row.sql.includes('quality_check')) {
      db.exec(`
        CREATE TABLE orders_new2 (
          id                INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          shoe_id           INTEGER REFERENCES shoes(id) ON DELETE SET NULL,
          shoe_name         TEXT NOT NULL,
          material          TEXT NOT NULL,
          color             TEXT NOT NULL,
          price             TEXT NOT NULL,
          status            TEXT NOT NULL DEFAULT 'pending_payment'
                            CHECK(status IN ('pending_payment','pending','processing','quality_check','shipped','delivered','cancelled')),
          created_at        TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
          user_order_number INTEGER NOT NULL DEFAULT 0,
          delivery_address  TEXT,
          billing_address   TEXT,
          accessories       TEXT NOT NULL DEFAULT '[]',
          scan_id           INTEGER REFERENCES foot_scans(id),
          eu_size           TEXT,
          order_ref         TEXT,
          foot_notes        TEXT,
          foot_notes_en     TEXT,
          shipping_method   TEXT,
          shipping_cost     TEXT,
          coupon_code       TEXT,
          discount_amount   TEXT,
          original_price    TEXT
        );
        INSERT INTO orders_new2
          SELECT id,user_id,shoe_id,shoe_name,material,color,price,status,
                 created_at,updated_at,user_order_number,delivery_address,
                 billing_address,accessories,scan_id,eu_size,order_ref,
                 foot_notes,foot_notes_en,
                 shipping_method,shipping_cost,coupon_code,discount_amount,
                 original_price
          FROM orders;
        DROP TABLE orders;
        ALTER TABLE orders_new2 RENAME TO orders;
        CREATE INDEX IF NOT EXISTS idx_orders_usr ON orders(user_id);
      `)
    }
  } catch (e) { console.error('[migrate orders quality_check]', e.message) }

  // ── ML Training data, foot scan images ──────────────────────────────────
  // Stores compressed images for each scan to build a training dataset.
  // Admin validates measurements → validated=1 → used for model training.
  db.exec(`
    CREATE TABLE IF NOT EXISTS scan_training_data (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_id         INTEGER REFERENCES foot_scans(id) ON DELETE CASCADE,
      right_top_img   TEXT,   -- base64 JPEG (compressed ~300KB)
      right_side_img  TEXT,   -- base64 JPEG (compressed ~200KB)
      left_top_img    TEXT,   -- base64 JPEG (compressed ~300KB)
      left_side_img   TEXT,   -- base64 JPEG (compressed ~200KB)
      validated       INTEGER NOT NULL DEFAULT 0,  -- 0=raw AI, 1=admin-verified
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_training_scan ON scan_training_data(scan_id);
    CREATE INDEX IF NOT EXISTS idx_training_val  ON scan_training_data(validated);
  `)

  // ── Email templates table ─────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_templates (
      type        TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      subject     TEXT NOT NULL,
      intro       TEXT NOT NULL,
      body        TEXT NOT NULL,
      updated_by  INTEGER REFERENCES users(id),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // ── Phase 5: Point clouds + cross-section geometries for shoe last production ─
  db.exec(`
    CREATE TABLE IF NOT EXISTS scan_point_clouds (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_id     INTEGER NOT NULL REFERENCES foot_scans(id) ON DELETE CASCADE,
      side        TEXT    NOT NULL CHECK(side IN ('right','left')),
      format      TEXT    NOT NULL DEFAULT 'xyz_mm',
      point_count INTEGER NOT NULL DEFAULT 0,
      data        TEXT    NOT NULL,   -- JSON array of [x,y,z] triplets (mm, PCA-aligned)
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(scan_id, side)
    );
    CREATE INDEX IF NOT EXISTS idx_pc_scan ON scan_point_clouds(scan_id);

    CREATE TABLE IF NOT EXISTS shoe_type_settings (
      shoe_type        TEXT PRIMARY KEY,
      name             TEXT    NOT NULL,
      zugabe_mm        REAL    NOT NULL DEFAULT 0,
      toe_extension_mm REAL    NOT NULL DEFAULT 0,
      heel_pitch_mm    REAL    NOT NULL DEFAULT 0,
      instep_raise_mm  REAL    NOT NULL DEFAULT 0,
      shank_spring_mm  REAL    NOT NULL DEFAULT 0,
      width_ease_mm    REAL    NOT NULL DEFAULT 0,
      girth_ease_mm    REAL    NOT NULL DEFAULT 0,
      updated_by       INTEGER REFERENCES users(id),
      updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO shoe_type_settings (shoe_type, name) VALUES
      ('oxford',  'Oxford / Halbschuh'),
      ('derby',   'Derby / Blücher'),
      ('stiefel', 'Stiefel / Boot'),
      ('sneaker', 'Sneaker / Sportschuh'),
      ('pumps',   'Pumps / Damenschuh'),
      ('sandale', 'Sandale / Pantolette');

    CREATE TABLE IF NOT EXISTS scan_cross_sections (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_id     INTEGER NOT NULL REFERENCES foot_scans(id) ON DELETE CASCADE,
      side        TEXT    NOT NULL CHECK(side IN ('right','left')),
      level_name  TEXT    NOT NULL,   -- 'Ferse','Taille','Gewölbe','Ballen','Rist','Knöchel'
      level_frac  REAL    NOT NULL,   -- fraction along foot length (0=heel, 1=toe)
      girth_mm    REAL,               -- perimeter in mm
      width_mm    REAL,               -- cross-section width
      height_mm   REAL,               -- cross-section height
      contour     TEXT    NOT NULL,   -- JSON array of [y,z] 2D contour points (mm)
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(scan_id, side, level_name)
    );
    CREATE INDEX IF NOT EXISTS idx_cs_scan ON scan_cross_sections(scan_id);

    -- ── Measurement calibration (learned from validated scans) ─────────
    CREATE TABLE IF NOT EXISTS measurement_calibration (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      measurement     TEXT    NOT NULL,     -- 'right_length', 'right_ball_girth', etc.
      source          TEXT    NOT NULL,     -- 'photo', 'photogrammetry', 'lidar'
      bias_mm         REAL    NOT NULL DEFAULT 0,  -- systematic offset (predicted - actual)
      std_dev_mm      REAL    NOT NULL DEFAULT 5,  -- standard deviation of error
      sample_count    INTEGER NOT NULL DEFAULT 0,  -- number of validated pairs
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(measurement, source)
    );
    CREATE INDEX IF NOT EXISTS idx_cal_meas ON measurement_calibration(measurement, source);

    -- ── Scan comparison pairs (AI prediction vs admin-corrected ground truth) ──
    CREATE TABLE IF NOT EXISTS scan_comparison_pairs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_id         INTEGER NOT NULL REFERENCES foot_scans(id) ON DELETE CASCADE,
      measurement     TEXT    NOT NULL,     -- 'right_length', 'right_ball_girth', etc.
      source          TEXT    NOT NULL,     -- 'photo', 'photogrammetry', 'lidar'
      predicted_mm    REAL    NOT NULL,     -- original AI/CV measurement
      actual_mm       REAL    NOT NULL,     -- admin-corrected value
      error_mm        REAL    NOT NULL,     -- predicted - actual
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(scan_id, measurement)
    );
    CREATE INDEX IF NOT EXISTS idx_comp_scan ON scan_comparison_pairs(scan_id);
    CREATE INDEX IF NOT EXISTS idx_comp_source ON scan_comparison_pairs(source);

    -- ── Raw AI predictions (stored alongside every scan for retrospective learning) ──
    CREATE TABLE IF NOT EXISTS scan_predictions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_id         INTEGER NOT NULL REFERENCES foot_scans(id) ON DELETE CASCADE,
      source          TEXT    NOT NULL DEFAULT 'photo',
      predictions     TEXT    NOT NULL,      -- JSON of original AI/CV predictions
      depth_used      INTEGER NOT NULL DEFAULT 0,
      pca_applied     INTEGER NOT NULL DEFAULT 0,
      calibration_applied TEXT,              -- JSON of calibration corrections
      confidence      REAL,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(scan_id)
    );
    CREATE INDEX IF NOT EXISTS idx_pred_scan ON scan_predictions(scan_id);

    -- ── Explore sections (CMS-editable) ───────────────────────────────────
    CREATE TABLE IF NOT EXISTS explore_sections (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      key           TEXT    NOT NULL UNIQUE,
      label         TEXT    NOT NULL,
      title         TEXT    NOT NULL,
      description   TEXT,
      tag           TEXT    NOT NULL DEFAULT 'Demnächst',
      color         TEXT    NOT NULL DEFAULT '#1a1a1a',
      accent        TEXT    NOT NULL DEFAULT '#ffffff',
      icon          TEXT    NOT NULL DEFAULT 'BookOpen',
      image_data    TEXT,
      preview_items TEXT    NOT NULL DEFAULT '[]',
      visible       INTEGER NOT NULL DEFAULT 1,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      created_by    INTEGER REFERENCES users(id),
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Hero settings for explore page stored in settings table
    -- (hero_image, hero_title, hero_subtitle)

    -- ── Loyalty / Membership Tiers (CMS-editable) ────────────────────────
    CREATE TABLE IF NOT EXISTS loyalty_tiers (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      key           TEXT    NOT NULL UNIQUE,
      label         TEXT    NOT NULL,
      min_points    INTEGER NOT NULL DEFAULT 0,
      color         TEXT    NOT NULL DEFAULT '#000000',
      icon          TEXT    NOT NULL DEFAULT 'Award',
      description   TEXT,
      benefits      TEXT    NOT NULL DEFAULT '[]',
      visible       INTEGER NOT NULL DEFAULT 1,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      created_by    INTEGER REFERENCES users(id),
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Product configuration (CMS-editable) ─────────────────────────────
    CREATE TABLE IF NOT EXISTS shoe_materials (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      key           TEXT    NOT NULL UNIQUE,
      label         TEXT    NOT NULL,
      sub           TEXT,
      color         TEXT    NOT NULL DEFAULT '#374151',
      available     INTEGER NOT NULL DEFAULT 1,
      tip           TEXT,
      season        TEXT,
      rating        TEXT    NOT NULL DEFAULT 'neutral'
                    CHECK(rating IN ('good','neutral','warn')),
      sort_order    INTEGER NOT NULL DEFAULT 0,
      created_by    INTEGER REFERENCES users(id),
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO loyalty_tiers (key, label, min_points, color, icon, description, benefits, visible, sort_order) VALUES
      ('bronze',    'Bronze',    0,     '#cd7f32', 'Award',    'Willkommen bei Artisan Sole. Als Bronze-Mitglied genießen Sie Zugang zu unserer exklusiven Kollektion maßgefertigter Schuhe.', '["Zugang zur kompletten Kollektion","Persönliches Fußprofil mit 3D-Scan","Newsletter mit Styling-Tipps","Geburtstagsgruß"]', 1, 0),
      ('silver',    'Silver',    500,   '#c0c0c0', 'Award',    'Ihre Treue wird belohnt. Silver-Mitglieder erhalten bevorzugten Zugang und besondere Aufmerksamkeit.', '["Alle Bronze-Vorteile","Kostenloser Express-Versand","10% auf Pflegeprodukte","Frühzeitiger Zugang zu neuen Modellen","Einladung zu Private Sales"]', 1, 1),
      ('gold',      'Gold',      1500,  '#ffd700', 'Crown',    'Exzellenz trifft Handwerk. Gold-Mitglieder sind Teil eines ausgewählten Kreises mit Premium-Privilegien.', '["Alle Silver-Vorteile","Persönlicher Style-Berater","15% auf alle Bestellungen","Priority-Kundenservice","Exklusive Einladungen zu Artisan Sole-Events","Kostenlose Lederpflege-Sets"]', 1, 2),
      ('platinum',  'Platinum',  5000,  '#e5e4e2', 'Gem',      'Die höchste Auszeichnung für wahre Kenner. Platinum-Mitglieder genießen unvergleichliche Privilegien und persönlichen Service.', '["Alle Gold-Vorteile","Dedizierter Concierge-Service","20% auf alle Bestellungen","Kostenlose Reparaturen auf Lebenszeit","Zugang zu Limited Editions","Einladung zur jährlichen Gala","Maßgefertigte Schuhspanner gratis"]', 1, 3),
      ('executive', 'Executive', 15000, '#1a1a1a', 'Shield',   NULL, '["Alle Platinum-Vorteile","Persönlicher Artisan Sole-Besuch in der Manufaktur","Individuelles Leder-Sourcing","Namentliche Gravur auf jeder Sohle","Exklusiver Zugang zu Archiv-Modellen","Einladung zu Designer-Kollaborationen","VIP-Lounge bei Events","Persönliches Jahresgeschenk"]', 0, 4);

    -- ── Feedback / Support Tickets ─────────────────────────────────
    CREATE TABLE IF NOT EXISTS feedback_tickets (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_id      INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      type          TEXT    NOT NULL DEFAULT 'feedback'
                    CHECK(type IN ('feedback','complaint','question','return')),
      subject       TEXT    NOT NULL,
      message       TEXT    NOT NULL,
      status        TEXT    NOT NULL DEFAULT 'open'
                    CHECK(status IN ('open','in_progress','resolved','closed')),
      admin_notes   TEXT,
      resolved_by   INTEGER REFERENCES users(id),
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tickets_user   ON feedback_tickets(user_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON feedback_tickets(status);

    -- ── Accessories (CMS-editable) ────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS accessories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      key         TEXT    NOT NULL UNIQUE,
      name        TEXT    NOT NULL,
      description TEXT,
      price       REAL    NOT NULL DEFAULT 0,
      image_data  TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_by  INTEGER REFERENCES users(id),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO accessories (key, name, description, price, sort_order) VALUES
      ('shoetrees',       'Zedernholz Schuhspanner',    'Formerhalt & Feuchtigkeitskontrolle. Zedernholz absorbiert Feuchtigkeit und hält Ihren Schuh in perfekter Form.',  45,   0),
      ('carekit',         'Lederpflege-Set',             'Komplett-Set mit Creme, Rosshaar-Bürste & Poliertuch für die optimale Pflege von Glattleder.',                     35,   1),
      ('dustbag',         'Samtbeutel',                  'Schutzaufbewahrung aus weicher Baumwolle. Bewahrt den Glanz und schützt vor Staub und Kratzern.',                  25,   2),
      ('shoehorn',        'Messing-Schuhlöffel',         'Handgravierter Schuhlöffel aus massivem Messing, 38 cm. Schont die Fersenkappe beim Anziehen.',                    20,   3),
      ('belt',            'Passendes Ledergürtel',       'Maßgefertigter Gürtel aus derselben Haut & Farbe wie Ihr Schuh. Das perfekte Ensemble.',                          180,  4),
      ('horsehair_brush', 'Rosshaar-Bürste',             'Weiche Naturborsten für das tägliche Polieren von Glattleder. Entfernt Staub und bringt den natürlichen Glanz zurück.', 28, 5),
      ('suede_brush',     'Wildleder-Kreppbürste',       'Krepp- & Messingborsten für Velours und Nubuk. Richtet das Flor auf und entfernt hartnäckige Flecken.',             32,   6),
      ('suede_spray',     'Imprägnierspray',             'Nano-Schutz gegen Feuchtigkeit & Flecken, 250 ml. Unverzichtbar für empfindliche Leder und Wildleder.',            18,   7),
      ('suede_eraser',    'Wildleder-Radierer',          'Entfernt trockene Flecken & Salzränder schonend, ohne das Material zu beschädigen.',                                12,   8),
      ('cream_dark',      'Schuhcreme Schwarz',          'Pigmentierte Pflegecreme für schwarzes Glattleder. Nährt das Leder und frischt die Farbe auf.',                    15,   9),
      ('cream_cognac',    'Schuhcreme Cognac',           'Pigmentierte Pflegecreme für braunes & cognacfarbenes Leder. Perfekt für warme Brauntöne.',                         15,  10),
      ('cordovan_balm',   'Cordovan-Balsam',             'Spezialwachs für Shell Cordovan. Nährt das edle Pferdeleder und schützt vor Austrocknung.',                        38,  11),
      ('patent_care',     'Lackleder-Pflege',            'Reinigung & Glanzerhalt für Patentleder. Entfernt Fingerabdrücke und kleine Kratzer.',                              22,  12),
      ('boot_jack',       'Stiefelknecht',               'Massives Buchenholz mit Gummischutz. Erleichtert das Ausziehen von hohen Chelsea Boots.',                          35,  13),
      ('waxed_laces',     'Gewachste Schnürsenkel',      'Rundes Profil, 75 cm, passend gefärbt. Halten besser und sehen eleganter aus.',                                    12,  14),
      ('sneaker_kit',     'Sneaker-Reinigungsset',       'Spezialschaum, Mikrofasertuch & Sohlenbürste. Speziell für Glattleder-Sneaker entwickelt.',                        28,  15),
      ('buckle_cloth',    'Schnallen-Poliertuch',        'Anti-Anlauf-Tuch für Messing- & Silberschnallen. Hält Schnallen und Metallteile glänzend.',                         15,  16),
      ('sole_oil',        'Ledersohlen-Balsam',          'Pflegt & imprägniert offenporige Ledersohlen. Verlängert die Lebensdauer der Sohle erheblich.',                    18,  17),
      ('exotic_care',     'Exotenleder-Pflege',          'Spezialcreme für Kroko-Prägung & strukturierte Leder. Erhält die einzigartige Textur.',                            42,  18),
      ('polishing_cloth', 'Poliertuch',                  'Doppellagiges Baumwollflanell für Hochglanz-Finish. Unverzichtbar für Mirror-Shine-Liebhaber.',                    12,  19),
      ('shoe_tree_black',        'Schuhspanner Schwarz (Labeled)',                'Eleganter lackierter Schuhspanner in Schwarz, passend zu schwarzen Schuhen. Formerhalt & Feuchtigkeitskontrolle.',           22.0,  20),
      ('shoe_tree_cedar',        'Zedernholz-Schuhspanner (Labeled)',             'Schuhspanner aus aromatischem Zedernholz. Absorbiert Feuchtigkeit und hält den Schuh in perfekter Form.',                    21.0,  21),
      ('boot_tree_cedar',        'Zedernholz-Stiefelspanner (Private Labeled)',   'Hoher Spanner aus Zedernholz, speziell für Stiefel & Boots. Bewahrt Schaft und Form.',                                      29.0,  22),
      ('care_kit_saphir_patina', 'Schuhpflege-Set Saphir Patina',                 'Premium-Set von Saphir Médaille d''Or für patinierte Leder: Creme, Bürste & Applikator. Erhält Tiefe und Glanz der Patina.', 38.0,  23),
      ('care_kit_suede',         'Schuhpflege-Set Wildleder (1 Unit)',            'Komplett-Set für Velours & Nubuk: Krepp-/Messingbürste, Imprägnierung & Radierer. Richtet das Flor auf und schützt.',        25.25, 24),
      ('care_kit_leather',       'Schuhpflege-Set Glattleder (1 Unit)',           'Komplett-Set für Glattleder: Creme, Bürsten & Poliertuch. Nährt, schützt und bringt den Glanz zurück.',                      23.7,  25),
      ('calf_care_cream',        'Luxe Calf Leather Care Cream',                  'Hochwertige Pflegecreme für feines Kalbsleder. Spendet Feuchtigkeit und frischt die Farbe schonend auf.',                    6.9,   26),
      ('shoe_cream_black',       'Schuhcreme-Set Schwarz',                        'Pigmentierte Pflegecreme-Set in Schwarz für schwarzes Glattleder. Nährt das Leder und vertieft die Farbe.',                  6.9,   27);

    -- ── Shipping configuration ──────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS shipping_config (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      key             TEXT    NOT NULL UNIQUE,
      label           TEXT    NOT NULL,
      description     TEXT,
      price           REAL    NOT NULL DEFAULT 0,
      free_above      REAL    DEFAULT NULL,
      is_default      INTEGER NOT NULL DEFAULT 0,
      is_active       INTEGER NOT NULL DEFAULT 1,
      created_by      INTEGER REFERENCES users(id),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO shipping_config (key, label, description, price, free_above, is_default, is_active) VALUES
      ('standard', 'Standardversand', 'Lieferung in 3 bis 5 Werktagen', 9.90, 500, 1, 1),
      ('express',  'Expressversand',  'Lieferung in 1 bis 2 Werktagen', 19.90, NULL, 0, 1);

    -- ── Coupons ──────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS coupons (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      code            TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      type            TEXT    NOT NULL CHECK(type IN ('percentage','fixed','free_shipping','free_accessory')),
      value           REAL    NOT NULL DEFAULT 0,
      free_accessory_id TEXT  DEFAULT NULL,
      min_order_value REAL    DEFAULT NULL,
      max_uses        INTEGER DEFAULT NULL,
      used_count      INTEGER NOT NULL DEFAULT 0,
      single_use      INTEGER NOT NULL DEFAULT 0,
      expires_at      TEXT    DEFAULT NULL,
      is_active       INTEGER NOT NULL DEFAULT 1,
      created_by      INTEGER REFERENCES users(id),
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_coupon_code ON coupons(code);

    CREATE TABLE IF NOT EXISTS coupon_usages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      coupon_id  INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(coupon_id, order_id)
    );
    CREATE INDEX IF NOT EXISTS idx_usage_coupon ON coupon_usages(coupon_id);
    CREATE INDEX IF NOT EXISTS idx_usage_user   ON coupon_usages(user_id);

    -- ── Shoe ↔ Accessory join table ────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS shoe_accessories (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      shoe_id       INTEGER NOT NULL REFERENCES shoes(id) ON DELETE CASCADE,
      accessory_id  INTEGER NOT NULL REFERENCES accessories(id) ON DELETE CASCADE,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      UNIQUE(shoe_id, accessory_id)
    );
    CREATE INDEX IF NOT EXISTS idx_sa_shoe ON shoe_accessories(shoe_id);
    CREATE INDEX IF NOT EXISTS idx_sa_acc  ON shoe_accessories(accessory_id);

    INSERT OR IGNORE INTO shoe_materials (key, label, sub, color, available, tip, season, rating, sort_order) VALUES
      ('calfskin', 'CALFSKIN', 'Full-Grain', '#b45309', 1, 'Robust und langlebig, entwickelt mit der Zeit eine edle Patina. Ideal für den täglichen Einsatz bei jedem Wetter.', 'Ganzjährig', 'good', 0),
      ('suede', 'SUEDE', 'Nubuck', '#78716c', 1, 'Samtig-weiche Oberfläche für lässig-elegante Looks. Empfindlich bei Nässe, am besten für trockene Tage und Indoor-Anlässe.', 'Frühling / Sommer', 'warn', 1),
      ('patent', 'PATENT', 'High-Gloss', '#111827', 0, 'Hochglanz-Finish für formelle Anlässe, Galas und Abendveranstaltungen. Pflegeleicht, aber empfindlich gegen Kratzer.', 'Events', 'neutral', 2);

    CREATE TABLE IF NOT EXISTS shoe_colors (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      key           TEXT    NOT NULL UNIQUE,
      hex           TEXT    NOT NULL DEFAULT '#000000',
      name          TEXT    NOT NULL,
      available     INTEGER NOT NULL DEFAULT 1,
      tip           TEXT,
      pairs_with    TEXT,
      rating        TEXT    NOT NULL DEFAULT 'neutral'
                    CHECK(rating IN ('good','neutral','warn')),
      sort_order    INTEGER NOT NULL DEFAULT 0,
      created_by    INTEGER REFERENCES users(id),
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO shoe_colors (key, hex, name, available, tip, pairs_with, rating, sort_order) VALUES
      ('schwarz',  '#000000', 'Schwarz',        1, 'Der Klassiker, passt zu jedem Outfit und jedem Anlass. Business, Formal, Casual, Schwarz geht immer.', 'Grau, Navy, alle dunklen Anzüge', 'good', 0),
      ('black',    '#111827', 'Midnight Black',  1, 'Dunkles Anthrazit mit leichtem Blauschimmer. Moderner als reines Schwarz, perfekt für Smart Casual und kreative Berufe.', 'Dunkle Jeans, Navy Blazer, Charcoal Suits', 'good', 1),
      ('cognac',   '#92400e', 'Cognac',          1, 'Warmes Braun mit Tiefe, der ideale Business-Casual-Begleiter. Passt hervorragend zu Beige, Navy und Erdtönen.', 'Beige Chinos, Navy Blazer, Jeans', 'good', 2),
      ('oxblood',  '#7b1e1e', 'Oxblood',         1, 'Sattes Bordeaux-Rot, ein Herbst- und Winter-Statement. Elegant zum dunklen Anzug, lässig zur Jeans.', 'Charcoal, Navy, Dunkelgrün, Tweed', 'neutral', 3),
      ('tan',      '#b45309', 'Tan',             1, 'Helles Karamell-Braun, die perfekte Sommerfarbe. Strahlt bei Sonnenlicht und passt zu hellen, leichten Outfits.', 'Weiß, Hellblau, Leinen, Beige', 'neutral', 4),
      ('navy',     '#1e3a5f', 'Navy',            0, 'Der moderne Gentleman-Ton, elegant und unkonventionell zugleich. Perfekt zu grauen und hellbraunen Outfits.', 'Grau, Beige, helle Jeans, Tweed', 'good', 5),
      ('forest',   '#14532d', 'Forest',          0, 'Tiefes Waldgrün, für den mutigen Stilbewussten. Ein Herbst-Highlight zu Cord, Tweed und Erdtönen.', 'Braun, Beige, Senfgelb, Cord', 'neutral', 6);

    CREATE TABLE IF NOT EXISTS shoe_soles (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      key           TEXT    NOT NULL UNIQUE,
      label         TEXT    NOT NULL,
      sub           TEXT,
      description   TEXT,
      tip           TEXT,
      price_extra   INTEGER NOT NULL DEFAULT 0,
      rating        TEXT    NOT NULL DEFAULT 'good'
                    CHECK(rating IN ('good','neutral','warn')),
      recommended   INTEGER NOT NULL DEFAULT 0,
      categories    TEXT    NOT NULL DEFAULT '*',
      sort_order    INTEGER NOT NULL DEFAULT 0,
      created_by    INTEGER REFERENCES users(id),
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO shoe_soles (key, label, sub, description, tip, price_extra, rating, recommended, categories, sort_order) VALUES
      ('leather',     'LEDERSOHLE',    'Klassisch',    'Handgenähte Ledersohle, elegant und atmungsaktiv.', 'Nur für trockene Bedingungen empfohlen. Ideal im Sommer und für Indoor-Anlässe. Bei Nässe wird es rutschig.', 0, 'warn', 0, 'OXFORD,LOAFER,DERBY,MONK', 0),
      ('rubber-grip', 'ANTI-RUTSCH',   'Gummi-Profil', 'Gummibeschichtete Profilsohle, maximale Rutschfestigkeit auf allen Oberflächen.', 'Unsere Empfehlung für den Alltag. Sicherer Halt bei Regen, Schnee und nassen Böden. Ganzjährig einsetzbar.', 35, 'good', 1, 'OXFORD,LOAFER,DERBY,MONK,BOOT', 1),
      ('sneaker',     'SNEAKER-SOHLE', 'EVA-Komfort',  'Leichte EVA-Komfortsohle mit Dämpfung, für maximalen Gehkomfort den ganzen Tag.', 'Speziell für Sneaker entwickelt. Stoßdämpfend, flexibel und ultraleicht.', 0, 'good', 0, 'SNEAKER', 2);

    -- Im CMS gelöschte Seed-Modelle.
    -- Der Seed legt seine Modelle bei jedem Start per Name neu an, wenn sie
    -- fehlen. Ein im CMS gelöschter Schuh kam dadurch beim nächsten Neustart
    -- zurück. Dieser Merkzettel hält fest, was bewusst entfernt wurde; der
    -- Seed überspringt diese Namen. Wird der Schuh später von Hand wieder
    -- angelegt, verschwindet der Eintrag.
    -- ── Vermittler (Affiliates) ─────────────────────────────────────────────
    -- Wirbt für die Schuhe und erhält je vermitteltem Paar eine Provision.
    --
    -- commission_type/-value: entweder ein fester Betrag je Paar oder ein
    -- Prozentsatz vom Kaufpreis. cap_per_shoe deckelt beides — bewusst je
    -- Paar, nicht je Bestellung, damit ein Einkauf mit mehreren Paaren auch
    -- mehrfach vergütet wird.
    --
    -- gift_shoetree: Der Vermittler kann seinen Kunden einen Zedernholz-
    -- Schuhspanner schenken. Verrechnet wird der Einkaufspreis aus
    -- accessories.cost_price, nicht der Ladenpreis — der liegt mit 45 € über
    -- der Provision selbst. Nur zusammen mit der Prozentwahl sinnvoll.
    CREATE TABLE IF NOT EXISTS affiliates (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
      code            TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      status          TEXT    NOT NULL DEFAULT 'pending'
                              CHECK(status IN ('pending','active','suspended','ended')),

      -- Vertragsdaten
      full_name       TEXT    NOT NULL,
      email           TEXT    NOT NULL,
      phone           TEXT,
      street          TEXT,
      postal_code     TEXT,
      city            TEXT,
      country         TEXT    NOT NULL DEFAULT 'DE',
      birth_date      TEXT,

      -- Steuer und Bank
      tax_status      TEXT    NOT NULL DEFAULT 'small_business'
                              CHECK(tax_status IN ('small_business','vat_liable')),
      tax_number      TEXT,
      vat_id          TEXT,
      iban            TEXT,
      account_holder  TEXT,

      -- Vergütung
      commission_type TEXT    NOT NULL DEFAULT 'percent'
                              CHECK(commission_type IN ('percent','fixed')),
      commission_value REAL   NOT NULL DEFAULT 10,
      cap_per_shoe    REAL    NOT NULL DEFAULT 40,
      gift_shoetree   INTEGER NOT NULL DEFAULT 0,

      terms_accepted_at TEXT,
      note            TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);

    -- Eine Zeile je vermitteltem Paar. orders trägt ohnehin ein Paar je Zeile,
    -- die Zuordnung ist also eins zu eins.
    --
    -- Zustände:
    --   pending    Bestellung liegt vor, noch nicht zugestellt
    --   confirmed  zugestellt, Schutzfrist läuft
    --   payable    Frist verstrichen, keine Rückgabe — auszahlbar
    --   cancelled  zurückgegeben, reklamiert oder storniert
    --   paid       ausgezahlt (payout_id gesetzt)
    CREATE TABLE IF NOT EXISTS affiliate_commissions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      affiliate_id  INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
      order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      status        TEXT    NOT NULL DEFAULT 'pending'
                            CHECK(status IN ('pending','confirmed','payable','cancelled','paid')),
      shoe_price    REAL    NOT NULL DEFAULT 0,   -- Kaufpreis nach Rabatt
      gross_amount  REAL    NOT NULL DEFAULT 0,   -- Provision vor Abzug
      gift_cost     REAL    NOT NULL DEFAULT 0,   -- einbehaltener Einkaufspreis der Zugabe
      amount        REAL    NOT NULL DEFAULT 0,   -- was ausgezahlt wird
      payable_at    TEXT,                          -- Zustellung + Schutzfrist
      payout_id     INTEGER REFERENCES affiliate_payouts(id) ON DELETE SET NULL,
      cancel_reason TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(order_id)
    );
    CREATE INDEX IF NOT EXISTS idx_aff_comm_affiliate ON affiliate_commissions(affiliate_id, status);

    -- Auszahlung über jeweils fünf auszahlbare Paare.
    CREATE TABLE IF NOT EXISTS affiliate_payouts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      affiliate_id  INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
      reference     TEXT    NOT NULL UNIQUE,
      pair_count    INTEGER NOT NULL,
      amount        REAL    NOT NULL,
      paid_at       TEXT,
      note          TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_aff_payouts_affiliate ON affiliate_payouts(affiliate_id);

    CREATE TABLE IF NOT EXISTS deleted_seed_shoes (
      name       TEXT PRIMARY KEY,
      deleted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cms_media (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      filename    TEXT    NOT NULL,
      created_by  INTEGER REFERENCES users(id),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Custom-fit shoe requests (Custom-Anfrage) ───────────────────────────
    -- Guests can submit; user_id is optional. Phone is required for
    -- WhatsApp-Business follow-up by admin / curator.
    CREATE TABLE IF NOT EXISTS custom_requests (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
      customer_name   TEXT    NOT NULL,
      customer_email  TEXT    NOT NULL,
      customer_phone  TEXT    NOT NULL,
      shoe_id         INTEGER REFERENCES shoes(id) ON DELETE SET NULL,
      shoe_name       TEXT,
      material        TEXT,
      color           TEXT,
      sole            TEXT,
      eu_size         TEXT,
      scan_id         INTEGER REFERENCES foot_scans(id) ON DELETE SET NULL,
      accessories     TEXT,                              -- JSON string
      notes           TEXT,
      status          TEXT    NOT NULL DEFAULT 'open'
                      CHECK(status IN ('open','contacted','in_progress','quoted','accepted','declined','closed')),
      admin_notes     TEXT,
      assigned_to     INTEGER REFERENCES users(id),
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_custom_requests_status ON custom_requests(status);
    CREATE INDEX IF NOT EXISTS idx_custom_requests_user   ON custom_requests(user_id);

    -- ── Per-shoe Material- und Farb-Optionen ────────────────────────────────
    -- Wenn der Admin im CMS Materialien/Farben für einen Schuh setzt, zeigt
    -- der Konfigurator nur diese. Sonst Fallback auf alle globalen Werte.
    CREATE TABLE IF NOT EXISTS shoe_material_options (
      shoe_id      INTEGER NOT NULL REFERENCES shoes(id) ON DELETE CASCADE,
      material_key TEXT    NOT NULL,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (shoe_id, material_key)
    );
    CREATE INDEX IF NOT EXISTS idx_shoe_material_options_shoe ON shoe_material_options(shoe_id);

    -- Farb-Varianten pro Schuh inkl. Bilder. Mind. 1 Bild Pflicht
    -- (Backend lehnt PUT ab, wenn images leer ist).
    CREATE TABLE IF NOT EXISTS shoe_color_variants (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      shoe_id     INTEGER NOT NULL REFERENCES shoes(id) ON DELETE CASCADE,
      hex         TEXT    NOT NULL DEFAULT '#000000',
      name        TEXT    NOT NULL,
      images      TEXT    NOT NULL DEFAULT '[]',  -- JSON Array von base64-Strings
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_shoe_color_variants_shoe ON shoe_color_variants(shoe_id);

    -- ── Generisches Konfigurator-Options-System ─────────────────────────────
    -- option_groups: Konfigurator-Schritte (Last, Sohle, Welt, Heel, Toe, …)
    CREATE TABLE IF NOT EXISTS option_groups (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      key           TEXT    NOT NULL UNIQUE,
      label         TEXT    NOT NULL,
      description   TEXT,
      ui_type       TEXT    NOT NULL DEFAULT 'single'
                    CHECK(ui_type IN ('single','toggle','multi')),
      required      INTEGER NOT NULL DEFAULT 1,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- options: konkrete Werte innerhalb einer Gruppe (z. B. Zurigo, Monti, …)
    CREATE TABLE IF NOT EXISTS options (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id              INTEGER NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
      key                   TEXT    NOT NULL,
      label                 TEXT    NOT NULL,
      description           TEXT,
      image_data            TEXT,
      default_price_extra   REAL    NOT NULL DEFAULT 0,
      applicable_categories TEXT    NOT NULL DEFAULT '*',  -- '*' oder 'OXFORD,DERBY,…'
      sort_order            INTEGER NOT NULL DEFAULT 0,
      created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at            TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(group_id, key)
    );
    CREATE INDEX IF NOT EXISTS idx_options_group ON options(group_id);

    -- shoe_options: pro Schuh aktivierte Werte + ggf. Preis-Override
    CREATE TABLE IF NOT EXISTS shoe_options (
      shoe_id        INTEGER NOT NULL REFERENCES shoes(id) ON DELETE CASCADE,
      option_id      INTEGER NOT NULL REFERENCES options(id) ON DELETE CASCADE,
      price_override REAL,
      is_default     INTEGER NOT NULL DEFAULT 0,
      sort_order     INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (shoe_id, option_id)
    );
    CREATE INDEX IF NOT EXISTS idx_shoe_options_shoe ON shoe_options(shoe_id);

    -- category_templates: pro Schuh-Kategorie welche Optionen typisch sind
    CREATE TABLE IF NOT EXISTS category_templates (
      category    TEXT    NOT NULL,
      option_id   INTEGER NOT NULL REFERENCES options(id) ON DELETE CASCADE,
      is_default  INTEGER NOT NULL DEFAULT 0,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (category, option_id)
    );
    CREATE INDEX IF NOT EXISTS idx_category_templates_cat ON category_templates(category);

    -- ── Passform-Maßtabelle (Leisten × Weite × Größe → Länge + Ballenumfang) ──
    CREATE TABLE IF NOT EXISTS last_size_chart (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      last_key       TEXT    NOT NULL,
      width          TEXT    NOT NULL DEFAULT 'D',     -- D | EE | EEE
      size_system    TEXT    NOT NULL DEFAULT 'EU',    -- EU | US
      size_label     TEXT    NOT NULL,                 -- '42','42.5',… bzw. US
      foot_length_mm REAL    NOT NULL,
      ball_girth_mm  REAL    NOT NULL,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(last_key, width, size_system, size_label)
    );
    CREATE INDEX IF NOT EXISTS idx_last_size_chart_lk ON last_size_chart(last_key);
  `)

  // ── B2B-Firmenkonten (business.artisansole.com) ──────────────────────────
  // Ein Firmenkonto gehört genau einem Login (owner_user_id, role 'user',
  // is_active=0 bis zur Registrierung über den Einladungslink). Das Logo wird
  // als base64 (data:-URL) gespeichert und später auf der Sohle verwendet.
  db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_user_id     INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      name              TEXT    NOT NULL,
      contact_email     TEXT,
      contact_phone     TEXT,
      logo_data         TEXT,
      status            TEXT    NOT NULL DEFAULT 'pending'
                        CHECK(status IN ('pending','active','suspended')),
      source_request_id INTEGER REFERENCES custom_requests(id) ON DELETE SET NULL,
      invite_token      TEXT,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_businesses_owner  ON businesses(owner_user_id);
    CREATE INDEX IF NOT EXISTS idx_businesses_invite ON businesses(invite_token);
  `)

  // ── Einmal-Codes pro Firmenkonto ─────────────────────────────────────────
  // Pro Code konfigurierbar: Deckung (voll vs. Rabatt) und Einlösbarkeit
  // (festgelegtes Design vs. freie Katalogwahl). Jeder Code ist genau einmal
  // einlösbar (status issued → redeemed).
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_codes (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id       INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      code              TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      coverage_type     TEXT    NOT NULL DEFAULT 'full'
                        CHECK(coverage_type IN ('full','discount')),
      discount_type     TEXT    CHECK(discount_type IN ('percentage','fixed')),
      discount_value    REAL,
      design_scope      TEXT    NOT NULL DEFAULT 'catalog'
                        CHECK(design_scope IN ('fixed','catalog')),
      allowed_shoe_ids  TEXT,                            -- JSON-Array von shoe-ids (design_scope='fixed')
      max_value         REAL,                            -- Wert-Obergrenze (optional)
      status            TEXT    NOT NULL DEFAULT 'issued'
                        CHECK(status IN ('issued','redeemed','revoked','expired')),
      redeemed_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
      redeemed_order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      redeemed_at       TEXT,
      expires_at        TEXT,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_business_codes_biz  ON business_codes(business_id);
    CREATE INDEX IF NOT EXISTS idx_business_codes_code ON business_codes(code);
  `)

  // ── B2B-Kampagnen (MOQ-Sammelbestellung) ─────────────────────────────────
  // Eine Kampagne gehört einem Firmenkonto. Mitarbeitende treten über einen
  // Join-Link (E-Mail-Domain) oder eine E-Mail-Allow-Liste bei und bestellen
  // zum Kampagnen-Rabatt. MOQ (moq_per_model) ist ein Richtwert fürs Dashboard,
  // KEIN harter Checkout-Gate (optimistisch; Admin schließt manuell).
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_campaigns (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id          INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name                 TEXT    NOT NULL,
      slug                 TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      payment_mode         TEXT    NOT NULL DEFAULT 'employee'
                           CHECK(payment_mode IN ('employee','company')),
      discount_pct         REAL    NOT NULL DEFAULT 25,
      moq_per_model        INTEGER NOT NULL DEFAULT 10,
      allowed_shoe_ids     TEXT,                       -- JSON-Array; NULL = ganzer Office-Katalog
      access_mode          TEXT    NOT NULL DEFAULT 'domain'
                           CHECK(access_mode IN ('domain','list','both')),
      allowed_email_domain TEXT,                       -- z. B. 'firma.com'
      status               TEXT    NOT NULL DEFAULT 'draft'
                           CHECK(status IN ('draft','open','closed')),
      deadline             TEXT,                       -- optionales ISO-Datum
      created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at           TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_campaigns_biz  ON business_campaigns(business_id);
    CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON business_campaigns(slug);

    CREATE TABLE IF NOT EXISTS business_campaign_members (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL REFERENCES business_campaigns(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(campaign_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_campaign_members_user ON business_campaign_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_campaign_members_camp ON business_campaign_members(campaign_id);

    CREATE TABLE IF NOT EXISTS business_campaign_invites (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id    INTEGER NOT NULL REFERENCES business_campaigns(id) ON DELETE CASCADE,
      email          TEXT    NOT NULL COLLATE NOCASE,
      token          TEXT    UNIQUE,
      status         TEXT    NOT NULL DEFAULT 'pending'
                     CHECK(status IN ('pending','joined','revoked')),
      joined_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(campaign_id, email)
    );
    CREATE INDEX IF NOT EXISTS idx_campaign_invites_camp ON business_campaign_invites(campaign_id);
  `)

  // ── Spalten-Migrationen GANZ AM ENDE ausführen ───────────────────────────
  // Erst hier existieren ALLE Tabellen (auch shoe_materials, options,
  // option_groups, category_templates aus den späteren db.exec-Blöcken).
  // Vorher liefen diese ALTERs ins Leere („no such table") und Spalten wie
  // family/applicable_materials/color_hex/icon/helper_text/recommended
  // wurden NIE angelegt, was den Seed crashen ließ.
  for (const sql of colMigrations) {
    try { db.exec(sql) } catch { /* column already exists */ }
  }

  // ── Slugs für bestehende Modelle nachtragen ──────────────────────────────
  // Muss NACH der colMigrations-Schleife stehen: dort wird shoes.slug erst
  // angelegt. Weiter oben lief der Nachtrag in „no such column: slug".
  try {
    const missing = db.prepare("SELECT id, name FROM shoes WHERE length(coalesce(slug, '')) = 0").all()
    if (missing.length) {
      const upd = db.prepare('UPDATE shoes SET slug = ? WHERE id = ?')
      // Einzeln, nicht gesammelt: uniqueShoeSlug liest die bereits vergebenen
      // Slugs, jeder Schritt muss den vorherigen also schon sehen.
      for (const s of missing) upd.run(uniqueShoeSlug(db, s.name, s.id), s.id)
      console.log(`✅ Slugs nachgetragen: ${missing.length} Modell(e)`)
    }
  } catch (e) { console.error('[migrate shoes.slug]', e.message) }

  // ── Footer-Migration: veraltete /legal-Typen auf gültige Ziele umschreiben ──
  // Frühere Footer-Defaults nutzten Rechtstypen, die das Backend nicht kennt
  // (terms/privacy/imprint/about/shipping/withdrawal/cookies) → 400 / tote Links.
  // Bereits gespeicherte Footer-Konfigurationen werden hier idempotent korrigiert.
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'footer_config'").get()
    if (row?.value) {
      const map = {
        '/legal/terms': '/legal/agb',
        '/legal/privacy': '/legal/datenschutz',
        '/legal/imprint': '/legal/impressum',
        '/legal/about': '/explore',
        '/legal/shipping': '/help',
        '/legal/withdrawal': '/feedback',
        '/legal/cookies': '/legal/datenschutz',
      }
      let v = row.value, changed = false
      for (const [bad, good] of Object.entries(map)) {
        if (v.includes(bad)) { v = v.split(bad).join(good); changed = true }
      }
      if (changed) {
        db.prepare("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'footer_config'").run(v)
        console.log('[migrate footer legal links] veraltete /legal-Typen korrigiert')
      }
    }
  } catch (e) { console.error('[migrate footer legal links]', e.message) }
}
