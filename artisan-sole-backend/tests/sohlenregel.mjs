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
  randfarbeFuer, abgeleiteteWerte, nurMitBild, hatBild,
  OHNE_LEDERRAND, FARBGRUPPEN_SOHLE, AUFSATZ_MIT_METALL, FESTE_WERTE, ABGELEITET,
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
// Neun Gruppen kommen vom Server, sieben werden angeboten: Der Rahmen (Welt)
// steht fest, der Sohlenrand folgt dem Oberleder — beides kein Schritt mehr.
p('Maßschuh zeigt alles außer Rahmen und Sohlenrand',
  schluessel(sichtbareGruppen(ALLE, { product: massschuh })).length === 7)
p('Der Sohlenrand ist kein Schritt',
  !schluessel(sichtbareGruppen(ALLE, { product: massschuh })).includes('sole_color'))
p('Der Rahmen ist kein Schritt',
  !schluessel(sichtbareGruppen(ALLE, { product: massschuh })).includes('welt'))
p('Express zeigt nur die Freigabe (ohne den abgeleiteten Rand)',
  schluessel(sichtbareGruppen(ALLE, { product: expressSchuh })).join(',')
  === 'sole,sole_bottom_color,buckle,buckle_color')

console.log('\n── 2. Ledersohle ─────────────────────────────────────────────')
for (const sohle of ['leather', 'leather_rubber', 'leather_mountain', 'dainite', 'beveled_waist']) {
  const sicht = schluessel(sichtbareGruppen(ALLE, { product: massschuh, soleKey: sohle }))
  p(`${sohle}: Lauffläche bleibt wählbar, Rand wird abgeleitet`,
    !sicht.includes('sole_color') && sicht.includes('sole_bottom_color'))
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
p('Ohne Angaben: alles außer Rahmen und Rand', sichtbareGruppen(ALLE).length === 7)

console.log('\n── 5a. Der Sohlenrand folgt dem Oberleder ───────────────────')

/*
 * Die Zuordnung, wie eine Werkstatt sie trifft. Die Farben sind die Felder
 * des Katalogs und die üblichen Verdächtigen dazu. Verschiebt jemand eine
 * Grenze in randfarbeFuer(), steht hier, welche Farbe dadurch den Rand
 * wechselt — und ob das gewollt ist.
 */
const ZUORDNUNG = [
  ['Schwarz', '#0a0a0a', 'black'], ['Box Calf schwarz', '#1c1c1e', 'black'],
  ['Dunkelbraun', '#3b2314', 'brown'], ['Lux Calf', '#3a2010', 'brown'],
  ['Painted Calf', '#5a2d16', 'brown'], ['Lux Suede', '#774027', 'brown'],
  ['Cognac', '#9a5a2a', 'brown'], ['Taupe', '#8b7d6b', 'brown'],
  ['Bordeaux', '#5a1a22', 'brick'], ['Oxblood', '#4a0e14', 'brick'],
  ['Marine', '#1f2a44', 'black'], ['Grau', '#888888', 'black'], ['Oliv', '#4b5320', 'black'],
  ['Sand', '#d8c4a4', 'natural'], ['Weiß', '#f2f2f2', 'natural'],
]
for (const [name, hex, soll] of ZUORDNUNG) {
  const ist = randfarbeFuer(hex)
  p(`${name} ${hex} → ${soll}`, ist === soll, ist === soll ? '' : `(ist ${ist})`)
}
p('Ohne Farbe keine Zuordnung', randfarbeFuer('') === null && randfarbeFuer(undefined) === null)
p('Unlesbare Farbe keine Zuordnung', randfarbeFuer('braun') === null)
p('Der Rand steht in der Liste der abgeleiteten Gruppen', ABGELEITET.includes('sole_color'))

const RAND = [{ key: 'sole_color', label: 'Sohlenrand', values: [
  { id: 36, key: 'black', label: 'Black' }, { id: 37, key: 'brown', label: 'Brown' },
  { id: 38, key: 'brick', label: 'Brick', price_extra: 25 }, { id: 39, key: 'natural', label: 'Natural' },
] }]
p('Braunes Leder: brauner Rand in der Bestellung',
  JSON.stringify(abgeleiteteWerte(RAND, { oberHex: '#5a2d16', soleKey: 'leather' }))
  === JSON.stringify([{ group: 'Sohlenrand', key: 'sole_color', value: 'Brown', price: 0 }]))
p('Ein abgeleiteter Rand kostet nichts, auch wenn das CMS einen Aufpreis trägt',
  abgeleiteteWerte(RAND, { oberHex: '#5a1a22', soleKey: 'leather' })[0]?.price === 0)
p('Gummisohle: kein Rand in der Bestellung',
  abgeleiteteWerte(RAND, { oberHex: '#5a2d16', soleKey: 'rubber' }).length === 0)
p('Unlesbare Farbe: Schwarz als Vorgabe der Werkstatt',
  abgeleiteteWerte(RAND, { oberHex: null, soleKey: 'leather' })[0]?.value === 'Black')
p('Modell ohne Randgruppe: keine erfundene Angabe',
  abgeleiteteWerte([], { oberHex: '#5a2d16', soleKey: 'leather' }).length === 0)

console.log('\n── 5b. Nur zur Wahl, was man sehen kann ─────────────────────')

/* Genau die Sohlen-Auswahl, wie sie im Konfigurator stand: sechs mit Foto,
   fünf mit drei Buchstaben als Platzhalter. */
const SOHLEN = { key: 'sole', label: 'Sohlen-Art', values: [
  { key: 'rubber', image: '/u/rubber.jpg' }, { key: 'leather', image: '/u/leather.jpg' },
  { key: 'leather_mountain', image: '/u/lm.jpg' }, { key: 'leather_buttons', image: '/u/lb.jpg' },
  { key: 'leather_rubber', image: '/u/lr.jpg' }, { key: 'commando', image: '/u/co.jpg' },
  { key: 'dainite' }, { key: 'dots' }, { key: 'beveled_waist' }, { key: 'art' }, { key: 'gummy_sole' },
] }
{
  const raus = nurMitBild(SOHLEN).values.map(v => v.key)
  p('Gemischte Gruppe: die sechs mit Foto bleiben', raus.length === 6)
  p('Gemischte Gruppe: kein Platzhalter mehr',
    !raus.some(k => ['dainite', 'dots', 'beveled_waist', 'art', 'gummy_sole'].includes(k)))
}
const ABSATZ = { key: 'heel', label: 'Absatz', values: [{ key: 'standard' }, { key: 'higher_heel' }] }
p('Reine Textgruppe bleibt ganz (Absatz)', nurMitBild(ABSATZ).values.length === 2)
const WELT = { key: 'welt', label: 'Welt', values: [{ key: 'city' }, { key: 'country', image: '/u/c.jpg' }] }
p('Festgelegte Gruppe bleibt ganz, auch gemischt (Rahmen)', nurMitBild(WELT).values.length === 2)
const RAND_G = { key: 'sole_color', values: [{ key: 'black', color_hex: '#000' }, { key: 'x' }] }
p('Abgeleitete Gruppe bleibt ganz (Sohlenrand)', nurMitBild(RAND_G).values.length === 2)
p('Farbfeld zählt als Bild', hatBild({ color_hex: '#5b3a1d' }) && !hatBild({ key: 'x' }))
const DEKO = { key: 'loafer_decoration', values: [{ key: 'tassel', image: '/u/t.jpg' }, { key: 'penny' }] }
p('Ein festgelegter Wert bleibt, auch ohne Bild',
  nurMitBild(DEKO, { behalten: 'penny' }).values.length === 2)
p('Ohne Festlegung fällt er heraus', nurMitBild(DEKO).values.length === 1)
p('Leere Gruppe bleibt leer', nurMitBild({ key: 'sole', values: [] }).values.length === 0)

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
