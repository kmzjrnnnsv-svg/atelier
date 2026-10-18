/**
 * Bestaetigung — ein Häkchen mit dem Satz, dem zugestimmt wird.
 *
 * Ein echtes Kontrollkästchen, nicht ein Knopf, der wie eines aussieht: Die
 * Zustimmung ist rechtlich das Gewicht dieser Seite, und ein Bildschirmleser
 * soll sie als das ansagen, was sie ist. Nicht vorangekreuzt — eine
 * voreingestellte Zustimmung ist keine.
 */
export default function Bestaetigung({ id, an, onChange, warnung = false, children }) {
  return (
    <div className={`flex items-start gap-3 ${warnung ? 'rounded-md p-4 bg-[#FBF1E4] shadow-[0_0_0_1px_#C9A46A]' : ''}`}>
      <input
        id={id}
        type="checkbox"
        checked={an}
        onChange={e => onChange(e.target.checked)}
        className="mt-[3px] w-5 h-5 shrink-0 accent-[#6B231D] cursor-pointer"
      />
      <label htmlFor={id} className="t-klein c-tinte cursor-pointer leading-relaxed">
        {children}
      </label>
    </div>
  )
}
