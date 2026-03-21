import { useNavigate, useLocation } from 'react-router-dom'
import { useTransition } from 'react'
import { Home, Compass, User } from 'lucide-react'
import { prefetchRoute, isNative } from '../App'

const NAV_ITEMS = [
  { id: 'shop',    icon: Home,    label: 'SOLE',    path: '/collection' },
  { id: 'explore', icon: Compass, label: 'EXPLORE', path: '/explore'    },
  { id: 'profile', icon: User,    label: 'PROFILE', path: '/profile'    },
]

export default function BottomNav() {
  const navigate        = useNavigate()
  const { pathname }    = useLocation()
  const [isPending, startTransition] = useTransition()

  const activeId = NAV_ITEMS.find(item =>
    pathname === item.path || pathname.startsWith(item.path + '/')
  )?.id

  return (
    <div className="bg-white border-t border-black/5 flex items-center justify-around px-2 pt-0 flex-shrink-0"
      style={{ paddingBottom: isNative ? 'max(env(safe-area-inset-bottom, 0px), 12px)' : '12px' }}>
      {NAV_ITEMS.map(({ id, icon: Icon, label, path }) => {
        const isActive = activeId === id
        return (
          <button
            key={id}
            onClick={() => startTransition(() => navigate(path))}
            onPointerEnter={() => prefetchRoute(path)}
            onTouchStart={() => prefetchRoute(path)}
            className={`flex flex-col items-center gap-0.5 bg-transparent border-0 pt-2 pb-2 px-2 transition-colors ${
              isActive ? 'text-black' : 'text-black/30'
            } ${isPending ? 'opacity-70' : ''}`}
            style={{ borderTop: isActive ? '2px solid black' : '2px solid transparent' }}
          >
            <Icon size={22} strokeWidth={isActive ? 1.8 : 1.5} />
            <span
              className="text-[7px] uppercase tracking-[0.18em] font-normal"
              style={{ letterSpacing: '0.18em' }}
            >{label}</span>
          </button>
        )
      })}
    </div>
  )
}
