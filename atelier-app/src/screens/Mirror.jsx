/**
 * Mirror.jsx — Realistic Avatar Mirror & Outfit Studio
 *
 * Features:
 *  • Realistic human SVG avatar with detailed face, hair, body
 *  • BMI-based body proportions (height + weight sliders)
 *  • Photo-based clothing overlay via SVG <image> + clipPath
 *  • Camera capture: photograph real clothing → overlay on avatar
 *  • localStorage-persisted custom clothing items
 *
 * Phase flow:  intro → scan → processing → editor → mirror
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, RotateCcw, EyeOff, Eye, ShoppingBag, Bookmark,
  Camera, Check, X, ChevronRight, Sparkles, Sliders,
} from 'lucide-react'
import useAtelierStore from '../store/atelierStore'

// ── Constants ─────────────────────────────────────────────────────────────────

const SKIN_TONES = [
  '#FDDBB4', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#5C3317',
]

const HAIR_COLORS = [
  '#1a0a00', '#3d1c02', '#7b4f2e', '#c4882c', '#f0c060', '#d0d0d0', '#666', '#000',
]

// p = [shoulderHalfWidth, waistHalfWidth, hipHalfWidth, legHalfWidth]
const BODY_SHAPES = [
  { label: 'Schlank',  p: [26, 16, 22, 7]  },
  { label: 'Normal',   p: [30, 20, 26, 9]  },
  { label: 'Athletic', p: [36, 23, 29, 11] },
  { label: 'Kräftig',  p: [40, 33, 38, 14] },
]

const SCAN_STEPS = [
  { id: 1, label: 'Vorderseite',   instruction: 'Halte dein Gesicht mittig in den Rahmen',            shapeType: 'face'  },
  { id: 2, label: 'Linke Seite',   instruction: 'Drehe deinen Kopf langsam zur linken Seite',         shapeType: 'left'  },
  { id: 3, label: 'Rechte Seite',  instruction: 'Drehe deinen Kopf zur rechten Seite',                shapeType: 'right' },
  { id: 4, label: 'Ganzer Körper', instruction: 'Tritt einen Meter zurück — voller Körper sichtbar',  shapeType: 'body', optional: true },
]

const CLOTHING_CATS = [
  { id: 'tops',  label: 'Oberteile', icon: '👔' },
  { id: 'pants', label: 'Hosen',     icon: '👖' },
  { id: 'shoes', label: 'Schuhe',    icon: '👟' },
]

const LOCAL_STORAGE_KEY = 'atelier_local_clothing'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBMIShape(h, w) {
  const bmi = w / Math.pow(h / 100, 2)
  if (bmi < 19) return 0
  if (bmi < 25) return 1
  if (bmi < 30) return 2
  return 3
}

function isTop(name) {
  const n = (name || '').toLowerCase()
  return n.includes('shirt') || n.includes('blazer') || n.includes('turtleneck') ||
         n.includes('overcoat') || n.includes('linen') || n.includes('suit') || n.includes('jacket')
}

function isPants(name) {
  const n = (name || '').toLowerCase()
  return n.includes('chino') || n.includes('jean') || n.includes('trouser') ||
         n.includes('slim') || n.includes('pant')
}

function loadLocalClothing() {
  try { return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]') }
  catch { return [] }
}

// ── Avatar SVG ────────────────────────────────────────────────────────────────

function AvatarSVG({ skinColor, hairColor, shapeIdx, topPhoto, pantsPhoto, topColor, pantsColor, shoeColor, spinning }) {
  const cx = 80
  const shape = BODY_SHAPES[shapeIdx] || BODY_SHAPES[1]
  const [sW, wW, hW, lW] = shape.p

  // Key Y coordinates
  const headCy   = 30
  const neckTop  = 51
  const neckBot  = 64
  const shldrY   = 68
  const waistY   = 148
  const hipY     = 168
  const kneeY    = 232
  const ankleY   = 298
  const floorY   = 318

  const topFill   = topColor   || '#1e3a5f'
  const pantsFill = pantsColor || '#111827'
  const shoeFill  = shoeColor  || '#92400e'
  const hair      = hairColor  || '#1a0a00'
  const skin      = skinColor  || '#D4A88A'

  // Clip region dimensions
  const topClipX = cx - sW - 24
  const topClipW = (sW + 24) * 2
  const topClipY = shldrY - 2
  const topClipH = hipY + 14 - shldrY

  const pantsClipX = cx - hW - 12
  const pantsClipW = (hW + 12) * 2
  const pantsClipY = hipY - 2
  const pantsClipH = floorY + 6 - hipY

  return (
    <svg
      viewBox="0 0 160 340"
      style={{ width: 140, height: 300, filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.5))' }}
      className={`transition-transform duration-500 ${spinning ? 'scale-90 opacity-70' : ''}`}
    >
      <defs>
        {/* Skin radial gradient */}
        <radialGradient id="sGrad" cx="38%" cy="30%" r="65%">
          <stop offset="0%"   stopColor={skin} />
          <stop offset="100%" stopColor={skin} stopOpacity="0.78" />
        </radialGradient>

        {/* Side body shadow */}
        <linearGradient id="bShade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(0,0,0,0.24)" />
          <stop offset="48%"  stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.18)" />
        </linearGradient>

        {/* Clip paths for clothing zones */}
        <clipPath id="topClip">
          <rect x={topClipX} y={topClipY} width={topClipW} height={topClipH} />
        </clipPath>
        <clipPath id="pantsClip">
          <rect x={pantsClipX} y={pantsClipY} width={pantsClipW} height={pantsClipH} />
        </clipPath>
      </defs>

      {/* ── HAIR (behind head) ── */}
      <ellipse cx={cx}    cy={headCy - 6}  rx={20}   ry={20}   fill={hair} />
      <ellipse cx={cx-17} cy={headCy + 4}  rx={5}    ry={12}   fill={hair} />
      <ellipse cx={cx+17} cy={headCy + 4}  rx={5}    ry={12}   fill={hair} />

      {/* ── HEAD ── */}
      <ellipse cx={cx} cy={headCy} rx={18} ry={22} fill="url(#sGrad)" />

      {/* Ears */}
      <ellipse cx={cx-18} cy={headCy+3} rx={3.5} ry={5.5} fill={skin} />
      <ellipse cx={cx+18} cy={headCy+3} rx={3.5} ry={5.5} fill={skin} />
      <ellipse cx={cx-18} cy={headCy+3} rx={2}   ry={3.5} fill="rgba(0,0,0,0.07)" />
      <ellipse cx={cx+18} cy={headCy+3} rx={2}   ry={3.5} fill="rgba(0,0,0,0.07)" />

      {/* ── FACE ── */}

      {/* Eyebrows */}
      <path d={`M${cx-12} ${headCy-8} Q${cx-7} ${headCy-11} ${cx-2} ${headCy-8.5}`}
        stroke={hair} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d={`M${cx+2} ${headCy-8.5} Q${cx+7} ${headCy-11} ${cx+12} ${headCy-8}`}
        stroke={hair} strokeWidth="1.4" fill="none" strokeLinecap="round" />

      {/* Eyes — white sclera */}
      <ellipse cx={cx-6.5} cy={headCy-4} rx={4.5} ry={3.2} fill="white" />
      <ellipse cx={cx+6.5} cy={headCy-4} rx={4.5} ry={3.2} fill="white" />
      {/* Iris */}
      <circle cx={cx-6.5} cy={headCy-4} r={2.2} fill="#3d2507" />
      <circle cx={cx+6.5} cy={headCy-4} r={2.2} fill="#3d2507" />
      {/* Pupil */}
      <circle cx={cx-6.5} cy={headCy-4} r={1.1} fill="#0d0805" />
      <circle cx={cx+6.5} cy={headCy-4} r={1.1} fill="#0d0805" />
      {/* Eye shine */}
      <circle cx={cx-5.3} cy={headCy-5.3} r={0.9} fill="white" />
      <circle cx={cx+7.7} cy={headCy-5.3} r={0.9} fill="white" />

      {/* Nose */}
      <path d={`M${cx-1} ${headCy} L${cx-3} ${headCy+5.5} Q${cx} ${headCy+7} ${cx+3} ${headCy+5.5} L${cx+1} ${headCy}`}
        fill="rgba(0,0,0,0.07)" stroke="rgba(0,0,0,0.10)" strokeWidth="0.5" />
      <ellipse cx={cx-2.5} cy={headCy+6.5} rx={1.5} ry={1} fill="rgba(0,0,0,0.16)" />
      <ellipse cx={cx+2.5} cy={headCy+6.5} rx={1.5} ry={1} fill="rgba(0,0,0,0.16)" />

      {/* Lips */}
      <path d={`M${cx-5.5} ${headCy+10} Q${cx} ${headCy+8.5} ${cx+5.5} ${headCy+10}`}
        stroke="rgba(0,0,0,0.18)" strokeWidth="0.8" fill="none" />
      <path d={`M${cx-5} ${headCy+10} Q${cx} ${headCy+13.5} ${cx+5} ${headCy+10}`}
        stroke="rgba(0,0,0,0.28)" strokeWidth="1.1" fill="none" strokeLinecap="round" />

      {/* Cheeks */}
      <ellipse cx={cx-13} cy={headCy+7} rx={5}   ry={3} fill={skin} opacity="0.38" />
      <ellipse cx={cx+13} cy={headCy+7} rx={5}   ry={3} fill={skin} opacity="0.38" />

      {/* ── NECK ── */}
      <path d={`M${cx-6} ${neckTop} L${cx+6} ${neckTop} L${cx+7} ${neckBot} L${cx-7} ${neckBot} Z`}
        fill="url(#sGrad)" />

      {/* ── TORSO (color fill) ── */}
      <path d={`
        M${cx-sW} ${shldrY}
        Q${cx} ${shldrY-8} ${cx+sW} ${shldrY}
        L${cx+wW+4} ${waistY}
        L${cx+hW} ${hipY}
        L${cx-hW} ${hipY}
        L${cx-wW-4} ${waistY} Z
      `} fill={topFill} />

      {/* Torso photo overlay */}
      {topPhoto && (
        <g clipPath="url(#topClip)">
          <image
            href={topPhoto}
            x={topClipX} y={topClipY}
            width={topClipW} height={topClipH}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      )}

      {/* Torso side shading (applied on top of both color and photo) */}
      <path d={`
        M${cx-sW} ${shldrY}
        Q${cx} ${shldrY-8} ${cx+sW} ${shldrY}
        L${cx+wW+4} ${waistY}
        L${cx+hW} ${hipY}
        L${cx-hW} ${hipY}
        L${cx-wW-4} ${waistY} Z
      `} fill="url(#bShade)" />

      {/* ── LEFT ARM ── */}
      <path d={`
        M${cx-sW+4} ${shldrY+6}
        L${cx-sW-18} ${shldrY+54}
        Q${cx-sW-22} ${shldrY+74} ${cx-sW-15} ${shldrY+84}
        L${cx-sW-9}  ${shldrY+86}
        Q${cx-sW-3}  ${shldrY+84} ${cx-sW}    ${shldrY+78}
        L${cx-sW+10} ${shldrY+24} Z
      `} fill={topPhoto ? 'transparent' : topFill} />
      {!topPhoto && (
        <path d={`
          M${cx-sW+4} ${shldrY+6}
          L${cx-sW-18} ${shldrY+54}
          Q${cx-sW-22} ${shldrY+74} ${cx-sW-15} ${shldrY+84}
          L${cx-sW-9}  ${shldrY+86}
          Q${cx-sW-3}  ${shldrY+84} ${cx-sW}    ${shldrY+78}
          L${cx-sW+10} ${shldrY+24} Z
        `} fill="rgba(0,0,0,0.10)" />
      )}

      {/* ── RIGHT ARM ── */}
      <path d={`
        M${cx+sW-4} ${shldrY+6}
        L${cx+sW+18} ${shldrY+54}
        Q${cx+sW+22} ${shldrY+74} ${cx+sW+15} ${shldrY+84}
        L${cx+sW+9}  ${shldrY+86}
        Q${cx+sW+3}  ${shldrY+84} ${cx+sW}    ${shldrY+78}
        L${cx+sW-10} ${shldrY+24} Z
      `} fill={topPhoto ? 'transparent' : topFill} />
      {!topPhoto && (
        <path d={`
          M${cx+sW-4} ${shldrY+6}
          L${cx+sW+18} ${shldrY+54}
          Q${cx+sW+22} ${shldrY+74} ${cx+sW+15} ${shldrY+84}
          L${cx+sW+9}  ${shldrY+86}
          Q${cx+sW+3}  ${shldrY+84} ${cx+sW}    ${shldrY+78}
          L${cx+sW-10} ${shldrY+24} Z
        `} fill="rgba(255,255,255,0.06)" />
      )}

      {/* Arms color when photo is used (solid skin-tone overlay for exposed skin) */}
      {topPhoto && (
        <>
          <path d={`
            M${cx-sW+4} ${shldrY+6}
            L${cx-sW-18} ${shldrY+54}
            Q${cx-sW-22} ${shldrY+74} ${cx-sW-15} ${shldrY+84}
            L${cx-sW-9} ${shldrY+86}
            Q${cx-sW-3} ${shldrY+84} ${cx-sW} ${shldrY+78}
            L${cx-sW+10} ${shldrY+24} Z
          `} fill={topFill} />
          <path d={`
            M${cx+sW-4} ${shldrY+6}
            L${cx+sW+18} ${shldrY+54}
            Q${cx+sW+22} ${shldrY+74} ${cx+sW+15} ${shldrY+84}
            L${cx+sW+9} ${shldrY+86}
            Q${cx+sW+3} ${shldrY+84} ${cx+sW} ${shldrY+78}
            L${cx+sW-10} ${shldrY+24} Z
          `} fill={topFill} />
        </>
      )}

      {/* Hands */}
      <ellipse cx={cx-sW-12} cy={shldrY+88} rx={6} ry={4.5} fill={skin} />
      <ellipse cx={cx+sW+12} cy={shldrY+88} rx={6} ry={4.5} fill={skin} />

      {/* ── WAISTBAND ── */}
      <rect x={cx-hW-2} y={hipY} width={(hW+2)*2} height={14} rx={3} fill={pantsFill} />

      {/* ── LEFT LEG ── */}
      <path d={`
        M${cx-hW}    ${hipY+13}
        L${cx-4}     ${hipY+13}
        L${cx-6}     ${ankleY}
        L${cx-lW-10} ${ankleY}
        Q${cx-hW-6}  ${kneeY} ${cx-hW} ${hipY+13} Z
      `} fill={pantsFill} />
      <path d={`
        M${cx-hW}    ${hipY+13}
        L${cx-4}     ${hipY+13}
        L${cx-6}     ${ankleY}
        L${cx-lW-10} ${ankleY}
        Q${cx-hW-6}  ${kneeY} ${cx-hW} ${hipY+13} Z
      `} fill="rgba(0,0,0,0.09)" />

      {/* ── RIGHT LEG ── */}
      <path d={`
        M${cx+4}     ${hipY+13}
        L${cx+hW}    ${hipY+13}
        Q${cx+hW+6}  ${kneeY} ${cx+lW+10} ${ankleY}
        L${cx+6}     ${ankleY} Z
      `} fill={pantsFill} />
      <path d={`
        M${cx+4}     ${hipY+13}
        L${cx+hW}    ${hipY+13}
        Q${cx+hW+6}  ${kneeY} ${cx+lW+10} ${ankleY}
        L${cx+6}     ${ankleY} Z
      `} fill="rgba(255,255,255,0.05)" />

      {/* Pants photo overlay */}
      {pantsPhoto && (
        <g clipPath="url(#pantsClip)">
          <image
            href={pantsPhoto}
            x={pantsClipX} y={pantsClipY}
            width={pantsClipW} height={pantsClipH}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      )}

      {/* Leg crease line */}
      <line x1={cx} y1={hipY+13} x2={cx} y2={ankleY-20} stroke="rgba(0,0,0,0.10)" strokeWidth="1" />

      {/* ── LEFT SHOE ── */}
      <path d={`
        M${cx-lW-14} ${ankleY}
        L${cx-4}     ${ankleY}
        L${cx-3}     ${floorY-6}
        Q${cx-4}     ${floorY}   ${cx-14}    ${floorY}
        L${cx-lW-24} ${floorY}
        Q${cx-lW-28} ${floorY-2} ${cx-lW-26} ${floorY-7}
        L${cx-lW-20} ${ankleY} Z
      `} fill={shoeFill} />
      <path d={`
        M${cx-lW-24} ${floorY}
        Q${cx-lW-28} ${floorY+3} ${cx-lW-24} ${floorY+6}
        L${cx-14}    ${floorY+6}
        Q${cx-3}     ${floorY+5} ${cx-3} ${floorY}
        L${cx-14}    ${floorY}
        Q${cx-lW-24} ${floorY}   ${cx-lW-28} ${floorY} Z
      `} fill={shoeFill} opacity="0.6" />

      {/* ── RIGHT SHOE ── */}
      <path d={`
        M${cx+4}     ${ankleY}
        L${cx+lW+14} ${ankleY}
        L${cx+lW+20} ${ankleY}
        L${cx+lW+26} ${floorY-7}
        Q${cx+lW+28} ${floorY-2} ${cx+lW+24} ${floorY}
        L${cx+14}    ${floorY}
        Q${cx+4}     ${floorY} ${cx+3} ${floorY-6}
        L${cx+3}     ${ankleY} Z
      `} fill={shoeFill} />
      <path d={`
        M${cx+3}     ${floorY}
        Q${cx+3}     ${floorY+5} ${cx+14}    ${floorY+6}
        L${cx+lW+24} ${floorY+6}
        Q${cx+lW+28} ${floorY+3} ${cx+lW+24} ${floorY}
        L${cx+14}    ${floorY}
        Q${cx+3}     ${floorY}   ${cx+3}     ${floorY} Z
      `} fill={shoeFill} opacity="0.6" />

      {/* Ground shadow */}
      <ellipse cx={cx} cy={floorY+10} rx={42} ry={5} fill="rgba(0,0,0,0.18)" />
    </svg>
  )
}

