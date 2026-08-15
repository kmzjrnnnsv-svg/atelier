/**
 * auftragslauf.js — der Weg einer Bestellung, an einer Stelle.
 *
 * ── Warum das eine eigene Datei ist ───────────────────────────────────────
 *
 * Drei Dinge hingen bisher am selben Feld — `orders.status` — und wurden an
 * drei verschiedenen Stellen ausgelegt: Was der Kunde als Fortschritt sieht,
 * was die Verwaltung als nächsten Schritt tun kann, und was eine Stornierung
 * in diesem Moment kostet. Die dritte Auslegung stand bis heute nur in den
 * AGB und nirgends im Programm; gerechnet hat sie ein Mensch.
 *
 * Das ist die Stelle, an der man sich verrechnet. Die Staffel aus Ziffer 7.2
 * steht deshalb hier als Tabelle, einmal, und alles andere fragt sie ab.
 *
 * ── Zur Staffel selbst ────────────────────────────────────────────────────
 *
 * Der Prozentsatz ist, was wir EINBEHALTEN dürfen — die Obergrenze nach
 * Ziffer 7.2 Abs. 5, nicht ein Betrag, der in jedem Fall fällig wird. Die
 * Verwaltung kann jederzeit weniger einbehalten; das Feld dafür ist in der
 * Stornomaske vorbelegt und überschreibbar. Mehr als die Obergrenze geht
 * nicht, und zwar im Programm und nicht nur auf dem Papier.
 */
import { betragAusText } from './zahlung.js'

/**
 * Die Stufen in der Reihenfolge, in der sie durchlaufen werden.
 *
 * `kunde` ist der Text, den der Besteller sieht — kein Statusname, sondern
 * eine Aussage darüber, was gerade passiert. `naechstes` sagt, was als
 * Nächstes kommt; das war die häufigste Rückfrage und stand nirgends.
 */
export const STUFEN = [
  {
    key: 'pending_payment',
    label: 'Auf Zahlung wartend',
    kunde: 'Wir haben Ihre Bestellung. Sobald Ihre Überweisung eingeht, geht sie in die Werkstatt.',
    naechstes: 'Zahlungseingang',
  },
  {
    key: 'pending',
    label: 'Zahlung eingegangen',
    kunde: 'Ihre Zahlung ist verbucht. Ihr Auftrag steht zur Freigabe an die Werkstatt an.',
    naechstes: 'Freigabe an die Werkstatt',
  },
  {
    key: 'processing',
    label: 'In Fertigung',
    kunde: 'Ihr Paar wird gebaut. Leisten sind belegt, das Leder ist zugeschnitten.',
    naechstes: 'Endkontrolle',
  },
  {
    key: 'quality_check',
    label: 'Endkontrolle',
    kunde: 'Ihr Paar ist fertig und wird geprüft, bevor es das Haus verlässt.',
    naechstes: 'Versand',
  },
  {
    key: 'shipped',
    label: 'Versandt',
    kunde: 'Ihr Paar ist unterwegs.',
    naechstes: 'Zustellung',
  },
  {
    key: 'delivered',
    label: 'Zugestellt',
    kunde: 'Zugestellt. Wenn etwas nicht passt, melden Sie sich innerhalb von 14 Tagen.',
    naechstes: null,
  },
]

export const STORNIERT = {
  key: 'cancelled',
  label: 'Storniert',
  kunde: 'Dieser Auftrag wurde storniert.',
  naechstes: null,
}

const NACH_KEY = new Map([...STUFEN, STORNIERT].map(s => [s.key, s]))

export const stufeInfo = (status) => NACH_KEY.get(status) || STORNIERT
export const stufenIndex = (status) => STUFEN.findIndex(s => s.key === status)

