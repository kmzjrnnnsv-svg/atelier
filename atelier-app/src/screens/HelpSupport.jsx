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
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">

      {/* Header */}
      <div className="bg-white flex items-center justify-between px-5 pt-4 pb-4 border-b border-gray-100 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center border-0">
          <ArrowLeft size={18} strokeWidth={1.8} className="text-gray-800" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold tracking-wide text-black">Help & Support</p>
          <p className="text-[9px] text-gray-400 uppercase tracking-widest">FAQ</p>
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Category Filters */}
        {categories.length > 1 && (
          <div className="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap border-0 transition-all ${
                  activeFilter === cat ? 'bg-black text-white' : 'bg-white text-gray-500 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="px-4 pt-3 pb-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <HelpCircle size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-black">No FAQs yet</p>
              <p className="text-[11px] text-gray-400 mt-1">Check back soon for helpful answers</p>
            </div>
          ) : (
            filtered.map(faq => (
              <div key={faq.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === faq.id ? null : faq.id)}
                  className="w-full flex items-center justify-between p-4 bg-transparent border-0 text-left"
                >
                  <p className="text-sm font-semibold text-black leading-tight pr-3 flex-1">{faq.question}</p>
                  {expanded === faq.id
                    ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
                    : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                  }
                </button>
                {expanded === faq.id && (
                  <div className="px-4 pb-4 border-t border-gray-50">
                    <p className="text-[11px] text-gray-600 leading-relaxed mt-3">{faq.answer}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      <span className="text-[8px] uppercase tracking-widest text-gray-400">{faq.category}</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Contact CTA */}
        <div
          className="mx-4 mb-6 rounded-2xl p-4 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Mail size={18} className="text-white" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">Still need help?</p>
            <p className="text-sm font-bold text-white leading-tight mt-0.5">Contact our team</p>
            <p className="text-[9px] text-gray-400 mt-0.5">support@atelier.com</p>
          </div>
        </div>
      </div>
    </div>
  )
}
