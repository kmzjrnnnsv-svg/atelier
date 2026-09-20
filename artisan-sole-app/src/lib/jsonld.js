/**
 * jsonld.js — was eine Suchmaschine über ein Modell erfährt, ohne es zu lesen.
 *
 * ── Warum ─────────────────────────────────────────────────────────────────
 *
 * Im Suchergebnis steht bei einem Shop mehr als Titel und Beschreibung:
 * Preis, Währung, Verfügbarkeit, Hersteller. Diese Angaben liest Google
 * nicht aus dem Fließtext — es liest sie aus einem Block strukturierter
 * Daten im Kopf der Seite. Fehlt er, bleibt das Ergebnis eine graue Zeile
 * neben Wettbewerbern, die „ab 1.290 €" danebenstehen haben.
 *
 * Bis hierher gab es im ganzen Laden keinen einzigen solchen Block.
 *
 * ── Was hier steht und was nicht ──────────────────────────────────────────
 *
 * Nur Angaben, die ohnehin auf der Seite stehen. Strukturierte Daten, die
 * etwas anderes behaupten als der sichtbare Inhalt, sind ein Verstoß gegen
 * Googles Richtlinien und können die Auszeichnung für die ganze Domain
 * kosten — das Risiko steht in keinem Verhältnis zu einer hübscheren Zeile.
 *
 * Deshalb ausdrücklich NICHT enthalten: Bewertungen (`aggregateRating`) und
 * Rezensionen. Es gibt sie nicht, und erfundene sind der häufigste Grund für
 * eine manuelle Abstrafung.
 *
 * ── Zur Verfügbarkeit ─────────────────────────────────────────────────────
 *
 * `InStock` heißt in der Norm „kann jetzt bestellt werden", nicht „liegt im
 * Regal" — und das trifft zu: Jedes Paar entsteht nach der Bestellung. Eine
 * Angabe eigens für Auftragsfertigung wäre genauer, ließ sich aber aus
 * dieser Umgebung nicht gegen die Norm prüfen (schema.org ist hier
 * gesperrt), und eine geratene Aufzählungsangabe macht den ganzen Block
 * ungültig. Die rund vier Wochen stehen im sichtbaren Text der Seite.
 */
import { useEffect } from 'react'
import { preisAlsZahl } from './preis'

/** Alle von dieser Datei erzeugten Blöcke tragen dieses Merkmal. */
const MERKMAL = 'data-jsonld'

/**
 * Hängt einen Block strukturierter Daten in den Kopf der Seite und räumt ihn
 * beim Verlassen wieder ab.
 *
 * Das Abräumen ist nicht Kosmetik: Diese Anwendung lädt die Seite nie neu.
 * Ohne Aufräumen trüge die Kollektionsseite nach zwei Klicks die Daten von
 * drei Modellen mit sich, und eine Suchmaschine bekäme drei Produkte auf
 * einer Seite gemeldet, von denen zwei nicht darauf stehen.
 *
 * @param {object|null} daten  Das Objekt, so wie es in den Block soll.
 *   `null` (etwa solange das Modell noch lädt) hängt nichts ein.
 * @param {string} schluessel  Unterscheidet mehrere Blöcke auf einer Seite.
 */
export function useJsonLd(daten, schluessel = 'seite') {
  // Als Zeichenkette in die Abhängigkeitsliste: Das Objekt wird bei jedem
  // Neuzeichnen neu gebaut und wäre sonst jedes Mal „verändert" — der Block
  // flöge bei jedem Tastendruck im Konfigurator raus und wieder rein.
  const inhalt = daten ? JSON.stringify(daten) : null

  useEffect(() => {
    if (typeof document === 'undefined' || !inhalt) return
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.setAttribute(MERKMAL, schluessel)
    el.textContent = inhalt
    document.head.appendChild(el)
    return () => el.remove()
  }, [inhalt, schluessel])
}

/**
 * Ein Modell als Produkt.
 *
 * Fehlende Felder werden weggelassen, nicht mit Platzhaltern gefüllt: Ein
 * `Offer` ohne Preis ist als Angabe wertlos, aber gültig; ein `Offer` mit
 * dem Preis 0 ist falsch.
 */
export function produktDaten(schuh, { url, bild } = {}) {
  if (!schuh?.name) return null

  const preis = preisAlsZahl(schuh.price)
  const bilder = [bild].filter(Boolean)

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: schuh.name,
    ...(schuh.description || schuh.tagline
      ? { description: String(schuh.description || schuh.tagline).trim() }
      : {}),
    ...(bilder.length ? { image: bilder } : {}),
    ...(schuh.material ? { material: schuh.material } : {}),
    ...(schuh.color ? { color: schuh.color } : {}),
    brand: { '@type': 'Brand', name: 'Artisan Sole' },
    // Die Kennung muss über die Zeit stabil bleiben — sonst gilt dasselbe
    // Modell nach einer Umbenennung als neues Produkt. Der Slug ändert sich
    // seltener als der Name, die Datenbank-Kennung nie.
    ...(schuh.slug ? { sku: schuh.slug } : {}),
    ...(preis > 0 && url
      ? {
        offers: {
          '@type': 'Offer',
          url,
          price: String(preis),
          priceCurrency: 'EUR',
          availability: 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
        },
      }
      : {}),
  }
}
