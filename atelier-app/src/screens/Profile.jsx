/**
 * Profile.jsx — LV-inspired profile page
 * Warm tones, elegant typography, generous whitespace
 */
import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ChevronRight, BookOpen, Footprints, Award, Crown, Gem, Shield, Star, Lock, ChevronDown, ChevronUp, Edit3, Package, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import useAtelierStore from '../store/atelierStore'
import { apiFetch } from '../hooks/useApi'
import { isMobileWeb } from '../App'
import CtaBanner from '../components/CtaBanner'
import { SHOES, LIFESTYLE, HEROES } from '../lib/editorialImages'

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

export default function Profile() {
  const navigate   = useNavigate()
  const { user }   = useAuth()
  const { favorites, orders, loyaltyTiers, loyaltyStatus, latestScan, averagedScan, refreshScan, footNotes, saveFootNotes } = useAtelierStore()
  const [activeTab, setActiveTab] = useState('SIZE')
  const [showLoyalty, setShowLoyalty] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editedValues, setEditedValues] = useState({})
  const [savingEdits, setSavingEdits] = useState(false)

  const tabKeys = tabs.map(t => t.id)
  const swipeHandlers = useSwipeTabs(tabKeys, activeTab, setActiveTab)

  const displayScan = (averagedScan?._bayesian?.scans_used > 1) ? averagedScan : latestScan
  const scanArchtype = determineArchtype(displayScan)
  const scanArchInfo = ARCHETYPES.find(a => a.key === scanArchtype)
  const scanArchLabel = archLabel(displayScan)

  const initials = (user?.name || 'A').charAt(0).toUpperCase()

  return (
    <div className="min-h-full bg-white">

      {/* ── Hero banner ──────────────────────────────────────────── */}
      <div className="relative">
        <div className="w-full overflow-hidden" style={{ aspectRatio: '16 / 5' }}>
          <img src={HEROES.profile} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 30%, rgba(255,255,255,0.95) 90%, white 100%)' }} />
      </div>

      {/* ── Hero header ─────────────────────────────────────────── */}
      <div className="px-5 lg:px-16 -mt-16 relative z-10 pb-6 lg:pb-8">
        <p className="text-[10px] lg:text-[11px] text-black/30 uppercase tracking-[0.25em] mb-3">Ihr Profil</p>

        {/* Profile info */}
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 bg-[#f6f5f3] flex items-center justify-center flex-shrink-0">
            <span className="text-[28px] font-extralight text-black/30" style={{ fontFamily: 'Georgia, serif' }}>{initials}</span>
          </div>
          <div>
            <h1 className="text-[24px] lg:text-[32px] font-extralight text-black tracking-tight">{user?.name || 'Alex Sterling'}</h1>
            {(() => {
              const sorted = [...loyaltyTiers].sort((a, b) => a.sortOrder - b.sortOrder)
              const currentTier = sorted.find(t => t.key === loyaltyStatus.tier) || sorted[0]
              if (!currentTier) return null
              const TierIcon = TIER_ICONS[currentTier.icon] || Award
              return (
                <button
                  onClick={() => setShowLoyalty(v => !v)}
                  className="mt-2 px-3 py-1.5 border border-black/10 bg-transparent flex items-center gap-2 hover:border-black/20 transition-colors"
                >
                  <TierIcon size={11} className="text-black/40" />
                  <span className="text-[10px] uppercase tracking-[0.15em] text-black/40 font-light">
                    {currentTier.label} Member
                  </span>
                  <span className="text-[10px] text-black/25 font-light">{loyaltyStatus.points.toLocaleString()} Pkt.</span>
                </button>
              )
            })()}
          </div>
        </div>

        {/* Stats */}
        <div className="flex mt-6 border-t border-black/[0.06] pt-5">
          {[
            { label: 'Bestellungen', value: orders.length,    path: '/orders' },
            { label: 'Favoriten',    value: favorites.length, path: '/wishlist' },
            { label: 'Bewertungen',  value: '–',              path: null },
          ].map(({ label, value, path }) => (
            <button
              key={label}
              onClick={() => path && navigate(path)}
              className={`flex-1 text-center bg-transparent border-0 py-1 ${path ? 'cursor-pointer hover:opacity-70' : 'cursor-default'} transition-opacity`}
            >
              <p className="text-[18px] font-extralight text-black">{value}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-black/25 mt-1 font-light">{label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Loyalty Tiers ──────────────────────────────────────── */}
      {showLoyalty && (() => {
        const sorted = [...loyaltyTiers].sort((a, b) => a.sortOrder - b.sortOrder)
        const currentTier = sorted.find(t => t.key === loyaltyStatus.tier)
        const currentIdx = sorted.findIndex(t => t.key === loyaltyStatus.tier)
        const nextTier = sorted[currentIdx + 1]
        const points = loyaltyStatus.points

        return (
          <div className="border-y border-black/[0.06]">
            {/* Progress */}
            {nextTier && (
              <div className="px-5 lg:px-16 pt-6 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-black/25 font-light">Fortschritt</span>
                  <span className="text-[11px] text-black/35 font-light">
                    {points.toLocaleString()} / {nextTier.minPoints.toLocaleString()} Punkte
                  </span>
                </div>
                <div className="w-full h-px bg-black/[0.08]">
                  <div className="h-full bg-black transition-all" style={{ width: `${Math.min(100, (points / nextTier.minPoints) * 100)}%` }} />
                </div>
                <p className="text-[11px] text-black/30 mt-2 font-light">
                  Noch {(nextTier.minPoints - points).toLocaleString()} Punkte bis <span className="text-black/50">{nextTier.label}</span>
                </p>
              </div>
            )}

            {/* Tier cards */}
            <div className="px-5 lg:px-16 pb-6 space-y-2">
              {sorted.map(tier => {
                const isActive = tier.key === loyaltyStatus.tier
                const isReached = points >= tier.minPoints
                const isHidden = !tier.visible && !isReached
                const TIcon = TIER_ICONS[tier.icon] || Award

                if (isHidden) {
                  return (
                    <div key={tier.id} className="border border-black/[0.06] p-4 flex items-center gap-3">
                      <div className="w-9 h-9 flex items-center justify-center bg-[#f6f5f3]">
                        <Lock size={14} className="text-black/15" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] text-black/20 uppercase tracking-[0.15em] font-light">Geheimer Status</p>
                        <p className="text-[10px] text-black/15 mt-0.5 font-light">Wird bei Erreichen freigeschaltet</p>
                      </div>
                      <span className="text-[10px] text-black/15 font-light">{tier.minPoints.toLocaleString()}</span>
                    </div>
                  )
                }

                return (
                  <div key={tier.id} className={`border p-4 ${isActive ? 'border-black/15' : 'border-black/[0.06]'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 bg-[#f6f5f3]">
                        <TIcon size={16} className={isReached ? 'text-black/60' : 'text-black/20'} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-[13px] ${isActive ? 'text-black' : isReached ? 'text-black/60' : 'text-black/25'} font-light`}>
                            {tier.label}
                          </p>
                          {isActive && (
                            <span className="text-[9px] uppercase tracking-[0.15em] text-black/30 font-light">Aktuell</span>
                          )}
                          {isReached && !isActive && (
                            <CheckCircle size={12} className="text-black/25" strokeWidth={1.5} />
                          )}
                        </div>
                        {tier.description && (
                          <p className="text-[11px] text-black/30 mt-0.5 leading-relaxed font-light line-clamp-2">{tier.description}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-black/20 font-light flex-shrink-0">{tier.minPoints.toLocaleString()}</span>
                    </div>

                    {isActive && tier.benefits?.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-black/[0.06] space-y-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-black/20 font-light">Ihre Vorteile</p>
                        {tier.benefits.map((b, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-1 h-1 bg-black/20 mt-1.5 flex-shrink-0" />
                            <span className="text-[11px] text-black/40 leading-relaxed font-light">{b}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="px-5 lg:px-16 pb-5">
              <p className="text-[10px] text-black/20 leading-relaxed font-light">
                Punkte werden bei jeder Bestellung automatisch gutgeschrieben. 1€ = 1 Punkt.
              </p>
            </div>
          </div>
        )
      })()}

      {/* ── 3D Scan Card (native only) ─────────────────────────── */}
      {!isMobileWeb && (
        <div className="px-5 lg:px-16 pt-6">
          <div
            className="group cursor-pointer bg-[#19110B] overflow-hidden"
            onClick={() => navigate('/scan')}
          >
            <div className="px-6 py-5 flex items-center gap-5">
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/25 mb-2">3D-Technologie</p>
                <p className="text-[16px] font-extralight text-white">3D Foot Scan</p>
                <p className="text-[11px] text-white/30 mt-1 font-light leading-relaxed">
                  Aktualisieren Sie Ihr Präzisionsmodell für die perfekte Passform.
                </p>
                <button
                  onClick={e => { e.stopPropagation(); navigate('/scan') }}
                  className="mt-4 px-5 py-2 bg-white text-black text-[10px] border-0 font-light hover:bg-white/90 transition-colors"
                  style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
                >
                  Neuen Scan starten
                </button>
              </div>
              <div className="w-16 h-16 flex items-center justify-center flex-shrink-0 opacity-30">
                <Footprints size={40} strokeWidth={0.5} className="text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Saved Dimensions ───────────────────────────────────── */}
      {displayScan ? (
        <div className="px-5 lg:px-16 pt-8">
          <div className="border border-black/[0.06]">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-black/25 font-light">Saved Dimensions</p>
                {averagedScan?._bayesian?.scans_used > 1 && (
                  <p className="text-[10px] text-black/20 mt-1 font-light">
                    Gemittelt aus {averagedScan._bayesian.scans_used} Scans
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setEditMode(m => !m); setEditedValues({}) }}
                  className={`text-[10px] uppercase tracking-[0.15em] font-light bg-transparent border border-black/10 px-3 py-1.5 hover:border-black/20 transition-colors ${editMode ? 'text-black border-black/20' : 'text-black/35'}`}
                >
                  {editMode ? 'Abbrechen' : 'Bearbeiten'}
                </button>
                <button
                  onClick={() => navigate('/my-scans')}
                  className="text-[10px] uppercase tracking-[0.15em] text-black/30 font-light bg-transparent border-0 p-0 hover:text-black/50 transition-colors"
                >
                  History
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-black/[0.06]">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 text-center bg-transparent border-l-0 border-r-0 border-t-0 transition-all ${
                    activeTab === tab.id ? 'text-black border-b-2 border-black' : 'text-black/25 border-b-2 border-transparent'
                  }`}
                >
                  <span className="text-[9px] uppercase tracking-[0.15em] font-light block">{tab.label}</span>
                  <span className="text-[8px] text-black/25 block mt-0.5 font-light">{tab.sub}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-5" style={{ minHeight: 220 }} {...swipeHandlers}>
              {activeTab === 'SIZE' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-black/25 font-light">Schuhgröße</span>
                    <span className="text-[13px] text-black font-light">EU {displayScan.eu_size} · UK {displayScan.uk_size} · US {displayScan.us_size}</span>
                  </div>
                  {['right', 'left'].map(side => {
                    const sideLabel = side === 'right' ? 'Rechts' : 'Links'
                    const fields = [
                      { label: 'Fußlänge',            key: `${side}_length`,           mfr: true },
                      { label: 'Breite',               key: `${side}_width` },
                      { label: 'Gewölbe',              key: `${side}_arch` },
                      { label: 'Ballenumfang',         key: `${side}_ball_girth`,       mfr: true },
                      { label: 'Ristumfang',           key: `${side}_instep_girth`,     mfr: true },
                      { label: 'Lg. Fersenumfang',     key: `${side}_long_heel_girth`,  mfr: true },
                      { label: 'Kz. Fersenumfang',     key: `${side}_short_heel_girth`, mfr: true },
                      { label: 'Fersenumfang',         key: `${side}_heel_girth` },
                      { label: 'Gelenkweite',          key: `${side}_waist_girth` },
                      { label: 'Knöchel',              key: `${side}_ankle_girth` },
                      { label: 'Fußhöhe',              key: `${side}_foot_height` },
                    ]
                    return (
                      <div key={side} className="border-t border-black/[0.04] pt-3 mt-3">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-black/20 mb-2 font-light">{sideLabel}</p>
                        {fields.map(({ label, key, mfr }) => {
                          const rawVal = displayScan[key]
                          const edited = editedValues[key]
                          const hasVal = rawVal != null || edited !== undefined
                          if (!editMode && !hasVal && !mfr) return null
                          return (
                            <div key={key} className="flex justify-between items-center py-1">
                              <span className={`text-[11px] ${mfr ? 'text-black/45' : 'text-black/30'} font-light`}>{label}</span>
                              {editMode ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.1"
                                    value={edited !== undefined ? edited : (rawVal != null ? Number(rawVal).toFixed(1) : '')}
                                    onChange={e => setEditedValues(v => ({ ...v, [key]: e.target.value }))}
                                    placeholder="—"
                                    className={`w-16 text-right text-[12px] bg-transparent border-0 border-b p-0 py-0.5 focus:outline-none font-light ${
                                      edited !== undefined ? 'text-black border-black/20' : 'text-black/50 border-black/[0.06]'
                                    }`}
                                  />
                                  <span className="text-[9px] text-black/20 font-light">mm</span>
                                </div>
                              ) : (
                                <span className="text-[12px] text-black/60 font-light">
                                  {rawVal != null ? `${Number(rawVal).toFixed(1)} mm` : '—'}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                  {editMode && Object.keys(editedValues).length > 0 && (
                    <button
                      onClick={async () => {
                        setSavingEdits(true)
                        try {
                          const scanId = latestScan?.id
                          if (!scanId) throw new Error('Kein Scan vorhanden')
                          const body = {}
                          for (const [key, val] of Object.entries(editedValues)) {
                            const numVal = parseFloat(val)
                            if (!isNaN(numVal)) body[key] = numVal
                          }
                          await apiFetch(`/api/scans/${scanId}/my-measurements`, {
                            method: 'PATCH',
                            body: JSON.stringify(body),
                          })
                          refreshScan()
                          setEditedValues({})
                          setEditMode(false)
                        } catch (err) {
                          alert('Fehler: ' + (err.message || err))
                        }
                        setSavingEdits(false)
                      }}
                      disabled={savingEdits}
                      className="w-full py-3 mt-4 bg-black text-white font-light text-[11px] border-0 hover:bg-black/80 transition-colors disabled:opacity-50"
                      style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {savingEdits ? 'Wird gespeichert…' : 'Werte speichern'}
                    </button>
                  )}
                  {editMode && Object.keys(editedValues).length === 0 && (
                    <p className="text-[10px] text-black/20 text-center mt-4 font-light">Ändern Sie einen Wert oder ergänzen Sie fehlende Maße</p>
                  )}
                </div>
              )}
              {activeTab === 'GENERAL' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-black/25 font-light">Fußtyp</span>
                    <span className="text-[13px] text-black font-light">{scanArchInfo?.label || '—'}</span>
                  </div>
                  <p className="text-[11px] text-black/30 leading-relaxed font-light -mt-2">{scanArchInfo?.desc}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-black/25 font-light">Gewölbe</span>
                    <span className="text-[13px] text-black font-light">{scanArchLabel || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-black/25 font-light">Genauigkeit</span>
                    <span className="text-[13px] text-black font-light">{Number(displayScan.accuracy).toFixed(1)}%</span>
                  </div>
                  <div className="border-t border-black/[0.04] pt-4 mt-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-black/20 mb-3 font-light">Alle Fußtypen</p>
                    {ARCHETYPES.map(a => (
                      <div key={a.key} className={`flex items-center gap-3 py-2.5 ${a.key === scanArchtype ? 'bg-[#f6f5f3] px-3 -mx-3' : ''}`}>
                        <div className={`w-1.5 h-1.5 flex-shrink-0 ${a.key === scanArchtype ? 'bg-black' : 'bg-black/10'}`} />
                        <div className="flex-1">
                          <p className={`text-[11px] ${a.key === scanArchtype ? 'text-black' : 'text-black/35'} font-light`}>{a.label}</p>
                          <p className="text-[10px] text-black/20 mt-0.5 font-light">{a.desc}</p>
                        </div>
                        {a.key === scanArchtype && <span className="text-[9px] uppercase tracking-[0.15em] text-black/30 font-light">Ihr Typ</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'MYSELF' && (
                <div>
                  {editingNotes ? (
                    <div className="space-y-3">
                      <textarea
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        maxLength={1000}
                        className="w-full border border-black/[0.06] bg-[#f6f5f3] p-4 text-[12px] text-black leading-relaxed resize-none focus:outline-none focus:border-black/15 font-light"
                        rows={4}
                        placeholder="Persönliche Notizen zu Ihren Füßen..."
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-black/20 font-light">{noteText.length}/1000</span>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingNotes(false)}
                            className="px-4 py-2 text-[11px] text-black/35 bg-transparent border border-black/10 font-light hover:border-black/20 transition-colors">
                            Abbrechen
                          </button>
                          <button
                            onClick={async () => { await saveFootNotes(noteText); setEditingNotes(false) }}
                            className="px-4 py-2 text-[11px] text-white bg-black border-0 font-light hover:bg-black/80 transition-colors">
                            Speichern
                          </button>
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
                          <p className="text-[12px] text-black/40 italic leading-relaxed flex-1 font-light">"{footNotes}"</p>
                          <Edit3 size={12} className="text-black/15 mt-0.5 flex-shrink-0 group-hover:text-black/30 transition-colors" strokeWidth={1.5} />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 py-2 text-black/20">
                          <Edit3 size={13} strokeWidth={1.5} />
                          <span className="text-[11px] font-light">Tippen Sie hier, um persönliche Notizen hinzuzufügen…</span>
                        </div>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Aesthetic Profile ───────────────────────────────────── */}
      <div className="px-5 lg:px-16 pt-8">
        <p className="text-[10px] uppercase tracking-[0.25em] text-black/25 font-light mb-4">Aesthetic Profile</p>
        <p className="text-[12px] text-black/30 mb-4 font-light">Ihr persönlicher Stil für maßgefertigte Schuhe.</p>
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {[
            { label: 'Modern Business', desc: 'Sharp, tailored', active: true, img: SHOES.oxfords },
            { label: 'Classic',          desc: 'Timeless, refined', active: false, img: SHOES.dressShoes },
            { label: 'Weekend',          desc: 'Relaxed, smart', active: false, img: SHOES.loafers },
          ].map(card => (
            <div
              key={card.label}
              className={`flex-shrink-0 w-36 h-24 overflow-hidden relative cursor-pointer transition-all ${card.active ? 'border border-black' : 'border border-black/[0.06]'}`}
            >
              <img src={card.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.6) 100%)' }} />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-[10px] text-white font-light leading-tight">{card.label}</p>
                <p className="text-[9px] text-white/50 mt-0.5 font-light">{card.desc}</p>
              </div>
              {card.active && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-black flex items-center justify-center">
                  <svg viewBox="0 0 16 16" className="w-2.5 h-2.5" fill="none">
                    <path d="M13.5 4.5l-7 7-3-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick links ────────────────────────────────────────── */}
      <div className="px-5 lg:px-16 pt-8">
        <p className="text-[10px] uppercase tracking-[0.25em] text-black/25 font-light mb-4">Schnellzugriff</p>
        {[
          { icon: Package,    label: 'Meine Bestellungen', sub: 'Bestellungen · Tracking · Status',        path: '/orders' },
          { icon: Footprints, label: 'Meine Scans',        sub: 'Fußscan-Verlauf · 3D-Modelle',           path: '/my-scans' },
          { icon: BookOpen,   label: 'Schuh-Info',          sub: 'Informationen rund um den perfekten Schuh', path: '/health' },
          { icon: Settings,   label: 'Einstellungen',       sub: 'Profil · Passwort · Adressen',            path: '/settings' },
        ].map(({ icon: Icon, label, sub, path }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="w-full flex items-center justify-between py-4 bg-transparent border-0 text-left border-b border-black/[0.04] hover:bg-black/[0.01] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#f6f5f3] flex items-center justify-center">
                <Icon size={16} className="text-black/30" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-black/25 font-light">{sub}</p>
                <p className="text-[13px] text-black font-light mt-0.5">{label}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-black/15" strokeWidth={1.5} />
          </button>
        ))}
      </div>

      {/* ── CTA Banner (CMS-controlled) ──────────────────────── */}
      <div className="px-5 lg:px-16 py-12">
        <CtaBanner page="profile" />
      </div>
    </div>
  )
}
