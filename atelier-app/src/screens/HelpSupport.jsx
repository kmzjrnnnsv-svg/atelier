import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, Mail } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'

export default function HelpSupport() {
  const navigate = useNavigate()
  const { faqs, fetchFaqs } = useAtelierStore()
  const [activeFilter, setActiveFilter] = useState('Alle')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    if (faqs.length === 0) fetchFaqs().catch(() => {})
  }, [])

  const categories = ['Alle', ...new Set(faqs.map(f => f.category))]
  const filtered = activeFilter === 'Alle' ? faqs : faqs.filter(f => f.category === activeFilter)

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-black/5 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center border-0 bg-transparent">
          <ArrowLeft size={18} className="text-black" strokeWidth={1.5} />
        </button>
        <div className="text-center">
          <p className="text-[11px] text-black" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>Hilfe</p>
          <p className="text-[9px] text-black/30" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>FAQ</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Category Filters */}
        {categories.length > 1 && (
          <div className="flex gap-2 px-5 pt-4 pb-2 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-3 py-1.5 text-[9px] whitespace-nowrap border transition-all ${
                  activeFilter === cat ? 'bg-black text-white border-black' : 'bg-transparent text-black/40 border-black/10'
                }`}
                style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="pt-2 pb-4">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <HelpCircle size={36} className="text-black/15 mx-auto mb-3" />
              <p className="text-[12px] text-black">Noch keine FAQs</p>
              <p className="text-[10px] text-black/35 mt-1">Bald verfügbar</p>
            </div>
          ) : (
            filtered.map(faq => (
              <div key={faq.id} className="border-b border-black/5">
                <button
                  onClick={() => setExpanded(expanded === faq.id ? null : faq.id)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-transparent border-0 text-left"
                >
                  <p className="text-[12px] text-black leading-tight pr-3 flex-1">{faq.question}</p>
                  {expanded === faq.id
                    ? <ChevronUp size={14} className="text-black/30 flex-shrink-0" strokeWidth={1.5} />
                    : <ChevronDown size={14} className="text-black/30 flex-shrink-0" strokeWidth={1.5} />
                  }
                </button>
                {expanded === faq.id && (
                  <div className="px-5 pb-4">
                    <p className="text-[10px] text-black/50 leading-relaxed">{faq.answer}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-black/20" />
                      <span className="text-[8px] text-black/30" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>{faq.category}</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Contact CTA */}
        <button
          onClick={() => navigate('/feedback')}
          className="mx-0 mb-0 p-5 flex items-center gap-4 bg-black w-full border-0 text-left"
        >
          <div className="w-10 h-10 bg-white/10 flex items-center justify-center flex-shrink-0">
            <Mail size={18} className="text-white" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <p className="text-[9px] text-white/40" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>Noch Fragen?</p>
            <p className="text-[12px] text-white leading-tight mt-0.5">Feedback & Hilfe</p>
            <p className="text-[9px] text-white/40 mt-0.5">Anfragen, Beschwerden & Retouren</p>
          </div>
        </button>
      </div>
    </div>
  )
}
