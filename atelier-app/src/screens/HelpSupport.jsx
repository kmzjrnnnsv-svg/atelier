/**
 * HelpSupport.jsx — LV-inspired FAQ & help page
 * Warm tones, elegant typography, generous whitespace
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HelpCircle, ChevronDown, ChevronUp, Mail } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import CtaBanner from '../components/CtaBanner'

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
    <div className="min-h-full bg-white">

      {/* ── Hero header ─────────────────────────────────────────── */}
      <div className="px-5 lg:px-16 pt-8 lg:pt-14 pb-6 lg:pb-10">
        <p className="text-[10px] lg:text-[11px] text-black/30 uppercase tracking-[0.25em] mb-3">Atelier Service</p>
        <h1 className="text-[32px] lg:text-[44px] font-extralight text-black leading-[1.1] tracking-tight">
          Hilfe & Support
        </h1>
        <p className="text-[13px] lg:text-[15px] text-black/40 mt-3 lg:mt-4 max-w-lg leading-[1.7] font-light">
          Häufig gestellte Fragen und direkter Kontakt zu unserem Team.
        </p>
      </div>

      {/* ── Category filters ───────────────────────────────────── */}
      {categories.length > 1 && (
        <div className="px-5 lg:px-16 pb-5 lg:pb-8 border-b border-black/[0.06]">
          <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`flex-shrink-0 px-4 py-2 text-[11px] lg:text-[12px] border-0 bg-transparent transition-all ${
                  activeFilter === cat
                    ? 'text-black font-medium'
                    : 'text-black/30 hover:text-black/60'
                }`}
                style={{
                  letterSpacing: '0.06em',
                  borderBottom: activeFilter === cat ? '2px solid black' : '2px solid transparent',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── FAQ count ──────────────────────────────────────────── */}
      <div className="px-5 lg:px-16 pt-5 lg:pt-6 pb-2">
        <p className="text-[11px] text-black/25 font-light">{filtered.length} {filtered.length === 1 ? 'Frage' : 'Fragen'}</p>
      </div>

      {/* ── FAQ list ───────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-5">
          <HelpCircle size={32} className="text-black/10 mb-4" strokeWidth={1} />
          <p className="text-[14px] font-light text-black/60">Noch keine FAQs</p>
          <p className="text-[12px] text-black/30 mt-2 font-light">Bald verfügbar</p>
        </div>
      ) : (
        <div className="px-5 lg:px-16">
          {filtered.map(faq => (
            <div key={faq.id} className="border-b border-black/[0.06]">
              <button
                onClick={() => setExpanded(expanded === faq.id ? null : faq.id)}
                className="w-full flex items-center justify-between py-5 bg-transparent border-0 text-left"
              >
                <p className="text-[13px] lg:text-[14px] text-black font-light leading-snug pr-4 flex-1">{faq.question}</p>
                {expanded === faq.id
                  ? <ChevronUp size={16} className="text-black/20 flex-shrink-0" strokeWidth={1.5} />
                  : <ChevronDown size={16} className="text-black/20 flex-shrink-0" strokeWidth={1.5} />
                }
              </button>
              {expanded === faq.id && (
                <div className="pb-5">
                  <p className="text-[12px] lg:text-[13px] text-black/40 leading-[1.8] font-light">{faq.answer}</p>
                  <p className="text-[10px] text-black/20 mt-3 uppercase tracking-[0.15em] font-light">{faq.category}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Contact CTA ────────────────────────────────────────── */}
      <div className="px-5 lg:px-16 pt-10 lg:pt-14 pb-4">
        <div
          className="group cursor-pointer bg-[#19110B]"
          onClick={() => navigate('/feedback')}
        >
          <div className="px-6 lg:px-10 py-6 lg:py-8 flex items-center gap-5">
            <div className="w-11 h-11 bg-white/10 flex items-center justify-center flex-shrink-0">
              <Mail size={18} className="text-white/60" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Noch Fragen?</p>
              <p className="text-[14px] text-white font-light mt-1">Feedback & Hilfe</p>
              <p className="text-[11px] text-white/35 mt-0.5 font-light">Anfragen, Beschwerden & Retouren</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA Banner (CMS-controlled) ──────────────────────── */}
      <div className="px-5 lg:px-16 pb-16">
        <CtaBanner page="help" />
      </div>
    </div>
  )
}
