/**
 * schuhname.js — ein Modellname gehört genau einem Modell.
 *
 * ── Warum das eine eigene Datei ist ──────────────────────────────────────
 *
 * Ein Schuh kann auf sechs Wegen entstehen: über das CMS, über die
 * Matrix-Vorlage, über die drei Mokassin-Seeds, über die Express-Ableitung.
 * Jeder dieser Wege hat bisher selbst geprüft, ob es den Namen schon gibt,
 * und jeder hat es mit `WHERE name = ?` getan — also zeichengenau. „Moc Flex
 * Sport" und „Moc Flex Sport " (ein Leerzeichen am Ende) waren damit zwei
 * verschiedene Modelle, und im Laden standen sie als zwei Kacheln mit
 * demselben Namen nebeneinander. Genau das ist einmal passiert, als der
 * Umbenenner „Mov" → „Moc" nach der Matrix lief statt davor.
 *
 * Die Regel steht deshalb an einer Stelle, und darunter liegt ein
 * eindeutiger Index in der Datenbank (siehe `schema.js`). Der Index ist das,
 * was die Zusage trägt: Er gilt auch für Code, den es heute noch nicht gibt,
 * und für jeden, der von Hand ein INSERT absetzt. Die Prüfungen hier oben
 * sind nur dafür da, dass der Redakteur einen Satz zu lesen bekommt statt
 * eines Datenbankfehlers.
 *
 * ── Was „derselbe Name" heißt ────────────────────────────────────────────
 *
 * Groß-/Kleinschreibung zählt nicht, Leerzeichen am Rand zählen nicht, und
 * mehrere Leerzeichen in der Mitte gelten als eines. Beim Schreiben wird der
 * Name auf diese Form gebracht, damit der Index in der Datenbank — der nur
 * `lower(trim(name))` kann und keine inneren Leerzeichen zusammenzieht —
 * dieselbe Antwort gibt wie die Prüfung hier.
 */

/** Der Name, wie er gespeichert wird: Ränder ab, Mehrfachleerzeichen zu einem. */
export const sauberName = (roh) => String(roh ?? '').replace(/\s+/g, ' ').trim()

/** Der Name als Vergleichsschlüssel. */
export const nameSchluessel = (roh) => sauberName(roh).toLowerCase()

/**
 * Gibt es den Namen schon? Liefert die kollidierende Zeile oder null.
 *
 * `ausserId` klammert das Modell aus, das gerade bearbeitet wird — sonst
 * verböte ein Speichern ohne Namensänderung sich selbst.
 */
export function nameKollision(db, name, ausserId = null) {
  const s = nameSchluessel(name)
  if (!s) return null
  const id = ausserId == null ? null : Number(ausserId)
  return db.prepare(`
    SELECT id, name FROM shoes
     WHERE lower(trim(name)) = ? AND (? IS NULL OR id != ?)
     ORDER BY id ASC LIMIT 1
  `).get(s, id, id) || null
}

/**
 * Steht dieses Modell schon im Katalog?
 *
 * Für die Seeds gedacht, die vor jedem INSERT fragen. Zeichengenaues
 * `WHERE name = ?` reichte dort nicht mehr: Seit der eindeutige Index steht,
 * würde ein Treffer, den die Abfrage übersieht, den INSERT nicht mehr
 * durchgehen lassen, sondern den Start abbrechen.
 */
export const schuhVorhanden = (db, name) =>
  !!db.prepare('SELECT 1 FROM shoes WHERE lower(trim(name)) = ?').get(nameSchluessel(name))

/**
 * Ein freier Name in der Nähe des gewünschten: „The Oxford (2)", „(3)" …
 *
 * Nur für die Migration, die einen Bestand mit Doppelten vorfindet. Gelöscht
 * wird dort nichts — was ein Betreiber angelegt hat, entscheidet er selbst.
 * Er bekommt beide Modelle zu sehen, unterscheidbar benannt, und räumt auf.
 */
export function freierName(db, wunsch) {
  const basis = sauberName(wunsch)
  if (!schuhVorhanden(db, basis)) return basis
  for (let n = 2; n < 1000; n++) {
    const kandidat = `${basis} (${n})`
    if (!schuhVorhanden(db, kandidat)) return kandidat
  }
  return `${basis} (${Date.now()})`
}
