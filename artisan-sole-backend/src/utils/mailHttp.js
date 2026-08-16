/**
 * mailHttp.js — Mail verschicken, ohne einen Mail-Port zu brauchen.
 *
 * ── Warum es das gibt ─────────────────────────────────────────────────────
 *
 * Der Versand über SMTP scheitert auf diesem Server nicht an den Zugangsdaten,
 * sondern am Netz: Hetzner sperrt bei neuen Servern die ausgehenden Mail-Ports
 * 25, 465 und 587. Die Verbindung kommt gar nicht erst zustande, deshalb die
 * nackte Meldung „Connection timeout" bei völlig richtiger Einstellung. Die
 * Sperre lässt sich per Support-Anfrage aufheben — das dauert, und solange
 * geht keine einzige Mail hinaus.
 *
 * Port 443 ist offen. Er muss es sein, sonst wäre die Website nicht erreichbar.
 * Und jeder ernstzunehmende Maildienst nimmt Nachrichten auch über genau
 * diesen Weg an: eine gewöhnliche HTTPS-Anfrage statt einer SMTP-Sitzung.
 *
 * Damit ist der Versand von der Portfreigabe unabhängig. Kein Support-Ticket,
 * keine Wartezeit, keine zweite Infrastruktur — dieselben Vorlagen, dieselben
 * Aufrufe, nur ein anderer Weg hinaus.
 *
 * ── Was hier absichtlich nicht steht ──────────────────────────────────────
 *
 * Kein Abhängigkeitspaket. Alle vier Dienste sprechen JSON oder Formularfelder
 * über HTTPS; das kann `fetch` seit Node 18 von sich aus. Ein SDK je Anbieter
 * wären vier Pakete für insgesamt vierzig Zeilen.
 *
 * Und keine Warteschlange. Wenn ein Versand scheitert, scheitert er sichtbar —
 * dasselbe Verhalten wie bei SMTP. Eine stille Wiedervorlage hätte genau das
 * Problem verdeckt, das uns hierher gebracht hat.
 */

/** Wie lange auf den Dienst gewartet wird, bevor abgebrochen wird. */
const ZEITGRENZE_MS = 15000

/**
 * Die vier Wege hinaus.
 *
 * Jeder Eintrag baut die Anfrage und deutet die Antwort. Mehr ist es nicht —
 * der Unterschied zwischen den Anbietern liegt allein in den Feldnamen.
 *
 * Ausgewählt nach dem, was ein deutscher Betrieb braucht: Brevo und Mailgun
 * betreiben Rechenzentren in der EU (bei Mailgun ist die Region zu wählen),
 * Postmark und Resend sind schneller eingerichtet. Alle vier haben ein
 * kostenloses Kontingent, das für ein Atelier reicht.
 */
