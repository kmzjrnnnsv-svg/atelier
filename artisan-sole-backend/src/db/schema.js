import { uniqueShoeSlug } from '../utils/slug.js'

// Alle Zustände, die eine Bestellung annehmen darf. Einzige Quelle für die
// CHECK-Bedingung — sowohl beim Anlegen der Tabelle als auch beim Nachrüsten.
const ORDER_STATUS = [
  'pending_payment', 'pending', 'processing',
  'quality_check', 'shipped', 'delivered', 'cancelled',
]

/**
 * Sorgt dafür, dass orders.status alle Zustände aus ORDER_STATUS zulässt.
 *
 * SQLite kann eine CHECK-Bedingung nicht ändern; die Tabelle muss neu gebaut
 * werden. Drei Dinge, die die früheren Versuche falsch gemacht haben:
 *
 *  1. Sie schrieben die Spaltenliste ab. Jede später per ALTER TABLE ergänzte
 *     Spalte fehlte damit im Neubau — samt Inhalt. Hier wird stattdessen die
 *     vorhandene CREATE-Anweisung übernommen und nur die Statusliste ersetzt,
 *     sodass Spalten, Vorgaben und Fremdschlüssel wortgleich erhalten bleiben.
 *  2. Sie liefen ohne Transaktion. Ein Fehler in der Mitte ließ die
 *     Zwischentabelle stehen, und deren bloße Existenz blockierte alle
 *     folgenden Versuche.
 *  3. Sie ließen die Fremdschlüssel eingeschaltet. `DROP TABLE orders` löst
 *     dann die ON-DELETE-CASCADE-Regeln der Kindtabellen aus — coupon_usages
 *     und affiliate_commissions wären mitgelöscht worden.
 */
function ensureOrderStatusCheck(db) {
  // Leichen der alten Versuche wegräumen. orders_new2 liegt auf dem
  // Produktivsystem seit Monaten herum und ließ dort jeden Start mit
  // „table orders_new2 already exists" scheitern.
  for (const t of ['orders_new', 'orders_new2']) {
    try {
      const stale = db.prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?"
      ).get(t)
      if (stale) {
        const { n } = db.prepare(`SELECT COUNT(*) AS n FROM "${t}"`).get()
        db.exec(`DROP TABLE "${t}"`)
        console.log(`🧹 Reste eines abgebrochenen orders-Umbaus entfernt: ${t} (${n} Zeilen)`)
      }
    } catch (e) { console.error(`[orders.status] ${t}`, e.message) }
  }

  const row = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'"
  ).get()
  if (!row?.sql) return

  const missing = ORDER_STATUS.filter(s => !row.sql.includes(`'${s}'`))
  if (!missing.length) return

  const check = /CHECK\s*\(\s*status\s+IN\s*\([^)]*\)\s*\)/i
  if (!check.test(row.sql)) {
    console.error('[orders.status] CHECK-Bedingung nicht gefunden — übersprungen')
    return
  }

  const createTmp = row.sql
    .replace(/^\s*CREATE\s+TABLE\s+(?:"orders"|'orders'|`orders`|\[orders\]|orders)/i,
             'CREATE TABLE orders_rebuild')
    .replace(check, `CHECK(status IN (${ORDER_STATUS.map(s => `'${s}'`).join(',')}))`)

  if (!createTmp.startsWith('CREATE TABLE orders_rebuild')) {
    console.error('[orders.status] Tabellenname nicht ersetzbar — übersprungen')
    return
  }

  // Spalten namentlich kopieren statt SELECT *: Reihenfolge ist so garantiert
  // unerheblich.
  const cols = db.prepare('PRAGMA table_info(orders)').all()
    .map(c => `"${c.name}"`).join(',')

  // Indizes gehen beim DROP verloren und werden danach wiederhergestellt.
  const indexes = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='orders' AND sql IS NOT NULL"
  ).all().map(r => r.sql)

  // PRAGMA foreign_keys wirkt innerhalb einer Transaktion nicht — deshalb hier,
  // außerhalb. Ohne das Abschalten löscht DROP TABLE die Kindzeilen mit.
  db.pragma('foreign_keys = OFF')
  try {
    db.transaction(() => {
      db.exec('DROP TABLE IF EXISTS orders_rebuild')
      db.exec(createTmp)
      db.exec(`INSERT INTO orders_rebuild (${cols}) SELECT ${cols} FROM orders`)
      db.exec('DROP TABLE orders')
      db.exec('ALTER TABLE orders_rebuild RENAME TO orders')
      for (const sql of indexes) db.exec(sql)

      const broken = db.pragma('foreign_key_check')
      if (broken.length) throw new Error(`${broken.length} verwaiste Verweise — Umbau verworfen`)
    })()
    console.log(`✅ orders.status erweitert um: ${missing.join(', ')}`)
  } catch (e) {
    console.error('[orders.status]', e.message)
    // Nach einem Rückrollen darf nichts liegen bleiben, sonst wiederholt sich
    // genau die Blockade, die diese Funktion beseitigen soll.
    try { db.exec('DROP TABLE IF EXISTS orders_rebuild') } catch { /* egal */ }
  } finally {
    db.pragma('foreign_keys = ON')
  }
}

// Produkttexte der beiden Pflegesets. Angaben vom Hersteller: Fertigung in
// Italien, Schachtel 18 × 11 × 5 cm, Inhalt wie aufgeführt.
const LEATHER_KIT_DESC =
  'Alles für die Reinigung und Pflege glatter Leder. Vollständig in Italien gefertigt, geliefert in einer eigens angefertigten Schachtel, 18 × 11 × 5 cm.\n\nInhalt: ein Tiegel natürliche Lederpflegecreme, ein Poliertuch aus 100 % Baumwolle, zwei kleine Rundbürsten, zwei große Bürsten. Eine Pflegeanleitung liegt bei.\n\nGedacht für weiche Leder wie Box Calf oder poliertes Kalbsleder. Wir empfehlen, in alle Schuhe Spanner einzusetzen, solange sie nicht getragen werden.'

const SUEDE_KIT_DESC =
  'Zum Auffrischen von Wildleder und Nubuk. Vollständig in Italien gefertigt, geliefert in einer eigens angefertigten Schachtel, 18 × 11 × 5 cm. Auch einzeln erhältlich.\n\nInhalt: eine runde Messingbürste, eine runde Kreppbürste, ein Nubuk-Auffrischungsspray, ein kleiner Kreppradierer mit Bürste. Eine Pflegeanleitung liegt bei.\n\nGedacht für samtige Leder wie Wildleder und Nubuk. Wir empfehlen, in alle Schuhe Spanner einzusetzen, solange sie nicht getragen werden.'

// Einkaufspreise je Zubehör-Schlüssel. Nur für Artikel nötig, die als Zugabe
// im Affiliate-Programm auftauchen — der Einkaufspreis wird dort von der
// Provision einbehalten.
const ACCESSORY_COSTS = {
  shoe_tree_cedar: 22.0,
}

// Zubehör, das früher aus diesem Seed stammte und nicht mehr geführt wird.
// Bewusst als feste Liste und nicht als „alles, was nicht in accData steht":
// Artikel, die im CMS von Hand angelegt wurden, sollen bleiben.
const RETIRED_ACCESSORIES = [
  'shoetrees', 'carekit', 'dustbag', 'shoehorn', 'belt',
  'horsehair_brush', 'suede_brush', 'suede_spray', 'suede_eraser',
  'cream_dark', 'cream_cognac', 'cordovan_balm', 'patent_care',
  'boot_jack', 'waxed_laces', 'sneaker_kit', 'buckle_cloth',
  'sole_oil', 'exotic_care', 'polishing_cloth',
  'care_kit_saphir_patina', 'calf_care_cream', 'shoe_cream_black',
]

