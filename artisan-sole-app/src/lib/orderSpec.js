/**
 * Fertigungsspezifikation einer Bestellung.
 *
 * Gibt zurück, was der Kunde gewählt hat — als Liste aus [Bezeichnung, Wert],
 * damit CMS und Telefon-Verwaltung dasselbe zeigen und nicht auseinanderlaufen.
 *
 * Anlass: In der Bestellansicht standen nur Modell, Leder und Farbe. Sohle und
 * Zusatzoptionen waren im Warenkorb geführt, gingen beim Bestellen aber
 * verloren; Leisten, Weite und die zugrunde gelegten Maße wurden zwar
 * gespeichert, aber nirgends angezeigt. Für eine Manufaktur ist das zu wenig,
 * um den Schuh zu bauen.
 */

const SIZE_TYPE = {
  fit:      'Leisten-Empfehlung',
  standard: 'Standardgröße',
  custom:   'Sonderanfertigung',
}

const parse = (v) => {
  if (!v) return null
  if (typeof v === 'object') return v
  try { return JSON.parse(v) } catch { return null }
}

export function orderSpec(order) {
  if (!order) return []
  const rows = []
  const add = (label, value) => { if (value !== null && value !== undefined && value !== '') rows.push([label, value]) }

  add('Modell', order.shoe_name)
  add('Leder', order.material)
  add('Farbe', order.color)
  add('Sohle', order.sole)

  // Zusatzoptionen einzeln, mit ihrer Gruppe als Bezeichnung: „Kappe: Cap-Toe"
  // sagt der Fertigung mehr als eine Aufzählung ohne Zuordnung.
  const extras = parse(order.extras)
  if (Array.isArray(extras)) {
    for (const e of extras) {
      if (e?.value) add(e.group || e.key || 'Option', e.value)
    }
  }

  const sizeLine = [
    order.eu_size ? `EU ${order.eu_size}` : null,
    SIZE_TYPE[order.size_type] || null,
  ].filter(Boolean).join(' · ')
  add('Größe', sizeLine)

  add('Leisten', order.last_label || order.last_key)
  add('Weite', order.last_width)

  // Die Maße, auf denen die Größe beruht. Weicht der fertige Schuh ab, ist das
  // die Zeile, an der sich klären lässt, woran es lag.
  const m = parse(order.fit_measurements)
  if (m?.foot_length_mm) {
    const parts = [`Länge ${m.foot_length_mm} mm`]
    if (m.ball_girth_mm) parts.push(`Ballenumfang ${m.ball_girth_mm} mm`)
    add('Maße', parts.join(' · '))
  }

  add('Fußscan', order.scan_id ? `#${order.scan_id}` : null)
  return rows
}
