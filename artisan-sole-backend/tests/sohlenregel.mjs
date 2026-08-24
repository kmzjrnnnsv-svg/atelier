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
  sichtbareGruppen, hatLederrand, expressFreigabe, hatMetall, festeWerte,
  OHNE_LEDERRAND, FARBGRUPPEN_SOHLE, AUFSATZ_MIT_METALL, FESTE_WERTE,
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
// Neun Gruppen kommen vom Server, acht werden angeboten: Der Rahmen (Welt)
// steht fest und ist deshalb kein Schritt mehr.
p('Maßschuh zeigt alles außer dem festgelegten Rahmen',
  schluessel(sichtbareGruppen(ALLE, { product: massschuh })).length === 8)
p('Der Rahmen ist kein Schritt',
  !schluessel(sichtbareGruppen(ALLE, { product: massschuh })).includes('welt'))
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
  p(`${sohle}: alles Übrige bleibt`, sicht.length === 6)
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
p('Ohne Angaben unverändert', sichtbareGruppen(ALLE).length === 8)

console.log('\n── 6a. Der Rahmen steht fest ─────────────────────────────────')

/*
 * „Country" und „Storm" standen im Konfigurator zur Wahl, ohne dass sie
 * gebaut werden. Der Schritt ist weg — der Wert nicht: Die Werkstatt braucht
 * die Angabe, und eine Bestellung ohne sie wäre unvollständig. Geprüft wird
 * beides, weil beides einzeln schiefgehen kann: ein Schritt, der wiederkommt,
 * und eine Angabe, die still verschwindet.
 */
const MIT_WERTEN = [
  { key: 'welt', label: 'Welt', values: [
    { id: 1, key: 'city', label: 'City' },
    { id: 2, key: 'country', label: 'Country' },
  ] },
  { key: 'sole', label: 'Sohlen-Art', values: [{ id: 3, key: 'leather', label: 'Leather' }] },
]
p('Welt steht in der Liste der festgelegten Gruppen', FESTE_WERTE.welt === 'city')
p('Die feste Angabe geht in die Bestellung',
  JSON.stringify(festeWerte(MIT_WERTEN)) === JSON.stringify([{ group: 'Welt', key: 'welt', value: 'City', price: 0 }]))
p('Sie kostet nichts', festeWerte(MIT_WERTEN)[0].price === 0)
p('Fehlt die Gruppe am Modell, wird nichts erfunden',
  festeWerte([{ key: 'sole', label: 'Sohlen-Art', values: [] }]).length === 0)
p('Fehlt der Wert in der Gruppe, wird nichts erfunden',
  festeWerte([{ key: 'welt', label: 'Welt', values: [{ id: 2, key: 'country', label: 'Country' }] }]).length === 0)
p('Ohne Liste bleibt es bei nichts', festeWerte(null).length === 0)

console.log('\n── 7. Metall nur, wo Metall sitzt ────────────────────────────')

/*
 * Am Sport-Mokassin und am Loafer sitzt auf dem Spann entweder ein
 * Metallbügel oder eben keiner. Ist keiner gewählt, gibt es auch keinen
 * Metallton — die Frage nach Gold oder Nickel ginge ins Leere, und in der
 * Bestellung stünde eine Angabe zu einem Teil, das der Schuh nicht hat.
 *
 * Am Double Monk ist es umgekehrt: Dort gibt es die Wahl der Ausführung gar
 * nicht, weil IMMER eine Schnalle sitzt. Die Frage bleibt also stehen. Der
 * Unterschied hängt daran, ob es die Gruppe `loafer_decoration` überhaupt
 * gibt — und genau das ist die Stelle, an der sich eine zu einfache Regel
 * vertut.
 */
const MIT_DEKO = [...ALLE, { key: 'loafer_decoration', label: 'Accessoires' }]
const keys = (l) => l.map(g => g.key)

p('Metallbügel: Metallton bleibt',
  keys(sichtbareGruppen(MIT_DEKO, { dekoKey: 'metal_bit' })).includes('buckle_color'))
p('Horsebit: Metallton bleibt',
  keys(sichtbareGruppen(MIT_DEKO, { dekoKey: 'horsebit' })).includes('buckle_color'))
p('Ohne Aufsatz: kein Metallton',
  !keys(sichtbareGruppen(MIT_DEKO, { dekoKey: 'bare' })).includes('buckle_color'))
p('Quasten: kein Metallton',
  !keys(sichtbareGruppen(MIT_DEKO, { dekoKey: 'tassels' })).includes('buckle_color'))
p('Maske: kein Metallton',
  !keys(sichtbareGruppen(MIT_DEKO, { dekoKey: 'albert_mask' })).includes('buckle_color'))
// Solange nichts gewählt ist, wird nichts weggenommen: Ein Schritt, der
// verschwindet und wiederkommt, sieht aus wie ein Fehler.
p('Noch nichts gewählt: Metallton steht da',
  keys(sichtbareGruppen(MIT_DEKO, {})).includes('buckle_color'))
// Der Double Monk: keine Ausführung zu wählen, also immer eine Schnalle.
p('Ohne Ausführungs-Gruppe bleibt der Metallton',
  keys(sichtbareGruppen(ALLE, { dekoKey: 'bare' })).includes('buckle_color'))

p('hatMetall: Bügel ja', hatMetall('metal_bit', true) === true)
p('hatMetall: Quasten nein', hatMetall('tassels', true) === false)
p('hatMetall: ohne Gruppe immer ja', hatMetall('tassels', false) === true)
p('Die Liste nennt beide Metallteile',
  AUFSATZ_MIT_METALL.includes('metal_bit') && AUFSATZ_MIT_METALL.includes('horsebit'))

console.log('\n── Ergebnis ──────────────────────────────────────────────────\n')
console.log(`  ${ok} bestanden, ${bad.length} fehlgeschlagen`)
if (bad.length) { console.log('  ' + bad.join('\n  ')); process.exit(1) }
