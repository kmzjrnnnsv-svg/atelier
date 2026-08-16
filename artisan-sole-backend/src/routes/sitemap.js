/**
 * sitemap.js — die Landkarte, die der Laden den Suchmaschinen hinlegt.
 *
 * ── Warum das eine Route ist und keine Datei ─────────────────────────────
 *
 * Eine `sitemap.xml` im `public/`-Verzeichnis wäre in fünf Minuten
 * geschrieben und ab dem ersten neuen Modell falsch. Sie müsste bei jedem
 * Anlegen, Löschen und Umbenennen von Hand nachgezogen werden, und niemand
 * merkt es, wenn es unterbleibt: Eine veraltete Landkarte sieht genauso aus
 * wie eine richtige.
 *
 * Hier entsteht sie bei jedem Abruf aus dem Katalog. Ein Modell, das im
 * Laden steht, steht damit auch in der Karte, und ein gelöschtes
 * verschwindet von selbst.
 *
 * ── Was drinsteht und was nicht ──────────────────────────────────────────
 *
 * Nur Seiten, die ein Besucher OHNE Anmeldung sehen kann und die für sich
 * stehen: die Startseite, die Kollektion, jede Modellseite, das Zubehör,
 * die Hilfe und die drei Rechtstexte.
 *
 * Nicht drin: Konto, Warenkorb, Kasse, Bestellungen, Fußscan, Verwaltung.
 * Sie führen entweder zur Anmeldung oder zeigen persönliche Daten. Eine
 * Suchmaschine, die sie aufnimmt, listet leere Hüllen — und im schlimmsten
 * Fall landet der Inhalt eines fremden Kontos im Index.
 *
 * Ebenfalls nicht drin: `/customize?id=13`. Diese Form führt zur selben
 * Seite wie `/schuhe/heritage-oxford` und wäre ein zweiter Eintrag für
 * denselben Inhalt.
 *
 * ── lastmod ──────────────────────────────────────────────────────────────
 *
 * Kommt aus `updated_at` des Modells. Es ist die einzige ehrliche Angabe,
 * die wir haben: Wer sie erfindet (etwa „heute" für alles), bringt eine
 * Suchmaschine dazu, unveränderte Seiten immer wieder abzuholen, und
 * verliert dabei das Zutrauen in die Angabe.
 */
import { Router } from 'express'
import { getDb } from '../db/database.js'

const router = Router()

// Woher der Laden erreichbar ist. Aus der Umgebung, denn die Adresse
// unterscheidet sich zwischen Entwicklung und Betrieb — und eine falsche
// Adresse in der Karte macht sie wertlos: Die Verweise zeigen dann auf einen
// Rechner, den es außerhalb des Hauses nicht gibt.
const basis = () =>
  (process.env.PUBLIC_URL || process.env.APP_URL || 'https://artisansole.com').replace(/\/+$/, '')

// Feste Seiten. `prio` sagt der Suchmaschine, was uns wichtig ist, `freq`,
// wie oft sich etwas ändert. Beides sind Hinweise und keine Anweisungen;
// übertriebene Werte („alles 1.0, alles stündlich") werden ignoriert.
const FESTE_SEITEN = [
  { pfad: '/',                    prio: '1.0', freq: 'weekly' },
  { pfad: '/collection',          prio: '0.9', freq: 'weekly' },
  { pfad: '/accessories',         prio: '0.6', freq: 'monthly' },
  { pfad: '/help',                prio: '0.4', freq: 'monthly' },
  { pfad: '/legal/agb',           prio: '0.2', freq: 'yearly' },
  { pfad: '/legal/datenschutz',   prio: '0.2', freq: 'yearly' },
  { pfad: '/legal/impressum',     prio: '0.2', freq: 'yearly' },
]

// XML kennt fünf Zeichen, die nicht roh in einem Textknoten stehen dürfen.
// Ein Slug enthält sie normalerweise nicht — aber „normalerweise" ist keine
// Zusage, und eine kaputte Karte wird von Google kommentarlos verworfen.
const xml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;')

// Datum in der Form, die die Norm verlangt (W3C Datetime, hier auf den Tag
// genau). SQLite liefert „2026-08-16 21:04:11"; daraus wird „2026-08-16".
const tag = (wert) => {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(wert || ''))
  return m ? m[1] : null
}

router.get('/sitemap.xml', (req, res) => {
  const b = basis()
  const eintraege = FESTE_SEITEN.map(s => ({ ...s, loc: b + s.pfad }))

  try {
    const modelle = getDb().prepare(`
      SELECT slug, updated_at FROM shoes
       WHERE slug IS NOT NULL AND TRIM(slug) != ''
       ORDER BY id ASC
    `).all()
    for (const m of modelle) {
      eintraege.push({
        loc: `${b}/schuhe/${m.slug}`,
        prio: '0.8',
        freq: 'monthly',
        lastmod: tag(m.updated_at),
      })
    }
  } catch (e) {
    // Ohne Katalog bleibt die Karte auf den festen Seiten stehen. Besser
    // eine kurze Karte als gar keine: Ein Fehler hier würde eine
    // Suchmaschine die Adresse als defekt vermerken lassen.
    console.error('[sitemap]', e.message)
  }

  const leib = eintraege.map(e => [
    '  <url>',
    `    <loc>${xml(e.loc)}</loc>`,
    e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
    `    <changefreq>${e.freq}</changefreq>`,
    `    <priority>${e.prio}</priority>`,
    '  </url>',
  ].filter(Boolean).join('\n')).join('\n')

  res.type('application/xml').send(
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    leib + '\n</urlset>\n'
  )
})

/**
 * robots.txt — was ein Crawler NICHT abgrasen soll.
 *
 * Die gesperrten Pfade sind keine Sicherheitsmaßnahme: `robots.txt` ist eine
 * Bitte, kein Riegel, und wer die Verwaltung sucht, liest sie zuerst. Der
 * Zugriffsschutz sitzt in den Routen. Hier geht es allein darum, dass eine
 * Suchmaschine ihre Zeit nicht mit Seiten verbringt, die für sie leer sind,
 * und dass keine Kontoansichten in den Index geraten.
 */
router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send([
    'User-agent: *',
    'Allow: /',
    '',
    '# Persönliches und Verwaltung. Führt ohne Anmeldung nirgendwohin.',
    'Disallow: /cms',
    'Disallow: /admin',
    'Disallow: /konto',
    'Disallow: /profil',
    'Disallow: /checkout',
    'Disallow: /warenkorb',
    'Disallow: /orders',
    'Disallow: /bestellungen',
    'Disallow: /wishlist',
    'Disallow: /scan',
    'Disallow: /health',
    'Disallow: /ruecksendungen',
    'Disallow: /login',
    'Disallow: /register',
    'Disallow: /passwort-neu',
    '',
    '# Dieselbe Seite wie /schuhe/<slug>, nur ohne sprechende Adresse.',
    'Disallow: /customize',
    '',
    '# Die Schnittstelle liefert JSON, keine Seiten.',
    'Disallow: /api/',
    '',
    `Sitemap: ${basis()}/sitemap.xml`,
    '',
  ].join('\n'))
})

export default router
