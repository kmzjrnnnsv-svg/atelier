/**
 * mokassin.mjs — der Mokassin so, wie ihn die Manufaktur konfiguriert.
 *
 * Der Driver ist das erste Modell, das nicht der Dress-Matrix folgt: eigene
 * Leder, eigene Farben, eigene Schritte, eigener Leisten. Fast alles davon
 * hängt an einem einzigen Wort — der Kategorie `MOCCASIN` — und wird an fünf
 * verschiedenen Stellen ausgewertet: Leder-Zuordnung, Farbfilter,
 * Options-Zuordnung, Kategorie-Vorlage und Leisten-Matcher.
 *
 * Was hier geprüft wird, ist deshalb nicht „ist die Zeile da", sondern:
 * Kommen die drei Leder mit genau 17, 13 und 7 Farben heraus — den Zahlen aus
 * dem Konfigurator der Manufaktur —, und bleibt der Rest des Katalogs davon
 * unberührt?
 *
 * Das Umgekehrte zählt genauso: Ein Oxford darf kein Nappa anbieten, und ein
 * Mokassin kein Luxe Calf. Die Leder wandern über globale Tabellen, und ein
 * fehlender Filter fällt sonst erst auf, wenn ein Kunde bestellt hat.
 *
 *   node tests/mokassin.mjs        (Server auf 3099, eigene Datenbank)
 */
const BASIS = 'http://localhost:3099'
let ok = 0
const fehler = []

