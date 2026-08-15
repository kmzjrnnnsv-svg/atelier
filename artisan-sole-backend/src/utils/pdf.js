/**
 * pdf.js — ein PDF schreiben, ohne dafür ein Paket zu installieren.
 *
 * ── Warum von Hand ────────────────────────────────────────────────────────
 *
 * Eine Rechnung ist ein Blatt mit Text, Linien und rechtsbündigen Beträgen.
 * Dafür ein Paket aufzunehmen hieße: eine Abhängigkeit mehr, die bei jedem
 * Ausliefern nachgeladen werden muss, mit eigenen Abhängigkeiten und
 * eingebetteten Schriftdateien im Megabyte-Bereich — für etwas, das das
 * Dateiformat seit 1993 vorsieht.
 *
 * PDF hat vierzehn Schriften, die jeder Betrachter mitbringt, ohne dass sie
 * in der Datei stehen müssen. Zwei davon genügen hier: Helvetica und
 * Helvetica fett.
 *
 * ── Was zu beachten war ───────────────────────────────────────────────────
 *
 *  1. Umlaute. Die Standardschriften werden mit WinAnsiEncoding angesprochen,
 *     also CP1252. Für ÄÖÜäöüß ist das deckungsgleich mit Latin-1, für das
 *     Eurozeichen nicht — das liegt in CP1252 auf 0x80 und in Latin-1 gar
 *     nicht. Deshalb die Ersetzungstabelle in `kodiere`.
 *
 *  2. Die Querverweistabelle am Ende nennt Byte-Positionen. Sie werden auf
 *     dem Latin-1-Puffer gerechnet, nicht auf der Zeichenkette — sonst
 *     verschiebt jeder Umlaut die Tabelle um ein Byte und kein Betrachter
 *     öffnet die Datei.
 *
 *  3. Beträge müssen untereinander stehen. Ohne die Zeichenbreiten der
 *     Schrift ginge das nicht; sie stehen unten als Tabelle. Das ist der
 *     einzige langweilige Teil dieser Datei.
 */

const A4 = { breite: 595.28, hoehe: 841.89 }
const RAND = 56

// ── Zeichenbreiten (1/1000 der Schriftgröße) ────────────────────────────────
// Aus den Metriken der Standardschriften. Nur was vorkommt; alles andere
// bekommt den Rückfallwert und wird höchstens ein paar Punkt zu breit
// geschätzt, was bei rechtsbündigen Zahlen nicht auffällt.
const B_NORMAL = {
  ' ':278,'!':278,'"':355,'#':556,'$':556,'%':889,'&':667,"'":191,'(':333,')':333,
  '*':389,'+':584,',':278,'-':333,'.':278,'/':278,':':278,';':278,'<':584,'=':584,
  '>':584,'?':556,'@':1015,'[':278,'\\':278,']':278,'^':469,'_':556,'`':333,
  '{':334,'|':260,'}':334,'~':584,
  A:667,B:667,C:722,D:722,E:667,F:611,G:778,H:722,I:278,J:500,K:667,L:556,M:833,
  N:722,O:778,P:667,Q:778,R:722,S:667,T:611,U:722,V:667,W:944,X:667,Y:667,Z:611,
  a:556,b:556,c:500,d:556,e:556,f:278,g:556,h:556,i:222,j:222,k:500,l:222,m:833,
  n:556,o:556,p:556,q:556,r:333,s:500,t:278,u:556,v:500,w:722,x:500,y:500,z:500,
  'Ä':667,'Ö':778,'Ü':722,'ä':556,'ö':556,'ü':556,'ß':556,'€':556,
  '–':556,'—':1000,'„':333,'“':333,'”':333,'·':278,
}
const B_FETT = {
  ' ':278,'!':333,'"':474,'#':556,'$':556,'%':889,'&':722,"'":238,'(':333,')':333,
  '*':389,'+':584,',':278,'-':333,'.':278,'/':278,':':333,';':333,'<':584,'=':584,
  '>':584,'?':611,'@':975,'[':333,'\\':278,']':333,'^':584,'_':556,'`':333,
  '{':389,'|':280,'}':389,'~':584,
  A:722,B:722,C:722,D:722,E:667,F:611,G:778,H:722,I:278,J:556,K:722,L:611,M:833,
  N:722,O:778,P:667,Q:778,R:722,S:667,T:611,U:722,V:667,W:944,X:667,Y:667,Z:611,
  a:556,b:611,c:556,d:611,e:556,f:333,g:611,h:611,i:278,j:278,k:556,l:278,m:889,
  n:611,o:611,p:611,q:611,r:389,s:556,t:333,u:611,v:556,w:778,x:556,y:556,z:500,
  'Ä':722,'Ö':778,'Ü':722,'ä':556,'ö':611,'ü':611,'ß':611,'€':556,
  '–':556,'—':1000,'„':500,'“':500,'”':500,'·':278,
}
for (const z of '0123456789') { B_NORMAL[z] = 556; B_FETT[z] = 556 }

