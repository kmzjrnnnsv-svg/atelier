/**
 * bildGrund — die Farbe, auf der ein Studiofoto steht.
 *
 * Die Schuhfotos haben einen eigenen, einfarbigen Grund (Stein, Grau). Auf
 * der hellen Seite stand das Foto deshalb als Kasten da, wie eingeklebt.
 * Nimmt die Fläche drumherum genau diese Farbe an, geht das Foto randlos in
 * sie über, und der Schuh steht frei im Raum — so zeigen ihn die großen
 * Häuser auch.
 *
 * Gelesen werden die vier Ecken eines verkleinerten Abbilds. Weichen sie
 * stark voneinander ab, steht das Foto nicht auf einem einfarbigen Grund
 * (eine Aufnahme am Fuß, im Freien), und es gibt keine Farbe zurück. Ebenso
 * bei durchsichtigen Ecken und bei Bildern fremder Herkunft, deren Pixel der
 * Browser nicht herausgibt.
 */
export function bildGrund(img) {
  try {
    if (!img?.naturalWidth) return null
    const n = 24
    const c = document.createElement('canvas')
    c.width = n
    c.height = n
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, n, n)
    const ecken = [[1, 1], [n - 2, 1], [1, n - 2], [n - 2, n - 2]]
      .map(([x, y]) => ctx.getImageData(x, y, 1, 1).data)
    if (ecken.some(d => d[3] < 250)) return null
    for (let k = 0; k < 3; k++) {
      const werte = ecken.map(d => d[k])
      if (Math.max(...werte) - Math.min(...werte) > 22) return null
    }
    const mittel = (k) => Math.round(ecken.reduce((s, d) => s + d[k], 0) / ecken.length)
    return `rgb(${mittel(0)}, ${mittel(1)}, ${mittel(2)})`
  } catch {
    return null
  }
}
