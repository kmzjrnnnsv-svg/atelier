/**
 * loeschung.js — Konten löschen: beantragen, bestätigen, Frist, endgültig.
 *
 * ── Warum drei Schritte statt eines Knopfes ───────────────────────────────
 *
 * Das Löschen eines Kontos ist der einzige Vorgang in dieser Anwendung, der
 * sich nicht zurücknehmen lässt. Mit dem Konto gehen Bestellungen, Passformen,
 * Nachrichten und die Zuordnung vermittelter Paare. Ein Klick daneben, und es
 * gibt nichts, was man noch tun könnte.
 *
 * Deshalb:
 *
 *   1. Beantragen.    Eine Verwaltungsperson stellt den Antrag, mit Grund.
 *                     Noch passiert nichts — das Konto arbeitet weiter.
 *   2. Bestätigen.    Eine ZWEITE Person bestätigt. Erst jetzt wird das Konto
 *                     gesperrt und die Frist beginnt.
 *   3. Endgültig.     Nach dreißig Tagen ist es weg. Bis dahin lässt es sich
 *                     mit einem Klick zurückholen.
 *
 * Das Vier-Augen-Prinzip schützt nicht vor Böswilligkeit — wer beide Zugänge
 * hat, hat beide. Es schützt vor dem Versehen: der falschen Zeile in der
 * Liste, dem Klick um 23 Uhr, der Verwechslung zweier Kunden mit ähnlichem
 * Namen. Genau die Fälle, die tatsächlich eintreten.
 *
 * ── Warum eine Frist und keine Sofortlöschung ─────────────────────────────
 *
 * Weil ein Irrtum Zeit braucht, um aufzufallen. Der Kunde meldet sich, wenn
 * er nicht mehr hineinkommt — nicht in der Sekunde, in der jemand klickt. Und
 * wer sein Konto selbst löschen ließ und es sich anders überlegt, bekommt es
 * zurück, statt neu anzufangen.
 *
 * Die DSGVO steht dem nicht entgegen: Sie verlangt Löschung „unverzüglich",
 * und eine kurze, dokumentierte Frist zur Absicherung gegen Fehllöschungen
 * ist damit vereinbar. Wer ausdrücklich sofort gelöscht werden will, bekommt
 * das — dafür gibt es die Sofortlöschung, ebenfalls im Vier-Augen-Prinzip.
 */

import crypto from 'crypto'

/** Tage zwischen Sperrung und endgültiger Löschung. */
export const FRIST_TAGE = 30

/**
 * Die Adresse des Platzhalterkontos.
 *
 * `.invalid` ist laut RFC 2606 dafür reserviert und wird nie aufgelöst — die
 * Adresse kann also niemandem gehören und niemanden erreichen.
 */
export const PLATZHALTER_MAIL = 'geloescht@artisansole.invalid'

/**
 * Das Konto, an dem Bestellungen gelöschter Kunden hängen.
 *
 * Wird beim ersten Bedarf angelegt. Es ist dauerhaft inaktiv und trägt einen
 * Kennwort-Hash, der zu keiner Eingabe passt: Anmelden lässt es sich nicht,
 * und ein Passkey ist ihm nie zugeordnet.
 */
