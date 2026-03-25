import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, Search, User, ShoppingCart, X, Compass, Heart, Package, Settings, HelpCircle, Footprints } from 'lucide-react'
import { prefetchRoute } from '../App'
import useAtelierStore from '../store/atelierStore'

const MENU_ITEMS = [
  { icon: User,         label: 'Für dich',       path: '/foryou' },
  { icon: ShoppingCart,  label: 'Produkte',       path: '/collection' },
  { icon: Compass,      label: 'Mehr machen',    path: '/explore' },
  { icon: Search,       label: 'Suche',          path: '/search' },
  { icon: Heart,        label: 'Wunschliste',    path: '/wishlist' },
  { icon: Footprints,   label: 'Meine Scans',    path: '/my-scans' },
  { icon: Package,      label: 'Bestellungen',   path: '/orders' },
  { icon: Settings,     label: 'Einstellungen',  path: '/settings' },
  { icon: HelpCircle,   label: 'Hilfe',          path: '/help' },
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
      {/* ── Floating nav icons (no bar, transparent) ── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1" style={{ position: 'sticky', top: 0, zIndex: 20 }}>
        <button onClick={() => setOpen(true)} className="w-9 h-9 bg-white/80 backdrop-blur-sm flex items-center justify-center border-0 active:opacity-60">
          <Menu size={20} strokeWidth={1.5} className="text-black" />
        </button>

        <div className="flex items-center gap-2">
          <button onClick={() => go('/profile')} className="w-9 h-9 bg-white/80 backdrop-blur-sm flex items-center justify-center border-0 active:opacity-60">
            <User size={17} strokeWidth={1.5} className="text-black/70" />
          </button>
          <button onClick={() => go('/checkout')} className="w-9 h-9 bg-white/80 backdrop-blur-sm flex items-center justify-center border-0 active:opacity-60 relative">
            <ShoppingCart size={17} strokeWidth={1.5} className="text-black/70" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-black text-white text-[8px] font-bold min-w-[14px] h-3.5 flex items-center justify-center px-0.5 leading-none">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Slide-out menu overlay ── */}
      {open && (
        <div className="fixed inset-0 z-[999] flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <nav className="relative w-72 max-w-[80vw] bg-white h-full flex flex-col shadow-2xl" style={{ animation: 'slideInLeft 0.3s ease' }}>
            <div className="flex items-center justify-between px-5 h-14 border-b border-black/5">
              <span className="text-[15px] font-bold tracking-[0.05em]">ATELIER</span>
              <button onClick={() => setOpen(false)} className="w-8 h-8 bg-[#F2F2F7] flex items-center justify-center border-0">
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
                    className={`w-full flex items-center gap-3 px-5 py-3 bg-transparent border-0 text-left transition-colors ${
                      isActive ? 'text-black bg-[#F2F2F7]' : 'text-black/60'
                    }`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
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
