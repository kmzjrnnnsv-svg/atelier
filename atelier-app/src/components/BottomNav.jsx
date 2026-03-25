import { useNavigate, useLocation } from 'react-router-dom'
import { useTransition, useState, useEffect, useRef, useCallback } from 'react'
import { Search } from 'lucide-react'
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
        <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 leading-none">
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

// Hook: hide nav on scroll down, show on scroll up
function useScrollDirection() {
  const [visible, setVisible] = useState(true)
  const lastY = useRef(0)
  const ticking = useRef(false)

  const onScroll = useCallback(() => {
    if (ticking.current) return
    ticking.current = true
    requestAnimationFrame(() => {
      const y = window.scrollY
      const delta = y - lastY.current
      // Show when scrolling up or near top, hide when scrolling down past threshold
      if (y < 60) {
        setVisible(true)
      } else if (delta > 6) {
        setVisible(false)
      } else if (delta < -4) {
        setVisible(true)
      }
      lastY.current = y
      ticking.current = false
    })
  }, [])

  useEffect(() => {
    // Only use scroll-direction hide on mobile web (document scroll)
    if (!isMobileWeb) return
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onScroll])

  // For native (internal scroll container), always visible
  if (!isMobileWeb) return true
  return visible
}

export default function BottomNav() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  const [isPending, startTransition] = useTransition()
  const cartCount = useAtelierStore(s => s.cart.length)
  const visible = useScrollDirection()

  const activeId = pathname === '/search' ? 'search'
    : PILL_ITEMS.find(item => pathname === item.path || pathname.startsWith(item.path + '/'))?.id

  // On mobile web: fixed to viewport bottom, animated show/hide
  // On native: flex-shrink-0 inside the fixed container
  const wrapperStyle = isMobileWeb
    ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transform: visible ? 'translateY(0)' : 'translateY(calc(100% + 10px))',
        transition: 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
        willChange: 'transform',
        pointerEvents: visible ? 'auto' : 'none',
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
          className="flex items-center justify-around flex-1 rounded-2xl px-1 py-1"
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

        {/* ── Separate search circle button ── */}
        <button
          onClick={() => {
            hapticSelection()
            startTransition(() => navigate('/search'))
          }}
          onPointerEnter={() => prefetchRoute('/search')}
          className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center border-0 flex-shrink-0 transition-colors ${
            activeId === 'search' ? 'text-[#007AFF]' : 'text-white/70'
          }`}
          style={{
            background: 'rgba(45,45,48,0.92)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
          }}
        >
          <Search size={22} strokeWidth={activeId === 'search' ? 2.2 : 1.8} />
        </button>
      </div>
    </div>
  )
}

// Height constant for content padding (so content isn't hidden behind fixed nav)
export const BOTTOM_NAV_HEIGHT = 76
