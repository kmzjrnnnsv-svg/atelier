/**
 * guertel.js — der Gürtel und was ihn festlegt.
 *
 * ── Warum eine eigene Datei ───────────────────────────────────────────────
 *
 * Der Gürtel ist das erste Zubehör, das konfiguriert wird. Bisher galt für
 * Zubehör: ein Artikel, ein Preis, in den Warenkorb. Beim Gürtel hängen fünf
 * Angaben zusammen — Leder, Farbe, Schließenform, Metall, Länge —, und sie
 * entstehen an zwei verschiedenen Orten: einmal während der Schuhkonfiguration
 * (dann übernimmt der Gürtel, was am Schuh schon feststeht), einmal später auf
 * der Zubehörseite (dann steht nichts fest und alles wird gefragt).
 *
 * Zwei Oberflächen, dieselbe Regel. Genau dort entstehen sonst zwei Regeln,
 * die sich langsam auseinanderentwickeln — und der Preis, den die Kasse
 * ausrechnet, wäre ein anderer als der, den die Seite zeigt.
 *
 * ── Was der Server prüft und was er nicht glaubt ──────────────────────────
 *
 * Preis und Beschreibung entstehen HIER, aus den Schlüsseln. Was der Browser
 * an Beträgen oder Fließtext mitschickt, wird verworfen. Ein Gürtel für 1 €
 * ist sonst eine Frage von zwei Zeilen in der Entwicklerkonsole.
 */

/**
 * Die Kennung des Artikels im Zubehörbestand.
 *
 * Der Gürtel ist eine ganz normale Zeile in `accessories` — mit Preis,
 * Beschreibung und Bildern, alles im CMS zu pflegen. Was ihn unterscheidet,
 * steht in `config_kind`: Diese Zeile wird nicht einfach in den Warenkorb
 * gelegt, sie wird vorher konfiguriert.
 */
export const GUERTEL_KEY = 'belt_hamptons'
export const GUERTEL_ART = 'belt'

/**
 * Die Längen, die gefertigt werden: 80 bis 180 cm in Schritten von 5.
 *
 * Gemessen wird von der Dornbefestigung bis zum mittleren Loch — das ist die
 * Angabe, die auf jedem Gürtel steht, und die einzige, die sich mit einem
 * vorhandenen Gürtel nachmessen lässt.
 */
export const GROESSEN = Array.from({ length: 21 }, (_, i) => 80 + i * 5)

/**
 * Wie man auf seine Länge kommt.
 *
 * Zwei Wege, weil nicht jeder einen Gürtel zum Nachmessen hat. Der zweite ist
 * der ungenauere; er steht deshalb an zweiter Stelle und sagt das auch.
 */
export const GROESSEN_HILFE = {
  titel: 'Welche Länge brauche ich?',
  wege: [
    {
      titel: 'Mit einem Gürtel, den Sie gern tragen',
      text: 'Legen Sie ihn flach hin und messen Sie von der Befestigung des Dorns bis zum mittleren Loch. Das Ergebnis in Zentimetern ist Ihre Größe.',
    },
    {
      titel: 'Ohne Vorbild',
      text: 'Messen Sie über der Hose dort, wo der Gürtel sitzt — durch die Schlaufen. Runden Sie auf die nächste Größe auf.',
    },
  ],
  hinweis: 'Der mittlere Dorn ist die Vorgabe. Nach beiden Seiten bleiben zwei Löcher Spiel, je 3 cm — eine Größe daneben ist also noch zu tragen.',
}

/** Der Spielraum je Richtung in Zentimetern (zwei Löcher à 3 cm). */
export const SPIELRAUM_CM = 6

/**
 * Was eine gewählte Länge in der Praxis bedeutet.
 *
 * Steht neben der Auswahl. Eine Zahl allein sagt niemandem, ob er richtig
 * liegt; „passt von 94 bis 106 cm" schon.
 */
export function groessenSpanne(cm) {
  const n = Number(cm)
  if (!Number.isFinite(n)) return null
  return { von: n - SPIELRAUM_CM, bis: n + SPIELRAUM_CM }
}

/**
 * Die Schließenformen und Metalltöne kommen aus dem Optionsbestand.
 *
 * Es sind dieselben Gruppen, aus denen der Monk seine Schnalle bekommt —
 * `buckle` und `buckle_color`. Das ist kein Zufall, sondern der Grund, warum
 * die Übernahme vom Schuh überhaupt funktioniert: Steht am Schuh schon ein
 * Metallton, ist es derselbe Wert aus derselben Tabelle, und der Gürtel kann
 * ihn wortwörtlich übernehmen statt ihn zu übersetzen.
 *
 * Eine eigene Gürtel-Liste hätte eine Zuordnungstabelle gebraucht („Kupfer am
 * Schuh heißt am Gürtel Altgold"), und jede solche Tabelle ist eine Stelle,
 * an der später etwas nicht mehr zusammenpasst.
 */
