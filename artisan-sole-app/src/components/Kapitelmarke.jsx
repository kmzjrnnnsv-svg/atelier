/**
 * Kapitelmarke — die kleine gesperrte Zeile über jeder Überschrift.
 *
 * Sie gliedert die Seite: Wer mitten hineinscrollt, weiß an ihr, in welchem
 * Kapitel er gelandet ist, ohne die Überschrift lesen zu müssen.
 *
 * Sie stand als lokale Funktion in TestHomepage.jsx, bis der Schuhaufbau sie
 * ebenfalls brauchte — auf seiner Bühne steht sie als einzige Beschriftung.
 * Zwei Fassungen derselben Zeile wären zwei Gelegenheiten, dass sie
 * auseinanderlaufen.
 */
export default function Kapitelmarke({ children, hell = false }) {
  return (
    <p className={`t-klein ${hell ? 'c-hell-leise' : 'c-leise'}`}>
      {children}
    </p>
  )
}
