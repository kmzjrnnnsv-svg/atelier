import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Bell, CheckCircle, ChevronRight, BookOpen, Footprints, X, BellRing, Award, Crown, Gem, Shield, Star, Lock, ChevronDown, ChevronUp, Edit3 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import useAtelierStore from '../store/atelierStore'
import { apiFetch } from '../hooks/useApi'

const TIER_ICONS = { Award, Crown, Gem, Shield, Star }

const tabs = [
  { id: 'SIZE',    label: 'SIZE',    sub: 'Maße' },
  { id: 'GENERAL', label: 'GENERAL', sub: 'Fußform' },
  { id: 'MYSELF',  label: 'MYSELF',  sub: 'Notizen' },
]

// ── Foot Archetypes ────────────────────────────────────────────────────────
const ARCHETYPES = [
  { key: 'egyptian',    label: 'Ägyptischer Fuß',   desc: 'Großer Zeh ist der längste. Häufigster Fußtyp.' },
  { key: 'roman',       label: 'Römischer Fuß',     desc: 'Die ersten 2–3 Zehen sind gleich lang. Breiter Vorfuß.' },
  { key: 'greek',       label: 'Griechischer Fuß',  desc: 'Zweiter Zeh ist länger als der große Zeh.' },
  { key: 'germanic',    label: 'Germanischer Fuß',  desc: 'Alle Zehen ähnlich lang. Sehr breiter Vorfuß.' },
  { key: 'celtic',      label: 'Keltischer Fuß',    desc: 'Großer Zeh kurz, zweiter lang, restliche absteigend.' },
]

function determineArchtype(scan) {
  if (!scan) return null
  const rw = Number(scan.right_width), rl = Number(scan.right_length)
  const lw = Number(scan.left_width),  ll = Number(scan.left_length)
  const avgRatio = ((rw / rl) + (lw / ll)) / 2
  // Heuristic from width/length ratio
  if (avgRatio > 0.40) return 'germanic'
  if (avgRatio > 0.38) return 'roman'
  if (avgRatio > 0.36) return 'egyptian'
  if (avgRatio > 0.34) return 'greek'
  return 'celtic'
}

function archLabel(scan) {
  if (!scan) return null
  const ra = Number(scan.right_arch), la = Number(scan.left_arch)
  const avg = (ra + la) / 2
  if (avg > 18) return 'Hohes Gewölbe'
  if (avg > 12) return 'Normales Gewölbe'
  return 'Flaches Gewölbe'
}