export const ANBIETER = {
  brevo: {
    name: 'Brevo',
    hinweis: 'Rechenzentren in der EU, 300 Mails am Tag kostenlos.',
    schluesselFeld: 'API-Schlüssel (beginnt mit xkeysib-)',
    brauchtDomain: false,
    einrichtung: [
      'Konto anlegen auf brevo.com. Kostenlos, 300 Nachrichten am Tag, keine Karte nötig.',
      'Domain bestätigen: „Senders, Domains & Dedicated IPs" › Domains › Add Domain › artisansole.com. '
        + 'Brevo zeigt daraufhin die einzutragenden Werte an (Brevo-Code, DKIM, SPF), die kommen bei Ihrem '
        + 'DNS-Anbieter in die Zone der Domain, danach dort auf „Verify". Meist in Minuten bestätigt, '
        + 'in Ausnahmen dauert die Verteilung im DNS bis zu 48 Stunden.',
      'Schlüssel erzeugen: Settings › SMTP & API › Reiter „API keys" › Generate a new API key. '
        + 'Er wird genau einmal angezeigt, am besten gleich hier einfügen. '
        + 'Nicht zu verwechseln mit dem SMTP-Passwort im Reiter daneben: Die beiden sind verschieden '
        + 'und lassen sich nicht gegeneinander tauschen.',
      'Schlüssel und Absenderadresse hier eintragen, speichern, Testnachricht schicken.',
    ],
    senden: (cfg, m) => ({
      url: 'https://api.brevo.com/v3/smtp/email',
      init: {
        method: 'POST',
        headers: { 'api-key': cfg.apiKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: cfg.from, name: cfg.fromName },
          to: [{ email: m.to }],
          subject: m.subject,
          htmlContent: m.html,
          ...(m.text ? { textContent: m.text } : {}),
        }),
      },
    }),
    pruefen: (cfg) => ({
      url: 'https://api.brevo.com/v3/account',
      init: { headers: { 'api-key': cfg.apiKey, accept: 'application/json' } },
    }),
  },

  resend: {
    name: 'Resend',
    hinweis: 'In Minuten eingerichtet, 3.000 Mails im Monat kostenlos.',
    schluesselFeld: 'API-Schlüssel (beginnt mit re_)',
    brauchtDomain: false,
    einrichtung: [
      'Konto anlegen auf resend.com. Kostenlos, 3.000 Nachrichten im Monat.',
      'Domain bestätigen: Domains › Add Domain › artisansole.com. Resend zeigt die einzutragenden '
        + 'Werte an (MX, SPF als TXT, DKIM), die kommen bei Ihrem DNS-Anbieter in die Zone der Domain, '
        + 'danach dort auf „Verify". In der Regel innerhalb einer Viertelstunde bestätigt.',
      'Schlüssel erzeugen: API Keys › Create API Key. „Sending access" genügt, mehr Rechte braucht '
        + 'diese Anwendung nicht.',
      'Schlüssel und Absenderadresse hier eintragen, speichern, Testnachricht schicken.',
    ],
    senden: (cfg, m) => ({
      url: 'https://api.resend.com/emails',
      init: {
        method: 'POST',
        headers: { authorization: `Bearer ${cfg.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: `${cfg.fromName} <${cfg.from}>`,
          to: [m.to],
          subject: m.subject,
          html: m.html,
          ...(m.text ? { text: m.text } : {}),
        }),
      },
    }),
    pruefen: (cfg) => ({
      url: 'https://api.resend.com/domains',
      init: { headers: { authorization: `Bearer ${cfg.apiKey}` } },
    }),
  },

  postmark: {
    name: 'Postmark',
    hinweis: 'Sehr zuverlässige Zustellung, 100 Mails im Monat kostenlos.',
    schluesselFeld: 'Server-Token',
    brauchtDomain: false,
    einrichtung: [
      'Konto anlegen auf postmarkapp.com. 100 Nachrichten im Monat kostenlos.',
      'Absender bestätigen: unter „Sender Signatures" entweder die einzelne Adresse '
        + '(Postmark schickt eine Bestätigungsmail an sie) oder gleich die ganze Domain über die dort '
        + 'angezeigten DNS-Einträge. Die einzelne Adresse geht schneller, die Domain ist die bessere Wahl, '
        + 'wenn später weitere Absender dazukommen.',
      'Schlüssel holen: beim Server unter „API Tokens" den Server-Token kopieren. '
        + 'Nicht den Account-Token, der ist für die Kontoverwaltung und wird hier abgewiesen.',
      'Token und Absenderadresse hier eintragen, speichern, Testnachricht schicken.',
    ],
    senden: (cfg, m) => ({
      url: 'https://api.postmarkapp.com/email',
      init: {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': cfg.apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          From: `${cfg.fromName} <${cfg.from}>`,
          To: m.to,
          Subject: m.subject,
          HtmlBody: m.html,
          ...(m.text ? { TextBody: m.text } : {}),
          MessageStream: 'outbound',
        }),
      },
    }),
    pruefen: (cfg) => ({
      url: 'https://api.postmarkapp.com/server',
      init: { headers: { 'X-Postmark-Server-Token': cfg.apiKey, accept: 'application/json' } },
    }),
  },

  mailgun: {
    name: 'Mailgun',
    hinweis: 'Region EU wählbar. Braucht zusätzlich die dort eingerichtete Domain.',
    schluesselFeld: 'Private API-Schlüssel',
    brauchtDomain: true,
    einrichtung: [
      'Konto anlegen auf mailgun.com, bei der Registrierung die Region EU wählen. '
        + 'Sie lässt sich später nicht umstellen, und ein EU-Konto ist über den US-Endpunkt nicht erreichbar.',
      'Domain einrichten: Sending › Domains › Add New Domain. Üblich ist eine eigene Unterdomain '
        + 'wie mg.artisansole.com, damit die Zustellung nicht an der Hauptdomain hängt. Die dort '
        + 'angezeigten TXT-, MX- und CNAME-Einträge beim DNS-Anbieter eintragen und verifizieren lassen.',
      'Schlüssel holen: unter API Security den privaten API-Schlüssel kopieren.',
      'Schlüssel, Absenderadresse, Domain und Region hier eintragen, speichern, Testnachricht schicken.',
    ],
    senden: (cfg, m) => {
      // Mailgun nimmt Formularfelder, kein JSON — als einziger der vier.
      const felder = new URLSearchParams({
        from: `${cfg.fromName} <${cfg.from}>`,
        to: m.to,
        subject: m.subject,
        html: m.html,
      })
      if (m.text) felder.set('text', m.text)
      return {
        url: `${mailgunBasis(cfg)}/v3/${encodeURIComponent(cfg.domain)}/messages`,
        init: {
          method: 'POST',
          headers: {
            authorization: 'Basic ' + Buffer.from(`api:${cfg.apiKey}`).toString('base64'),
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: felder.toString(),
        },
      }
    },
    pruefen: (cfg) => ({
      url: `${mailgunBasis(cfg)}/v3/domains/${encodeURIComponent(cfg.domain)}`,
      init: { headers: { authorization: 'Basic ' + Buffer.from(`api:${cfg.apiKey}`).toString('base64') } },
    }),
  },
}

const mailgunBasis = (cfg) => (cfg.region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net')

/** Die Namen der Anbieter für die Verwaltung — ohne die Funktionen. */
export const anbieterListe = () =>
  Object.entries(ANBIETER).map(([schluessel, a]) => ({
    schluessel, name: a.name, hinweis: a.hinweis,
    schluesselFeld: a.schluesselFeld, brauchtDomain: a.brauchtDomain,
    einrichtung: a.einrichtung || [],
  }))

/**
 * Was eine Fehlerantwort bedeutet.
 *
 * Dieselbe Überlegung wie bei den SMTP-Meldungen: Ein nackter Statuscode
 * schickt jeden zuerst zum Schlüssel, und in der Hälfte der Fälle ist der
 * Schlüssel in Ordnung und nur die Absenderadresse nicht bestätigt.
 */
function deutung(status, koerper, cfg, a) {
  const text = String(koerper || '').slice(0, 400)

  // Die Reihenfolge ist nicht beliebig: Ein 403 heißt bei Postmark und Resend
  // meist „Absender nicht bestätigt", bei Brevo dagegen „Schlüssel ungültig".
  // Deshalb entscheidet zuerst der Antworttext, und erst wenn der nichts
  // hergibt, der Statuscode allein.
  if (/not verified|unverified|sender|signature|from address|domain is not/i.test(text)) {
    return `${a.name} nimmt die Absenderadresse „${cfg.from}" nicht an (HTTP ${status}). `
      + 'Sie muss beim Dienst einmal bestätigt werden, entweder die Adresse selbst '
      + `oder die ganze Domain über die dort genannten DNS-Einträge. Antwort: ${text}`
  }
  if (status === 404 && a.brauchtDomain) {
    return `${a.name} kennt die Domain „${cfg.domain}" nicht (HTTP 404). `
      + 'Bitte prüfen, ob die Schreibweise stimmt und ob die Region richtig gewählt ist, '
      + 'ein EU-Konto ist über den US-Endpunkt nicht erreichbar und umgekehrt.'
  }
  if (status === 401 || status === 403) {
    return `${a.name} weist den Schlüssel zurück (HTTP ${status}). `
      + 'Am Absender oder am Empfänger liegt es nicht, so weit kommt es gar nicht. '
      + `Bitte den ${a.schluesselFeld} neu erzeugen und hier eintragen.`
  }
  if (status === 422) {
    return `${a.name} hat die Nachricht nicht angenommen (HTTP 422), meist ist die `
      + `Absenderadresse „${cfg.from}" dort noch nicht bestätigt. Antwort: ${text}`
  }
  if (status === 429) {
    return `${a.name} bremst uns aus (HTTP 429), das Kontingent für heute ist erschöpft. `
      + 'Später erneut versuchen oder das Kontingent erhöhen.'
  }
  if (status >= 500) {
    return `${a.name} hat ein Problem auf der eigenen Seite (HTTP ${status}). `
      + `An unserer Einstellung liegt es nicht. Antwort: ${text}`
  }
  return `${a.name} hat die Nachricht abgelehnt (HTTP ${status}). Antwort: ${text}`
}

/**
 * Eine HTTPS-Anfrage mit Zeitgrenze.
 *
 * Ohne sie hinge ein Versand an einem nicht antwortenden Dienst, bis Node von
 * sich aus aufgibt — dasselbe Bild, das uns bei SMTP so viel Zeit gekostet hat.
 */
async function ruf(url, init) {
  const abbruch = new AbortController()
  const uhr = setTimeout(() => abbruch.abort(), ZEITGRENZE_MS)
  try {
    const r = await fetch(url, { ...init, signal: abbruch.signal })
    const koerper = await r.text().catch(() => '')
    return { status: r.status, ok: r.ok, koerper }
  } catch (e) {
    if (e?.name === 'AbortError') {
      const fehler = new Error(`Der Dienst hat innerhalb von ${ZEITGRENZE_MS / 1000} Sekunden nicht geantwortet.`)
      fehler.code = 'ZEITGRENZE'
      throw fehler
    }
    const fehler = new Error(`Der Dienst ist nicht erreichbar: ${e?.message || e}`)
    fehler.code = 'NETZ'
    throw fehler
  } finally {
    clearTimeout(uhr)
  }
}

/** Fehlt etwas, das der gewählte Weg zwingend braucht? */
export function fehlendeAngaben(cfg) {
  const a = ANBIETER[cfg.provider]
  if (!a) return [`Unbekannter Anbieter „${cfg.provider}"`]
  const fehlt = []
  if (!cfg.apiKey) fehlt.push(a.schluesselFeld)
  if (!cfg.from) fehlt.push('Absenderadresse')
  if (a.brauchtDomain && !cfg.domain) fehlt.push('Domain')
  return fehlt
}

/** Eine Nachricht über HTTPS hinausgeben. */
export async function versendeUeberHttp(cfg, nachricht) {
  const a = ANBIETER[cfg.provider]
  if (!a) throw new Error(`Unbekannter Anbieter „${cfg.provider}"`)

  const fehlt = fehlendeAngaben(cfg)
  if (fehlt.length) throw new Error(`Es fehlt noch: ${fehlt.join(', ')}.`)

  const { url, init } = a.senden(cfg, nachricht)
  const r = await ruf(url, init)
  if (!r.ok) {
    const fehler = new Error(deutung(r.status, r.koerper, cfg, a))
    fehler.status = r.status
    throw fehler
  }
  return { ok: true, anbieter: a.name }
}

/**
 * Den Weg prüfen, ohne etwas zu verschicken.
 *
 * Das Gegenstück zu `transporter.verify()` bei SMTP: Es fragt den Dienst nach
 * dem eigenen Konto. Antwortet er, stimmen Schlüssel und Erreichbarkeit. Ob
 * die Absenderadresse bestätigt ist, sagt das noch nicht — dafür braucht es
 * die Testnachricht.
 */
export async function pruefeHttp(cfg) {
  const a = ANBIETER[cfg.provider]
  if (!a) return { ok: false, reason: `Unbekannter Anbieter „${cfg.provider}"` }

  const fehlt = fehlendeAngaben(cfg)
  if (fehlt.length) return { ok: false, reason: `Es fehlt noch: ${fehlt.join(', ')}.` }

  try {
    const { url, init } = a.pruefen(cfg)
    const r = await ruf(url, init)
    if (!r.ok) return { ok: false, reason: deutung(r.status, r.koerper, cfg, a), status: r.status }
    return {
      ok: true,
      anbieter: a.name,
      hinweis: 'Schlüssel und Verbindung stimmen. Ob die Absenderadresse dort bestätigt ist, '
        + 'zeigt erst die Testnachricht.',
    }
  } catch (e) {
    return { ok: false, reason: e.message, code: e.code || null }
  }
}