export function wahlmoeglichkeiten(db) {
  const werte = (gruppe) => db.prepare(`
    SELECT o.key, o.label, o.description, o.color_hex, o.image_data
    FROM options o JOIN option_groups g ON g.id = o.group_id
    WHERE g.key = ?
    ORDER BY o.sort_order ASC, o.id ASC
  `).all(gruppe)

  return {
    formen:  werte('buckle'),
    metalle: werte('buckle_color'),
    groessen: GROESSEN,
    hilfe: GROESSEN_HILFE,
    spielraum_cm: SPIELRAUM_CM,
  }
}

/** Der Zubehör-Datensatz des Gürtels, oder null wenn er gelöscht wurde. */
export function guertelArtikel(db) {
  try {
    return db.prepare('SELECT * FROM accessories WHERE key = ? AND is_active = 1').get(GUERTEL_KEY) || null
  } catch { return null }
}

/**
 * Was der Gürtel kostet.
 *
 * Zwei Preise, ein Grund: Zusammen mit einem Paar geht er im selben Karton
 * hinaus, allein braucht er Verpackung und Porto für sich. Beide Beträge
 * stehen am Artikel und sind im CMS zu ändern; hier steht nur, welcher wann
 * gilt — und ein Rückfall auf den Einzelpreis, falls der zweite nicht
 * gepflegt ist.
 */
export function preis(artikel, { mitSchuh = false } = {}) {
  const einzeln = Number(artikel?.price) || 0
  if (!mitSchuh) return einzeln
  const zusammen = Number(artikel?.price_with_shoe)
  return Number.isFinite(zusammen) && zusammen > 0 ? zusammen : einzeln
}

const text = (v) => (v === null || v === undefined ? '' : String(v).trim())

/**
 * Eine Konfiguration prüfen und in die Form bringen, in der sie gespeichert
 * wird.
 *
 * Gibt `{ ok: false, fehler }` zurück, wenn etwas fehlt oder nicht im
 * Bestand steht — mit dem Feld im Klartext, damit die Meldung im Browser
 * etwas taugt. Bei `ok` steht in `wert` genau das, was in die Bestellung
 * geschrieben wird: gefundene Bezeichnungen statt der mitgeschickten, denn
 * die Bezeichnung ist Sache des Servers.
 */
export function pruefe(db, eingabe = {}, { mitSchuh = false } = {}) {
  const artikel = guertelArtikel(db)
  if (!artikel) return { ok: false, fehler: 'Den Gürtel führen wir derzeit nicht.' }

  const wahl = wahlmoeglichkeiten(db)

  const form = wahl.formen.find(f => f.key === text(eingabe.form))
  if (!form) return { ok: false, fehler: 'Bitte wählen Sie die Form der Schließe.', feld: 'form' }

  const metall = wahl.metalle.find(m => m.key === text(eingabe.metall))
  if (!metall) return { ok: false, fehler: 'Bitte wählen Sie die Farbe des Metalls.', feld: 'metall' }

  const groesse = Number(eingabe.groesse)
  if (!GROESSEN.includes(groesse)) {
    return { ok: false, fehler: `Bitte wählen Sie eine Länge zwischen ${GROESSEN[0]} und ${GROESSEN[GROESSEN.length - 1]} cm.`, feld: 'groesse' }
  }

  // Leder und Farbe: Sie stammen entweder vom Schuh oder aus der eigenen Wahl.
  // Geprüft wird gegen denselben Bestand, aus dem der Konfigurator sie nimmt —
  // ein Leder, das es nicht gibt, wäre eine Bestellung, die niemand fertigen
  // kann.
  const lederKey = text(eingabe.leder)
  const leder = lederKey
    ? db.prepare('SELECT key, label FROM shoe_materials WHERE key = ? AND available = 1').get(lederKey)
    : null
  if (!leder) return { ok: false, fehler: 'Bitte wählen Sie die Lederart.', feld: 'leder' }

  const farbKey = text(eingabe.farbe)
  const farbe = farbKey
    ? db.prepare('SELECT key, name, hex, applicable_materials FROM shoe_colors WHERE key = ?').get(farbKey)
    : null
  if (!farbe) return { ok: false, fehler: 'Bitte wählen Sie die Farbe.', feld: 'farbe' }

  // Die Farbe muss es an diesem Leder auch geben. Sonst käme über die
  // Übernahme vom Schuh eine Paarung zustande, die der Konfigurator selbst
  // nie angeboten hätte.
  const gilt = text(farbe.applicable_materials) || '*'
  if (gilt !== '*' && !gilt.split(',').map(s => s.trim()).includes(leder.key)) {
    return { ok: false, fehler: `${farbe.name} gibt es nicht in ${leder.label}.`, feld: 'farbe' }
  }

  const wert = {
    art: GUERTEL_ART,
    leder: leder.key,     leder_label: leder.label,
    farbe: farbe.key,     farbe_name: farbe.name, farbe_hex: farbe.hex,
    form: form.key,       form_label: form.label,
    metall: metall.key,   metall_label: metall.label, metall_hex: metall.color_hex,
    groesse,
    mit_schuh: !!mitSchuh,
  }
  wert.beschreibung = beschreibung(wert)

  return { ok: true, wert, artikel, preis: preis(artikel, { mitSchuh }) }
}