/**
 * War die Datenbank leer, als die Migrationen liefen?
 *
 * Wichtig für die Katalog-Vorlage (seedExport.js): Auf einer frischen
 * Installation legt der Quelltext hier gleich seine alten Festwerte an — Preise
 * von damals. Die Vorlage darf die dann überschreiben, weil es keine gepflegten
 * Daten gibt, die verloren gehen könnten. Auf einer laufenden Datenbank darf sie
 * das nicht.
 *
 * Die Auskunft gilt einmal: Wer sie abholt, verbraucht sie. Ein zweiter
 * Seed-Lauf im selben Prozess arbeitet damit auf einer Datenbank, die
 * mittlerweile gepflegte Daten enthält, und lässt sie in Ruhe.
 */
const frischeDbs = new WeakSet()
export function frischeInstallationVerbrauchen(db) {
  if (!frischeDbs.has(db)) return false
  frischeDbs.delete(db)
  return true
}

export function runMigrations(db) {
  const leer = db.prepare(
    "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
  ).get().n === 0
  if (leer) frischeDbs.add(db)

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


    CREATE INDEX IF NOT EXISTS idx_refresh_user    ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_exp     ON refresh_tokens(expires_at);
    CREATE INDEX IF NOT EXISTS idx_scans_user      ON foot_scans(user_id);

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

    -- ── Der Weg einer Bestellung ────────────────────────────────────────────
    --
    -- Die Bestellung trägt ihren Status, aber ein Status ist ein Zustand und
    -- keine Geschichte: Er sagt, wo das Paar gerade ist, nicht wann es dorthin
    -- kam und wer es bewegt hat. Der Kunde sah deshalb eine Stufe ohne Datum,
    -- und bei einer Rückfrage ließ sich nicht belegen, wann freigegeben wurde.
    --
    -- Eine Zeile je Übergang. Sie wird nie geändert und nie gelöscht — das ist
    -- der Punkt: Was hier steht, ist der Nachweis.
    CREATE TABLE IF NOT EXISTS order_events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      status     TEXT    NOT NULL,
      note       TEXT,
      -- Wer den Übergang ausgelöst hat: 'kunde', 'verwaltung' oder 'system'.
      -- Der Name statt der Nutzerkennung, damit der Eintrag lesbar bleibt,
      -- wenn das Konto später gelöscht wird.
      actor      TEXT    NOT NULL DEFAULT 'system',
      actor_id   INTEGER,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_order_events ON order_events(order_id, id);

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
    // accessories, zweiter Preis: was der Artikel kostet, wenn er ZUSAMMEN mit
    // einem Paar Schuhe bestellt wird. Dann geht er im selben Karton hinaus;
    // allein braucht er Verpackung und Porto für sich. NULL heißt: ein Preis
    // für beide Wege, nämlich `price`.
    `ALTER TABLE accessories ADD COLUMN price_with_shoe REAL`,
    // accessories, Art der Konfiguration. NULL ist der Normalfall — der
    // Artikel wandert wie er ist in den Warenkorb. 'belt' heißt: Er wird
    // vorher konfiguriert (Leder, Farbe, Schließe, Metall, Länge), und die
    // Oberfläche zeigt dafür eine Maske statt eines Knopfes.
    `ALTER TABLE accessories ADD COLUMN config_kind TEXT`,
    // shoes, zu welcher Jahreszeit das Modell gehört: 'summer' | 'winter' |
    // 'all'. Die einzige Ordnung, die der Kunde noch sieht — die Machart
    // (OXFORD, LOAFER …) bleibt im Programm, weil an ihr Leisten und
    // Optionen hängen, verschwindet aber aus dem Laden.
    `ALTER TABLE shoes ADD COLUMN season TEXT`,
    // accessories, darf dieser Artikel allein reisen?
    //
    // Für Pflegesets und Spanner gilt: nein — das Porto kostet mehr als der
    // Artikel. Der Gürtel trägt sein Porto selbst, und ein Kunde, der ein
    // halbes Jahr nach den Schuhen den passenden Gürtel bestellen will, soll
    // dafür nicht ein zweites Paar kaufen müssen.
    `ALTER TABLE accessories ADD COLUMN ships_alone INTEGER NOT NULL DEFAULT 0`,
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
    // accessories, Einkaufspreis. Nötig, seit ein Affiliate seinem Kunden
    // eine Zugabe schenken kann: Verrechnet wird der Einkaufspreis, nicht der
    // Ladenpreis. Beim Schuhspanner (45 € im Verkauf) läge der Ladenpreis über
    // der Provision selbst — der Affiliate zahlte drauf.
    `ALTER TABLE accessories ADD COLUMN cost_price REAL`,
    // Bilderstrecke wie bei den Modellen: JSON-Feld, Reihenfolge trägt die
    // Bedeutung — erstes Bild in der Übersicht, zweites beim Überfahren.
    // image_data bleibt als Rückfall für Zubehör, das nur ein Bild hat.
    `ALTER TABLE accessories ADD COLUMN images TEXT`,
    // orders, Rückgabe und Reklamation nach Zustellung. Der Statuswert
    // 'cancelled' meint eine Stornierung VOR Lieferung; was danach passiert,
    // ließ sich bisher nirgends festhalten.
    `ALTER TABLE orders ADD COLUMN returned_at    TEXT`,
    `ALTER TABLE orders ADD COLUMN return_reason  TEXT`,
    `ALTER TABLE orders ADD COLUMN delivered_at   TEXT`,
    // orders, vermittelnder Code (Kleinschreibung, wie in affiliates.code)
    `ALTER TABLE orders ADD COLUMN affiliate_code TEXT`,
    // Fertigungsspezifikation: Sohle und die gewählten Zusatzoptionen.
    // Beides wurde im Warenkorb geführt, ging beim Bestellen aber verloren —
    // in der Bestellung standen nur Modell, Leder und Farbe.
    `ALTER TABLE orders ADD COLUMN sole   TEXT`,
    `ALTER TABLE orders ADD COLUMN extras TEXT`,
    // Verweis auf die gespeicherte Konfiguration — die maßgebliche Quelle.
    `ALTER TABLE orders ADD COLUMN config_id TEXT REFERENCES shoe_configs(id)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_affiliate ON orders(affiliate_code)`,
    `ALTER TABLE shoes ADD COLUMN slug TEXT`,
    `CREATE INDEX IF NOT EXISTS idx_shoes_slug ON shoes(slug)`,
    // shoes, optionales 3D-Modell (.glb/.gltf) als Pfad unter /uploads.
    // Kein base64 wie bei den Bildern — solche Dateien sind um Größenordnungen
    // schwerer und haben in einer Datenbankspalte nichts verloren.
    `ALTER TABLE shoes ADD COLUMN model_3d TEXT`,
    // ── Express-Linie ────────────────────────────────────────────────────
    //
    // Manche Modelle lassen sich in rund zwei statt vier bis sechs Wochen
    // fertigen, weil häufig gewählte Bauteile — zugeschnittene Schäfte,
    // vorbereitete Sohlen — vorgehalten werden. Gezwickt und ausgearbeitet
    // wird trotzdem auf dem Leisten des Kunden: Das Paar ist eine
    // Einzelanfertigung, nur mit kürzerem Weg dorthin.
    //
    // Die Eigenschaft hängt am Modell, nicht an der Bestellung. Ob ein Schuh
    // so gebaut werden kann, entscheidet die Werkstatt und nicht der Kunde
    // beim Bezahlen.
    `ALTER TABLE shoes ADD COLUMN express INTEGER NOT NULL DEFAULT 0`,
    // Aufpreis in Euro. Die schnellere Fertigung kostet Vorhaltung: Bauteile
    // liegen auf Lager, ohne dass feststeht, ob sie jemand abruft.
    `ALTER TABLE shoes ADD COLUMN express_surcharge REAL NOT NULL DEFAULT 100`,
    // Zugesagte Dauer in Wochen — Richtwert, kein Fixtermin (AGB Ziffer 2.1).
    `ALTER TABLE shoes ADD COLUMN express_weeks INTEGER NOT NULL DEFAULT 2`,
    // Welche Auswahlgruppen im Express-Weg offen bleiben (JSON-Array von
    // option_groups.key). Leer heißt: nur Größe und Weite, alles andere ist
    // durch das vorbereitete Bauteil festgelegt.
    //
    // Bewusst leer als Vorgabe. Eine Gruppe zu öffnen, die sich am
    // vorbereiteten Schaft gar nicht mehr ändern lässt, wäre ein Versprechen
    // an den Kunden, das die Werkstatt nicht halten kann — die Liste gehört
    // deshalb von Hand gesetzt, Modell für Modell.
    `ALTER TABLE shoes ADD COLUMN express_groups TEXT NOT NULL DEFAULT '[]'`,
    // ── Kollektion ───────────────────────────────────────────────────────
    //
    // Eine Ebene über der Kategorie. Die Kategorie sagt, was für ein Schuh
    // es ist (Oxford, Loafer); die Kollektion sagt, zu welchem Angebot er
    // gehört — Maßanfertigung, Express, später Damen.
    //
    // Nötig geworden, weil dieselbe Machart in zwei Linien vorkommt: Es gibt
    // den Oxford als Maßanfertigung und als Express. Ohne diese Spalte
    // stünden beide unsortiert nebeneinander in der Kollektionsansicht, und
    // der Kunde sähe zweimal „Oxford" zu verschiedenen Preisen, ohne dass
    // ihm jemand sagt, warum.
    // ── Eine Zahlung je Warenkorb ────────────────────────────────────────
    //
    // Ein Korb mit zwei Paaren wird zu zwei Bestellungen — das ist richtig, sie
    // werden einzeln gefertigt, einzeln versandt, einzeln storniert. Bezahlt
    // wird aber einmal.
    //
    // Bisher bekam jede Bestellung ihren eigenen Verwendungszweck und ihren
    // eigenen Betrag, während die Bestätigungsseite die Gesamtsumme zeigte.
    // Wer wie angezeigt überwies, hatte eine überzahlte und eine unbezahlte
    // Bestellung — und niemandem fiel auf, warum.
    //
    // `payment_ref` klammert zusammen, was zusammen bezahlt wird. Alle
    // Bestellungen eines Kaufs tragen dieselbe; der Betrag ist ihre Summe.
    `ALTER TABLE orders ADD COLUMN payment_ref TEXT`,
    // Die Kennung des Warenkorbs, aus dem diese Bestellung stammt. Der Browser
    // vergibt sie einmal je Kauf; der Server erkennt daran die Geschwister.
    `ALTER TABLE orders ADD COLUMN basket_id TEXT`,
    // Wann die Zahlungsanweisung für diesen Kauf hinausging. Steht nur an der
    // Bestellung, die den Verwendungszweck stiftet, und verhindert, dass ein
    // zweiter Aufruf dieselbe Mail noch einmal verschickt.
    `ALTER TABLE orders ADD COLUMN payment_mailed_at TEXT`,
    `CREATE INDEX IF NOT EXISTS idx_orders_payment_ref ON orders(payment_ref)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_basket ON orders(basket_id)`,
    `ALTER TABLE shoes ADD COLUMN collection TEXT NOT NULL DEFAULT 'standard'`,
    `CREATE INDEX IF NOT EXISTS idx_shoes_collection ON shoes(collection)`,

    // ── Nach dem Kauf ────────────────────────────────────────────────────
    //
    // Bis hierher endete die Bestellung mit dem Status. Wann er sich änderte,
    // stand nirgends; wo das Paket ist, auch nicht. Der Kunde sah eine Stufe
    // ohne Datum und ohne Aussicht, und die Verwaltung beantwortete das per
    // Nachricht.
    //
    // Sendungsnummer und Zusteller. Getrennte Spalten, weil erst beides
    // zusammen einen Link ergibt — eine Nummer ohne Dienstleister ist eine
    // Zahl, die niemand nachschlagen kann.
    `ALTER TABLE orders ADD COLUMN tracking_code TEXT`,
    `ALTER TABLE orders ADD COLUMN carrier       TEXT`,
    // Wann die Zahlung verbucht wurde. Bis dahin trug allein der Status die
    // Information, und der lässt sich zurückdrehen.
    `ALTER TABLE orders ADD COLUMN paid_at TEXT`,
    // Stornierung. Die Staffel steht in den AGB (Ziffer 7.2); was tatsächlich
    // einbehalten und was erstattet wurde, muss an der Bestellung stehen —
    // sonst ist der Vorgang nach einem Jahr nicht mehr nachvollziehbar.
    `ALTER TABLE orders ADD COLUMN cancelled_at   TEXT`,
    `ALTER TABLE orders ADD COLUMN cancel_fee_pct REAL`,
    `ALTER TABLE orders ADD COLUMN cancel_fee     REAL`,
    `ALTER TABLE orders ADD COLUMN refund_amount  REAL`,
    `ALTER TABLE orders ADD COLUMN cancel_reason  TEXT`,
    `ALTER TABLE orders ADD COLUMN cancelled_by   TEXT`,
    // Rechnungsnummer. Fortlaufend und lückenlos je Jahr — eine Rechnung
    // darf nicht zweimal vergeben und nicht übersprungen werden.
    `ALTER TABLE orders ADD COLUMN invoice_no        TEXT`,
    `ALTER TABLE orders ADD COLUMN invoice_issued_at TEXT`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_invoice ON orders(invoice_no) WHERE invoice_no IS NOT NULL`,

    // ── Passwort zurücksetzen ────────────────────────────────────────────
    //
    // Gab es nie, aus einem Grund, der entfallen ist: Der Mailversand stand
    // still. Die Kontowiederherstellung führt zu einem neuen Passkey — wer
    // sich mit Passwort angemeldet hat und es vergisst, hatte keinen Weg
    // zurück.
    //
    // Gespeichert wird der SHA-256 des Tokens, nicht das Token. Wer die
    // Datenbank liest, soll sich damit nicht anmelden können.
    `ALTER TABLE users ADD COLUMN reset_token_hash TEXT`,
    `ALTER TABLE users ADD COLUMN reset_expires_at TEXT`,

    // ── Express-Bestand ──────────────────────────────────────────────────
    //
    // Die zwei Wochen sind eine Zusage, und sie hängt daran, dass in der
    // Werkstatt vorbereitete Schäfte liegen. Ohne Zähler ist sie ungedeckt:
    // Der Laden nimmt Bestellungen an, für die es kein Bauteil gibt.
    //
    // NULL heißt ausdrücklich „nicht geführt" — nicht „null Stück". Wer den
    // Bestand nicht pflegen will, ändert nichts und der Laden verhält sich
    // wie bisher.
    `ALTER TABLE shoes ADD COLUMN express_stock INTEGER`,

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

  // ── Zubehör: fünf Artikel, mehr wird nicht geführt ───────────────────────
  // Vorher standen hier 28 Einträge — ein Katalog aus Cremes, Bürsten,
  // Tüchern und Gürteln, den es real nie gab. Geführt werden zwei Pflegesets
  // (Glatt- und Wildleder) und drei Spanner (Zeder, schwarz, Zeder für
  // Stiefel). Die übrigen 23 sind unter RETIRED_ACCESSORIES aufgeführt und
  // werden unten entfernt; ein bloßes Streichen aus dieser Liste würde sie
  // nicht los, weil der Upsert nur anlegt und aktualisiert, nie löscht.
  try {
    const accData = [
      { key: 'care_kit_leather', name: 'Lederpflege-Set',              desc: LEATHER_KIT_DESC,        price: 23.7,  sort: 0, rec: '[]',                                  not: '["SNEAKER"]' },
      { key: 'care_kit_suede',   name: 'Wildlederpflege-Set',           desc: SUEDE_KIT_DESC, price: 25.25, sort: 1, rec: '[]',                                  not: '[]' },
      { key: 'shoe_tree_cedar',  name: 'Zedernholz-Schuhspanner',       desc: 'Spanner aus aromatischem Zedernholz. Nimmt Feuchtigkeit auf und hält den Schuh in Form.',                                    price: 21.0,  sort: 2, rec: '[]',                                  not: '["SNEAKER"]', cost: 22.0 },
      { key: 'shoe_tree_black',  name: 'Schuhspanner Schwarz',          desc: 'Lackierter Spanner in Schwarz, passend zu schwarzen Schuhen. Hält den Schuh in Form.',                                        price: 22.0,  sort: 3, rec: '[]',                                  not: '["SNEAKER"]' },
      { key: 'boot_tree_cedar',  name: 'Zedernholz-Stiefelspanner',     desc: 'Hoher Spanner aus Zedernholz für Stiefel und Boots. Bewahrt Schaft und Form.',                                                price: 29.0,  sort: 4, rec: '["BOOT","CHELSEA","CHUKKA","JODHPUR"]', not: '["SNEAKER"]' },
    ]
    const upsert = db.prepare(`
      INSERT INTO accessories (key, name, description, price, sort_order, is_active, recommended_for, not_recommended_for)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      -- NICHTS überschreiben. Der Seed legt fehlende Artikel an, mehr nicht.
      -- Vorher stand hier price = excluded.price: Jeder Serverstart schrieb
      -- den im CMS gepflegten Preis mit dem fest im Code stehenden Wert
      -- zurück. Für den Betreiber sah es aus, als würde nicht gespeichert —
      -- gespeichert wurde, nur beim nächsten Start wieder überschrieben.
      -- Dasselbe galt für Name, Beschreibung, Sortierung und Zuordnung.
      ON CONFLICT(key) DO NOTHING
    `)
    // Im CMS gelöschte Artikel bleiben gelöscht.
    const geloescht = new Set(
      db.prepare('SELECT key FROM deleted_seed_accessories').all().map(r => r.key)
    )
    for (const a of accData) {
      if (geloescht.has(a.key)) continue
      upsert.run(a.key, a.name, a.desc, a.price, a.sort, a.rec, a.not)
    }

    // Einmalige Textkorrekturen — ausdrücklich ohne Preise anzufassen.
    // Lieferantenzusätze gehören nicht in den Laden; sie werden nur entfernt,
    // solange sie noch dastehen, und nie wieder gesetzt.
    db.prepare(`
      UPDATE accessories
      SET name = TRIM(REPLACE(REPLACE(REPLACE(name,
            ' (Private Labeled)', ''), ' (Labeled)', ''), ' (1 Unit)', ''))
      WHERE name LIKE '%(Labeled)%' OR name LIKE '%(Private Labeled)%' OR name LIKE '%(1 Unit)%'
    `).run()

    // Beschreibungen nur füllen, wo keine steht.
    const fillDesc = db.prepare(
      "UPDATE accessories SET description = ? WHERE key = ? AND (description IS NULL OR TRIM(description) = '')"
    )
    for (const a of accData) fillDesc.run(a.desc, a.key)


  } catch (e) {
    // Beim allerersten Start gibt es die Tabelle noch nicht — sie entsteht
    // weiter unten, und der INSERT OR IGNORE dort legt den Bestand an. Das
    // ist kein Fehler und gehört nicht als solcher gemeldet.
    if (!/no such table/.test(e.message)) console.error('[accessories]', e.message)
  }

  // Hier standen zwei Neubauten der orders-Tabelle (pending_payment und
  // quality_check). Beide sind entfallen — sie liefen zu früh, kopierten eine
  // fest verdrahtete Spaltenliste und ließen bei jedem Fehlschlag eine
  // Leichtabelle zurück. Ersatz: ensureOrderStatusCheck() nach der
  // colMigrations-Schleife.

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
    -- Merkliste für im CMS gelöschtes Zubehör. Muss vor der Tabelle stehen,
    -- damit der Ausgangsbestand unten darauf prüfen kann.
    CREATE TABLE IF NOT EXISTS deleted_seed_accessories (
      key        TEXT PRIMARY KEY,
      deleted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

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
    -- Ausgangsbestand einer frischen Datenbank. Jede Zeile prüft zweierlei:
    -- ob der Artikel schon da ist und ob er im CMS gelöscht wurde. Ohne die
    -- zweite Prüfung käme gelöschtes Zubehör bei jedem Serverstart zurück.
    INSERT INTO accessories (key, name, description, price, sort_order)
      SELECT 'care_kit_leather', 'Lederpflege-Set', 'Alles für die Reinigung und Pflege glatter Leder. Vollständig in Italien gefertigt, geliefert in einer eigens angefertigten Schachtel, 18 × 11 × 5 cm. Inhalt: ein Tiegel natürliche Lederpflegecreme, ein Poliertuch aus 100 % Baumwolle, zwei kleine Rundbürsten, zwei große Bürsten. Eine Pflegeanleitung liegt bei. Gedacht für weiche Leder wie Box Calf oder poliertes Kalbsleder. Wir empfehlen, in alle Schuhe Spanner einzusetzen, solange sie nicht getragen werden.', 23.7, 0
      WHERE NOT EXISTS (SELECT 1 FROM accessories WHERE key = 'care_kit_leather')
        AND NOT EXISTS (SELECT 1 FROM deleted_seed_accessories WHERE key = 'care_kit_leather');
    INSERT INTO accessories (key, name, description, price, sort_order)
      SELECT 'care_kit_suede', 'Wildlederpflege-Set', 'Zum Auffrischen von Wildleder und Nubuk. Vollständig in Italien gefertigt, geliefert in einer eigens angefertigten Schachtel, 18 × 11 × 5 cm. Auch einzeln erhältlich. Inhalt: eine runde Messingbürste, eine runde Kreppbürste, ein Nubuk-Auffrischungsspray, ein kleiner Kreppradierer mit Bürste. Eine Pflegeanleitung liegt bei. Gedacht für samtige Leder wie Wildleder und Nubuk. Wir empfehlen, in alle Schuhe Spanner einzusetzen, solange sie nicht getragen werden.', 25.25, 1
      WHERE NOT EXISTS (SELECT 1 FROM accessories WHERE key = 'care_kit_suede')
        AND NOT EXISTS (SELECT 1 FROM deleted_seed_accessories WHERE key = 'care_kit_suede');
    INSERT INTO accessories (key, name, description, price, sort_order)
      SELECT 'shoe_tree_cedar', 'Zedernholz-Schuhspanner', 'Spanner aus aromatischem Zedernholz. Nimmt Feuchtigkeit auf und hält den Schuh in Form.', 21.0, 2
      WHERE NOT EXISTS (SELECT 1 FROM accessories WHERE key = 'shoe_tree_cedar')
        AND NOT EXISTS (SELECT 1 FROM deleted_seed_accessories WHERE key = 'shoe_tree_cedar');
    INSERT INTO accessories (key, name, description, price, sort_order)
      SELECT 'shoe_tree_black', 'Schuhspanner Schwarz', 'Lackierter Spanner in Schwarz, passend zu schwarzen Schuhen. Hält den Schuh in Form.', 22.0, 3
      WHERE NOT EXISTS (SELECT 1 FROM accessories WHERE key = 'shoe_tree_black')
        AND NOT EXISTS (SELECT 1 FROM deleted_seed_accessories WHERE key = 'shoe_tree_black');
    INSERT INTO accessories (key, name, description, price, sort_order)
      SELECT 'boot_tree_cedar', 'Zedernholz-Stiefelspanner', 'Hoher Spanner aus Zedernholz für Stiefel und Boots. Bewahrt Schaft und Form.', 29.0, 4
      WHERE NOT EXISTS (SELECT 1 FROM accessories WHERE key = 'boot_tree_cedar')
        AND NOT EXISTS (SELECT 1 FROM deleted_seed_accessories WHERE key = 'boot_tree_cedar');

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
    -- ── Affiliate (Affiliates) ─────────────────────────────────────────────
    -- Wirbt für die Schuhe und erhält je vermitteltem Paar eine Provision.
    --
    -- commission_type/-value: entweder ein fester Betrag je Paar ('fixed',
    -- dann ist commission_value der Topf) oder ein Prozentsatz vom Kaufpreis
    -- ('percent', dann deckelt cap_per_shoe ihn). Gedeckelt wird bewusst je
    -- Paar, nicht je Bestellung, damit ein Einkauf mit mehreren Paaren auch
    -- mehrfach vergütet wird.
    --
    -- Der so bestimmte Topf ist zugleich die Obergrenze für das, was der
    -- Affiliate seinem Kunden zusagen darf: Nachlass wie Zugabe gehen von
    -- seiner Provision ab (customer_benefit). Eine Vermittlung kostet das
    -- Haus deshalb nie mehr als diesen Betrag.
    --
    -- gift_shoetree: Vorgänger von customer_benefit/gift_key — die Spalte
    -- bleibt für alte Zeilen stehen, gelesen wird sie nicht mehr.
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
      cap_per_shoe    REAL    NOT NULL DEFAULT 50,
      gift_shoetree   INTEGER NOT NULL DEFAULT 0,
      -- Was der geworbene Kunde erhält, unabhängig von der Provision.
      customer_discount_pct REAL NOT NULL DEFAULT 0,

      -- Einladung ins eigene Konto (wie bei den Firmenkonten).
      invite_token    TEXT,

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
      gross_amount  REAL    NOT NULL DEFAULT 0,   -- der Topf für dieses Paar
      gift_cost     REAL    NOT NULL DEFAULT 0,   -- davon für die Zusage einbehalten
      benefit_kind  TEXT    NOT NULL DEFAULT 'none', -- wofür: 'none'|'discount'|'gift'
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

    -- ── Klicks ──────────────────────────────────────────────────────────────
    --
    -- Gezählt wurde bisher erst die Bestellung. Ein Vermittler, der nichts
    -- verkauft, erfuhr damit nicht, ob niemand geklickt hat oder ob alle an
    -- der Kasse abgesprungen sind — zwei Befunde, die zu völlig
    -- verschiedenen Schlüssen führen.
    --
    -- Absichtlich ohne Kennung des Besuchers: kein Cookie, keine IP, keine
    -- Wiedererkennung. Gespeichert wird der Tag, das Ziel und woher der Klick
    -- kam. Das genügt für die Frage „wirkt mein Link" und macht die Zählung
    -- nicht einwilligungspflichtig.
    CREATE TABLE IF NOT EXISTS affiliate_clicks (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
      day          TEXT    NOT NULL,          -- YYYY-MM-DD
      target       TEXT    NOT NULL DEFAULT 'seite',  -- 'seite' | 'modell'
      shoe_slug    TEXT,
      referrer     TEXT,                      -- nur der Host, nie der volle Pfad
      count        INTEGER NOT NULL DEFAULT 0,
      UNIQUE(affiliate_id, day, target, shoe_slug, referrer)
    );
    CREATE INDEX IF NOT EXISTS idx_aff_clicks ON affiliate_clicks(affiliate_id, day);

    -- ── Werbemittel ─────────────────────────────────────────────────────────
    -- Freigegebenes Material, damit sich niemand sein eigenes baut. Bei einer
    -- Marke, die von Bildsprache lebt, ist selbstgebautes Material ein
    -- doppeltes Risiko: schlechte Bilder und ungedeckte Aussagen.
    CREATE TABLE IF NOT EXISTS affiliate_assets (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      kind       TEXT    NOT NULL DEFAULT 'bild',   -- 'bild' | 'text'
      body       TEXT,                              -- Textbaustein zum Kopieren
      image_data TEXT,                              -- Data-URL wie bei den Modellen
      note       TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      visible    INTEGER NOT NULL DEFAULT 1,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Änderungsprotokoll ──────────────────────────────────────────────────
    --
    -- Einzelne Tabellen vermerkten den Bearbeiter in updated_by, aber das ist
    -- der letzte, nicht der Verlauf. Bei einem Streit über einen Preis oder
    -- eine Kondition fehlte der Nachweis, wer wann was gesetzt hat.
    --
    -- Bewusst schmal: Was, woran, von wem, wann — und der vorherige Wert.
    -- Kein vollständiges Abbild jeder Zeile; das bläht die Datenbank auf und
    -- niemand liest es.
    CREATE TABLE IF NOT EXISTS audit_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      entity     TEXT    NOT NULL,       -- 'order', 'affiliate', 'shoe', …
      entity_id  TEXT,
      action     TEXT    NOT NULL,       -- 'status', 'storno', 'auszahlung', …
      detail     TEXT,                   -- eine lesbare Zeile, kein JSON-Klumpen
      user_id    INTEGER,
      user_name  TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id, id);
    CREATE INDEX IF NOT EXISTS idx_audit_zeit   ON audit_log(id DESC);

    -- ── Rücksendungen ───────────────────────────────────────────────────────
    -- Der Schuh entsteht auf Maß für einen einzelnen Fuß und ist danach für
    -- niemanden sonst zu gebrauchen — er ist vom Widerruf ausgenommen
    -- (§ 312g Abs. 2 Nr. 1 BGB). Zubehör ist Lagerware und geht regulär zurück.
    -- Deshalb hängt eine Rücksendung an einzelnen Positionen, nicht an der
    -- Bestellung: items hält die zurückgehenden Zubehörzeilen als Kopie aus
    -- Name, Preis und Menge, so wie orders.accessories sie führt.
    CREATE TABLE IF NOT EXISTS return_requests (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status      TEXT    NOT NULL DEFAULT 'requested'
                          CHECK(status IN ('requested','approved','rejected','received','refunded')),
      items       TEXT    NOT NULL DEFAULT '[]',
      amount      REAL    NOT NULL DEFAULT 0,
      reason      TEXT,
      note        TEXT,
      decided_at  TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_return_requests_order ON return_requests(order_id);
    CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(status);

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
    -- collections: die Angebote, in die der Katalog zerfällt.
    -- Eine Ebene über der Kategorie: „Maßanfertigung", „Express", später
    -- „Damen". Als Tabelle und nicht als feste Liste im Code, weil hier
    -- absehbar weitere dazukommen — und dann soll niemand deployen müssen.
    CREATE TABLE IF NOT EXISTS collections (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      key           TEXT    NOT NULL UNIQUE,
      label         TEXT    NOT NULL,
      description   TEXT,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      visible       INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

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

  // ── Nachrichten zwischen Haus und Gegenüber ──────────────────────────────
  //
  // Bis hierher endete jede Nachricht in einer Sackgasse: Eine Anfrage landete
  // in custom_requests und wurde per E-Mail beantwortet, ein Ticket in
  // feedback_tickets bekam eine einzelne Notiz, auf die niemand antworten
  // konnte. Wer nachfragen wollte, schrieb ein neues Ticket — und der Verlauf
  // lag über zwei Tabellen und ein Postfach verstreut.
  //
  // Ein Verlauf je Person, nicht je Anliegen: Es ist ein Gespräch mit dem Haus,
  // kein Ticketsystem. Deshalb `UNIQUE` auf user_id.
  //
  // Die Kategorie (Firma, Affiliate, Kunde) steht bewusst NICHT in der Tabelle.
  // Sie ergibt sich aus dem Konto und kann sich ändern — wer heute Kunde ist,
  // führt morgen ein Firmenkonto. Eingefroren wäre sie ab dann falsch, und die
  // Verwaltung suchte den Verlauf im falschen Reiter.
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_threads (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      last_message_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_chat_threads_letzte ON chat_threads(last_message_at DESC);

    CREATE TABLE IF NOT EXISTS chat_messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id   INTEGER NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
      -- 'kunde' = das Gegenüber, 'team' = Verwaltung (admin/curator)
      von         TEXT    NOT NULL CHECK(von IN ('kunde','team')),
      autor_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      text        TEXT    NOT NULL,
      -- Gelesen wird je Nachricht vermerkt, nicht als Zähler am Verlauf.
      -- Ein Zähler geht bei jedem Fehler dauerhaft falsch; hier lässt sich der
      -- Stand jederzeit neu ausrechnen.
      gelesen_am  TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id, id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_offen  ON chat_messages(gelesen_am);
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

  // ── Passformen je Kunde ──────────────────────────────────────────────────
  // Jede eingetragene Fußvermessung wird festgehalten, nicht überschrieben.
  // Eine Konfiguration verweist auf die Passform, mit der sie entstanden ist,
  // und bleibt damit unveränderlich: Neue Maße heißen neue Konfiguration.
  //
  // Der Grund ist kein Ordnungssinn. Vorher liess sich die Passform in der
  // Kasse nachträglich ändern — die Anzeige der Fertigung behielt aber die
  // alten Maße. Auf derselben Seite standen zwei Zahlenpaare, und gefertigt
  // worden wäre nach dem alten. Ein falsch sitzender Schuh, ohne Fehlermeldung.
  db.exec(`
    CREATE TABLE IF NOT EXISTS fit_profiles (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      foot_length_mm REAL    NOT NULL,
      ball_girth_mm  REAL,
      source         TEXT    NOT NULL DEFAULT 'manual',   -- manual | scan
      scan_id        INTEGER REFERENCES foot_scans(id) ON DELETE SET NULL,
      note           TEXT,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_fitprofiles_user ON fit_profiles(user_id, created_at);
  `)

  // ── Konfigurationen (Entwürfe) ───────────────────────────────────────────
  // Jede Konfiguration wird beim Zusammenstellen gespeichert, lange bevor
  // bestellt wird. Grund: Vorher reiste sie durch drei Bildschirme als
  // Zustand im Browser — Konfigurator, Warenkorb, Kasse — und jede Stelle,
  // die ein Feld vergaß, verlor es lautlos. Genau so fehlten beim Direktkauf
  // sämtliche Zusatzoptionen in der Bestellung.
  //
  // Ab jetzt ist die Datenbank die Quelle: Die Bestellung verweist auf die
  // Konfiguration, und der Server liest sie von dort, nicht aus dem, was der
  // Browser mitschickt.
  db.exec(`
    CREATE TABLE IF NOT EXISTS shoe_configs (
      id           TEXT    PRIMARY KEY,          -- vom Browser erzeugt, damit auch Gäste einen Entwurf führen können
      user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      shoe_id      INTEGER REFERENCES shoes(id) ON DELETE SET NULL,
      shoe_name    TEXT,
      material     TEXT,
      color        TEXT,                          -- Farbwert (#hex)
      color_name   TEXT,                          -- lesbarer Name
      sole         TEXT,
      extras       TEXT,                          -- JSON: [{group,key,value,price}]
      size_type    TEXT,
      eu_size      TEXT,
      last_key     TEXT,
      last_label   TEXT,
      last_width   TEXT,
      fit_measurements TEXT,                      -- JSON
      accessories  TEXT,                          -- JSON
      price        TEXT,
      -- Mit welcher Passform diese Konfiguration entstanden ist. Sie ist
      -- festgeschrieben: Neue Maße heißen neue Konfiguration.
      fit_profile_id INTEGER REFERENCES fit_profiles(id),
      status       TEXT    NOT NULL DEFAULT 'draft'
                           CHECK(status IN ('draft','ordered')),
      -- Getrennt vom Status statt als weiterer Wert in der CHECK-Bedingung:
      -- Die lässt sich in SQLite nachträglich nicht ändern, ohne die Tabelle
      -- neu zu bauen. Ein eigenes Feld ist hier das kleinere Übel.
      in_cart      INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_configs_user   ON shoe_configs(user_id);
    CREATE INDEX IF NOT EXISTS idx_configs_status ON shoe_configs(status);
    CREATE INDEX IF NOT EXISTS idx_configs_open   ON shoe_configs(user_id, shoe_id, status, in_cart);
  `)

  // ── Passkeys ─────────────────────────────────────────────────────────────
  // Ein Konto kann mehrere haben — Telefon und Rechner sollten getrennt
  // hinterlegt sein, sonst sperrt ein verlorenes Gerät den Zugang aus.
  // Der öffentliche Schlüssel liegt hier; er ist nicht geheim. Der private
  // verlässt das Gerät nie, das ist der ganze Sinn der Sache.
  db.exec(`
    CREATE TABLE IF NOT EXISTS passkeys (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id  TEXT    NOT NULL UNIQUE,
      public_key     TEXT    NOT NULL,
      counter        INTEGER NOT NULL DEFAULT 0,
      transports     TEXT,
      label          TEXT,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      last_used_at   TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_passkeys_user ON passkeys(user_id);

    -- Kurzlebige Aufgaben (Challenges). Sie dürfen genau einmal eingelöst
    -- werden und verfallen nach fünf Minuten; ohne das ließe sich eine
    -- abgefangene Antwort wiederverwenden.
    -- ── Zugang wiederherstellen ──────────────────────────────────────────
    --
    -- Konten ohne Passwort haben nichts, was sich zurücksetzen ließe. Wer
    -- alle Geräte verliert, braucht trotzdem einen Weg zurück: eine einmalige
    -- Kennung, die genau eines erlaubt — einen neuen Passkey anzulegen.
    --
    -- Gespeichert wird der Hash, nicht die Kennung selbst. Wer die Datenbank
    -- liest, soll damit keine Konten übernehmen können.
    --
    -- issued_by hält fest, wer sie ausgestellt hat: NULL bei Selbstbedienung
    -- über die Bestelldaten, sonst die Verwaltungsperson. Das ist kein
    -- Ordnungssinn — ein Zugangsweg ohne Spur ist keiner, den man verantworten
    -- kann.
    CREATE TABLE IF NOT EXISTS account_recovery (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT    NOT NULL UNIQUE,
      expires_at TEXT    NOT NULL,
      used_at    TEXT,
      issued_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      note       TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_recovery_user ON account_recovery(user_id, created_at);

    CREATE TABLE IF NOT EXISTS webauthn_challenges (
      id         TEXT    PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      challenge  TEXT    NOT NULL,
      purpose    TEXT    NOT NULL CHECK(purpose IN ('register','login')),
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Nachrüstung für Datenbanken, in denen die Tabellen schon standen. Hier
  // und nicht in colMigrations: Die Schleife läuft, bevor diese Tabellen
  // angelegt werden, und ein ALTER auf eine fehlende Tabelle scheitert still.
  for (const sql of [
    `ALTER TABLE shoe_configs ADD COLUMN in_cart INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE shoe_configs ADD COLUMN fit_profile_id INTEGER REFERENCES fit_profiles(id)`,
    `ALTER TABLE orders       ADD COLUMN fit_profile_id INTEGER REFERENCES fit_profiles(id)`,
    // Woher eine Anfrage kommt. Bislang liefen alle drei Wege in denselben
    // Topf und ließen sich nur am Text auseinanderhalten ("Corporate
    // Gifting" im shoe_name) — für getrennte Ansichten in der Verwaltung zu
    // wenig. 'shop' = Maßanfrage aus dem Laden, 'business' = Firmenseite,
    // 'affiliate' = Affiliate-Seite.
    `ALTER TABLE custom_requests ADD COLUMN source TEXT NOT NULL DEFAULT 'shop'`,
    // Einladung ins eigene Affiliate-Konto. Ohne Login sah ein angelegter
    // Affiliate seinen Stand nie — die Zeile existierte, das Konto nicht.
    `ALTER TABLE affiliates   ADD COLUMN invite_token TEXT`,
    // Was der geworbene Kunde bekommt. Bislang gab es nur die Zugabe
    // (gift_shoetree); zugesagt wird aber oft ein Nachlass, und der stand
    // nirgends.
    `ALTER TABLE affiliates   ADD COLUMN customer_discount_pct REAL NOT NULL DEFAULT 0`,
    // Eine Wahl statt zweier unabhängiger Felder.
    //
    // Vorher konnten Nachlass und Zugabe gleichzeitig gesetzt sein — gemeint
    // war aber immer ein Entweder-oder, und in der Maske standen sie an
    // getrennten Stellen. Wer beides ausfüllte, verschenkte doppelt, ohne dass
    // ihn etwas gewarnt hätte.
    //
    // 'none' | 'discount' (dann zählt customer_discount_pct)
    //        | 'gift'     (dann zählt gift_key)
    `ALTER TABLE affiliates   ADD COLUMN customer_benefit TEXT NOT NULL DEFAULT 'none'`,
    // Welche Zugabe. Vorher war der Zedernholz-Spanner fest verdrahtet; ein
    // Pflegeset ließ sich nicht zusagen, obwohl es im Zubehör längst steht.
    `ALTER TABLE affiliates   ADD COLUMN gift_key TEXT`,
    // Wofür bei dieser Vermittlung einbehalten wurde: 'none' | 'discount' | 'gift'.
    // gift_cost allein sagt nur, DASS etwas abging — im Portal soll dastehen,
    // wofür. Alte Zeilen tragen 'gift', denn mehr gab es damals nicht.
    `ALTER TABLE affiliate_commissions ADD COLUMN benefit_kind TEXT NOT NULL DEFAULT 'none'`,
    // Anmeldedaten einer noch nicht angelegten Registrierung.
    //
    // Bei der Registrierung mit Passkey gibt es das Konto noch nicht, wenn die
    // Aufgabe gestellt wird — Name und Adresse müssen die Zeremonie überdauern
    // und dürfen nicht vom Browser zurückkommen, sonst könnte er sie zwischen
    // Stellen und Einlösen austauschen.
    `ALTER TABLE webauthn_challenges ADD COLUMN data TEXT`,
    // ── Konto löschen, in zwei Schritten und mit Frist ────────────────────
    //
    // Ein Konto zu löschen ist der einzige Vorgang hier, der sich nicht
    // zurücknehmen lässt — Bestellungen, Passformen, Nachrichten, alles weg.
    // Deshalb nicht ein Klick, sondern: beantragen, von einer zweiten Person
    // bestätigen lassen, dreißig Tage Frist. Erst danach ist es endgültig.
    //
    // Die Frist ist kein Zögern. Sie ist die Zeit, in der ein Irrtum noch
    // auffällt — und in der ein Kunde, der es sich anders überlegt, sein
    // Konto zurückbekommt, statt neu anzufangen.
    `ALTER TABLE users ADD COLUMN deletion_requested_at TEXT`,
    `ALTER TABLE users ADD COLUMN deletion_requested_by INTEGER`,
    `ALTER TABLE users ADD COLUMN deletion_reason TEXT`,
    `ALTER TABLE users ADD COLUMN deleted_at TEXT`,
    `ALTER TABLE users ADD COLUMN deleted_by INTEGER`,
    // Welche Felder der Affiliate nicht mehr selbst ändern darf.
    //
    // JSON-Liste von Spaltennamen. Der Affiliate trägt seine Daten selbst ein
    // — das ist richtig, denn er ist der Einzige, der sie sicher weiß. Sobald
    // die Verwaltung eine Angabe geprüft hat (Anschrift auf dem Ausweis, IBAN
    // gegen den Kontoauszug), soll sie sich aber nicht mehr still ändern
    // lassen: Eine geprüfte Bankverbindung, die nachts eine andere wird, ist
    // der klassische Weg, eine Gutschrift umzuleiten.
    `ALTER TABLE affiliates ADD COLUMN locked_fields TEXT NOT NULL DEFAULT '[]'`,
    // Auszahlung auf Zuruf. Bisher löste allein die Verwaltung aus; der
    // Vermittler konnte weder anstoßen noch erkennen, dass etwas läuft.
    // Der Zeitstempel ist zugleich die Sperre gegen mehrfaches Anfordern.
    `ALTER TABLE affiliates ADD COLUMN payout_requested_at TEXT`,
    // Belegnummer der Gutschrift. Eigener Nummernkreis (GS-JJJJ-NNNN), weil
    // eine Gutschrift keine Rechnung ist und nicht in deren Reihe gehört.
    `ALTER TABLE affiliate_payouts ADD COLUMN document_no TEXT`,
    // Wie der Vermittler im Laden genannt wird — „Schuhhaus Müller", nicht
    // „Michael Müller".
    //
    // Bewusst getrennt von full_name: Der steht auf der Gutschrift und ist
    // der Name laut Ausweis. Ihn dem Besucher zu zeigen, hieße den Klarnamen
    // einer Privatperson auf jeder Ladenseite auszustellen. Bleibt das Feld
    // leer, nennt das Banner keinen Namen und spricht nur von einer
    // Empfehlung.
    `ALTER TABLE affiliates ADD COLUMN display_name TEXT`,
  ]) {
    try { db.exec(sql) } catch { /* Spalte bereits vorhanden */ }
  }

  // ── Konten ohne Namen nachtragen ─────────────────────────────────────────
  //
  // Wer einen Affiliate über die E-Mail-Adresse allein anlegte, erzeugte ein
  // Benutzerkonto mit leerem Namen. Das war nicht bloß unschön: Die
  // Benutzerliste der Verwaltung griff auf den ersten Buchstaben zu, `''[0]`
  // ist undefined, und die ganze Seite stürzte ab — an die Liste kam danach
  // niemand mehr heran.
  //
  // Der Teil vor dem @ ist ein Notbehelf, kein Anspruch auf Richtigkeit. Er
  // wird überschrieben, sobald der Affiliate seine Stammdaten einträgt, und
  // ist allemal besser als eine Verwaltung, die sich nicht öffnen lässt.
  try {
    const info = db.prepare(`
      UPDATE users
      SET name = TRIM(REPLACE(REPLACE(REPLACE(
            substr(email, 1, instr(email, '@') - 1), '.', ' '), '_', ' '), '-', ' ')),
          updated_at = datetime('now')
      WHERE (name IS NULL OR TRIM(name) = '') AND instr(email, '@') > 1
    `).run()
    if (info.changes) console.log(`✅ Nachgetragen: ${info.changes} Konto/Konten ohne Namen`)
  } catch (e) { console.error('[migrate leere Namen]', e.message) }

  // ── Farbnamen der Luxe-Calf-Reihe ────────────────────────────────────────
  //
  // Aus „Black" wird „Midnight Black", aus „Cognac" „Cognac Classic". Die
  // alten Namen waren Farbbezeichnungen aus dem Gerbereikatalog; die neuen
  // sind die, unter denen das Haus sie verkauft.
  //
  // Zwei Dinge dazu, die man wissen muss:
  //
  //  1. **Es gibt einen Namen je Farbe, nicht je Leder.** Die Tabelle führt
  //     jede Farbe einmal und vermerkt daneben, für welche Leder sie gilt.
  //     „Black" heißt deshalb auch beim Wildleder künftig „Midnight Black".
  //     Wer je Leder verschiedene Namen will, bräuchte eine zweite Spalte —
  //     das wäre eine eigene Entscheidung und keine Umbenennung.
  //
  //  2. **Genau einmal.** Der Merker verhindert, dass ein Neustart eine
  //     spätere Änderung aus dem CMS wieder überschreibt. Umbenannt wird
  //     außerdem nur, was noch den alten Namen trägt.
  //
  //  3. **Die neuen Namen stehen zusätzlich in `seed-data.json`.** Diese
  //     Umbenennung allein reichte nicht: Auf einer FRISCHEN Installation
  //     laufen die Migrationen zuerst, und danach schreibt `katalogAnwenden`
  //     die Vorlage mit `ueberschreiben: true` darüber — die eben
  //     umbenannten Farben trugen anschließend wieder ihre alten Namen, und
  //     der Merker hier stand bereits auf „erledigt". Im Bestand fiel es
  //     nicht auf, weil dort nichts überschrieben wird. Beide Stellen tragen
  //     deshalb dieselben Namen; wer einen ändert, ändert beide.
  try {
    const schonGelaufen = db.prepare("SELECT value FROM settings WHERE key = 'farbnamen_luxe_2026'").get()
    if (!schonGelaufen) {
      const NEUE_NAMEN = [
        ['Black',        'Midnight Black'],
        ['Grey',         'Silver Mist'],
        ['Dark Brown',   'Espresso Heritage'],
        ['Medium Brown', 'Cedar Brown'],
        ['Syrup',        'Maple Amber'],
        ['Cognac',       'Cognac Classic'],
        ['Saffron',      'Saffron Sunset'],
        ['Light Brown',  'Sandy Taupe'],
        ['Oxblood',      'Bordeaux Heritage'],
        ['Burgundy',     'Burgundy Wine'],
        ['Red',          'Crimson Red'],
        ['Forest Green', 'Forest Heritage'],
        // Im Bestand heißt diese Farbe nur „Forest" — beide Schreibweisen
        // treffen dasselbe und sollen auf denselben neuen Namen laufen.
        ['Forest',       'Forest Heritage'],
        ['Olive',        'Olive Grove'],
        ['Navy',         'Midnight Navy'],
        ['Medium Navy',  'Ocean Navy'],
        ['Plain Crust',  'Natural Sand'],
      ]
      const um = db.prepare('UPDATE shoe_colors SET name = ? WHERE name = ? COLLATE NOCASE')
      const getroffen = []
      const fehlend = []
      for (const [alt, neu] of NEUE_NAMEN) {
        const info = um.run(neu, alt)
        if (info.changes) getroffen.push(`${alt} → ${neu}`)
        else if (!getroffen.some(g => g.endsWith(neu))) fehlend.push(alt)
      }
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('farbnamen_luxe_2026', ?, datetime('now'))")
        .run(String(getroffen.length))
      if (getroffen.length) console.log(`✅ Farbnamen: ${getroffen.length} umbenannt (${getroffen.join(', ')})`)
      // Ausdrücklich melden, was NICHT gefunden wurde. Eine Umbenennung, die
      // still nichts tut, sieht aus wie eine, die gewirkt hat.
      if (fehlend.length) console.log(`ℹ️  Farbnamen: nicht im Bestand, daher unverändert — ${fehlend.join(', ')}`)
    }
  } catch (e) { console.error('[migrate Farbnamen]', e.message) }

  // ── „Mov Flex Sport" heißt „Moc Flex Sport" ──────────────────────────────
  //
  // Ein Vertipper, und die eigene Datenbank verrät ihn: Der Leisten, auf dem
  // diese Linie läuft, heißt seit jeher `moc_sport`. „Moc" ist die Machart
  // (Mokassin), „Mov" heißt nichts.
  //
  // Warum das HIER steht und nicht im Seed: Der Seed legt an, was er
  // vermisst — und er kennt seine Modelle über den Namen. Liefe die
  // Umbenennung nach ihm, hätte er die neuen Namen längst als fehlend
  // angelegt, und im Katalog stünden beide Fassungen nebeneinander. Die
  // Migrationen laufen davor; danach findet der Seed vor, was er sucht.
  try {
    const schonUmbenannt = db.prepare("SELECT value FROM settings WHERE key = 'moc_flex_umbenannt'").get()
    if (!schonUmbenannt) {
      const um = db.prepare('UPDATE shoes SET name = ?, updated_at = datetime(\'now\') WHERE name = ?')
      let n = 0
      for (const alt of ['Mov Flex Sport', 'Mov Flex Sport Laced Boot', 'Mov Flex Sport Boot']) {
        const neu = alt.replace('Mov ', 'Moc ')
        // Gibt es den neuen Namen schon, wäre die Umbenennung eine Kollision.
        // Dann ist nichts zu tun: Der Bestand hat den richtigen bereits.
        if (db.prepare('SELECT 1 FROM shoes WHERE name = ?').get(neu)) continue
        n += um.run(neu, alt).changes
      }
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('moc_flex_umbenannt', ?, datetime('now'))")
        .run(String(n))
      if (n) console.log(`✅ Umbenannt: ${n}× „Mov Flex Sport" → „Moc Flex Sport"`)
    }
  } catch (e) { console.error('[migrate Moc Flex]', e.message) }


  // Bestehende Affiliates auf die eine Wahl heben. Der Nachlass hat Vorrang:
  // Er war das Zugesagte, die Zugabe die Beigabe — wer beides trug, behält
  // den Nachlass, damit niemandem etwas weggenommen wird, das er versprochen
  // bekam.
  try {
    db.prepare(`
      UPDATE affiliates SET customer_benefit = 'discount'
      WHERE customer_benefit = 'none' AND customer_discount_pct > 0
    `).run()
    db.prepare(`
      UPDATE affiliates SET customer_benefit = 'gift', gift_key = 'shoe_tree_cedar'
      WHERE customer_benefit = 'none' AND gift_shoetree = 1
    `).run()
    db.prepare(`
      UPDATE affiliate_commissions SET benefit_kind = 'gift'
      WHERE benefit_kind = 'none' AND gift_cost > 0
    `).run()
    // Der Deckel je Paar steigt von 40 auf 50 €. Angehoben wird nur, wo noch
    // exakt der alte Standard steht — ein von Hand gesetzter Wert bleibt, was
    // er ist. Bereits erfasste Provisionen sind davon nicht berührt: Sie
    // tragen ihren Betrag selbst, damit eine spätere Änderung der Konditionen
    // ältere Vermittlungen nicht rückwirkend verteuert.
    db.prepare('UPDATE affiliates SET cap_per_shoe = 50 WHERE cap_per_shoe = 40').run()
  } catch { /* Spalten noch nicht da */ }

  // Bestehende Firmen-Anfragen nachtragen. Sie sind allein am shoe_name zu
  // erkennen, den die Firmenseite fest gesetzt hat — einmalig, danach trägt
  // jede Anfrage ihre Herkunft selbst.
  try {
    db.prepare("UPDATE custom_requests SET source = 'business' WHERE source = 'shop' AND shoe_name = 'Corporate Gifting'").run()
  } catch { /* Spalte oder Tabelle noch nicht da */ }

  // ── Nicht mehr geführtes Zubehör entfernen ───────────────────────────────
  // Erst hier, nach allen Seed-Blöcken: Der Ausgangsbestand wird rund 500
  // Zeilen weiter oben per INSERT OR IGNORE angelegt. Stünde das Aufräumen
  // davor, legte derselbe Start die Artikel gleich wieder an — gelöscht und
  // sofort neu erzeugt, bei jedem Deploy aufs Neue.
  //
  // Namentlich, nicht „alles außer den fünf": Zubehör, das im CMS von Hand
  // angelegt wurde, bleibt unangetastet. Bestellungen sind nicht betroffen,
  // orders.accessories hält eine Kopie aus Name und Preis statt eines
  // Verweises; die Zuordnung zu Modellen räumt shoe_accessories per
  // ON DELETE CASCADE selbst ab.
  try {
    const del = db.prepare('DELETE FROM accessories WHERE key = ?')
    let removed = 0
    for (const key of RETIRED_ACCESSORIES) removed += del.run(key).changes
    if (removed) console.log(`🧹 Zubehör entfernt: ${removed} nicht mehr geführte Artikel`)

    // Einkaufspreise. Hier und nicht oben beim Upsert: Der läuft beim ersten
    // Start ins Leere, weil die Tabelle erst danach entsteht — der Wert hätte
    // dann bis zum zweiten Start gefehlt, und die Zugabe an den Käufer wäre
    // dem Affiliate geschenkt worden.
    // Nur setzen, wo noch nichts steht: Gepflegt wird der Wert im CMS, kein
    // Deploy darf ihn überschreiben.
    const cost = db.prepare('UPDATE accessories SET cost_price = ? WHERE key = ? AND cost_price IS NULL')
    for (const [key, value] of Object.entries(ACCESSORY_COSTS)) cost.run(value, key)
  } catch (e) { console.error('[accessories cleanup]', e.message) }

  // ── orders.status: fehlende Zustände in die CHECK-Bedingung aufnehmen ─────
  // Muss NACH der colMigrations-Schleife stehen. Die Vorgänger standen ~750
  // Zeilen weiter oben und kopierten Spalten (order_ref, foot_notes, …), die
  // dort noch gar nicht existierten — der INSERT lief in „no such column",
  // die halbfertige Tabelle blieb liegen, und weil sie liegen blieb,
  // scheiterte jeder weitere Versuch an „table already exists". Ergebnis:
  // Der Zustand quality_check fehlte dauerhaft in der Bedingung.
  ensureOrderStatusCheck(db)

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
