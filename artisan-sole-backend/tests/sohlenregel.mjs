/**
 * sohlenregel.mjs — welche Auswahlgruppen ein Kunde tatsächlich angeboten
 * bekommt.
 *
 * Ohne Server und ohne Browser: Die Regel ist eine reine Funktion, und genau
 * deshalb steht sie in einer eigenen Datei. Sie über den Konfigurator zu
 * prüfen hieße, ein Dutzend Schritte durchzuklicken — Leder, Farbe, Sohle —,
 * und an jedem einzelnen könnte die Prüfung aus Gründen scheitern, die mit
 * der Regel nichts zu tun haben.
 *
 * Geprüft wird, was hier über Geld entscheidet: dass an einer Gummisohle
 * keine Randfarbe angeboten wird (es gibt keinen Rand), und dass die
 * Express-Linie nur zeigt, was die Werkstatt auch halten kann.
 *
 *     node tests/sohlenregel.mjs
 */
import {
  sichtbareGruppen, hatLederrand, expressFreigabe,
  OHNE_LEDERRAND, FARBGRUPPEN_SOHLE,
} from '../../artisan-sole-app/src/lib/sohlenRegel.js'

let ok = 0
const bad = []
const p = (was, bedingung, zusatz = '') => {
  if (bedingung) { ok++; console.log('  OK    ', was, zusatz) }
  else { bad.push(was); console.log('  FEHLER', was, zusatz) }
}

// So sehen die Gruppen aus, die vom Server kommen.
const ALLE = [
  { key: 'sole', label: 'Sohlen-Art' },
  { key: 'sole_color', label: 'Sohlenrand' },
  { key: 'sole_bottom_color', label: 'Laufsohle' },
  { key: 'welt', label: 'Welt' },
  { key: 'heel', label: 'Absatz' },
  { key: 'toe', label: 'Zehenkappe' },
  { key: 'inner_color', label: 'Innenfarbe' },
  { key: 'buckle', label: 'Buckle' },
  { key: 'buckle_color', label: 'Schnallen-Farbe' },
]
const schluessel = (l) => l.map(g => g.key)
const massschuh = { express: 0 }
const expressSchuh = {
  express: 1,
  express_groups: JSON.stringify(['sole', 'sole_color', 'sole_bottom_color', 'buckle', 'buckle_color']),
}

console.log('\n── 1. Ohne Sohle gewählt ─────────────────────────────────────')
p('Maßschuh zeigt alles', schluessel(sichtbareGruppen(ALLE, { product: massschuh })).length === 9)
p('Express zeigt nur die Freigabe',
  schluessel(sichtbareGruppen(ALLE, { product: expressSchuh })).join(',')
  === 'sole,sole_color,sole_bottom_color,buckle,buckle_color')

console.log('\n── 2. Ledersohle ─────────────────────────────────────────────')
for (const sohle of ['leather', 'leather_rubber', 'leather_mountain', 'dainite', 'beveled_waist']) {
  const sicht = schluessel(sichtbareGruppen(ALLE, { product: massschuh, soleKey: sohle }))
  p(`${sohle}: Rand und Lauffläche bleiben`,
    sicht.includes('sole_color') && sicht.includes('sole_bottom_color'))
}

console.log('\n── 3. Gummisohle ─────────────────────────────────────────────')
for (const sohle of OHNE_LEDERRAND) {
  const sicht = schluessel(sichtbareGruppen(ALLE, { product: massschuh, soleKey: sohle }))
  p(`${sohle}: keine Farbwahl an der Sohle`,
    !sicht.includes('sole_color') && !sicht.includes('sole_bottom_color'))
  p(`${sohle}: alles Übrige bleibt`, sicht.length === 7)
}
p('Die Regel gilt auch im Express',
  !schluessel(sichtbareGruppen(ALLE, { product: expressSchuh, soleKey: 'rubber' }))
    .some(k => FARBGRUPPEN_SOHLE.includes(k)))

console.log('\n── 4. Lederrand erkennen ─────────────────────────────────────')
p('Ohne Wahl gilt: Rand vorhanden', hatLederrand(null) && hatLederrand(undefined))
p('Leder hat einen Rand', hatLederrand('leather'))
p('Leder mit Gummi behält ihn', hatLederrand('leather_rubber'))
p('Dainite behält ihn', hatLederrand('dainite'))
p('Gummi hat keinen', !hatLederrand('rubber'))

console.log('\n── 5. Freigabe lesen ─────────────────────────────────────────')
p('Maßschuh: keine Einschränkung', expressFreigabe(massschuh) === null)
p('Express ohne Liste: nichts wählbar', expressFreigabe({ express: 1 }).size === 0)
p('Express mit Liste', expressFreigabe(expressSchuh).has('sole'))
p('Unlesbarer Wert schränkt auf nichts ein',
  expressFreigabe({ express: 1, express_groups: '{kaputt' }).size === 0)
p('Fremde Einträge fliegen raus',
  expressFreigabe({ express: 1, express_groups: '["sole", 42, null]' }).size === 1)
{
  const sicht = sichtbareGruppen(ALLE, { product: { express: 1, express_groups: '{kaputt' } })
  p('Kaputte Angabe zeigt nichts statt alles', sicht.length === 0)
}

console.log('\n── 6. Kein Eingriff bei fehlenden Daten ──────────────────────')
p('Leere Liste bleibt leer', sichtbareGruppen([], { product: massschuh }).length === 0)
p('Kein Array bleibt leer', sichtbareGruppen(null, { product: massschuh }).length === 0)
p('Ohne Angaben unverändert', sichtbareGruppen(ALLE).length === 9)

console.log('\n── Ergebnis ──────────────────────────────────────────────────\n')
console.log(`  ${ok} bestanden, ${bad.length} fehlgeschlagen`)
if (bad.length) { console.log('  ' + bad.join('\n  ')); process.exit(1) }
