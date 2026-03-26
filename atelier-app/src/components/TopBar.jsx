import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { X, ChevronLeft, Search, ShoppingBag, User, Heart } from 'lucide-react'
import { prefetchRoute, isMobileWeb } from '../App'
import useAtelierStore from '../store/atelierStore'

// ── Navigation structure (LV-style) ─────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Für dich',       path: '/foryou' },
  { label: 'Kollektion',     path: '/collection' },
  { label: 'Zubehör',        path: '/accessories' },
  { label: 'Entdecken',      path: '/explore' },
]

const SECONDARY_ITEMS = [
  { label: 'Wunschliste',     path: '/wishlist' },
  { label: 'Bestellungen',    path: '/orders' },
  { label: 'Hilfe & Kontakt', path: '/help' },
  { label: 'Einstellungen',   path: '/settings' },
]

// Pages that are "main" tabs — show burger. Others show back arrow.
const MAIN_PAGES = new Set(['/foryou', '/collection', '/accessories', '/explore', '/checkout'])

export default function TopBar() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const cartCount = useAtelierStore(s => s.cart.length)

  const isSubPage = !MAIN_PAGES.has(pathname)

  // Close menu on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Lock body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  const go = (path) => { setOpen(false); navigate(path) }

  const headerH = isMobileWeb ? 48 : 52
  const headerPx = isMobileWeb ? 16 : 28

  return (
    <>
      {/* ── Header bar ── */}
      <header
        className="flex items-center justify-between bg-white flex-shrink-0"
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          borderBottom: '0.5px solid rgba(0,0,0,0.08)',
          height: headerH, padding: `0 ${headerPx}px`,
        }}
      >
        {/* Left */}
        <div className="flex items-center" style={{ minWidth: 80 }}>
          {isSubPage ? (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 bg-transparent border-0 p-1 text-black active:opacity-50"
            >
              <ChevronLeft size={isMobileWeb ? 22 : 20} strokeWidth={1.3} />
              {!isMobileWeb && (
                <span className="text-[13px] font-light text-black/60">Zurück</span>
              )}
            </button>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="bg-transparent border-0 p-1.5 text-black active:opacity-50"
              aria-label="Menü öffnen"
            >
              {/* LV-style thin hamburger lines */}
              <div className="flex flex-col gap-[5px]" style={{ width: isMobileWeb ? 20 : 18 }}>
                <div className="h-px bg-black w-full" />
                <div className="h-px bg-black w-full" />
              </div>
            </button>
          )}
        </div>

        {/* Center: Brand */}
        <button
          onClick={() => go('/foryou')}
          className="absolute left-1/2 -translate-x-1/2 bg-transparent border-0 p-0 active:opacity-60"
        >
          <span className="text-[16px] lg:text-[17px] font-normal tracking-[0.18em] text-black">
            ATELIER
          </span>
        </button>

        {/* Right: icons */}
        <div className="flex items-center gap-0.5" style={{ minWidth: 80, justifyContent: 'flex-end' }}>
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
              <span
                className="absolute top-0.5 right-0 bg-black text-white text-[7px] font-bold min-w-[13px] h-[13px] flex items-center justify-center px-0.5 leading-none"
                style={{ borderRadius: '6px' }}
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Full-screen menu overlay (LV-style) ── */}
      {open && (
        <div
          className="fixed inset-0 z-[999] bg-white"
          style={{ animation: 'menuFadeIn 0.3s ease' }}
        >
          {/* Menu header */}
          <div
            className="flex items-center justify-between"
            style={{
              height: headerH, padding: `0 ${headerPx}px`,
              borderBottom: '0.5px solid rgba(0,0,0,0.08)',
            }}
          >
            <button
              onClick={() => setOpen(false)}
              className="bg-transparent border-0 p-1.5 text-black active:opacity-50"
              aria-label="Menü schließen"
            >
              <X size={isMobileWeb ? 22 : 20} strokeWidth={1.3} />
            </button>

            <span className="absolute left-1/2 -translate-x-1/2 text-[16px] lg:text-[17px] font-normal tracking-[0.18em] text-black">
              ATELIER
            </span>

            <div className="flex items-center gap-0.5">
              <button onClick={() => go('/profile')} className="bg-transparent border-0 p-1.5 text-black active:opacity-50">
                <User size={isMobileWeb ? 20 : 18} strokeWidth={1.3} />
              </button>
              <button onClick={() => go('/checkout')} className="bg-transparent border-0 p-1.5 text-black active:opacity-50 relative">
                <ShoppingBag size={isMobileWeb ? 20 : 18} strokeWidth={1.3} />
                {cartCount > 0 && (
                  <span
                    className="absolute top-0.5 right-0 bg-black text-white text-[7px] font-bold min-w-[13px] h-[13px] flex items-center justify-center px-0.5 leading-none"
                    style={{ borderRadius: '6px' }}
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Menu content — fixed layout, no scroll */}
          <div className="flex flex-col justify-center" style={{ height: `calc(100vh - ${headerH}px)`, overflow: 'hidden' }}>
            {/* Primary navigation — large text like LV */}
            <nav className="px-6 lg:px-12">
              {NAV_ITEMS.map(({ label, path }) => {
                const isActive = pathname === path || pathname.startsWith(path + '/')
                return (
                  <button
                    key={path}
                    onClick={() => go(path)}
                    onPointerEnter={() => prefetchRoute(path)}
                    className="block w-full text-left bg-transparent border-0 py-3 lg:py-4 group"
                  >
                    <span
                      className={`text-[28px] lg:text-[34px] font-extralight tracking-tight transition-colors ${
                        isActive ? 'text-black' : 'text-black/30 group-hover:text-black'
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                )
              })}
            </nav>

            {/* Divider */}
            <div className="mx-6 lg:mx-12 my-4 lg:my-6 h-px bg-black/[0.06]" />

            {/* Secondary navigation */}
            <nav className="px-6 lg:px-12">
              {SECONDARY_ITEMS.map(({ label, path }) => {
                const isActive = pathname === path
                return (
                  <button
                    key={path}
                    onClick={() => go(path)}
                    onPointerEnter={() => prefetchRoute(path)}
                    className="block w-full text-left bg-transparent border-0 py-2 lg:py-2.5 group"
                  >
                    <span
                      className={`text-[14px] lg:text-[15px] font-light transition-colors ${
                        isActive ? 'text-black' : 'text-black/35 group-hover:text-black'
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
