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
      status     TEXT NOT NULL DEFAULT 'pending'
                 CHECK(status IN ('pending','processing','shipped','delivered','cancelled')),
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
      ('bank_holder', 'ATELIER GmbH'),
      ('bank_name',   'Musterbank'),
      ('loyalty_expiry_days', '365'),
      ('shipping_to_warehouse', '0'),
      ('shipping_to_customer', '0'),
      ('packaging_cost', '0'),
      ('customs_cost', '0'),
      ('promotion_scan_tolerance_pct', '10');
  `)

  // ── Checkout columns (added after initial schema) ─────────────────────────
  const colMigrations = [
    // users — MFA
    `ALTER TABLE users ADD COLUMN mfa_secret  TEXT`,
    `ALTER TABLE users ADD COLUMN mfa_enabled INTEGER NOT NULL DEFAULT 0`,
    // orders — checkout
    `ALTER TABLE orders ADD COLUMN user_order_number INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE orders ADD COLUMN delivery_address  TEXT`,
    `ALTER TABLE orders ADD COLUMN billing_address   TEXT`,
    `ALTER TABLE orders ADD COLUMN accessories       TEXT NOT NULL DEFAULT '[]'`,
    `ALTER TABLE orders ADD COLUMN scan_id           INTEGER REFERENCES foot_scans(id)`,
    `ALTER TABLE orders ADD COLUMN eu_size           TEXT`,
    // orders — human-readable reference (ATL-YYYYMMDD-XXXXXX)
    `ALTER TABLE orders ADD COLUMN order_ref         TEXT`,
    // foot_scans — extended girth measurements (v2 model)
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
    // foot_scans — foot height (needed for accurate girth recomputation)
    `ALTER TABLE foot_scans ADD COLUMN right_foot_height  REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_foot_height   REAL`,
    // users — loyalty points
    `ALTER TABLE users ADD COLUMN loyalty_points INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN loyalty_tier   TEXT NOT NULL DEFAULT 'bronze'`,
    // users — persistent foot notes (user-level, not per-scan)
    `ALTER TABLE users ADD COLUMN foot_notes TEXT`,
    // orders — translated foot notes included with order
    `ALTER TABLE orders ADD COLUMN foot_notes    TEXT`,
    `ALTER TABLE orders ADD COLUMN foot_notes_en TEXT`,
    // foot_scans — long heel + short heel girth (manufacturer-required measurements)
    `ALTER TABLE foot_scans ADD COLUMN right_long_heel_girth  REAL`,
    `ALTER TABLE foot_scans ADD COLUMN right_short_heel_girth REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_long_heel_girth   REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_short_heel_girth  REAL`,
    // users — track last order date for loyalty point expiration
    `ALTER TABLE users ADD COLUMN last_order_at TEXT`,
    // foot_scans — scan with socks (measurements include sock thickness)
    `ALTER TABLE foot_scans ADD COLUMN scanned_with_socks INTEGER NOT NULL DEFAULT 1`,
    // scan_training_data — track which user uploaded the training images
    `ALTER TABLE scan_training_data ADD COLUMN user_id INTEGER REFERENCES users(id)`,
    // users — saved addresses & cart (JSON)
    `ALTER TABLE users ADD COLUMN saved_delivery_address TEXT`,
    `ALTER TABLE users ADD COLUMN saved_billing_address  TEXT`,
    `ALTER TABLE users ADD COLUMN saved_cart             TEXT`,
    // foot_scans — extended LiDAR girth measurements (toe, preball, midinstep, upper instep)
    `ALTER TABLE foot_scans ADD COLUMN right_toe_girth          REAL`,
    `ALTER TABLE foot_scans ADD COLUMN right_preball_girth      REAL`,
    `ALTER TABLE foot_scans ADD COLUMN right_midinstep_girth    REAL`,
    `ALTER TABLE foot_scans ADD COLUMN right_upper_instep_girth REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_toe_girth           REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_preball_girth       REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_midinstep_girth     REAL`,
    `ALTER TABLE foot_scans ADD COLUMN left_upper_instep_girth  REAL`,
    // foot_scans — preferred shoe type for last generation
    `ALTER TABLE foot_scans ADD COLUMN shoe_type TEXT DEFAULT 'oxford'`,
    // orders — shipping
    `ALTER TABLE orders ADD COLUMN shipping_method TEXT`,
    `ALTER TABLE orders ADD COLUMN shipping_cost   TEXT`,
    // orders — coupons
    `ALTER TABLE orders ADD COLUMN coupon_code      TEXT`,
    `ALTER TABLE orders ADD COLUMN discount_amount   TEXT`,
    `ALTER TABLE orders ADD COLUMN original_price    TEXT`,
    // users — promotion accounts
    `ALTER TABLE users ADD COLUMN is_promotion            INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN promotion_discount_pct  REAL DEFAULT NULL`,
    `ALTER TABLE users ADD COLUMN promotion_max_orders    INTEGER DEFAULT NULL`,
    `ALTER TABLE users ADD COLUMN promotion_orders_used   INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN promotion_invited_by    INTEGER REFERENCES users(id)`,
    `ALTER TABLE users ADD COLUMN promotion_invite_token  TEXT`,
    // shoes — cost pricing
    `ALTER TABLE shoes ADD COLUMN cost_price       REAL DEFAULT NULL`,
    `ALTER TABLE shoes ADD COLUMN promotion_price   TEXT DEFAULT NULL`,
    // accessories — shoe recommendations (JSON arrays of category strings)
    `ALTER TABLE accessories ADD COLUMN recommended_for TEXT DEFAULT '[]'`,
    `ALTER TABLE accessories ADD COLUMN not_recommended_for TEXT DEFAULT '[]'`,
  ]
  for (const sql of colMigrations) {
    try { db.exec(sql) } catch { /* column already exists */ }
  }

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

  // ── ML Training data — foot scan images ──────────────────────────────────
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
      ('bronze',    'Bronze',    0,     '#cd7f32', 'Award',    'Willkommen bei ATELIER. Als Bronze-Mitglied genießen Sie Zugang zu unserer exklusiven Kollektion maßgefertigter Schuhe.', '["Zugang zur kompletten Kollektion","Persönliches Fußprofil mit 3D-Scan","Newsletter mit Styling-Tipps","Geburtstagsgruß"]', 1, 0),
      ('silver',    'Silver',    500,   '#c0c0c0', 'Award',    'Ihre Treue wird belohnt. Silver-Mitglieder erhalten bevorzugten Zugang und besondere Aufmerksamkeit.', '["Alle Bronze-Vorteile","Kostenloser Express-Versand","10% auf Pflegeprodukte","Frühzeitiger Zugang zu neuen Modellen","Einladung zu Private Sales"]', 1, 1),
      ('gold',      'Gold',      1500,  '#ffd700', 'Crown',    'Exzellenz trifft Handwerk. Gold-Mitglieder sind Teil eines ausgewählten Kreises mit Premium-Privilegien.', '["Alle Silver-Vorteile","Persönlicher Style-Berater","15% auf alle Bestellungen","Priority-Kundenservice","Exklusive Einladungen zu Atelier-Events","Kostenlose Lederpflege-Sets"]', 1, 2),
      ('platinum',  'Platinum',  5000,  '#e5e4e2', 'Gem',      'Die höchste Auszeichnung für wahre Kenner. Platinum-Mitglieder genießen unvergleichliche Privilegien und persönlichen Service.', '["Alle Gold-Vorteile","Dedizierter Concierge-Service","20% auf alle Bestellungen","Kostenlose Reparaturen auf Lebenszeit","Zugang zu Limited Editions","Einladung zur jährlichen Gala","Maßgefertigte Schuhspanner gratis"]', 1, 3),
      ('executive', 'Executive', 15000, '#1a1a1a', 'Shield',   NULL, '["Alle Platinum-Vorteile","Persönlicher Atelier-Besuch in der Manufaktur","Individuelles Leder-Sourcing","Namentliche Gravur auf jeder Sohle","Exklusiver Zugang zu Archiv-Modellen","Einladung zu Designer-Kollaborationen","VIP-Lounge bei Events","Persönliches Jahresgeschenk"]', 0, 4);

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
      ('polishing_cloth', 'Poliertuch',                  'Doppellagiges Baumwollflanell für Hochglanz-Finish. Unverzichtbar für Mirror-Shine-Liebhaber.',                    12,  19);

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
      ('standard', 'Standardversand', 'Lieferung in 3–5 Werktagen', 9.90, 500, 1, 1),
      ('express',  'Expressversand',  'Lieferung in 1–2 Werktagen', 19.90, NULL, 0, 1);

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
      ('calfskin', 'CALFSKIN', 'Full-Grain', '#b45309', 1, 'Robust und langlebig — entwickelt mit der Zeit eine edle Patina. Ideal für den täglichen Einsatz bei jedem Wetter.', 'Ganzjährig', 'good', 0),
      ('suede', 'SUEDE', 'Nubuck', '#78716c', 1, 'Samtig-weiche Oberfläche für lässig-elegante Looks. Empfindlich bei Nässe — am besten für trockene Tage und Indoor-Anlässe.', 'Frühling / Sommer', 'warn', 1),
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
      ('schwarz',  '#000000', 'Schwarz',        1, 'Der Klassiker — passt zu jedem Outfit und jedem Anlass. Business, Formal, Casual — Schwarz geht immer.', 'Grau, Navy, alle dunklen Anzüge', 'good', 0),
      ('black',    '#111827', 'Midnight Black',  1, 'Dunkles Anthrazit mit leichtem Blauschimmer. Moderner als reines Schwarz — perfekt für Smart Casual und kreative Berufe.', 'Dunkle Jeans, Navy Blazer, Charcoal Suits', 'good', 1),
      ('cognac',   '#92400e', 'Cognac',          1, 'Warmes Braun mit Tiefe — der ideale Business-Casual-Begleiter. Passt hervorragend zu Beige, Navy und Erdtönen.', 'Beige Chinos, Navy Blazer, Jeans', 'good', 2),
      ('oxblood',  '#7b1e1e', 'Oxblood',         1, 'Sattes Bordeaux-Rot — ein Herbst- und Winter-Statement. Elegant zum dunklen Anzug, lässig zur Jeans.', 'Charcoal, Navy, Dunkelgrün, Tweed', 'neutral', 3),
      ('tan',      '#b45309', 'Tan',             1, 'Helles Karamell-Braun — die perfekte Sommerfarbe. Strahlt bei Sonnenlicht und passt zu hellen, leichten Outfits.', 'Weiß, Hellblau, Leinen, Beige', 'neutral', 4),
      ('navy',     '#1e3a5f', 'Navy',            0, 'Der moderne Gentleman-Ton — elegant und unkonventionell zugleich. Perfekt zu grauen und hellbraunen Outfits.', 'Grau, Beige, helle Jeans, Tweed', 'good', 5),
      ('forest',   '#14532d', 'Forest',          0, 'Tiefes Waldgrün — für den mutigen Stilbewussten. Ein Herbst-Highlight zu Cord, Tweed und Erdtönen.', 'Braun, Beige, Senfgelb, Cord', 'neutral', 6);

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
      ('leather',     'LEDERSOHLE',    'Klassisch',    'Handgenähte Ledersohle — elegant und atmungsaktiv.', 'Nur für trockene Bedingungen empfohlen. Ideal im Sommer und für Indoor-Anlässe. Bei Nässe wird es rutschig.', 0, 'warn', 0, 'OXFORD,LOAFER,DERBY,MONK', 0),
      ('rubber-grip', 'ANTI-RUTSCH',   'Gummi-Profil', 'Gummibeschichtete Profilsohle — maximale Rutschfestigkeit auf allen Oberflächen.', 'Unsere Empfehlung für den Alltag. Sicherer Halt bei Regen, Schnee und nassen Böden. Ganzjährig einsetzbar.', 35, 'good', 1, 'OXFORD,LOAFER,DERBY,MONK,BOOT', 1),
      ('sneaker',     'SNEAKER-SOHLE', 'EVA-Komfort',  'Leichte EVA-Komfortsohle mit Dämpfung — für maximalen Gehkomfort den ganzen Tag.', 'Speziell für Sneaker entwickelt. Stoßdämpfend, flexibel und ultraleicht.', 0, 'good', 0, 'SNEAKER', 2);

    CREATE TABLE IF NOT EXISTS cms_media (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      filename    TEXT    NOT NULL,
      created_by  INTEGER REFERENCES users(id),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `)
}
