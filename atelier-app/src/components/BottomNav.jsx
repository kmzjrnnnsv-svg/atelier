import { useNavigate, useLocation } from 'react-router-dom'
import { useTransition } from 'react'
import { prefetchRoute, isNative } from '../App'
import useAtelierStore from '../store/atelierStore'

function hapticSelection() {
  if (navigator.vibrate) navigator.vibrate(10)
}

// Apple Store style tab icons — thin SF Symbol-like strokes
function IconForYou({ active }) {
  return (
    <svg width="25" height="25" viewBox="0 0 25 25" fill="none" stroke="currentColor" strokeWidth={active ? 1.8 : 1.3} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12.5" cy="8" r="4" />
      <path d="M5 21.5c0-4.14 3.36-7.5 7.5-7.5s7.5 3.36 7.5 7.5" />
      {active && <circle cx="19" cy="5.5" r="2.5" fill="currentColor" stroke="none" />}
    </svg>
  )
}

function IconProducts({ active }) {
  return (
    <svg width="25" height="25" viewBox="0 0 25 25" fill="none" stroke="currentColor" strokeWidth={active ? 1.8 : 1.3} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="19" height="14" rx="2" />
      <path d="M3 10h19" />
      <path d="M9 6V4a3 3 0 0 1 3-3v0a3 3 0 0 1 3 3v2" />
    </svg>
  )
}

function IconExplore({ active }) {
  return (
    <svg width="25" height="25" viewBox="0 0 25 25" fill="none" stroke="currentColor" strokeWidth={active ? 1.8 : 1.3} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12.5" cy="12.5" r="10" />
      <polygon points="16.5,8.5 10.5,10.5 8.5,16.5 14.5,14.5" fill={active ? 'currentColor' : 'none'} />
    </svg>
  )
}

function IconSearch({ active }) {
  return (
    <svg width="25" height="25" viewBox="0 0 25 25" fill="none" stroke="currentColor" strokeWidth={active ? 1.8 : 1.3} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M16 16l5 5" />
    </svg>
  )
}

function IconBag({ active, count }) {
  return (
    <div className="relative">
      <svg width="25" height="25" viewBox="0 0 25 25" fill="none" stroke="currentColor" strokeWidth={active ? 1.8 : 1.3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8h13l1.5 13H4.5L6 8z" />
        <path d="M9 8V6a3.5 3.5 0 0 1 7 0v2" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1.5 bg-[#007AFF] text-white text-[9px] font-semibold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  )
}

const NAV_ITEMS = [
  { id: 'foryou',  icon: IconForYou,   label: 'Für dich',    path: '/foryou' },
  { id: 'shop',    icon: IconProducts,  label: 'Kollektion',  path: '/collection' },
  { id: 'explore', icon: IconExplore,   label: 'Entdecken',   path: '/explore' },
  { id: 'search',  icon: IconSearch,    label: 'Suche',       path: '/search' },
  { id: 'bag',     icon: IconBag,       label: 'Warenkorb',   path: '/checkout' },
]

export default function BottomNav() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  const [isPending, startTransition] = useTransition()
  const cartCount = useAtelierStore(s => s.cart.length)

  const activeId = NAV_ITEMS.find(item =>
    pathname === item.path || pathname.startsWith(item.path + '/')
  )?.id

  return (
    <div
      className="bg-white/95 backdrop-blur-xl border-t border-black/8 flex items-center justify-around px-1 flex-shrink-0"
      style={{ paddingBottom: isNative ? 'calc(env(safe-area-inset-bottom, 0px) + 2px)' : '8px' }}
    >
      {NAV_ITEMS.map(({ id, icon: Icon, label, path }) => {
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
            className={`relative flex flex-col items-center gap-0.5 bg-transparent border-0 pt-2 pb-1 px-2 min-w-[48px] transition-colors ${
              isActive ? 'text-[#007AFF]' : 'text-[#8E8E93]'
            } ${isPending ? 'opacity-70' : ''}`}
          >
            <Icon active={isActive} count={id === 'bag' ? cartCount : 0} />
            <span className="text-[10px] leading-tight mt-0.5" style={{ fontWeight: isActive ? 500 : 400 }}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