/**
 * Die Konfiguration als Satz.
 *
 * Sie steht in der Bestellung, in der Bestätigungsmail und auf dem Beleg. Ein
 * Kunde, der in einem halben Jahr nachschaut, was er bestellt hat, soll dort
 * nicht fünf Schlüssel lesen müssen, sondern einen Satz — und die Werkstatt
 * bekommt dieselbe Zeile.
 */
export function beschreibung(w) {
  const spanne = groessenSpanne(w.groesse)
  return [
    `${w.leder_label} in ${w.farbe_name}`,
    `${w.form_label} in ${w.metall_label}`,
    `Länge ${w.groesse} cm (passt von ${spanne.von} bis ${spanne.bis} cm)`,
  ].join(' · ')
}

/**
 * Was ein Schuh an einen Gürtel weitergibt.
 *
 * Leder und Farbe hat jede Bestellung. Den Metallton nur die, an denen eine
 * Schnalle sitzt — Monk und Double Monk. Steht er da, ist die Frage nach dem
 * Metall beantwortet, bevor sie gestellt wird; steht er nicht da, wird sie
 * gestellt. Das ist der ganze Unterschied, und er hängt an diesem einen Feld.
 */
export function ausSchuh(db, order) {
  if (!order) return null

  // ── Die Zusatzoptionen ───────────────────────────────────────────────
  //
  // Eine Bestellung führt sie als `{ group, key, value, price }` — `key` ist
  // dabei die Kennung der GRUPPE („buckle_color"), `value` die Beschriftung
  // des gewählten Werts („Nickel"). Die Kennung des Werts steht nicht darin;
  // sie wird über die Beschriftung zurückgesucht.
  let extras = []
  try { extras = JSON.parse(order.extras || '[]') } catch { extras = [] }
  if (!Array.isArray(extras)) extras = []

  const ausGruppe = (gruppe) => {
    const eintrag = extras.find(e => e?.key === gruppe)
    if (!eintrag?.value) return null
    return db.prepare(`
      SELECT o.key, o.label, o.color_hex FROM options o
      JOIN option_groups g ON g.id = o.group_id
      WHERE g.key = ? AND o.label = ? COLLATE NOCASE
    `).get(gruppe, String(eintrag.value)) || null
  }
  const metall = ausGruppe('buckle_color')
  const form   = ausGruppe('buckle')

  // ── Leder und Farbe ──────────────────────────────────────────────────
  //
  // Das Leder steht als Beschriftung in der Bestellung („Lux Calf"), die
  // Farbe als Farbwert („#92400e") — nicht als Name. Beides sind keine
  // Schlüssel, und für den Gürtel brauchen wir Schlüssel.
  //
  // Beim Farbwert kommt hinzu, dass er nicht eindeutig ist: „Schwarz" und
  // „Midnight Black" trugen beide #000000. Deshalb wird zuerst unter den
  // Farben gesucht, die es an DIESEM Leder überhaupt gibt — dort ist der
  // Wert eindeutig. Erst wenn das nichts ergibt, zählt der bloße Farbwert.
  const leder = db.prepare('SELECT key, label FROM shoe_materials WHERE label = ? COLLATE NOCASE')
    .get(String(order.material || '')) || null

  const gesucht = String(order.color || '').trim()
  const passtZumLeder = (c) => {
    const gilt = String(c.applicable_materials || '*')
    return gilt === '*' || (leder && gilt.split(',').map(s => s.trim()).includes(leder.key))
  }
  const alleFarben = db.prepare('SELECT key, name, hex, applicable_materials FROM shoe_colors').all()
  const farbe =
       alleFarben.find(c => passtZumLeder(c) && c.hex?.toLowerCase() === gesucht.toLowerCase())
    || alleFarben.find(c => c.name?.toLowerCase() === gesucht.toLowerCase())
    || alleFarben.find(c => c.hex?.toLowerCase() === gesucht.toLowerCase())
    || null

  return {
    order_id: order.id,
    schuh: order.shoe_name,
    bestellt_am: order.created_at,
    leder: leder?.key || null,     leder_label: leder?.label || order.material || null,
    farbe: farbe?.key || null,     farbe_name: farbe?.name || null,
    farbe_hex: farbe?.hex || (/^#[0-9a-f]{6}$/i.test(gesucht) ? gesucht : null),
    // Null heißt hier ausdrücklich „am Schuh nicht festgelegt" und nicht
    // „unbekannt" — die Oberfläche fragt genau dann nach.
    metall: metall?.key || null,   metall_label: metall?.label || null,
    metall_hex: metall?.color_hex || null,
    form:   form?.key   || null,   form_label:   form?.label   || null,
    // Vollständig heißt: Der Gürtel ließe sich daraus bauen. Fehlt Leder oder
    // Farbe, taugt die Bestellung nicht als Vorlage und wird gar nicht erst
    // angeboten.
    brauchbar: !!(leder && farbe),
  }
}
