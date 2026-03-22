import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, Search, User, ShoppingCart, X, Compass, ShoppingBag, Settings, HelpCircle, Heart, Package } from 'lucide-react'
import { prefetchRoute } from '../App'
import useAtelierStore from '../store/atelierStore'

const MENU_ITEMS = [
  { icon: ShoppingBag, label: 'Kollektion', path: '/collection' },
  { icon: Compass,     label: 'Entdecken',  path: '/explore' },
  { icon: Search,      label: 'Suche',      path: '/search' },
  { icon: Heart,       label: 'Wunschliste', path: '/wishlist' },
  { icon: Package,     label: 'Bestellungen', path: '/orders' },
  { icon: Settings,    label: 'Einstellungen', path: '/settings' },
  { icon: HelpCircle,  label: 'Hilfe',      path: '/help' },
]

export default function TopBar() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const cartCount = useAtelierStore(s => s.cart.length)

  const go = (path) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <>
      {/* ── Header bar ── */}
      <header className="border-b border-black/5 flex items-center justify-between px-4 h-12 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <button onClick={() => setOpen(true)} className="bg-transparent border-0 p-1 -ml-1 text-black">
          <Menu size={22} strokeWidth={1.5} />
        </button>

        <button onClick={() => go('/collection')} className="bg-transparent border-0 p-0 flex items-center gap-1.5">
          <svg viewBox="0 0 32 32" className="w-7 h-7">
            <rect width="32" height="32" fill="#000" rx="6" />
            <text x="16" y="23" fontFamily="Georgia, serif" fontSize="20" fontWeight="bold" textAnchor="middle" fill="#fff">A</text>
          </svg>
          <span className="text-sm font-semibold tracking-wide text-black">ATELIER</span>
        </button>

        <div className="flex items-center gap-3">
          <button onClick={() => go('/search')} className="bg-transparent border-0 p-1 text-black">
            <Search size={20} strokeWidth={1.5} />
          </button>
          <button onClick={() => go('/profile')} className="bg-transparent border-0 p-1 text-black">
            <User size={20} strokeWidth={1.5} />
          </button>
          <button onClick={() => go('/checkout')} className="bg-transparent border-0 p-1 text-black relative">
            <ShoppingCart size={20} strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-1 bg-red-500 text-white text-[9px] font-semibold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 leading-none">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Slide-out menu overlay ── */}
      {open && (
        <div className="fixed inset-0 z-[999] flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

          {/* Drawer */}
          <nav className="relative w-72 max-w-[80vw] bg-white h-full flex flex-col shadow-2xl animate-slide-in-left">
            <div className="flex items-center justify-between px-4 h-14 border-b border-black/5">
              <span className="text-sm font-semibold tracking-wide">MENÜ</span>
              <button onClick={() => setOpen(false)} className="bg-transparent border-0 p-1 text-black">
                <X size={20} strokeWidth={1.5} />
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
                    className={`w-full flex items-center gap-3 px-5 py-3 bg-transparent border-0 text-left transition-colors ${
                      isActive ? 'text-black bg-black/[0.03]' : 'text-black/60 hover:text-black hover:bg-black/[0.02]'
                    }`}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                    <span className="text-sm" style={{ fontWeight: isActive ? 600 : 400 }}>{label}</span>
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
