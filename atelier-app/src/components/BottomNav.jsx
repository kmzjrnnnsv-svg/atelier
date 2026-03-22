import { useNavigate, useLocation } from 'react-router-dom'
import { useTransition } from 'react'
import { ShoppingBag, Compass, ShoppingCart, User, Search } from 'lucide-react'
import { prefetchRoute, isNative } from '../App'
import useAtelierStore from '../store/atelierStore'

function hapticSelection() {
  if (navigator.vibrate) navigator.vibrate(10)
}

const NAV_ITEMS = [
  { id: 'shop',    icon: ShoppingBag,  label: 'Kollektion', path: '/collection' },
  { id: 'explore', icon: Compass,      label: 'Entdecken',  path: '/explore'    },
  { id: 'cart',    icon: ShoppingCart,  label: 'Warenkorb',  path: '/checkout'   },
  { id: 'profile', icon: User,         label: 'Profil',     path: '/profile'    },
  { id: 'search',  icon: Search,       label: 'Suche',      path: '/search'     },
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
    <div className="flex items-center justify-around px-2 pt-0"
      style={{ position: isNative ? 'relative' : 'sticky', bottom: 0, zIndex: 20, paddingBottom: isNative ? 'max(env(safe-area-inset-bottom, 0px), 12px)' : '12px', background: 'rgba(250,250,250,0.5)', backdropFilter: 'blur(40px) saturate(180%) brightness(1.1)', WebkitBackdropFilter: 'blur(40px) saturate(180%) brightness(1.1)', boxShadow: 'inset 0 0 4px 0 rgba(255,255,255,0.5), 0 -0.5px 0 0 rgba(0,0,0,0.05)', borderTop: '0.5px solid rgba(255,255,255,0.6)', flexShrink: 0 }}>
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
            className={`relative flex flex-col items-center gap-0.5 bg-transparent border-0 py-1.5 px-1 min-w-[44px] min-h-[44px] transition-colors ${
              isActive ? 'text-black' : 'text-black/40'
            } ${isPending ? 'opacity-70' : ''}`}
          >
            <div className="relative">
              <Icon size={24} strokeWidth={isActive ? 2 : 1.5} />
              {id === 'cart' && cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-semibold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </div>
            <span
              className="text-[10px] tracking-wide leading-tight"
              style={{ fontWeight: isActive ? 500 : 400 }}
            >{label}</span>
          </button>
        )
      })}
    </div>
  )
}
