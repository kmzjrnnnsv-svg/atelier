import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Compass, BookOpen, User } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'shop',    icon: Home,     label: 'SOLE',    path: '/collection' },
  { id: 'explore', icon: Compass,  label: 'EXPLORE', path: '/explore'    },
  { id: 'learn',   icon: BookOpen, label: 'LEARN',   path: '/learn'      },
  { id: 'profile', icon: User,     label: 'PROFILE', path: '/profile'    },
]

export default function BottomNav() {
  const navigate        = useNavigate()
  const { pathname }    = useLocation()

  const activeId = NAV_ITEMS.find(item =>
    pathname === item.path || pathname.startsWith(item.path + '/')
  )?.id

  return (
    <div className="bg-white border-t border-gray-100 flex items-center justify-around px-2 pt-2 flex-shrink-0"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}>
      {NAV_ITEMS.map(({ id, icon: Icon, label, path }) => (
        <button
          key={id}
          onClick={() => navigate(path)}
          className={`flex flex-col items-center gap-0.5 bg-transparent border-0 p-2 transition-colors ${
            activeId === id ? 'text-black' : 'text-gray-400'
          }`}
        >
          <Icon size={22} strokeWidth={activeId === id ? 2 : 1.5} />
          <span className="text-[7px] uppercase tracking-widest font-bold">{label}</span>
        </button>
      ))}
    </div>
  )
}
