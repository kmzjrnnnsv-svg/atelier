import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'
import { useSeitentitel } from '../store/seitentitel'

const TITLES = {
  datenschutz: 'Datenschutzrichtlinie',
  agb:         'Allgemeine Geschäftsbedingungen',
  impressum:   'Impressum',
}

export default function LegalDoc() {
  const { type }  = useParams()
  const [doc,     setDoc]     = useState(null)
  const [loading, setLoading] = useState(true)

  const title = TITLES[type] || type
  // Die Überschrift steht in der oberen Leiste, zusammen mit dem Zurück-Pfeil.
  useSeitentitel(title)

  useEffect(() => {
    setLoading(true)
    apiFetch(`/api/legal/${type}`)
      .then(data => setDoc(data))
      .catch(() => setDoc(null))
      .finally(() => setLoading(false))
  }, [type])

  return (
    <div className="flex flex-col min-h-full bg-white">

      <div className="flex-1 px-5 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-black/10 border-t-black animate-spin" />
          </div>
        ) : !doc?.content ? (
          <div className="text-center py-20">
            <FileText size={36} className="text-black/10 mx-auto mb-3" />
            <p className="text-sm font-semibold text-black">Noch nicht verfügbar</p>
            <p className="text-[11px] text-black/35 mt-1">Dieses Dokument wird in Kürze bereitgestellt.</p>
          </div>
        ) : (
          <>
            {/* Nur, wenn das Dokument anders heißt als die Seite — sonst stünde
                dieselbe Überschrift zweimal untereinander, einmal in der Leiste
                und einmal hier. */}
            {doc.title && doc.title.trim().toLowerCase() !== title.trim().toLowerCase() && (
              <h1 className="text-xl font-bold text-black leading-tight mb-4">{doc.title}</h1>
            )}
            <div className="space-y-3">
              {doc.content.split('\n\n').map((para, i) => (
                <p
                  key={i}
                  className={`leading-relaxed ${
                    para.length < 80 && !para.includes('.') && i === 0
                      ? 'text-base font-semibold text-black'
                      : 'text-[13px] text-black/60'
                  }`}
                >
                  {para}
                </p>
              ))}
            </div>
            {doc.updated_at && (
              <p className="text-[9px] text-black/35 uppercase tracking-widest mt-8 pb-4 border-t border-black/5 pt-4">
                Zuletzt aktualisiert: {new Date(doc.updated_at).toLocaleDateString('de-DE')}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
