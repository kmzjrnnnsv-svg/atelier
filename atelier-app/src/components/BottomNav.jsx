import { useNavigate, useLocation } from 'react-router-dom'
import { useTransition } from 'react'
import { Home, ShoppingBag, Compass, User } from 'lucide-react'
import { prefetchRoute } from '../App'
import useAtelierStore from '../store/atelierStore'

const NAV_ITEMS = [
  { id: 'shop',    icon: Home,        label: 'Home',    path: '/collection' },
  { id: 'cart',    icon: ShoppingBag, label: 'Cart',    path: '/orders'     },
  { id: 'explore', icon: Compass,     label: 'Explore', path: '/explore'    },
  { id: 'profile', icon: User,        label: 'Profile', path: '/profile'    },
]

export default function BottomNav() {
  const navigate        = useNavigate()
  const { pathname }    = useLocation()
  const [isPending, startTransition] = useTransition()
  const orders = useAtelierStore(s => s.orders)
  const activeCount = orders.filter(o => !['delivered','cancelled'].includes(o.status)).length

  const activeId = NAV_ITEMS.find(item =>
    pathname === item.path || pathname.startsWith(item.path + '/')
  )?.id

  return (
    <div className="bg-white border-t border-black/8 flex items-center flex-shrink-0"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around w-full max-w-lg mx-auto">
        {NAV_ITEMS.map(({ id, icon: Icon, label, path }) => {
          const isActive = activeId === id
          const isCart = id === 'cart'
          return (
            <button
              key={id}
              onClick={() => startTransition(() => navigate(path))}
              onPointerEnter={() => prefetchRoute(path)}
              onTouchStart={() => prefetchRoute(path)}
              className={`relative flex flex-col items-center gap-1 bg-transparent border-0 py-3 px-4 transition-all ${
                isPending ? 'opacity-70' : ''
              }`}
            >
              <div className={`relative flex items-center justify-center transition-all ${
                isActive ? 'text-black' : 'text-black/25'
              }`}>
                <Icon size={20} strokeWidth={isActive ? 1.8 : 1.3} />
                {isCart && activeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 bg-black flex items-center justify-center">
                    <span className="text-[7px] font-bold text-white">{activeCount}</span>
                  </span>
                )}
              </div>
              <span className={`text-[7px] uppercase tracking-[0.15em] transition-all ${
                isActive ? 'text-black font-semibold' : 'text-black/25 font-normal'
              }`}>{label}</span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-black" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
