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

// Die Dress-Linie darf davon nichts abbekommen. Geprüft wird über den
// SCHLÜSSEL und nicht über den Namen: Beide Linien führen einen Ton namens
// „Black", und dass sie gleich heißen, ist gewollt. Getrennt sind die
// Zeilen, nicht die Bezeichnungen.
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
abschnitt('7. Der Sport-Mokassin')

/*
 * Der zweite Mokassin, „Moc Flex Sport". Er stand im Katalog schon — als
 * „Mov Flex Sport" mit v, unter SNEAKER, mit der Konfiguration eines
 * Sneakers: Innenfarbe und weiße Sohle, sonst nichts.
 *
 * Zwei Dinge sind hier zu prüfen, und beide gehen leicht schief:
 *
 *   • Der alte Name darf nicht zurückkommen. Er stand in der Matrix-Liste,
 *     und die legt an, was sie vermisst — ein Neustart hätte ihn sonst neben
 *     dem umbenannten Modell noch einmal angelegt.
 *   • Seine Konfiguration darf nicht abgeräumt werden. Unter SNEAKER stünde
 *     sie in der Matrix, und deren Force-Reset setzt bei jedem Start zurück.
 */
const sport = (schuhe || []).find(s => s.category === 'MOC_SPORT')
p('Der Sport-Mokassin steht im Katalog', !!sport, sport ? `${sport.name} (${sport.price})` : 'keiner')

if (sport) {
  p('Er heißt „Moc Flex Sport"', sport.name === 'Moc Flex Sport', sport.name)
  p('Der alte Name mit v ist weg',
    !(schuhe || []).some(s => String(s.name).startsWith('Mov ')),
    (schuhe || []).filter(s => String(s.name).startsWith('Mov ')).map(s => s.name).join(', ') || 'keiner')
  p('Einstandspreis hinterlegt', Number(sport.cost_price) > 0, `${sport.cost_price} €`)

  const { daten: sportLeder } = await ruf(`/api/shoes/${sport.id}/materials`)
  p('Nur ungefüttertes Wildleder', (sportLeder || []).join(',') === 'unlined_suede', (sportLeder || []).join(', '))

  const suedeFarben = farbenFuer(alleFarben || [], 'unlined_suede')
  p('Neun Farben', suedeFarben.length === 9, `${suedeFarben.length} — ${suedeFarben.map(c => c.name).join(', ')}`)

  const { daten: sportGruppen } = await ruf(`/api/shoes/${sport.id}/options`)
  const sNach = Object.fromEntries((sportGruppen || []).map(g => [g.key, g]))
  for (const [key, anzahl, name] of [
    ['loafer_decoration', 4,  'Aufsatz'],
    ['buckle_color',      4,  'Metall'],
    ['stitching_color',   9,  'Naht (Ton in Ton + 8 Farben)'],
    ['inner_color',       10, 'Futter'],
    ['sole_bottom_color', 1,  'Laufsohle'],
  ]) {
    const g = sNach[key]
    p(`${name} mit ${anzahl} Werten`, !!g && g.values.length === anzahl, g ? `${g.values.length}` : 'Gruppe fehlt')
  }

  // Die vier Aufsätze aus dem Back Office — Metallbügel, Maske, Quasten, ohne.
  const auf = (sNach.loafer_decoration?.values || []).map(v => v.key).sort()
  p('Bare, Metal Bit, Mask, Tassels', auf.join(',') === 'albert_mask,bare,metal_bit,tassels', auf.join(', '))
  // „Ton in Ton" muss die Vorgabe sein: Wer sich um die Naht nicht kümmert,
  // bekommt die unauffällige, nicht die erste Farbe der Liste.
  const naht = sNach.stitching_color?.values?.find(v => v.is_default)
  p('Die Naht ist Ton in Ton vorbelegt', naht?.key === 'tonal', naht?.label)

  // Ein Mokassin hat keinen Rahmen und keinen Absatz.
  for (const nicht of ['welt', 'heel', 'toe', 'buckle', 'sole']) {
    p(`Kein Schritt „${nicht}"`, !sNach[nicht])
  }

  // Der Leisten: `moc_sport`, nicht der des Drivers.
  //
  // Der Ballenumfang ist bewusst ein anderer als beim Driver: Der Moc-Sport-
  // Leisten ist schmaler geschnitten (244 mm statt 246 bei EU 42), und mit
  // dem Wert des Drivers läge die Abfrage außerhalb der Toleranz — die
  // Prüfung fiele um, ohne dass etwas kaputt wäre.
  const { daten: sportPass } = await ruf('/api/fit/match?category=MOC_SPORT&length=265&girth=244')
  const sportLeisten = [...new Set((sportPass?.matches || []).map(m => m.last_key))]
  p('Nur der Moc-Sport-Leisten', sportLeisten.length === 1 && sportLeisten[0] === 'moc_sport', sportLeisten.join(', '))

  // Und die Gegenprobe zum Driver: zwei Mokassins, zwei Leder, zwei Leisten.
  p('Kein Wildleder am Driver', !(lederAmModell || []).includes('unlined_suede'))
  p('Keine Driver-Leder am Sport-Mokassin',
    !ERWARTET.some(k => (sportLeder || []).includes(k)))
}

