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
      reference_type  TEXT    NOT NULL DEFAULT 'card',   -- 'card' | 'a4'
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
      ('bank_name',   'Musterbank');
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
  ]
  for (const sql of colMigrations) {
    try { db.exec(sql) } catch { /* column already exists */ }
  }

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
}