export function textBreite(s, groesse, fett = false) {
  const tab = fett ? B_FETT : B_NORMAL
  let summe = 0
  for (const z of String(s)) summe += tab[z] ?? 556
  return summe * groesse / 1000
}

// ── Kodierung ───────────────────────────────────────────────────────────────
// CP1252 dort, wo es von Latin-1 abweicht. Alles, was danach immer noch
// außerhalb von Latin-1 liegt, wird zu einem Fragezeichen — besser ein
// sichtbarer Platzhalter als eine Datei, die sich nicht öffnen lässt.
const CP1252 = {
  '€':'\x80','‚':'\x82','ƒ':'\x83','„':'\x84','…':'\x85',
  '†':'\x86','‡':'\x87','ˆ':'\x88','‰':'\x89','Š':'\x8a',
  '‹':'\x8b','Œ':'\x8c','Ž':'\x8e',
  '‘':'\x91','’':'\x92','“':'\x93','”':'\x94','•':'\x95',
  '–':'\x96','—':'\x97','˜':'\x98','™':'\x99','š':'\x9a',
  '›':'\x9b','œ':'\x9c','ž':'\x9e','Ÿ':'\x9f',
}
function kodiere(s) {
  let out = ''
  for (const z of String(s ?? '')) {
    if (CP1252[z]) out += CP1252[z]
    else if (z.charCodeAt(0) <= 0xff) out += z
    else out += '?'
  }
  // Klammern und Rückstrich sind im PDF-Textliteral bedeutungstragend.
  return out.replace(/([\\()])/g, '\\$1')
}

/**
 * Ein Dokument. Eine Seite entsteht von selbst, wenn der Platz nicht reicht.
 */
export class Dokument {
  constructor({ fusszeile = null } = {}) {
    this.seiten = []
    this.fusszeile = fusszeile
    this.neueSeite()
  }

  neueSeite() {
    this.inhalt = []
    this.seiten.push(this.inhalt)
    this.y = A4.hoehe - RAND
  }

  /** Reicht der Platz für `hoehe` Punkte? Sonst umbrechen. */
  platz(hoehe = 14) {
    if (this.y - hoehe < RAND + 30) this.neueSeite()
    return this.y
  }

  /**
   * Eine Zeile setzen. `x` fehlt = linker Rand; `rechts` = rechtsbündig an
   * dieser Kante, wofür die Zeichenbreiten gebraucht werden.
   */
  text(s, { x = RAND, y = null, groesse = 10, fett = false, rechts = null, grau = false } = {}) {
    const zeile = String(s ?? '')
    const yy = y ?? this.y
    const xx = rechts !== null ? rechts - textBreite(zeile, groesse, fett) : x
    this.inhalt.push(
      `BT /${fett ? 'F2' : 'F1'} ${groesse} Tf ${grau ? '0.42 0.42 0.42 rg' : '0 0 0 rg'} ` +
      `1 0 0 1 ${xx.toFixed(2)} ${yy.toFixed(2)} Tm (${kodiere(zeile)}) Tj ET`
    )
    return this
  }

