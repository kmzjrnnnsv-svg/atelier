import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, SlidersHorizontal, RotateCcw, EyeOff, Bookmark, ShoppingBag, Check } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'

// Garment catalogue — enriched beyond what the store provides
const GARMENT_SECTIONS = [
  {
    label: 'Sakkos & Outerwear',
    badge: 'Bespoke Line',
    items: [
      { id: 'g1', name: 'Navy Midnight Wool', price: '€ 1.250', color: '#1e3a5f', selected: true,
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80&fit=crop' },
      { id: 'g2', name: 'Charcoal Silk',      price: '€ 1.400', color: '#374151', selected: false, image: null },
      { id: 'g3', name: 'Sand Linen',         price: '€ 890',   color: '#c8a97e', selected: false, image: null },
    ],
  },
  {
    label: 'Trousers',
    badge: 'Tailored',
    items: [
      { id: 't1', name: 'Slim Trousers',  price: '€ 520', color: '#1f2937', selected: true,  image: null },
      { id: 't2', name: 'Cream Chinos',   price: '€ 390', color: '#f5f0e8', selected: false, image: null },
      { id: 't3', name: 'Dark Jeans',     price: '€ 340', color: '#1e293b', selected: false, image: null },
    ],
  },
]

const viewTabs = ['FULL LOOK', 'TOPS', 'FOOTWEAR']

export default function OutfitVisualizer() {
  const navigate         = useNavigate()
  const { outfits }      = useAtelierStore()
  const [currentOutfit,  setCurrentOutfit]  = useState(0)
  const [viewTab,        setViewTab]        = useState('FULL LOOK')
  const [hideModel,      setHideModel]      = useState(false)
  const [spinning,       setSpinning]       = useState(false)
  const [garments,       setGarments]       = useState(GARMENT_SECTIONS)
  const [saved,          setSaved]          = useState(false)

  const outfit = outfits[currentOutfit] ?? null

  // Total price computation
  const totalEur = garments.reduce((sum, section) => {
    const sel = section.items.find(i => i.selected)
    if (!sel) return sum
    const n = parseFloat(sel.price.replace(/[^\d]/g, ''))
    return sum + (isNaN(n) ? 0 : n)
  }, 0)

  const selectGarment = (sectionIdx, itemId) => {
    setGarments(prev => prev.map((sec, si) =>
      si === sectionIdx
        ? { ...sec, items: sec.items.map(it => ({ ...it, selected: it.id === itemId })) }
        : sec
    ))
  }

  const handleSpin = () => {
    setSpinning(true)
    setTimeout(() => setSpinning(false), 600)
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 bg-white border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center border-0">
          <ArrowLeft size={18} strokeWidth={1.8} className="text-gray-800" />
        </button>
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-black">Outfit Visualizer</p>
          <p className="text-[9px] uppercase tracking-[0.14em] font-semibold" style={{ color: '#b45309' }}>3D Studio Mode</p>
        </div>
        <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center border-0">
          <SlidersHorizontal size={17} strokeWidth={1.5} className="text-gray-700" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── 3D Visualizer Canvas ───────────────────────────────────── */}
        <div
          className="relative mx-4 mt-4 rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(180deg, #111827 0%, #1f2937 100%)', minHeight: 'clamp(220px, 36dvh, 340px)' }}
        >
          {/* AI Confidence badge */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 shadow-md">
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none">
              <path d="M8 1l1.8 3.6L14 5.5l-3 2.9.7 4.1L8 10.4l-3.7 2.1.7-4.1-3-2.9 4.2-.9z" fill="#f59e0b" />
            </svg>
            <span className="text-[9px] font-bold text-gray-800 uppercase tracking-wide">AI Confidence: 96%</span>
          </div>

          {/* Right controls */}
          <div className="absolute right-3 top-4 flex flex-col gap-2 z-10">
            <button
              onClick={handleSpin}
              className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border-0"
            >
              <RotateCcw size={16} className={`text-white transition-transform ${spinning ? 'rotate-180' : ''}`} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setHideModel(!hideModel)}
              className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border-0"
            >
              <EyeOff size={16} className="text-white" strokeWidth={1.5} />
            </button>
          </div>

          {/* Mannequin SVG */}
          <div className={`flex items-center justify-center pt-4 pb-4 transition-opacity duration-300 ${hideModel ? 'opacity-0' : 'opacity-100'}`}
            style={{ minHeight: 'clamp(180px, 30dvh, 290px)' }}>
            <svg viewBox="0 0 140 270" className={`w-40 drop-shadow-lg transition-transform duration-500 ${spinning ? 'scale-90' : 'scale-100'}`}>
              {/* Head */}
              <circle cx="70" cy="24" r="16" fill="#d4a88a" />
              {/* Neck */}
              <rect x="65" y="38" width="10" height="10" rx="4" fill="#d4a88a" />
              {/* Suit jacket body */}
              <path d="M32 48 Q48 44 70 44 Q92 44 108 48 L116 106 Q96 114 70 114 Q44 114 24 106 Z" fill="#1e3a5f" />
              {/* Shirt visible centre */}
              <path d="M70 44 L62 58 L70 66 L78 58 Z" fill="#f8fafc" />
              {/* Left arm */}
              <path d="M32 48 L14 100 Q11 106 14 108 L28 111 Q32 109 34 104 L48 58 Z" fill="#1e3a5f" />
              {/* Right arm */}
              <path d="M108 48 L126 100 Q129 106 126 108 L112 111 Q108 109 106 104 L92 58 Z" fill="#1e3a5f" />
              {/* Lapels */}
              <path d="M70 44 L55 60 L62 58 Z" fill="#1a3050" />
              <path d="M70 44 L85 60 L78 58 Z" fill="#1a3050" />
              {/* Trousers */}
              <path d="M24 106 Q44 114 70 114 Q96 114 116 106 L120 190 L88 190 L70 150 L52 190 L20 190 Z" fill="#111827" />
              {/* Left shoe */}
              <path d="M20 190 L52 190 L55 215 Q53 220 38 221 L16 221 Q14 220 14 217 Z" fill={outfit?.shoeColor || '#92400e'} />
              <path d="M14 217 Q12 221 18 223 L50 223 Q54 223 55 220 L55 218 Z" fill={outfit?.shoeColor || '#92400e'} opacity="0.7" />
              {/* Right shoe */}
              <path d="M88 190 L120 190 L126 215 Q124 220 109 221 L87 221 Q85 220 85 217 Z" fill={outfit?.shoeColor || '#92400e'} />
              <path d="M85 217 Q83 221 89 223 L121 223 Q125 223 126 220 L126 218 Z" fill={outfit?.shoeColor || '#92400e'} opacity="0.7" />
              {/* Pocket square hint */}
              <path d="M88 62 L92 56 L96 60 L92 64 Z" fill="#f59e0b" opacity="0.8" />
            </svg>
          </div>

          {/* Outfit navigation dots */}
          {outfits.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
              {outfits.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentOutfit(i)}
                  className={`rounded-full transition-all border-0 p-0 ${i === currentOutfit ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── View Tabs ──────────────────────────────────────────────── */}
        <div className="flex gap-2 px-4 mt-4">
          {viewTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setViewTab(tab)}
              className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest border-0 transition-all ${
                viewTab === tab ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Garment Sections ──────────────────────────────────────── */}
        {garments.map((section, sIdx) => (
          <div key={section.label} className="mt-4 px-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] uppercase tracking-[0.16em] text-gray-400 font-semibold">{section.label}</p>
              <span className="text-[8px] text-amber-600 font-bold uppercase tracking-wide">{section.badge}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {section.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => selectGarment(sIdx, item.id)}
                  className={`flex-shrink-0 w-36 rounded-2xl overflow-hidden border-2 transition-all bg-transparent text-left ${
                    item.selected ? 'border-blue-500' : 'border-gray-100'
                  }`}
                >
                  {/* Image or color block */}
                  <div className="relative h-28 overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full" style={{ backgroundColor: item.color }} />
                    )}
                    {item.selected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                        <Check size={12} className="text-white" strokeWidth={2.5} />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 bg-white">
                    <p className="text-[9px] font-semibold text-black leading-tight">{item.name}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{item.price}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="h-4" />
      </div>

      {/* ── Bottom Section: CTA + Nav ───────────────────────────────────── */}
      <div className="bg-white border-t border-gray-100">
        {/* CTA row */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <button
            onClick={() => setSaved(!saved)}
            className={`flex items-center gap-2 px-5 h-12 rounded-2xl border-2 transition-all text-[10px] font-bold uppercase tracking-widest ${
              saved ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200'
            }`}
          >
            <Bookmark size={16} className={saved ? 'fill-white text-white' : 'text-black'} strokeWidth={1.5} />
            Save
          </button>
          <button className="flex-1 h-12 rounded-2xl bg-black text-white flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest border-0">
            <ShoppingBag size={16} strokeWidth={1.5} />
            Checkout (€ {totalEur.toLocaleString('de-DE')})
          </button>
        </div>
      </div>
    </div>
  )
}