/**
 * Die Staffel aus AGB Ziffer 7.2.
 *
 * `pct` ist der Höchstsatz, den wir einbehalten. `null` heißt: In diesem
 * Zustand ist eine Stornierung nicht mehr vorgesehen — was danach kommt, ist
 * die Kulanz nach Ziffer 7.3 und keine Rechenaufgabe.
 */
export const STAFFEL = {
  // Nichts gezahlt, nichts zu erstatten. Der Auftrag verfällt einfach.
  pending_payment: { pct: 0, moeglich: true,  hinweis: 'Es ist noch nichts gezahlt, der Auftrag verfällt ohne Kosten.' },
  // Der Wendepunkt: bis zur Freigabe kostenfrei.
  pending:         { pct: 0, moeglich: true,  hinweis: 'Die Freigabe an die Werkstatt ist noch nicht erteilt. Die Stornierung ist kostenfrei.' },
  processing:      { pct: 50, moeglich: true, hinweis: 'Ihr Paar ist in Fertigung. Nach Ziffer 7.2 behalten wir bis zu 50 % ein.' },
  quality_check:   { pct: 75, moeglich: true, hinweis: 'Ihr Paar ist fertiggestellt. Nach Ziffer 7.2 behalten wir bis zu 75 % ein.' },
  shipped:         { pct: null, moeglich: false, hinweis: 'Ihr Paar ist bereits unterwegs. Eine Stornierung ist nicht mehr möglich, es bleibt die Kulanz nach Ziffer 7.3.' },
  delivered:       { pct: null, moeglich: false, hinweis: 'Ihr Paar ist zugestellt. Melden Sie sich innerhalb von 14 Tagen nach Erhalt, wenn etwas nicht passt (Ziffer 7.3).' },
  cancelled:       { pct: null, moeglich: false, hinweis: 'Dieser Auftrag ist bereits storniert.' },
}

const runden = (n) => Math.round((Number(n) || 0) * 100) / 100

/**
 * Was eine Stornierung dieser Bestellung jetzt kostet.
 *
 * Bemessungsgrundlage ist der gezahlte Preis der Bestellung. Versandkosten
 * bleiben außen vor: Was nicht versandt wurde, hat auch nichts gekostet.
 */
export function stornoVorschau(order, { pctUeberschreiben = null } = {}) {
  const regel  = STAFFEL[order?.status] || STAFFEL.cancelled
  const betrag = runden(betragAusText(order?.price))

  if (!regel.moeglich) {
    return { moeglich: false, bezahlt: order?.status !== 'pending_payment',
             betrag, pct: null, gebuehr: 0, erstattung: 0, hinweis: regel.hinweis }
  }

  // Nicht bezahlt heißt: Es gibt nichts zu erstatten und nichts einzubehalten.
  const bezahlt = order?.status !== 'pending_payment'
  const hoechst = regel.pct
  const pct = pctUeberschreiben === null || pctUeberschreiben === undefined
    ? hoechst
    : Math.min(Math.max(Number(pctUeberschreiben) || 0, 0), hoechst)

  const gebuehr    = bezahlt ? runden(betrag * pct / 100) : 0
  const erstattung = bezahlt ? runden(betrag - gebuehr)   : 0

  // `bezahlt` geht ausdrücklich mit hinaus. Ohne die Angabe rechnete die
  // Stornomaske der Verwaltung den Erstattungsbetrag selbst aus dem
  // Auftragswert — und bot bei einer unbezahlten Bestellung an, den vollen
  // Preis zurückzuüberweisen. Geld, das nie eingegangen ist.
  return { moeglich: true, bezahlt, betrag, pct, hoechstsatz: hoechst, gebuehr, erstattung, hinweis: regel.hinweis }
}

/**
 * Einen Übergang festhalten.
 *
 * Doppelte Einträge werden übersprungen: Ein Statuswechsel auf denselben
 * Wert ist kein Ereignis, und die Verwaltung klickt so etwas versehentlich.
 */
