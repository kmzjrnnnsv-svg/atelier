import { useNavigate, useLocation } from 'react-router-dom'
import { useTransition } from 'react'
import { Home, Compass, User } from 'lucide-react'
import { prefetchRoute } from '../App'

const NAV_ITEMS = [
  { id: 'shop',    icon: Home,    label: 'Home',    path: '/collection' },
  { id: 'explore', icon: Compass, label: 'Explore', path: '/explore'    },
  { id: 'profile', icon: User,    label: 'Profile', path: '/profile'    },
]

export default function BottomNav() {
  const navigate        = useNavigate()
  const { pathname }    = useLocation()
  const [isPending, startTransition] = useTransition()

  const activeId = NAV_ITEMS.find(item =>
    pathname === item.path || pathname.startsWith(item.path + '/')
  )?.id

  return (
    <div className="flex-shrink-0 flex justify-center px-4 pb-3 pt-2"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}>
      <div className="flex items-center justify-around w-full max-w-sm bg-black shadow-lg"
        style={{ borderRadius: 0 }}>
        {NAV_ITEMS.map(({ id, icon: Icon, label, path }) => {
          const isActive = activeId === id
          return (
            <button
              key={id}
              onClick={() => startTransition(() => navigate(path))}
              onPointerEnter={() => prefetchRoute(path)}
              onTouchStart={() => prefetchRoute(path)}
              className={`relative flex flex-col items-center gap-1 bg-transparent border-0 py-3 px-5 transition-all ${
                isPending ? 'opacity-70' : ''
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 1.8 : 1.3}
                className={isActive ? 'text-white' : 'text-white/35'} />
              <span className={`text-[7px] uppercase tracking-[0.15em] ${
                isActive ? 'text-white font-semibold' : 'text-white/35 font-normal'
              }`}>{label}</span>
              {isActive && (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
