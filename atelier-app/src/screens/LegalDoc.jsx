import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'

const TITLES = {
  datenschutz: 'Datenschutzrichtlinie',
  agb:         'Allgemeine Geschäftsbedingungen',
  impressum:   'Impressum',
}

export default function LegalDoc() {
  const navigate = useNavigate()
  const { type }  = useParams()
  const [doc,     setDoc]     = useState(null)
  const [loading, setLoading] = useState(true)

  const title = TITLES[type] || type

  useEffect(() => {
    setLoading(true)
    apiFetch(`/api/legal/${type}`)
      .then(data => setDoc(data))
      .catch(() => setDoc(null))
      .finally(() => setLoading(false))
  }, [type])

  return (
    <div className="flex flex-col min-h-full bg-white">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-4 border-b border-gray-100 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center border-0">
          <ArrowLeft size={18} strokeWidth={1.8} className="text-gray-800" />
        </button>
        <span className="text-sm font-bold tracking-wide text-black text-center flex-1 px-2">{title}</span>
        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <FileText size={16} className="text-gray-600" strokeWidth={1.5} />
        </div>
      </div>

      <div className="flex-1 px-5 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-black animate-spin" />
          </div>
        ) : !doc?.content ? (
          <div className="text-center py-20">
            <FileText size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-black">Noch nicht verfügbar</p>
            <p className="text-[11px] text-gray-400 mt-1">Dieses Dokument wird in Kürze bereitgestellt.</p>
          </div>
        ) : (
          <>
            {doc.title && (
              <h1 className="text-xl font-bold text-black leading-tight mb-4">{doc.title}</h1>
            )}
            <div className="space-y-3">
              {doc.content.split('\n\n').map((para, i) => (
                <p
                  key={i}
                  className={`leading-relaxed ${
                    para.length < 80 && !para.includes('.') && i === 0
                      ? 'text-base font-semibold text-black'
                      : 'text-[13px] text-gray-700'
                  }`}
                >
                  {para}
                </p>
              ))}
            </div>
            {doc.updated_at && (
              <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-8 pb-4 border-t border-gray-100 pt-4">
                Zuletzt aktualisiert: {new Date(doc.updated_at).toLocaleDateString('de-DE')}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