function platzhalterKonto(db) {
  const da = db.prepare('SELECT id FROM users WHERE email = ?').get(PLATZHALTER_MAIL)
  if (da) return da.id
  const info = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, is_active)
    VALUES ('Gelöschtes Konto', ?, ?, 'user', 0)
  `).run(PLATZHALTER_MAIL, `geloescht:${crypto.randomUUID()}`)
  return info.lastInsertRowid
}

/**
 * Konten, deren Frist abgelaufen ist, endgültig entfernen.
 *
 * Läuft nicht über eine eigene Zeitsteuerung, sondern beim Start und immer
 * dann, wenn die Verwaltung die Liste öffnet — dasselbe Muster wie bei der
 * Reifung der Provisionen. Ein Dienst, der stündlich aufwacht, um alle paar
 * Monate eine Zeile zu löschen, wäre mehr Betriebsteil als Nutzen.
 *
 * Gibt zurück, wie viele Konten entfernt wurden.
 */
export function abgelaufeneEndgueltigLoeschen(db) {
  const faellig = db.prepare(`
    SELECT id FROM users
    WHERE deleted_at IS NOT NULL
      AND datetime(deleted_at, '+${FRIST_TAGE} days') <= datetime('now')
  `).all()
  if (!faellig.length) return 0

  const loeschen = db.transaction((ids) => {
    for (const { id } of ids) endgueltig(db, id)
  })
  loeschen(faellig)
  return faellig.length
}

/**
 * Ein Konto wirklich entfernen.
 *
 * Was an Fremdschlüsseln hängt, räumt SQLite selbst weg (ON DELETE CASCADE).
 * Zwei Dinge bleiben absichtlich stehen:
 *
 *   • Bestellungen sind Geschäftsunterlagen. Sie unterliegen der
 *     handelsrechtlichen Aufbewahrung und dürfen nicht mit dem Konto
 *     verschwinden — sie verlieren aber ihre Verbindung zur Person.
 *   • Provisionen eines Affiliates bleiben der Abrechnung wegen bestehen.
 *
 * Fußscans und Passformen gehen mit. Sie tragen keine Aufbewahrungspflicht,
 * und was zu Entwicklungszwecken gebraucht wird, liegt ohnehin anonymisiert
 * vor — ohne Bezug zu einer Person, und damit ohne Grund, es hier zu halten.
 */
function endgueltig(db, userId) {
  // Bestellungen entkoppeln statt löschen. Die Anschrift muss dabei weg: Sie
  // ist der eigentliche Personenbezug, den eine Bestellnummer allein nicht
  // herstellt.
  //
  // Sie hängen an einem Platzhalterkonto statt an NULL — orders.user_id ist
  // NOT NULL, und der Fremdschlüssel löscht mit CASCADE. Ohne dieses Konto
  // gingen die Bestellungen also mit, und die handelsrechtliche Aufbewahrung
  // liefe ins Leere. Der Platzhalter trägt eine Adresse unter .invalid: Diese
  // Endung ist dafür reserviert und kann nie jemandem gehören.
  db.prepare(`
    UPDATE orders
    SET user_id = ?,
        delivery_address = NULL,
        billing_address = NULL,
        foot_notes = NULL,
        foot_notes_en = NULL,
        fit_measurements = NULL
    WHERE user_id = ?
  `).run(platzhalterKonto(db), userId)

  // Affiliate-Datensatz: Die Person geht, die Abrechnung bleibt. Was an ihr
  // personenbezogen ist, wird geleert.
  db.prepare(`
    UPDATE affiliates
    SET user_id = NULL, status = 'ended',
        full_name = 'Gelöschtes Konto', email = '',
        phone = NULL, street = NULL, postal_code = NULL, city = NULL,
        birth_date = NULL, tax_number = NULL, vat_id = NULL,
        iban = NULL, account_holder = NULL, invite_token = NULL,
        updated_at = datetime('now')
    WHERE user_id = ?
  `).run(userId)

  db.prepare('DELETE FROM users WHERE id = ?').run(userId)
}

/** Sofort und ohne Frist — nur auf ausdrücklichen Wunsch. */
export function sofortLoeschen(db, userId) {
  db.transaction(() => endgueltig(db, userId))()
}

/**
 * Darf sich dieses Konto anmelden?
 *
 * Ein gesperrtes Konto sagt beim Anmelden nicht, dass es gelöscht wird — das
 * ginge einen Unbefugten nichts an. Die betroffene Person erfährt es über den
 * Weg, über den sie die Löschung beantragt hat.
 */
export const istGesperrt = (user) => !!user?.deleted_at