const p = (was, bedingung, zusatz = '') => {
  if (bedingung) { ok++; console.log(`  OK     ${was}${zusatz ? ' — ' + zusatz : ''}`) }
  else { fehler.push(was); console.log(`  FEHLER ${was}${zusatz ? ' — ' + zusatz : ''}`) }
}
const abschnitt = (t) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 58 - t.length))}`)

async function ruf(pfad) {
  const res = await fetch(`${BASIS}${pfad}`, { headers: { 'X-Requested-With': 'ArtisanSole' } })
  const text = await res.text()
  let daten = null
  try { daten = JSON.parse(text) } catch { daten = text }
  return { status: res.status, daten }
}

/** Farben, die es an diesem Leder gibt. Genau der Filter aus dem Konfigurator. */
const farbenFuer = (farben, lederKey) => farben.filter(c => {
  const a = String(c.applicable_materials || '*')
  return a === '*' || a.split(',').map(s => s.trim()).includes(lederKey)
})

// ════════════════════════════════════════════════════════════════════════
abschnitt('1. Das Modell steht im Katalog')

const { daten: schuhe } = await ruf('/api/shoes')
p('Katalog abrufbar', Array.isArray(schuhe) && schuhe.length > 0, `${schuhe?.length} Modelle`)

const driver = (schuhe || []).find(s => s.category === 'MOCCASIN')
p('Ein Mokassin im Katalog', !!driver, driver ? `${driver.name} (${driver.price})` : 'keiner')
if (!driver) {
  console.log('\n  Ohne Modell ist der Rest gegenstandslos.')
  process.exit(1)
}
p('Über eine sprechende Adresse erreichbar', !!driver.slug, driver.slug || '—')
// Der Einstandspreis ist die Grundlage jeder Margenauswertung. Steht er nicht
// am Modell, rechnet die Auswertung stillschweigend mit null.
p('Einstandspreis hinterlegt', Number(driver.cost_price) > 0, `${driver.cost_price} €`)

// ════════════════════════════════════════════════════════════════════════
abschnitt('2. Die drei Leder')

const { daten: lederAmModell } = await ruf(`/api/shoes/${driver.id}/materials`)
const ERWARTET = ['calf_suede', 'nappa', 'fullgrain']
p('Genau drei Leder am Mokassin', Array.isArray(lederAmModell) && lederAmModell.length === 3,
  (lederAmModell || []).join(', '))
p('Es sind Calf Suede, Nappa und Fullgrain',
  ERWARTET.every(k => (lederAmModell || []).includes(k)))

const { daten: alleLeder } = await ruf('/api/materials')
const vorhanden = new Set((alleLeder || []).map(m => m.key))
p('Alle drei sind angelegt und verfügbar',
  ERWARTET.every(k => (alleLeder || []).some(m => m.key === k && m.available !== 0)))
// Eine Familie, sonst schiebt sich vor die Lederwahl noch ein Schritt
// („Aesthetic oder Durable"), an dem es beim Mokassin nichts zu wählen gibt.
const familien = new Set((alleLeder || []).filter(m => ERWARTET.includes(m.key)).map(m => m.family))
p('Alle drei in derselben Familie', familien.size === 1, [...familien].join(', '))

// Keine Vermischung mit der Dress-Linie, in beide Richtungen.
p('Kein Dress-Leder am Mokassin',
  !['lux_calf', 'lux_suede', 'box_calf', 'patina', 'velvet'].some(k => (lederAmModell || []).includes(k)))

const oxford = (schuhe || []).find(s => s.category === 'OXFORD')
if (oxford) {
  const { daten: oxfordLeder } = await ruf(`/api/shoes/${oxford.id}/materials`)
  p('Kein Mokassin-Leder am Oxford',
    !ERWARTET.some(k => (oxfordLeder || []).includes(k)), (oxfordLeder || []).join(', '))
}

// ════════════════════════════════════════════════════════════════════════
abschnitt('3. Die Farbpalette je Leder')

const { daten: alleFarben } = await ruf('/api/colors')
p('Farbtabelle abrufbar', Array.isArray(alleFarben) && alleFarben.length > 0, `${alleFarben?.length} Farben`)

// Die Zahlen stammen aus dem Konfigurator der Manufaktur. Weicht eine ab, ist
// entweder eine Farbe verlorengegangen oder eine an das falsche Leder geraten.
for (const [leder, soll] of [['calf_suede', 17], ['nappa', 13], ['fullgrain', 7]]) {
  const liste = farbenFuer(alleFarben || [], leder)
  p(`${leder}: ${soll} Farben`, liste.length === soll,
    `${liste.length} — ${liste.map(c => c.name).join(', ')}`)
}

// Die Dress-Linie darf davon nichts abbekommen: Ihre Farbzeilen tragen
// inzwischen eigene Namen („Espresso Heritage"), und der Mokassin hängt
// bewusst an eigenen Zeilen.
const luxCalf = farbenFuer(alleFarben || [], 'lux_calf')
p('Keine Mokassin-Farbe an Luxe Calf',
  !luxCalf.some(c => String(c.key).startsWith('moc_')),
  luxCalf.filter(c => String(c.key).startsWith('moc_')).map(c => c.key).join(', ') || 'keine')
// Die Gegenprobe: eine Mokassin-Farbe ohne Leder-Bindung („*") stünde an
// jedem Schuh im Haus.
const ungebunden = (alleFarben || []).filter(
  c => String(c.key).startsWith('moc_') && String(c.applicable_materials || '*') === '*')
p('Jede Mokassin-Farbe ist an ein Leder gebunden', ungebunden.length === 0,
  ungebunden.map(c => c.key).join(', ') || 'alle gebunden')

// ════════════════════════════════════════════════════════════════════════
abschnitt('4. Die Schritte im Konfigurator')

const { daten: gruppen } = await ruf(`/api/shoes/${driver.id}/options`)
const nach = Object.fromEntries((gruppen || []).map(g => [g.key, g]))

const SOLL = [
  ['moccasin_front',    3,  'Vorderteil'],
  ['stitching_color',   8,  'Nahtfarbe'],
  ['inner_color',       10, 'Futter'],
  ['soft_lining_color', 10, 'Weichfutter'],
  ['collar_color',      7,  'Kragen'],
  ['sole',              3,  'Sohle'],
]
for (const [key, anzahl, name] of SOLL) {
  const g = nach[key]
  p(`${name} mit ${anzahl} Werten`, !!g && g.values.length === anzahl,
    g ? `${g.values.length}` : 'Gruppe fehlt')
}

// Bare / Bow / Mask — die drei Vorderteile aus dem Back Office.
const front = (nach.moccasin_front?.values || []).map(v => v.key).sort()
p('Vorderteil: bare, bow, mask', front.join(',') === 'bare,bow,mask', front.join(', '))

// Was der Mokassin nicht hat, darf auch nicht zur Wahl stehen. Ein Rahmen an
// einem Mokassin ist keine Option, sondern ein Widerspruch.
for (const nicht of ['welt', 'heel', 'toe', 'buckle', 'wholecut_base', 'loafer_decoration']) {
  p(`Kein Schritt „${nicht}"`, !nach[nicht])
}
// Die Noppensohle ist durchgehend Gummi — Rand und Lauffläche gibt es dort
// nicht zu färben, also stehen sie auch nicht in der Vorlage.
p('Keine Sohlenfarben', !nach.sole_color && !nach.sole_bottom_color)