// ── Swipe hook ─────────────────────────────────────────────────────────────
function useSwipeTabs(items, activeKey, setActiveKey) {
  const startX = useRef(0)
  const startY = useRef(0)
  const onTouchStart = useCallback(e => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }, [])
  const onTouchEnd = useCallback(e => {
    const dx = e.changedTouches[0].clientX - startX.current
    const dy = e.changedTouches[0].clientY - startY.current
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return
    const idx = items.indexOf(activeKey)
    if (dx < 0 && idx < items.length - 1) setActiveKey(items[idx + 1])
    if (dx > 0 && idx > 0) setActiveKey(items[idx - 1])
  }, [items, activeKey, setActiveKey])
  return { onTouchStart, onTouchEnd }
}

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
  const { favorites, orders, notifications, markAllNotificationsRead, loyaltyTiers, loyaltyStatus, latestScan, refreshScan, footNotes, saveFootNotes } = useAtelierStore()
  const [activeTab, setActiveTab] = useState('SIZE')
  const [showNotifs, setShowNotifs] = useState(false)
  const [showLoyalty, setShowLoyalty] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [noteText, setNoteText] = useState('')
  const unreadCount = notifications.filter(n => !n.read).length

  const tabKeys = tabs.map(t => t.id)
  const swipeHandlers = useSwipeTabs(tabKeys, activeTab, setActiveTab)

  const scanArchtype = determineArchtype(latestScan)
  const scanArchInfo = ARCHETYPES.find(a => a.key === scanArchtype)
  const scanArchLabel = archLabel(latestScan)

  const initials = (user?.name || 'A').charAt(0).toUpperCase()

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden relative">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white flex items-center justify-between px-5 pt-4 pb-4">
        <button onClick={() => navigate('/settings')} className="w-9 h-9 flex items-center justify-center border border-black/10 bg-transparent">
          <Settings size={17} strokeWidth={1.5} className="text-black/60" />
        </button>
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-black">My Profile</span>
        <button
          onClick={() => { setShowNotifs(v => !v); if (!showNotifs && unreadCount) markAllNotificationsRead() }}
          className="w-9 h-9 flex items-center justify-center border border-black/10 bg-transparent relative"
        >
          <Bell size={17} strokeWidth={1.5} className="text-black/60" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-black border-2 border-white flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">{unreadCount}</span>
            </span>
          )}
        </button>
      </div>

      {/* ── Notification Panel (slide in from right) ─────────────────── */}
      <div className="absolute top-0 right-0 bottom-0 bg-white shadow-2xl z-50 flex flex-col"
        style={{ width: 'min(340px, 85vw)', transform: showNotifs ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-black/5">
          <h3 className="text-[12px] uppercase tracking-[0.18em] text-black font-medium">Benachrichtigungen</h3>
          <button onClick={() => setShowNotifs(false)} className="w-9 h-9 flex items-center justify-center border border-black/10 bg-transparent">
            <X size={17} strokeWidth={1.5} className="text-black/60" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <BellRing size={32} className="text-black/10 mb-3" />
              <p className="text-[11px] text-black/40">Keine Benachrichtigungen</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.slice(0, 20).map(n => (
                <div key={n.id} className="border border-black/8 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium text-black">{n.title}</p>
                    <span className="text-[8px] uppercase tracking-wider text-black/30">
                      {new Date(n.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[9px] text-black/40 mt-0.5">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-5 pb-5 pt-3 border-t border-black/5">
          <button onClick={() => { setShowNotifs(false); if (unreadCount) markAllNotificationsRead() }}
            className="w-full py-3 bg-black text-white text-[10px] uppercase tracking-[0.18em] font-medium border-0">
            Alle als gelesen markieren
          </button>
        </div>
      </div>
      {showNotifs && <div className="absolute inset-0 bg-black/30 z-40" onClick={() => setShowNotifs(false)} />}

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Profile Hero */}
        <div className="bg-white px-5 pt-5 pb-6 border-b border-black/8">
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-black/10"
                style={{ background: 'linear-gradient(135deg, #d1d5db, #9ca3af)' }}>
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-4xl font-bold text-white font-playfair">{initials}</span>
                </div>
              </div>
              <div className="absolute bottom-0.5 right-0.5 w-6 h-6 bg-black border-2 border-white flex items-center justify-center">
                <CheckCircle size={11} className="text-white fill-white" strokeWidth={0} />
              </div>
            </div>

            <h2 className="text-xl font-bold text-black font-playfair">{user?.name || 'Alex Sterling'}</h2>
            {(() => {
              const sorted = [...loyaltyTiers].sort((a, b) => a.sortOrder - b.sortOrder)
              const currentTier = sorted.find(t => t.key === loyaltyStatus.tier) || sorted[0]
              if (!currentTier) return null
              const TierIcon = TIER_ICONS[currentTier.icon] || Award
              return (
                <button
                  onClick={() => setShowLoyalty(v => !v)}
                  className="mt-1.5 px-3 py-1.5 border border-black/15 bg-transparent flex items-center gap-1.5"
                  style={{ background: `${currentTier.color}10` }}
                >
                  <TierIcon size={10} style={{ color: currentTier.color }} />
                  <span className="text-[8px] uppercase tracking-[0.2em] font-bold" style={{ color: currentTier.color }}>
                    {currentTier.label} Member
                  </span>
                  <span className="text-[8px] text-black/30 ml-1">·</span>
                  <span className="text-[8px] text-black/40 font-mono">{loyaltyStatus.points.toLocaleString()} Pkt.</span>
                </button>
              )
            })()}
          </div>

          <div className="flex mt-5 divide-x divide-black/8">
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
                <p className="text-lg font-light text-black">{value}</p>
                <p className="text-[8px] uppercase tracking-widest text-black/40 mt-0.5">{label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Loyalty Tiers Section */}
        {showLoyalty && (() => {
          const sorted = [...loyaltyTiers].sort((a, b) => a.sortOrder - b.sortOrder)
          const currentTier = sorted.find(t => t.key === loyaltyStatus.tier)
          const currentIdx = sorted.findIndex(t => t.key === loyaltyStatus.tier)
          const nextTier = sorted[currentIdx + 1]
          const points = loyaltyStatus.points

          return (
            <div className="bg-[#f6f5f3] border-b border-black/8">
              {/* Progress bar */}
              {nextTier && (
                <div className="px-5 pt-4 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] uppercase tracking-widest text-black/40 font-semibold">Fortschritt</span>
                    <span className="text-[9px] text-black/50">
                      {points.toLocaleString()} / {nextTier.minPoints.toLocaleString()} Punkte
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-black/8">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.min(100, (points / nextTier.minPoints) * 100)}%`,
                        backgroundColor: currentTier?.color || '#000',
                      }}
                    />
                  </div>
                  <p className="text-[9px] text-black/40 mt-1.5">
                    Noch {(nextTier.minPoints - points).toLocaleString()} Punkte bis <span className="font-semibold" style={{ color: nextTier.color }}>{nextTier.label}</span>
                  </p>
                </div>
              )}

              {/* Tier cards */}
              <div className="px-5 pb-4 space-y-2">
                {sorted.map((tier, idx) => {
                  const isActive = tier.key === loyaltyStatus.tier
                  const isReached = points >= tier.minPoints
                  const isHidden = !tier.visible && !isReached
                  const TIcon = TIER_ICONS[tier.icon] || Award

                  if (isHidden) {
                    return (
                      <div key={tier.id} className="border border-black/5 bg-white/60 p-3 flex items-center gap-3">
                        <div className="w-9 h-9 flex items-center justify-center bg-black/5">
                          <Lock size={14} className="text-black/20" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[9px] text-black/25 uppercase tracking-widest font-semibold">Geheimer Status</p>
                          <p className="text-[9px] text-black/20 mt-0.5">Wird bei Erreichen freigeschaltet</p>
                        </div>
                        <span className="text-[8px] text-black/20 font-mono">{tier.minPoints.toLocaleString()} Pkt.</span>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={tier.id}
                      className={`border p-3 ${isActive ? 'border-black/15 bg-white' : isReached ? 'border-black/8 bg-white/80' : 'border-black/5 bg-white/50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: isReached ? tier.color : `${tier.color}20` }}>
                          <TIcon size={16} color={isReached ? 'white' : tier.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-xs font-semibold ${isActive ? 'text-black' : isReached ? 'text-black/70' : 'text-black/35'}`}>
                              {tier.label}
                            </p>
                            {isActive && (
                              <span className="text-[7px] uppercase tracking-widest font-bold px-1.5 py-0.5" style={{ backgroundColor: `${tier.color}15`, color: tier.color }}>
                                Aktuell
                              </span>
                            )}
                            {isReached && !isActive && (
                              <CheckCircle size={11} className="text-green-500" />
                            )}
                          </div>
                          {tier.description && (
                            <p className="text-[9px] text-black/40 mt-0.5 leading-relaxed line-clamp-2">{tier.description}</p>
                          )}
                        </div>
                        <span className="text-[8px] text-black/30 font-mono flex-shrink-0">{tier.minPoints.toLocaleString()}</span>
                      </div>

                      {/* Benefits for active tier */}
                      {isActive && tier.benefits?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-black/5 space-y-1.5">
                          <p className="text-[8px] uppercase tracking-widest text-black/30 font-semibold">Ihre Vorteile</p>
                          {tier.benefits.map((b, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className="w-1 h-1 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: tier.color }} />
                              <span className="text-[10px] text-black/55 leading-relaxed">{b}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Points info */}
              <div className="px-5 pb-4">
                <p className="text-[8px] text-black/25 leading-relaxed">
                  Punkte werden bei jeder Bestellung automatisch gutgeschrieben. 1€ = 1 Punkt.
                </p>
              </div>
            </div>
          )
        })()}

        {/* 3D Scan Card */}
        <div
          className="overflow-hidden cursor-pointer border-b border-black/8"
          style={{ background: '#1a1a1a' }}
          onClick={() => navigate('/scan')}
        >
          <div className="p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 flex items-center justify-center bg-teal-500/20">
                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="#2dd4bf" strokeWidth="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="text-[8px] uppercase tracking-widest text-teal-400 font-semibold">AI Lab</span>
              </div>
              <h3 className="text-base font-bold text-white">3D Foot Scan</h3>
              <p className="text-[9px] text-white/40 mt-1 leading-relaxed">
                Update your precision model for the perfect bespoke fit using AI.
              </p>
              <button
                onClick={e => { e.stopPropagation(); navigate('/scan') }}
                className="mt-3 flex items-center gap-1.5 bg-white text-black text-[9px] font-bold uppercase tracking-widest px-4 py-2 border-0"
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
        {latestScan ? (
        <div className="bg-white overflow-hidden border-b border-black/8">
          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-black">Saved Dimensions</p>
            <button
              onClick={() => navigate('/my-scans')}
              className="text-[9px] uppercase tracking-widest text-black/50 font-bold bg-transparent border-0 p-0"
            >
              HISTORY
            </button>
          </div>

          <div className="flex border-b border-black/8 mt-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 text-center border-b-2 transition-all bg-transparent border-l-0 border-r-0 border-t-0 ${
                  activeTab === tab.id ? 'text-black border-black' : 'text-black/40 border-transparent'
                }`}
              >
                <span className="text-[8px] uppercase tracking-widest font-bold block">{tab.label}</span>
                <span className="text-[7px] text-black/40 block mt-0.5">{tab.sub}</span>
              </button>
            ))}
          </div>

          <div className="p-4" style={{ minHeight: 220 }} {...swipeHandlers}>
            {activeTab === 'SIZE' && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center py-1">
                  <span className="text-[9px] uppercase tracking-widest text-black/40">Schuhgröße</span>
                  <span className="text-sm font-bold text-black">EU {latestScan.eu_size} · UK {latestScan.uk_size} · US {latestScan.us_size}</span>
                </div>
                <div className="border-t border-black/5 pt-2 mt-2">
                  <p className="text-[8px] uppercase tracking-widest text-black/30 mb-2" style={{ letterSpacing: '0.15em' }}>Rechts</p>
                  {[
                    ['Länge', `${Number(latestScan.right_length).toFixed(1)} mm`],
                    ['Breite', `${Number(latestScan.right_width).toFixed(1)} mm`],
                    ['Gewölbe', `${Number(latestScan.right_arch).toFixed(1)} mm`],
                    ...(latestScan.right_ball_girth ? [['Ballenumfang', `${Number(latestScan.right_ball_girth).toFixed(1)} mm`]] : []),
                    ...(latestScan.right_instep_girth ? [['Ristumfang', `${Number(latestScan.right_instep_girth).toFixed(1)} mm`]] : []),
                    ...(latestScan.right_heel_girth ? [['Fersenumfang', `${Number(latestScan.right_heel_girth).toFixed(1)} mm`]] : []),
                    ...(latestScan.right_waist_girth ? [['Gelenkweite', `${Number(latestScan.right_waist_girth).toFixed(1)} mm`]] : []),
                    ...(latestScan.right_ankle_girth ? [['Knöchel', `${Number(latestScan.right_ankle_girth).toFixed(1)} mm`]] : []),
                    ...(latestScan.right_foot_height ? [['Fußhöhe', `${Number(latestScan.right_foot_height).toFixed(1)} mm`]] : []),
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center py-0.5">
                      <span className="text-[9px] text-black/40">{k}</span>
                      <span className="text-[11px] font-semibold text-black">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-black/5 pt-2 mt-2">
                  <p className="text-[8px] uppercase tracking-widest text-black/30 mb-2" style={{ letterSpacing: '0.15em' }}>Links</p>
                  {[
                    ['Länge', `${Number(latestScan.left_length).toFixed(1)} mm`],
                    ['Breite', `${Number(latestScan.left_width).toFixed(1)} mm`],
                    ['Gewölbe', `${Number(latestScan.left_arch).toFixed(1)} mm`],
                    ...(latestScan.left_ball_girth ? [['Ballenumfang', `${Number(latestScan.left_ball_girth).toFixed(1)} mm`]] : []),
                    ...(latestScan.left_instep_girth ? [['Ristumfang', `${Number(latestScan.left_instep_girth).toFixed(1)} mm`]] : []),
                    ...(latestScan.left_heel_girth ? [['Fersenumfang', `${Number(latestScan.left_heel_girth).toFixed(1)} mm`]] : []),
                    ...(latestScan.left_waist_girth ? [['Gelenkweite', `${Number(latestScan.left_waist_girth).toFixed(1)} mm`]] : []),
                    ...(latestScan.left_ankle_girth ? [['Knöchel', `${Number(latestScan.left_ankle_girth).toFixed(1)} mm`]] : []),
                    ...(latestScan.left_foot_height ? [['Fußhöhe', `${Number(latestScan.left_foot_height).toFixed(1)} mm`]] : []),
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center py-0.5">
                      <span className="text-[9px] text-black/40">{k}</span>
                      <span className="text-[11px] font-semibold text-black">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'GENERAL' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] uppercase tracking-widest text-black/40">Fußtyp</span>
                  <span className="text-sm font-semibold text-black">{scanArchInfo?.label || '—'}</span>
                </div>
                <p className="text-[9px] text-black/40 leading-relaxed -mt-1">{scanArchInfo?.desc}</p>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] uppercase tracking-widest text-black/40">Gewölbe</span>
                  <span className="text-sm font-semibold text-black">{scanArchLabel || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] uppercase tracking-widest text-black/40">Genauigkeit</span>
                  <span className="text-sm font-semibold text-black">{Number(latestScan.accuracy).toFixed(1)}%</span>
                </div>
                <div className="border-t border-black/5 pt-3 mt-2">
                  <p className="text-[8px] uppercase tracking-widest text-black/30 mb-2" style={{ letterSpacing: '0.15em' }}>Alle Fußtypen</p>
                  {ARCHETYPES.map(a => (
                    <div key={a.key} className={`flex items-center gap-3 py-2 ${a.key === scanArchtype ? 'bg-[#f6f5f3] px-2 -mx-2' : ''}`}>
                      <div className={`w-1.5 h-1.5 flex-shrink-0 ${a.key === scanArchtype ? 'bg-black' : 'bg-black/15'}`} />
                      <div className="flex-1">
                        <p className={`text-[10px] ${a.key === scanArchtype ? 'font-semibold text-black' : 'text-black/50'}`}>{a.label}</p>
                        <p className="text-[8px] text-black/30 mt-0.5">{a.desc}</p>
                      </div>
                      {a.key === scanArchtype && <span className="text-[8px] uppercase tracking-widest text-black/40 font-bold">Dein Typ</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'MYSELF' && (
              <div>
                {editingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      maxLength={1000}
                      className="w-full border border-black/10 bg-[#f6f5f3] p-3 text-[11px] text-black leading-relaxed resize-none focus:outline-none focus:border-black/30"
                      rows={4}
                      placeholder="Persönliche Notizen zu deinen Füßen..."
                      autoFocus
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] text-black/30">{noteText.length}/1000</span>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingNotes(false)} className="px-3 py-1.5 text-[10px] text-black/40 bg-transparent border border-black/10">Abbrechen</button>
                        <button
                          onClick={async () => {
                            await saveFootNotes(noteText)
                            setEditingNotes(false)
                          }}
                          className="px-3 py-1.5 text-[10px] text-white bg-black border-0 font-semibold"
                        >Speichern</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setNoteText(footNotes || ''); setEditingNotes(true) }}
                    className="w-full text-left bg-transparent border-0 p-0 group"
                  >
                    {footNotes ? (
                      <div className="flex items-start gap-2">
                        <p className="text-[11px] text-black/60 italic leading-relaxed flex-1">"{footNotes}"</p>
                        <Edit3 size={12} className="text-black/20 mt-0.5 flex-shrink-0 group-hover:text-black/40" strokeWidth={1.5} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 py-2 text-black/30">
                        <Edit3 size={13} strokeWidth={1.5} />
                        <span className="text-[10px]">Tippe hier, um persönliche Notizen hinzuzufügen…</span>
                      </div>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        ) : null}

        {/* Aesthetic Profile */}
        <div className="bg-white p-4 border-b border-black/8">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-black">Aesthetic Profile</p>
          <p className="text-[9px] text-black/40 mt-0.5 mb-3">Dein persönlicher Stil für maßgefertigte Schuhe.</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {styleCards.map(card => (
              <div
                key={card.label}
                className="flex-shrink-0 w-36 h-24 overflow-hidden relative cursor-pointer active:scale-95 transition-transform"
              >
                {card.image ? (
                  <img src={card.image} alt={card.label} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0" style={{ background: card.gradient }} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                {card.active && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-black flex items-center justify-center">
                    <svg viewBox="0 0 16 16" className="w-3 h-3" fill="white"><path d="M13.5 4.5l-7 7-3-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-[9px] font-bold text-white leading-tight">{card.label}</p>
                  <p className="text-[7px] text-white/50 mt-0.5">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white border-b border-black/8 divide-y divide-black/5 overflow-hidden">
          {[
            {
              icon: () => <Footprints size={16} className="text-teal-500" strokeWidth={1.5} />,
              label: 'Meine Scans',
              sub:   'Fußscan-Verlauf · 3D-Modelle',
              path:  '/my-scans',
            },
            {
              icon: () => <svg viewBox="0 0 24 24" className="w-4 h-4 text-black" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>,
              label: 'Outfit Visualization',
              sub:   'Vorschau mit deiner Garderobe',
              path:  '/visualizer',
            },
            {
              icon: () => <BookOpen size={16} className="text-amber-500" strokeWidth={1.5} />,
              label: 'Schuh-Info & Gesundheit',
              sub:   'Folgen von falschem Schuhwerk',
              path:  '/health',
            },
          ].map(({ icon: Icon, label, sub, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="w-full flex items-center justify-between p-4 bg-transparent border-0 text-left active:bg-black/3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black/5 flex items-center justify-center">
                  <Icon />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-black/40">{sub}</p>
                  <p className="text-sm font-semibold text-black mt-0.5">{label}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-black/20" strokeWidth={1.5} />
            </button>
          ))}
        </div>

        <div className="h-4" />
      </div>

    </div>
  )
}
