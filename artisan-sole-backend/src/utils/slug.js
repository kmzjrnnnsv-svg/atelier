/**
 * Sprechende URL-Bestandteile für Schuhmodelle.
 *
 * Aus «Heritage "Oxford"» wird `heritage-oxford`, die Produktseite liegt dann
 * unter /schuhe/heritage-oxford statt unter /customize?id=13.
 *
 * Deutsche Umlaute werden ausgeschrieben (ä → ae), nicht bloß entkleidet.
 * Ein reines NFKD würde aus «Größe» sonst «groe» machen, weil das ß dabei
 * ersatzlos entfällt — mit der Ersetzung unten bleibt «groesse».
 */

const UMLAUTS = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss', æ: 'ae', ø: 'oe', å: 'aa' }

export function slugifyName(name) {
  const cleaned = String(name || '')
    // Anführungszeichen sind im Namensfeld nur Auszeichnung (siehe shoeName.jsx)
    // und gehören nicht in die Adresse.
    .replace(/[„“”"]/g, ' ')
    .toLowerCase()
    .replace(/[äöüßæøå]/g, ch => UMLAUTS[ch] || ch)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')   // übrige Akzente (é → e)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')               // ein Bindestrich am Ende des Schnitts
  return cleaned || 'modell'
}

/**
 * Eindeutigen Slug für einen Schuh bilden.
 *
 * SQLite kann per ALTER TABLE keinen UNIQUE-Index nachrüsten, die
 * Eindeutigkeit entsteht deshalb hier. Bei Namensgleichheit wird angehängt
 * gezählt (…-2, …-3), damit die Adresse lesbar bleibt statt in einen
 * Zufallscode zu kippen.
 *
 * `excludeId` lässt den eigenen Datensatz außen vor, sonst bekäme ein Schuh
 * bei jedem Speichern ohne Namensänderung eine neue Nummer angehängt.
 */
export function uniqueShoeSlug(db, name, excludeId = null) {
  const base = slugifyName(name)
  const taken = db.prepare(
    excludeId
      ? 'SELECT slug FROM shoes WHERE slug IS NOT NULL AND id != ?'
      : 'SELECT slug FROM shoes WHERE slug IS NOT NULL'
  ).all(...(excludeId ? [excludeId] : [])).map(r => r.slug)

  const used = new Set(taken)
  if (!used.has(base)) return base
  for (let i = 2; i < 500; i++) {
    const candidate = `${base}-${i}`
    if (!used.has(candidate)) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}