// ════════════════════════════════════════════════════════════════════════
abschnitt('8. Der Sport-Mokassin als Boot')

/*
 * Derselbe Leisten, höher geschnitten — und deshalb andere Teile: ein
 * Fersenriemen, ein Futter (der flache ist ungefüttert) und sechzehn
 * Nahtfarben statt acht. Dafür nichts auf dem Spann.
 *
 * Die heikle Stelle ist das Leder. Beim Hersteller heißt es „Lux Suede" —
 * so wie unser Dress-Velours, das aber die Farben der Dress-Linie trägt.
 * Hingen beide an derselben Zeile, bekäme der Oxford in Lux Suede plötzlich
 * Khaki und Grey dazu. Das prüft dieser Abschnitt in beide Richtungen.
 */
const boot = (schuhe || []).find(s => s.category === 'MOC_SPORT_BOOT')
p('Der Boot steht im Katalog', !!boot, boot ? `${boot.name} (${boot.price})` : 'keiner')

if (boot) {
  p('Er heißt „Moc Flex Sport Boot"', boot.name === 'Moc Flex Sport Boot', boot.name)
  p('Einstandspreis hinterlegt', Number(boot.cost_price) > 0, `${boot.cost_price} €`)

  const { daten: bootLeder } = await ruf(`/api/shoes/${boot.id}/materials`)
  p('Gefüttertes Wildleder', (bootLeder || []).join(',') === 'lined_suede', (bootLeder || []).join(', '))

  const bootFarben = farbenFuer(alleFarben || [], 'lined_suede')
  p('Dieselben neun Farben wie der flache', bootFarben.length === 9,
    `${bootFarben.length} — ${bootFarben.map(c => c.name).join(', ')}`)

  // Die Gegenprobe, und sie ist der Grund für die eigene Lederzeile: Das
  // Dress-Velours darf davon nichts abbekommen.
  const dressVelours = farbenFuer(alleFarben || [], 'lux_suede')
  p('Das Dress-Velours behält seine Palette', dressVelours.length >= 10,
    `${dressVelours.length} Farben`)
  p('Keine Mokassin-Farbe im Dress-Velours',
    !dressVelours.some(c => String(c.key).startsWith('moc_')),
    dressVelours.filter(c => String(c.key).startsWith('moc_')).map(c => c.name).join(', ') || 'keine')

  const { daten: bootGruppen } = await ruf(`/api/shoes/${boot.id}/options`)
  const bNach = Object.fromEntries((bootGruppen || []).map(g => [g.key, g]))
  for (const [key, anzahl, name] of [
    ['back_strap_color',  9,  'Fersenriemen'],
    ['stitching_color',   16, 'Naht'],
    ['inner_color',       10, 'Futter'],
    ['sole_bottom_color', 1,  'Laufsohle'],
  ]) {
    const g = bNach[key]
    p(`${name} mit ${anzahl} Werten`, !!g && g.values.length === anzahl, g ? `${g.values.length}` : 'Gruppe fehlt')
  }

  // Ein Boot trägt auf dem Spann nichts — kein Bügel, keine Quasten, kein
  // Metallton. Und keinen Rahmen.
  for (const nicht of ['loafer_decoration', 'buckle_color', 'welt', 'heel', 'toe', 'sole']) {
    p(`Kein Schritt „${nicht}"`, !bNach[nicht])
  }

  // Jeder Farbwert braucht seinen Ton, sonst stehen dort leere Kästchen.
  const ohneHex = ['back_strap_color', 'stitching_color']
    .flatMap(k => (bNach[k]?.values || []).filter(v => !v.color_hex).map(v => `${k}:${v.key}`))
  p('Alle Farbwerte haben einen Ton', ohneHex.length === 0, ohneHex.join(', ') || 'alle gesetzt')

  const ohneVorgabeBoot = (bootGruppen || []).filter(g => !g.values.some(v => v.is_default))
  p('Jeder Schritt hat eine Vorgabe', ohneVorgabeBoot.length === 0,
    ohneVorgabeBoot.map(g => g.key).join(', ') || 'alle belegt')

  // Derselbe Leisten wie der flache Bruder.
  const { daten: bootPass } = await ruf('/api/fit/match?category=MOC_SPORT_BOOT&length=265&girth=244')
  const bootLeisten = [...new Set((bootPass?.matches || []).map(m => m.last_key))]
  p('Auf dem Moc-Sport-Leisten', bootLeisten.length === 1 && bootLeisten[0] === 'moc_sport', bootLeisten.join(', '))

  // Und die neuen Nahtfarben dürfen nirgends sonst auftauchen: Der Driver
  // führt acht, nicht sechzehn.
  p('Der Driver behält seine acht Nahtfarben', nach.stitching_color?.values?.length === 8,
    `${nach.stitching_color?.values?.length}`)
}

// ════════════════════════════════════════════════════════════════════════
console.log(`\n── Ergebnis ${'─'.repeat(48)}\n`)
console.log(`  ${ok} bestanden, ${fehler.length} fehlgeschlagen`)
if (fehler.length) { console.log('\n  ' + fehler.join('\n  ')); process.exit(1) }
