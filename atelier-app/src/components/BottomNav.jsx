import { useNavigate, useLocation } from 'react-router-dom'
import { useTransition } from 'react'
import { prefetchRoute, isNative, isMobileWeb } from '../App'
import useAtelierStore from '../store/atelierStore'

function hapticSelection() {
  if (navigator.vibrate) navigator.vibrate(10)
}

// Apple Store tab bar icons — matching the real app exactly
function IconForYou({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="14" y2="12" />
      <line x1="4" y1="18" x2="18" y2="18" />
      <path d="M18 4v4M16 6h4" strokeWidth={active ? 2.2 : 1.8} />
    </svg>
  )
}

function IconProducts({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a4 4 0 0 0-8 0v2" />
      <path d="M2 11h20" />
    </svg>
  )
}

function IconExplore({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" fill={active ? 'currentColor' : 'none'} />
    </svg>
  )
}

function IconBag({ active, count }) {
  return (
    <div className="relative">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-bold rounded-lg min-w-[14px] h-3.5 flex items-center justify-center px-0.5 leading-none">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  )
}

const PILL_ITEMS = [
  { id: 'foryou',  icon: IconForYou,   label: 'Für dich',          path: '/foryou' },
  { id: 'shop',    icon: IconProducts,  label: 'Produkte',          path: '/collection' },
  { id: 'explore', icon: IconExplore,   label: 'Mehr machen',       path: '/explore' },
  { id: 'bag',     icon: IconBag,       label: 'Einkaufstasche',    path: '/checkout' },
]


export default function BottomNav() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  const [isPending, startTransition] = useTransition()
  const cartCount = useAtelierStore(s => s.cart.length)

  const activeId = PILL_ITEMS.find(item => pathname === item.path || pathname.startsWith(item.path + '/'))?.id

  // On mobile web: fixed to viewport bottom (always visible)
  // On native: flex-shrink-0 inside the fixed container
  const wrapperStyle = isMobileWeb
    ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }
    : {}

  return (
    <div style={wrapperStyle}>
      <div
        className="flex items-end justify-center gap-2.5 px-4 flex-shrink-0"
        style={{ paddingBottom: isNative ? 'calc(env(safe-area-inset-bottom, 0px) + 4px)' : '12px', paddingTop: '6px' }}
      >
        {/* ── Main pill tab bar ── */}
        <div
          className="flex items-center justify-around flex-1 rounded-xl px-1 py-1"
          style={{
            background: 'rgba(45,45,48,0.92)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            maxWidth: '380px',
          }}
        >
          {PILL_ITEMS.map(({ id, icon: Icon, label, path }) => {
            const isActive = activeId === id
            return (
              <button
                key={id}
                onClick={() => {
                  hapticSelection()
                  startTransition(() => navigate(path))
                }}
                onPointerEnter={() => prefetchRoute(path)}
                onTouchStart={() => prefetchRoute(path)}
                className={`relative flex flex-col items-center gap-0 bg-transparent border-0 py-1.5 px-2 min-w-0 flex-1 transition-colors ${
                  isActive ? 'text-[#007AFF]' : 'text-white/60'
                } ${isPending ? 'opacity-70' : ''}`}
              >
                <Icon active={isActive} count={id === 'bag' ? cartCount : 0} />
                <span className="text-[9px] leading-tight mt-0.5 truncate w-full text-center" style={{ fontWeight: isActive ? 600 : 400 }}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>

      </div>
    </div>
  )
}

// Height constant for content padding (so content isn't hidden behind fixed nav)
export const BOTTOM_NAV_HEIGHT = 76