  /** Zeile setzen und den Zeiger weiterrücken. */
  zeile(s, opts = {}) {
    const hoehe = opts.abstand ?? (opts.groesse ?? 10) * 1.45
    this.platz(hoehe)
    this.text(s, opts)
    this.y -= hoehe
    return this
  }

  luecke(n = 10) { this.y -= n; return this }

  linie({ y = null, von = RAND, bis = A4.breite - RAND, staerke = 0.6, grau = 0.75 } = {}) {
    const yy = y ?? this.y
    this.inhalt.push(
      `${grau} ${grau} ${grau} RG ${staerke} w ${von.toFixed(2)} ${yy.toFixed(2)} m ` +
      `${bis.toFixed(2)} ${yy.toFixed(2)} l S`
    )
    return this
  }

  /**
   * Ein Absatz mit Umbruch an der Breite. Umgebrochen wird an Leerzeichen;
   * ein einzelnes überlanges Wort bleibt stehen und ragt heraus — das ist in
   * einem Beleg nie der Fall und rechtfertigt keine Silbentrennung.
   */
  absatz(s, { groesse = 9, breite = A4.breite - 2 * RAND, grau = false, x = RAND } = {}) {
    const worte = String(s ?? '').split(/\s+/).filter(Boolean)
    let zeile = ''
    for (const w of worte) {
      const test = zeile ? `${zeile} ${w}` : w
      if (textBreite(test, groesse) > breite && zeile) {
        this.zeile(zeile, { groesse, grau, x })
        zeile = w
      } else zeile = test
    }
    if (zeile) this.zeile(zeile, { groesse, grau, x })
    return this
  }

  /** Die fertige Datei. */
  buffer() {
    if (this.fusszeile) {
      this.seiten.forEach((seite, i) => {
        const merk = this.inhalt
        this.inhalt = seite
        this.text(this.fusszeile, { y: RAND - 16, groesse: 7.5, grau: true })
        if (this.seiten.length > 1) {
          this.text(`Seite ${i + 1} von ${this.seiten.length}`,
            { y: RAND - 16, groesse: 7.5, grau: true, rechts: A4.breite - RAND })
        }
        this.inhalt = merk
      })
    }
    return baue(this.seiten)
  }
}

/**
 * Objekte zusammensetzen und die Querverweistabelle rechnen.
 *
 * Nummerierung: 1 Katalog, 2 Seitenbaum, 3 und 4 die beiden Schriften, danach
 * je Seite ein Seitenobjekt und ein Inhaltsobjekt.
 */
function baue(seiten) {
  const objekte = []
  const anzahl = seiten.length
  const seiteNr  = (i) => 5 + i * 2
  const inhaltNr = (i) => 6 + i * 2

  objekte[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objekte[2] = `<< /Type /Pages /Kids [${seiten.map((_, i) => `${seiteNr(i)} 0 R`).join(' ')}] /Count ${anzahl} >>`
  objekte[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  objekte[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'

  seiten.forEach((seite, i) => {
    objekte[seiteNr(i)] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.breite} ${A4.hoehe}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${inhaltNr(i)} 0 R >>`
    const strom = seite.join('\n')
    objekte[inhaltNr(i)] =
      `<< /Length ${Buffer.byteLength(strom, 'latin1')} >>\nstream\n${strom}\nendstream`
  })

  let datei = '%PDF-1.4\n'
  const stellen = []
  for (let n = 1; n < objekte.length; n++) {
    if (!objekte[n]) continue
    stellen[n] = Buffer.byteLength(datei, 'latin1')
    datei += `${n} 0 obj\n${objekte[n]}\nendobj\n`
  }

  const xref = Buffer.byteLength(datei, 'latin1')
  const gesamt = objekte.length
  datei += `xref\n0 ${gesamt}\n0000000000 65535 f \n`
  for (let n = 1; n < gesamt; n++) {
    datei += stellen[n] !== undefined
      ? `${String(stellen[n]).padStart(10, '0')} 00000 n \n`
      : '0000000000 65535 f \n'
  }
  datei += `trailer\n<< /Size ${gesamt} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`

  return Buffer.from(datei, 'latin1')
}

export const SEITE = A4
export const SEITENRAND = RAND
