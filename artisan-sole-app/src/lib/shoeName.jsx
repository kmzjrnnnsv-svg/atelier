/**
 * shoeName.jsx — Anzeige von Schuhnamen mit optionaler Hervorhebung.
 *
 * Konvention im CMS-Namensfeld: Ein Teil in "Anführungszeichen" wird auf der
 * Seite in GROSSBUCHSTABEN hervorgehoben, der Rest erscheint gedämpft (grau,
 * aber gut lesbar). Beispiel: Boardroom "Oxford"  →  Boardroom OXFORD
 *
 * Die Anführungszeichen sind nur Markup und werden nie wörtlich angezeigt.
 * `cleanShoeName` liefert den reinen Namen für Bestellung/Warenkorb/E-Mail/Header.
 */

// Anführungszeichen (gerade + typografische) entfernen, Whitespace normalisieren.
export function cleanShoeName(name) {
  return String(name || '').replace(/[„“”"]/g, '').replace(/\s+/g, ' ').trim()
}

export default function ShoeName({ name, className = '' }) {
  const raw = String(name || '')
  const norm = raw.replace(/[„“”]/g, '"')
  if (!norm.includes('"')) return <span className={className}>{raw}</span>

  // split mit Capture-Group: gerade Indizes = außerhalb, ungerade = in "…".
  const parts = norm.split(/"([^"]+)"/g)
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p === '' ? null : i % 2 === 1
          ? <span key={i} style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{p}</span>
          : <span key={i} style={{ opacity: 0.45 }}>{p}</span>
      )}
    </span>
  )
}