// Jeder Schritt braucht eine Vorbelegung, sonst steht die Bestellung mit
// einem leeren Feld da, das niemand bewusst leer gelassen hat.
const ohneVorgabe = (gruppen || []).filter(g => !g.values.some(v => v.is_default))
p('Jeder Schritt hat eine Vorgabe', ohneVorgabe.length === 0,
  ohneVorgabe.map(g => g.key).join(', ') || 'alle belegt')

// Farbige Schritte brauchen einen Farbwert, sonst zeigt die Auswahl leere
// Kästchen statt Tönen.
const farbschritte = ['stitching_color', 'soft_lining_color', 'collar_color']
const ohneHex = farbschritte.flatMap(k => (nach[k]?.values || []).filter(v => !v.color_hex).map(v => `${k}:${v.key}`))
p('Alle Farbwerte haben einen Ton', ohneHex.length === 0, ohneHex.join(', ') || 'alle gesetzt')

// ════════════════════════════════════════════════════════════════════════
abschnitt('5. Der Leisten')

// Der Mokassin läuft nur auf dem Drivers-Leisten. Ohne Eintrag in
// CATEGORY_LASTS fiele der Matcher auf „alle Leisten" zurück und schlüge dem
// Kunden einen Dress-Leisten für einen Mokassin vor.
const { daten: passform } = await ruf('/api/fit/match?category=MOCCASIN&length=265&girth=250')
const leisten = [...new Set((passform?.matches || []).map(m => m.last_key))]
p('Nur der Drivers-Leisten', leisten.length === 1 && leisten[0] === 'drivers', leisten.join(', '))
const beste = passform?.matches?.[0]
p('Eine Größe wird gefunden', !!beste,
  beste ? `${beste.size_system} ${beste.size_label}, Weite ${beste.width}` : 'keine')

// ════════════════════════════════════════════════════════════════════════
abschnitt('6. Die Kategorie-Vorlage bleibt bestehen')

// Sie wurde beim zweiten Start abgeräumt: Die Dress-Matrix leerte
// `category_templates` vollständig, obwohl sie nur ihre eigenen Kategorien
// wieder aufbaut. Ein neues Mokassin-Modell im CMS hätte danach keine
// Optionen mehr bekommen.
const { daten: vorlage } = await ruf('/api/category-templates/MOCCASIN/config')
p('Vorlage für MOCCASIN vorhanden', Array.isArray(vorlage) && vorlage.length >= 6,
  `${(vorlage || []).length} Gruppen`)
const vorlagenKeys = new Set((vorlage || []).map(g => g.key))
p('Sie enthält die eigenen Schritte',
  ['moccasin_front', 'stitching_color', 'soft_lining_color', 'collar_color'].every(k => vorlagenKeys.has(k)),
  [...vorlagenKeys].join(', '))

// ════════════════════════════════════════════════════════════════════════
console.log(`\n── Ergebnis ${'─'.repeat(48)}\n`)
console.log(`  ${ok} bestanden, ${fehler.length} fehlgeschlagen`)
if (fehler.length) { console.log('\n  ' + fehler.join('\n  ')); process.exit(1) }