export function merkeEreignis(db, orderId, status, { note = null, actor = 'system', actorId = null } = {}) {
  try {
    const letzter = db.prepare(
      'SELECT status FROM order_events WHERE order_id = ? ORDER BY id DESC LIMIT 1'
    ).get(orderId)
    if (letzter?.status === status && !note) return
    db.prepare(`
      INSERT INTO order_events (order_id, status, note, actor, actor_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(orderId, status, note, actor, actorId)
  } catch (e) {
    // Der Verlauf ist ein Nachweis, kein Betriebsmittel. Wenn er scheitert,
    // darf er die Bestellung nicht mitreißen.
    console.error('[order_events]', e.message)
  }
}

/**
 * Der Verlauf einer Bestellung, aufbereitet für die Anzeige.
 *
 * Für Bestellungen, die es schon vor der Einführung des Verlaufs gab, ist die
 * Liste leer. Statt einer leeren Anzeige wird dann das Anlegedatum als erster
 * Punkt gesetzt — mehr weiß niemand, und das ist ehrlicher als nichts.
 */
export function verlauf(db, order) {
  let rows = []
  try {
    rows = db.prepare(
      'SELECT status, note, actor, created_at FROM order_events WHERE order_id = ? ORDER BY id'
    ).all(order.id)
  } catch { rows = [] }

  if (!rows.length) {
    rows = [{ status: 'pending_payment', note: null, actor: 'system', created_at: order.created_at }]
    if (order.status !== 'pending_payment') {
      rows.push({ status: order.status, note: null, actor: 'system', created_at: order.updated_at })
    }
  }

  return rows.map(r => ({
    ...r,
    label: stufeInfo(r.status).label,
    text:  stufeInfo(r.status).kunde,
  }))
}

/**
 * Die Verfolgungsadresse beim Zusteller.
 *
 * Ohne Dienstleister gibt es keinen Link — eine Nummer allein ist eine Zahl,
 * die niemand nachschlagen kann. Dann wird nur die Nummer angezeigt.
 */
export const ZUSTELLER = {
  dhl:      { name: 'DHL',      url: (n) => `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${encodeURIComponent(n)}` },
  dpd:      { name: 'DPD',      url: (n) => `https://tracking.dpd.de/status/de_DE/parcel/${encodeURIComponent(n)}` },
  ups:      { name: 'UPS',      url: (n) => `https://www.ups.com/track?loc=de_DE&tracknum=${encodeURIComponent(n)}` },
  gls:      { name: 'GLS',      url: (n) => `https://gls-group.com/DE/de/paketverfolgung?match=${encodeURIComponent(n)}` },
  fedex:    { name: 'FedEx',    url: (n) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}` },
  hermes:   { name: 'Hermes',   url: (n) => `https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/#${encodeURIComponent(n)}` },
  sonstige: { name: 'Sonstiger Zusteller', url: () => null },
}

export function sendungsLink(order) {
  const code = String(order?.tracking_code || '').trim()
  if (!code) return null
  const dienst = ZUSTELLER[String(order?.carrier || '').toLowerCase()] || ZUSTELLER.sonstige
  return { code, dienst: dienst.name, url: dienst.url(code) }
}

/**
 * Eine Zeile ins Änderungsprotokoll.
 *
 * Bewusst mit Klartext statt einem JSON-Abbild: Wer das Protokoll liest, will
 * eine Antwort und keine Datenstruktur. Und wie bei den Ereignissen gilt: Ein
 * Fehler hier darf den Vorgang nicht anhalten.
 */
export function protokoll(db, { entity, entityId = null, action, detail = null, user = null }) {
  try {
    db.prepare(`
      INSERT INTO audit_log (entity, entity_id, action, detail, user_id, user_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      String(entity), entityId === null ? null : String(entityId),
      String(action), detail === null ? null : String(detail).slice(0, 500),
      user?.id ?? null, user?.name || user?.email || null,
    )
  } catch (e) {
    console.error('[audit_log]', e.message)
  }
}
