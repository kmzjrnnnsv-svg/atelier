import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Bell, CheckCircle, ChevronRight, BookOpen, Footprints } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import useAtelierStore from '../store/atelierStore'

const tabs = [
  { id: 'SIZE',    label: 'SIZE',    sub: 'Maße' },
  { id: 'CATALOG', label: 'CATALOG', sub: 'Modelle' },
  { id: 'GENERAL', label: 'GENERAL', sub: 'Fußform' },
  { id: 'MYSELF',  label: 'MYSELF',  sub: 'Notizen' },
]

const styleCards = [
  {
    label: 'Modern Business',
    desc:  'Sharp, tailored',
    active: true,
    gradient: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=300&q=80&fit=crop',
  },
  {
    label: 'Classic',
    desc:  'Timeless, refined',
    active: false,
    gradient: 'linear-gradient(135deg, #78716c 0%, #a8a29e 100%)',
    image: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=300&q=80&fit=crop',
  },
  {
    label: 'Weekend',
    desc:  'Relaxed, smart',
    active: false,
    gradient: 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
    image: null,
  },
]

export default function Profile() {
  const navigate   = useNavigate()
  const { user }   = useAuth()
  const { favorites, orders } = useAtelierStore()
  const [activeTab, setActiveTab] = useState('SIZE')

  const initials = (user?.name || 'A').charAt(0).toUpperCase()

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white flex items-center justify-between px-5 pt-4 pb-4">
        <button onClick={() => navigate('/settings')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center border-0">
          <Settings size={17} strokeWidth={1.5} className="text-gray-700" />
        </button>
        <span className="text-sm font-bold tracking-wide text-black">My Profile</span>
        <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center border-0 relative">
          <Bell size={17} strokeWidth={1.5} className="text-gray-700" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
        </button>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Profile Hero */}
        <div className="bg-white px-5 pt-5 pb-6 border-b border-gray-100">
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md"
                style={{ background: 'linear-gradient(135deg, #d1d5db, #9ca3af)' }}>
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-4xl font-bold text-white font-playfair">{initials}</span>
                </div>
              </div>
              <div className="absolute bottom-0.5 right-0.5 w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                <CheckCircle size={11} className="text-white fill-white" strokeWidth={0} />
              </div>
            </div>

            <h2 className="text-xl font-bold text-black font-playfair">{user?.name || 'Alex Sterling'}</h2>
            <div className="mt-1.5 px-3 py-1 rounded-full border" style={{ background: '#fef9f0', borderColor: '#f5d88c' }}>
              <span className="text-[8px] uppercase tracking-[0.2em] font-bold" style={{ color: '#b45309' }}>
                Platinum Member
              </span>
            </div>
          </div>

          <div className="flex mt-5 divide-x divide-gray-100">
            {[
              { label: 'Orders',  value: orders.length,   path: '/orders'   },
              { label: 'Wishlist',value: favorites.length, path: '/wishlist' },
              { label: 'Reviews', value: '–',              path: null        },
            ].map(({ label, value, path }) => (
              <button
                key={label}
                onClick={() => path && navigate(path)}
                className={`flex-1 text-center bg-transparent border-0 py-1 ${path ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <p className="text-lg font-bold text-black">{value}</p>
                <p className="text-[8px] uppercase tracking-widest text-gray-400 mt-0.5">{label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 3D Scan Card */}
        <div
          className="mx-4 mt-4 rounded-2xl overflow-hidden cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}
          onClick={() => navigate('/scan')}
        >
          <div className="p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded flex items-center justify-center bg-teal-500/20">
                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="#2dd4bf" strokeWidth="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="text-[8px] uppercase tracking-widest text-teal-400 font-semibold">AI Lab</span>
              </div>
              <h3 className="text-base font-bold text-white">3D Foot Scan</h3>
              <p className="text-[9px] text-gray-400 mt-1 leading-relaxed">
                Update your precision model for the perfect bespoke fit using AI.
              </p>
              <button
                onClick={e => { e.stopPropagation(); navigate('/scan') }}
                className="mt-3 flex items-center gap-1.5 bg-white text-black text-[9px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border-0"
              >
                Start New Scan →
              </button>
            </div>
            <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 60 60" className="w-14 opacity-60">
                <ellipse cx="30" cy="52" rx="22" ry="5" fill="#2dd4bf" opacity="0.3" />
                <path d="M12 45 Q10 50 15 52 L45 52 Q50 52 50 45 L48 35 Q46 26 40 24 L22 24 Q15 24 13 30 Z" fill="#2dd4bf" opacity="0.4" />
                <path d="M13 30 Q11 20 18 14 L30 12 Q40 11 45 18 Q48 23 48 35 L40 24 L22 24 Q15 24 13 30 Z" fill="#2dd4bf" opacity="0.3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Saved Dimensions */}
        <div className="bg-white mx-4 mt-4 rounded-2xl overflow-hidden border border-gray-100">
          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            <p className="text-sm font-bold text-black">Saved Dimensions</p>
            <button
              onClick={() => navigate('/my-scans')}
              className="text-[9px] uppercase tracking-widest text-blue-500 font-bold bg-transparent border-0 p-0"
            >
              HISTORY
            </button>
          </div>

          <div className="flex border-b border-gray-100 mt-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 text-center border-b-2 transition-all bg-transparent border-l-0 border-r-0 border-t-0 ${
                  activeTab === tab.id ? 'text-black border-black' : 'text-gray-400 border-transparent'
                }`}
              >
                <span className="text-[8px] uppercase tracking-widest font-bold block">{tab.label}</span>
                <span className="text-[7px] text-gray-400 block mt-0.5">{tab.sub}</span>
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === 'SIZE' && (
              <div className="space-y-3">
                {[['EU Size', '43'], ['US Size', '10.5'], ['UK Size', '9'], ['Foot Width', '97.4 mm'], ['Foot Length', '265.8 mm']].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center">
                    <span className="text-[9px] uppercase tracking-widest text-gray-400">{k}</span>
                    <span className="text-sm font-bold text-black">{v}</span>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'CATALOG' && (
              <div className="grid grid-cols-3 gap-2">
                {['Oxford', 'Loafer', 'Derby', 'Boot', 'Chelsea', 'Monk'].map(type => (
                  <div key={type} className="bg-gray-50 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] uppercase tracking-widest text-gray-500">{type}</p>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'GENERAL' && (
              <div className="space-y-3">
                {[['Arch Type', 'Medium Neutral'], ['Instep', 'Standard'], ['Toe Box', 'Medium Round']].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center">
                    <span className="text-[9px] uppercase tracking-widest text-gray-400">{k}</span>
                    <span className="text-sm font-semibold text-black">{v}</span>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'MYSELF' && (
              <p className="text-xs text-gray-600 italic leading-relaxed">
                "Slightly wider in the forefoot. Prefer a snug heel counter. Ideal for dress occasions and business settings."
              </p>
            )}
          </div>
        </div>

        {/* Arch Type */}
        <div className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[8px] uppercase tracking-widest text-gray-400 font-semibold">Arch Type</p>
            <p className="text-base font-bold text-black mt-0.5">Medium Neutral Arch</p>
            <p className="text-[9px] text-gray-400">Balanced · Standard insole</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
            <svg viewBox="0 0 40 30" className="w-10">
              <path d="M2 24 Q10 26 20 24 Q30 22 38 24" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M2 24 Q6 14 10 11 Q15 8 20 9 Q25 10 30 14 Q34 17 38 24" stroke="#d1d5db" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Aesthetic Profile */}
        <div className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-gray-100">
          <p className="text-sm font-bold text-black">Aesthetic Profile</p>
          <p className="text-[9px] text-gray-400 mt-0.5 mb-3">Curating your bespoke collection.</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {styleCards.map(card => (
              <div
                key={card.label}
                className="flex-shrink-0 w-36 h-24 rounded-2xl overflow-hidden relative cursor-pointer"
              >
                {card.image ? (
                  <img src={card.image} alt={card.label} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0" style={{ background: card.gradient }} />
                )}
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                {card.active && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg viewBox="0 0 16 16" className="w-3 h-3" fill="white"><path d="M13.5 4.5l-7 7-3-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-[9px] font-bold text-white leading-tight">{card.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="mx-4 mt-3 mb-4 bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          {[
            {
              icon: () => <Footprints size={16} className="text-teal-500" />,
              label: 'Meine Scans',
              sub:   'Fußscan-Verlauf · 3D-Modelle',
              path:  '/my-scans',
            },
            {
              icon: () => <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>,
              label: 'Outfit Visualization',
              sub:   'Preview with your wardrobe',
              path:  '/visualizer',
            },
            {
              icon: () => <BookOpen size={16} className="text-amber-500" />,
              label: 'Schuh-Info & Gesundheit',
              sub:   'Folgen von falschem Schuhwerk',
              path:  '/health',
            },
          ].map(({ icon: Icon, label, sub, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="w-full flex items-center justify-between p-4 bg-transparent border-0 text-left active:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
                  <Icon />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-gray-400">{sub}</p>
                  <p className="text-sm font-semibold text-black mt-0.5">{label}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          ))}
        </div>

        <div className="h-24" />
      </div>

    </div>
  )
}
