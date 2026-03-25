import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, User, ShoppingBag, X, Compass, Heart, Package, HelpCircle, Settings, Gift } from 'lucide-react'
import { prefetchRoute, isMobileWeb } from '../App'
import useAtelierStore from '../store/atelierStore'

const MENU_ITEMS = [
  { icon: User,         label: 'Für dich',       path: '/foryou' },
  { icon: ShoppingBag,  label: 'Produkte',       path: '/collection' },
  { icon: Gift,         label: 'Zubehör',        path: '/accessories' },
  { icon: Compass,      label: 'Entdecken',      path: '/explore' },
  { icon: Heart,        label: 'Wunschliste',    path: '/wishlist' },
  { icon: Package,      label: 'Bestellungen',   path: '/orders' },
  { icon: HelpCircle,   label: 'Hilfe & Kontakt', path: '/help' },
  { icon: Settings,     label: 'Einstellungen',   path: '/settings' },
]

// Page titles for sub-pages — when set, replaces "ATELIER" in center
const PAGE_TITLES = {
  '/collection': 'Kollektion',
  '/wishlist':   'Wunschliste',
  '/my-scans':   'Meine Scans',
  '/orders':     'Bestellungen',
  '/profile':    'Profil',
  '/settings':   'Einstellungen',
  '/help':       'Hilfe & Kontakt',
  '/explore':      'Entdecken',
  '/accessories':  'Zubehör',
}

export default function TopBar() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const cartCount = useAtelierStore(s => s.cart.length)

  const go = (path) => { setOpen(false); navigate(path) }
  const pageTitle = PAGE_TITLES[pathname]

  return (
    <>
      {/* ── Header bar ── */}
      <header
        className="flex items-center justify-between bg-white flex-shrink-0"
        style={{ position: 'sticky', top: 0, zIndex: 20, borderBottom: '0.5px solid rgba(0,0,0,0.08)', height: isMobileWeb ? '48px' : '52px', padding: isMobileWeb ? '0 16px' : '0 28px' }}
      >
        {/* Left: Burger only */}
        <div className="flex items-center">
          <button onClick={() => setOpen(true)} className="bg-transparent border-0 p-1.5 text-black active:opacity-50">
            <Menu size={isMobileWeb ? 22 : 20} strokeWidth={1.3} />
          </button>
        </div>

        {/* Center: Page title or Brand */}
        <button onClick={() => go('/foryou')} className="absolute left-1/2 -translate-x-1/2 bg-transparent border-0 p-0 active:opacity-60">
          {pageTitle ? (
            <span className="text-[14px] font-semibold tracking-wide text-black">{pageTitle}</span>
          ) : (
            <span className="text-[18px] font-bold tracking-[0.06em] text-black" style={{ fontFamily: "'Inter', sans-serif" }}>ATELIER</span>
          )}
        </button>

        {/* Right: Wishlist (desktop) + Account + Cart */}
        <div className="flex items-center gap-0.5">
          {!isMobileWeb && (
            <button onClick={() => go('/wishlist')} className="bg-transparent border-0 p-1.5 text-black active:opacity-50">
              <Heart size={18} strokeWidth={1.3} />
            </button>
          )}
          <button onClick={() => go('/profile')} className="bg-transparent border-0 p-1.5 text-black active:opacity-50">
            <User size={isMobileWeb ? 20 : 18} strokeWidth={1.3} />
          </button>
          <button onClick={() => go('/checkout')} className="bg-transparent border-0 p-1.5 text-black active:opacity-50 relative">
            <ShoppingBag size={isMobileWeb ? 20 : 18} strokeWidth={1.3} />
            {cartCount > 0 && (
              <span className="absolute top-0.5 right-0 bg-black text-white text-[7px] font-bold min-w-[13px] h-[13px] flex items-center justify-center px-0.5 leading-none" style={{ borderRadius: '6px' }}>
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Slide-out menu overlay ── */}
      {open && (
        <div className="fixed inset-0 z-[999] flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <nav className="relative w-72 max-w-[80vw] bg-white flex flex-col shadow-2xl" style={{ animation: 'slideInLeft 0.3s ease', height: '100dvh' }}>
            <div className="flex items-center justify-between px-5 h-14 border-b border-black/5">
              <span className="text-[16px] font-bold tracking-[0.05em]">ATELIER</span>
              <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center border-0 bg-transparent active:opacity-60">
                <X size={16} strokeWidth={2} className="text-black/60" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {MENU_ITEMS.map(({ icon: Icon, label, path }) => {
                const isActive = pathname === path || pathname.startsWith(path + '/')
                return (
                  <button
                    key={path}
                    onClick={() => go(path)}
                    onPointerEnter={() => prefetchRoute(path)}
                    className={`w-full flex items-center gap-3.5 px-5 py-3.5 bg-transparent border-0 text-left transition-colors ${
                      isActive ? 'text-black' : 'text-black/50'
                    }`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2 : 1.3} />
                    <span className="text-[15px]" style={{ fontWeight: isActive ? 600 : 400 }}>{label}</span>
                  </button>
                )
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