// ── Scan Guide ────────────────────────────────────────────────────────────────

function ScanGuide({ shapeType }) {
  if (shapeType === 'face') return (
    <svg viewBox="0 0 200 240" className="w-40 absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -54%)' }}>
      <ellipse cx="100" cy="110" rx="56" ry="72" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeDasharray="6 4" />
      <ellipse cx="100" cy="110" rx="48" ry="64" fill="rgba(255,255,255,0.04)" />
    </svg>
  )
  if (shapeType === 'left' || shapeType === 'right') return (
    <svg viewBox="0 0 160 240" className="w-32 absolute" style={{ top: '50%', left: '50%', transform: `translate(-50%, -54%) scaleX(${shapeType === 'right' ? -1 : 1})` }}>
      <ellipse cx="70" cy="108" rx="36" ry="66" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeDasharray="6 4" />
    </svg>
  )
  return (
    <svg viewBox="0 0 120 320" className="absolute" style={{ width: 100, top: '50%', left: '50%', transform: 'translate(-50%, -52%)' }}>
      <rect x="20" y="10" width="80" height="300" rx="16" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeDasharray="6 4" />
    </svg>
  )
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ item, isSelected, onSelect, onDelete }) {
  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => onSelect(item.id)}
        className={`w-28 rounded-xl overflow-hidden border-2 transition-all bg-transparent text-left ${
          isSelected ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-black/[0.06]'
        }`}
      >
        <div className="relative h-24 overflow-hidden">
          {item.dataUrl ? (
            <img src={item.dataUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : item.image ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: item.color || '#374151' }}>
              <div className="w-10 h-10 rounded-lg" style={{ background: `radial-gradient(circle at 35% 35%, ${item.color}88, ${item.color})` }} />
            </div>
          )}
          {isSelected && (
            <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-md flex items-center justify-center shadow">
              <Check size={10} className="text-white" strokeWidth={3} />
            </div>
          )}
          {item.isLocal && (
            <div className="absolute bottom-1.5 left-1.5 bg-black/60 rounded-md px-1.5 py-0.5">
              <span className="text-[7px] text-amber-300 font-bold">📸 MEIN</span>
            </div>
          )}
        </div>
        <div className="p-2 bg-white">
          <p className="text-[8px] font-bold text-black leading-tight truncate">{item.name}</p>
          {item.price ? <p className="text-[8px] text-black/40 mt-0.5">{item.price}</p> : null}
        </div>
      </button>
      {item.isLocal && onDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(item.id) }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-md bg-red-500 flex items-center justify-center border-0 shadow-md"
        >
          <X size={9} className="text-white" strokeWidth={3} />
        </button>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Mirror() {
  const navigate = useNavigate()
  const { shoes, wardrobe } = useAtelierStore()

  // Phase flow
  const [phase, setPhase]                   = useState('intro')
  const [scanStep, setScanStep]             = useState(1)
  const [capturedSteps, setCapturedSteps]   = useState([])
  const [processingPct, setProcessingPct]   = useState(0)

  // Avatar appearance
  const [skinColor, setSkinColor]   = useState('#D4A88A')
  const [hairColor, setHairColor]   = useState('#1a0a00')
  const [shapeIdx, setShapeIdx]     = useState(1)
  const [bodyHeight, setBodyHeight] = useState(178)
  const [bodyWeight, setBodyWeight] = useState(76)

  // Outfit selection
  const [outfit, setOutfit]                   = useState({ tops: null, pants: null, shoes: null })
  const [activeCategory, setActiveCategory]   = useState('shoes')

  // Mirror controls
  const [spinning, setSpinning]       = useState(false)
  const [hideAvatar, setHideAvatar]   = useState(false)
  const [saved, setSaved]             = useState(false)

  // Local (photographed) clothing
  const [localClothing, setLocalClothing] = useState(() => loadLocalClothing())
  const fileInputRef                      = useRef(null)
  const [captureCategory, setCaptureCategory] = useState(null)

  // Persist local clothing
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localClothing))
  }, [localClothing])

  // BMI → body shape auto-update (only when height/weight change)
  useEffect(() => {
    setShapeIdx(getBMIShape(bodyHeight, bodyWeight))
  }, [bodyHeight, bodyWeight])

  // Build product lists from store + local
  const storeProducts = {
    shoes: shoes.map(s => ({
      id: `shoe-${s.id}`, name: s.name, color: s.color, price: s.price, image: s.image,
    })),
    pants: wardrobe.filter(w => isPants(w.name)).map(w => ({
      id: `pant-${w.id}`, name: w.name, color: w.color, price: '€ 520',
    })),
    tops: wardrobe.filter(w => isTop(w.name)).map(w => ({
      id: `top-${w.id}`, name: w.name, color: w.color, price: '€ 380',
    })),
  }

  const allProducts = {
    tops:  [...localClothing.filter(c => c.category === 'tops'),  ...storeProducts.tops],
    pants: [...localClothing.filter(c => c.category === 'pants'), ...storeProducts.pants],
    shoes: [...localClothing.filter(c => c.category === 'shoes'), ...storeProducts.shoes],
  }

  // Resolve outfit items for avatar rendering
  const selTop  = allProducts.tops.find(p => p.id === outfit.tops)
  const selPant = allProducts.pants.find(p => p.id === outfit.pants)
  const selShoe = allProducts.shoes.find(p => p.id === outfit.shoes)

  const topPhoto   = selTop?.dataUrl   || null
  const pantsPhoto = selPant?.dataUrl  || null
  const topColor   = topPhoto   ? null : (selTop?.color   || '#1e3a5f')
  const pantsColor = pantsPhoto ? null : (selPant?.color  || '#111827')
  const shoeColor  = selShoe?.color || '#92400e'

  // Handlers
  const selectItem = (cat, id) =>
    setOutfit(prev => ({ ...prev, [cat]: prev[cat] === id ? null : id }))

  const deleteLocalItem = id => {
    setLocalClothing(prev => prev.filter(c => c.id !== id))
    setOutfit(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(k => { if (next[k] === id) next[k] = null })
      return next
    })
  }

  const handleCaptureClick = cat => {
    setCaptureCategory(cat)
    fileInputRef.current?.click()
  }

  const handleFileChange = e => {
    const file = e.target.files?.[0]
    if (!file || !captureCategory) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = ev => {
      const newItem = {
        id:       `local-${Date.now()}`,
        category: captureCategory,
        name:     file.name.replace(/\.[^.]+$/, '').slice(0, 28) || 'Mein Kleidungsstück',
        dataUrl:  ev.target.result,
        isLocal:  true,
      }
      setLocalClothing(prev => [newItem, ...prev])
      setOutfit(prev => ({ ...prev, [captureCategory]: newItem.id }))
      setActiveCategory(captureCategory)
    }
    reader.readAsDataURL(file)
    setCaptureCategory(null)
  }

  const captureStep = () => {
    const next = [...capturedSteps, scanStep]
    setCapturedSteps(next)
    if (scanStep < 3) { setScanStep(scanStep + 1); return }
    if (scanStep === 3) { setScanStep(4); return }
    startProcessing()
  }

  const skipBody = () => startProcessing()

  const startProcessing = () => {
    setPhase('processing')
    let pct = 0
    const iv = setInterval(() => {
      pct += Math.random() * 18 + 4
      if (pct >= 100) { pct = 100; clearInterval(iv); setTimeout(() => setPhase('editor'), 600) }
      setProcessingPct(Math.round(Math.min(pct, 100)))
    }, 280)
  }

  const spin = () => { setSpinning(true); setTimeout(() => setSpinning(false), 700) }

  const step = SCAN_STEPS[scanStep - 1]

  // ── INTRO ──────────────────────────────────────────────────────────────────

  if (phase === 'intro') return (
    <div className="flex flex-col h-full overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)' }}>
      <div className="flex items-center justify-between px-5 pt-4 pb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center border-0">
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-white">Mirror</p>
          <p className="text-[9px] uppercase tracking-[0.14em] font-semibold" style={{ color: '#f59e0b' }}>Outfit Studio</p>
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center overflow-y-auto pb-8">
        {/* Live avatar preview */}
        <div className="w-44 h-44 rounded-full mb-8 flex items-center justify-center relative"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <AvatarSVG skinColor={skinColor} hairColor={hairColor} shapeIdx={shapeIdx}
            topColor="#1e3a5f" pantsColor="#111827" shoeColor="#92400e" />
          <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-spin" style={{ animationDuration: '8s' }} />
          <div className="absolute inset-3 rounded-full border border-blue-400/10 animate-spin" style={{ animationDuration: '5s', animationDirection: 'reverse' }} />
        </div>

        <h2 className="text-2xl font-bold text-white leading-tight mb-2">Dein virtueller Spiegel</h2>
        <p className="text-sm text-black/40 leading-relaxed mb-8">
          Erstelle einen realistischen Avatar mit deinen Körpermassen. Probiere Outfits an — auch mit abfotografierten Kleidungsstücken.
        </p>

        <div className="w-full space-y-3 mb-8">
          {[
            { icon: Camera,      text: 'Gesichtsscan in 3 Schritten',   sub: 'KI erstellt deinen Avatar' },
            { icon: Sliders,     text: 'Körpermasse anpassen',           sub: 'Größe & Gewicht für realistische Proportionen' },
            { icon: ShoppingBag, text: 'Outfits anprobieren',            sub: 'Kleidung abfotografieren & live anziehen' },
          ].map(({ icon: Icon, text, sub }) => (
            <div key={text} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-purple-300" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-white">{text}</p>
                <p className="text-[9px] text-black/40 mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => { setPhase('scan'); setScanStep(1); setCapturedSteps([]) }}
          className="w-full h-14 rounded-xl bg-white text-black text-sm font-bold uppercase tracking-widest border-0 mb-3"
        >
          Avatar erstellen →
        </button>
        <button
          onClick={() => setPhase('editor')}
          className="w-full h-11 rounded-xl bg-white/10 text-white/70 text-[10px] font-bold uppercase tracking-widest border-0 mb-2"
        >
          Direkt anpassen
        </button>
        <button
          onClick={() => setPhase('mirror')}
          className="text-[10px] text-black/60 uppercase tracking-widest bg-transparent border-0"
        >
          Demo-Modus überspringen
        </button>
      </div>
    </div>
  )

  // ── SCAN ───────────────────────────────────────────────────────────────────

  if (phase === 'scan') return (
    <div className="flex flex-col h-full overflow-hidden bg-black">
      <div className="flex items-center justify-between px-5 pt-4 pb-4 z-10">
        <button onClick={() => setPhase('intro')} className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center border-0">
          <X size={18} className="text-white" />
        </button>
        <div className="flex items-center gap-2">
          {SCAN_STEPS.map(s => (
            <div key={s.id} className={`rounded-full transition-all ${
              capturedSteps.includes(s.id) ? 'w-6 h-2 bg-white'
              : s.id === scanStep ? 'w-6 h-2 bg-white/60'
              : 'w-2 h-2 bg-white/20'
            }`} />
          ))}
        </div>
        <div className="w-9" />
      </div>

      <div className="text-center px-5 mb-2 z-10">
        <p className="text-[9px] uppercase tracking-[0.2em] text-black/40 font-semibold">
          Schritt {scanStep} von 4{step.optional ? ' (Optional)' : ''}
        </p>
        <p className="text-lg font-bold text-white mt-0.5">{step.label}</p>
      </div>

      <div className="flex-1 relative flex items-center justify-center mx-4 mb-4 rounded-xl overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)', minHeight: 300 }}>
        <div className="absolute inset-0 opacity-10">
          {[1,2,3].map(i => <div key={i} className="absolute left-0 right-0 border-t border-white" style={{ top: `${i*25}%` }} />)}
          {[1,2,3].map(i => <div key={i} className="absolute top-0 bottom-0 border-l border-white" style={{ left: `${i*25}%` }} />)}
        </div>
        {[['top-4 left-4','border-l-2 border-t-2'],['top-4 right-4','border-r-2 border-t-2'],['bottom-4 left-4','border-l-2 border-b-2'],['bottom-4 right-4','border-r-2 border-b-2']].map(([p,b]) => (
          <div key={p} className={`absolute w-6 h-6 ${p} ${b} border-white/60 rounded-sm`} />
        ))}
        <ScanGuide shapeType={step.shapeType} />
        {capturedSteps.includes(scanStep) ? (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/10">
            <div className="w-16 h-16 rounded-xl bg-green-500 flex items-center justify-center">
              <Check size={32} className="text-white" strokeWidth={2.5} />
            </div>
          </div>
        ) : (
          <div className="absolute h-0.5 left-4 right-4 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-60"
            style={{ top: '45%', animation: 'scan-line 2s ease-in-out infinite' }} />
        )}
        <div className="absolute top-4 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-1.5 bg-red-500 rounded-lg px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[8px] font-bold text-white uppercase tracking-wide">LIVE</span>
          </div>
        </div>
      </div>

      <div className="px-5 pb-8 text-center">
        <p className="text-sm text-black/30 mb-5 leading-relaxed">{step.instruction}</p>
        <div className="flex gap-3">
          {step.optional && (
            <button onClick={skipBody} className="flex-1 h-14 rounded-xl bg-white/10 text-white text-sm font-bold uppercase tracking-widest border-0">
              Überspringen
            </button>
          )}
          <button
            onClick={captureStep}
            className="flex-1 h-14 rounded-xl flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest border-0"
            style={{ background: capturedSteps.includes(scanStep) ? '#22c55e' : 'white', color: 'black' }}
          >
            <Camera size={18} />
            {capturedSteps.includes(scanStep) ? 'Weiter →' : 'Aufnehmen'}
          </button>
        </div>
        {scanStep < 3 && (
          <button onClick={() => setScanStep(p => p + 1)}
            className="mt-3 text-[9px] text-black/50 uppercase tracking-widest bg-transparent border-0">
            Demo: Schritt überspringen
          </button>
        )}
      </div>
    </div>
  )

  // ── PROCESSING ────────────────────────────────────────────────────────────

  if (phase === 'processing') return (
    <div className="flex flex-col h-full items-center justify-center px-8 text-center"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)' }}>
      <div className="w-28 h-28 rounded-full mb-8 flex items-center justify-center relative"
        style={{ border: '2px solid rgba(139,92,246,0.3)' }}>
        <div className="absolute inset-0 rounded-full border-t-2 border-purple-400 animate-spin" />
        <span className="text-3xl font-bold text-white">{processingPct}%</span>
      </div>
      <h2 className="text-xl font-bold text-white mb-2">KI erstellt deinen Avatar…</h2>
      <p className="text-sm text-black/40 mb-8">Bitte warte einen Moment</p>
      <div className="w-full space-y-3">
        {[
          { label: 'Gesicht analysieren',          done: processingPct > 20 },
          { label: '3D-Modell aufbauen',            done: processingPct > 50 },
          { label: 'Körperproportionen anpassen',   done: processingPct > 72 },
          { label: 'Modell finalisieren',            done: processingPct > 90 },
        ].map(({ label, done }) => (
          <div key={label} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5">
            <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-500' : 'bg-white/10'}`}>
              {done ? <Check size={11} className="text-white" strokeWidth={2.5} /> : <div className="w-2 h-2 rounded-full bg-white/30" />}
            </div>
            <span className={`text-xs ${done ? 'text-white font-semibold' : 'text-black/50'}`}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )

  // ── EDITOR ────────────────────────────────────────────────────────────────

  if (phase === 'editor') return (
    <div className="flex flex-col min-h-[100dvh] bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-4 border-b border-black/[0.06]">
        <button onClick={() => setPhase('intro')} className="w-9 h-9 rounded-lg bg-black/[0.03] flex items-center justify-center border-0">
          <ArrowLeft size={18} className="text-gray-800" />
        </button>
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-black">Avatar Editor</p>
          <p className="text-[9px] text-black/40 mt-0.5">Körpermasse & Aussehen</p>
        </div>
        <button onClick={() => setPhase('mirror')}
          className="text-[9px] font-bold uppercase tracking-widest text-black bg-transparent border-0">
          Fertig →
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {/* Live preview */}
        <div className="flex items-center justify-center py-6 bg-black/[0.02] rounded-xl mt-4 mb-5">
          <AvatarSVG skinColor={skinColor} hairColor={hairColor} shapeIdx={shapeIdx}
            topColor="#1e3a5f" pantsColor="#111827" shoeColor="#92400e" />
        </div>

        {/* BMI badge */}
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-5">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <p className="text-[9px] text-blue-700 font-semibold">
            Körperform: {BODY_SHAPES[shapeIdx]?.label} · BMI {Math.round(bodyWeight / Math.pow(bodyHeight/100, 2))}
          </p>
        </div>

        {/* Height slider */}
        <p className="text-[9px] uppercase tracking-[0.16em] text-black/40 font-semibold mb-2">
          Körpergröße — {bodyHeight} cm
        </p>
        <input type="range" min="150" max="210" value={bodyHeight}
          onChange={e => setBodyHeight(Number(e.target.value))}
          className="w-full h-2 appearance-none bg-black/[0.06] rounded-full outline-none mb-5" />

        {/* Weight slider */}
        <p className="text-[9px] uppercase tracking-[0.16em] text-black/40 font-semibold mb-2">
          Gewicht — {bodyWeight} kg
        </p>
        <input type="range" min="45" max="130" value={bodyWeight}
          onChange={e => setBodyWeight(Number(e.target.value))}
          className="w-full h-2 appearance-none bg-black/[0.06] rounded-full outline-none mb-5" />

        {/* Manual shape override */}
        <p className="text-[9px] uppercase tracking-[0.16em] text-black/40 font-semibold mb-2">Körperform (manuell)</p>
        <div className="flex gap-2 mb-5">
          {BODY_SHAPES.map((b, i) => (
            <button key={b.label} onClick={() => setShapeIdx(i)}
              className={`flex-1 py-2 rounded-xl text-[8px] font-bold uppercase tracking-wide border-2 transition-all bg-transparent ${
                shapeIdx === i ? 'border-black bg-black text-white' : 'border-black/[0.06] text-black/40'
              }`}>
              {b.label}
            </button>
          ))}
        </div>

        {/* Skin tone */}
        <p className="text-[9px] uppercase tracking-[0.16em] text-black/40 font-semibold mb-2">Hautton</p>
        <div className="flex gap-2 mb-5 flex-wrap">
          {SKIN_TONES.map(tone => (
            <button key={tone} onClick={() => setSkinColor(tone)}
              className={`w-9 h-9 rounded-lg border-2 transition-all bg-transparent ${skinColor === tone ? 'border-black scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: tone }} />
          ))}
        </div>

        {/* Hair color */}
        <p className="text-[9px] uppercase tracking-[0.16em] text-black/40 font-semibold mb-2">Haarfarbe</p>
        <div className="flex gap-2 mb-6 flex-wrap">
          {HAIR_COLORS.map(hc => (
            <button key={hc} onClick={() => setHairColor(hc)}
              className={`w-9 h-9 rounded-lg border-2 transition-all bg-transparent ${hairColor === hc ? 'border-black scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: hc }} />
          ))}
        </div>

        <button onClick={() => setPhase('mirror')}
          className="w-full h-14 rounded-xl bg-black text-white text-sm font-bold uppercase tracking-widest border-0">
          Zum Mirror →
        </button>
      </div>
    </div>
  )

  // ── MIRROR (main view) ────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden bg-black/[0.02]">

      {/* Hidden camera file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="bg-white flex items-center justify-between px-5 pt-4 pb-3 border-b border-black/[0.06]">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-lg bg-black/[0.03] flex items-center justify-center border-0">
          <ArrowLeft size={18} className="text-gray-800" />
        </button>
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-black">Mirror</p>
          <p className="text-[9px] uppercase tracking-[0.14em] font-semibold" style={{ color: '#f59e0b' }}>Outfit Studio</p>
        </div>
        <button onClick={() => setPhase('editor')} className="w-9 h-9 rounded-lg bg-black/[0.03] flex items-center justify-center border-0">
          <Sliders size={16} className="text-gray-700" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">

        {/* Avatar canvas */}
        <div className="relative mx-4 mt-4 rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: 'linear-gradient(180deg, #111827 0%, #1e1b4b 100%)', height: 316 }}>

          {/* Stats badge */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5 z-10">
            <span className="text-[9px] font-bold text-white">{bodyHeight} cm · {bodyWeight} kg</span>
          </div>

          {/* STL badge */}
          <div className="absolute top-12 left-4 flex items-center gap-1 bg-white rounded-lg px-2.5 py-1 shadow-md z-10">
            <Sparkles size={10} className="text-amber-500" />
            <span className="text-[8px] font-bold text-gray-800 uppercase tracking-wide">STL Match</span>
          </div>

          {/* Controls column */}
          <div className="absolute right-3 top-4 flex flex-col gap-2 z-10">
            <button onClick={spin} className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center border-0">
              <RotateCcw size={15} className={`text-white transition-transform ${spinning ? 'rotate-180' : ''}`} strokeWidth={1.5} />
            </button>
            <button onClick={() => setHideAvatar(v => !v)} className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center border-0">
              {hideAvatar ? <Eye size={15} className="text-white" /> : <EyeOff size={15} className="text-white" />}
            </button>
          </div>

          {/* Edit avatar link */}
          <button onClick={() => setPhase('editor')} className="absolute bottom-4 left-4 flex items-center gap-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 border-0 z-10">
            <span className="text-[8px] text-white uppercase tracking-wide font-semibold">Avatar bearbeiten</span>
            <ChevronRight size={9} className="text-white" />
          </button>

          {/* Outfit labels */}
          {(outfit.tops || outfit.pants || outfit.shoes) && (
            <div className="absolute bottom-4 right-3 flex flex-col items-end gap-1 z-10">
              {outfit.tops && (
                <div className="bg-black/60 rounded-md px-2 py-0.5">
                  <span className="text-[7px] text-white font-semibold">
                    👔 {allProducts.tops.find(p => p.id === outfit.tops)?.name?.slice(0, 18)}
                  </span>
                </div>
              )}
              {outfit.pants && (
                <div className="bg-black/60 rounded-md px-2 py-0.5">
                  <span className="text-[7px] text-white font-semibold">
                    👖 {allProducts.pants.find(p => p.id === outfit.pants)?.name?.slice(0, 18)}
                  </span>
                </div>
              )}
              {outfit.shoes && (
                <div className="bg-black/60 rounded-md px-2 py-0.5">
                  <span className="text-[7px] text-white font-semibold">
                    👟 {allProducts.shoes.find(p => p.id === outfit.shoes)?.name?.slice(0, 18)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Avatar */}
          <div className={`transition-opacity duration-300 ${hideAvatar ? 'opacity-0' : 'opacity-100'}`}>
            <AvatarSVG
              skinColor={skinColor}
              hairColor={hairColor}
              shapeIdx={shapeIdx}
              topPhoto={topPhoto}
              pantsPhoto={pantsPhoto}
              topColor={topColor}
              pantsColor={pantsColor}
              shoeColor={shoeColor}
              spinning={spinning}
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 px-4 mt-4 overflow-x-auto pb-1">
          {CLOTHING_CATS.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest border-0 whitespace-nowrap transition-all flex-shrink-0 ${
                activeCategory === cat.id ? 'bg-black text-white' : 'bg-black/[0.03] text-black/50'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Product list + camera capture button */}
        <div className="px-4 mt-3">
          <div className="flex gap-3 overflow-x-auto pb-2">

            {/* Camera capture tile */}
            <button
              onClick={() => handleCaptureClick(activeCategory)}
              className="flex-shrink-0 w-28 h-36 rounded-xl border-2 border-dashed border-black/10 flex flex-col items-center justify-center gap-2 bg-white transition-all hover:border-black/30 hover:bg-black/[0.02]"
            >
              <Camera size={22} className="text-black/40" />
              <span className="text-[8px] text-black/40 font-semibold text-center leading-tight px-2">
                Kleidung abfotografieren
              </span>
            </button>

            {/* Product cards */}
            {allProducts[activeCategory]?.map(item => (
              <ProductCard
                key={item.id}
                item={item}
                isSelected={outfit[activeCategory] === item.id}
                onSelect={id => selectItem(activeCategory, id)}
                onDelete={item.isLocal ? deleteLocalItem : null}
              />
            ))}
          </div>

          {allProducts[activeCategory]?.length === 0 && (
            <p className="text-center text-black/40 text-xs py-2 pb-4">
              Noch keine Artikel. Kleidung abfotografieren oder Kollektion besuchen.
            </p>
          )}
        </div>

        {/* STL info card */}
        <div className="mx-4 mt-3 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-500" />
            <p className="text-[9px] text-teal-700 font-semibold uppercase tracking-wide">STL-Fußmodell verbunden</p>
          </div>
          <p className="text-[9px] text-teal-600 mt-1 leading-relaxed">
            Ausgewählte Schuhe werden mit deinen 3D-Fußdaten kombiniert — exakte Passform garantiert.
          </p>
        </div>

        {/* Rescan button */}
        <button
          onClick={() => { setPhase('scan'); setScanStep(1); setCapturedSteps([]) }}
          className="mx-4 mt-3 w-[calc(100%-32px)] py-3 rounded-xl bg-white border border-black/[0.08] text-[9px] font-bold uppercase tracking-widest text-black/50 flex items-center justify-center gap-2"
          style={{ border: '1px solid #e5e7eb' }}
        >
          <Camera size={14} />
          Avatar neu scannen
        </button>
      </div>

      {/* Bottom CTA bar */}
      <div className="bg-white border-t border-black/[0.06] px-4 pt-3 pb-3 flex items-center gap-2">
        <button
          onClick={() => setSaved(v => !v)}
          className={`flex items-center gap-1.5 px-4 rounded-xl border-2 transition-all text-[9px] font-bold uppercase tracking-widest h-12 ${
            saved ? 'bg-black text-white border-black' : 'bg-white text-black border-black/[0.08]'
          }`}
        >
          <Bookmark size={14} className={saved ? 'fill-white text-white' : 'text-black'} strokeWidth={1.5} />
          Speichern
        </button>
        <button
          onClick={() => navigate('/collection')}
          className="flex-1 rounded-xl bg-black/[0.03] text-black flex items-center justify-center text-[9px] font-bold uppercase tracking-widest border-0 h-12"
        >
          Kollektion
        </button>
        <button
          onClick={() => navigate('/collection')}
          className="flex-1 rounded-xl bg-black text-white flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-widest border-0 h-12"
        >
          <ShoppingBag size={13} />
          Kaufen
        </button>
      </div>
    </div>
  )
}
