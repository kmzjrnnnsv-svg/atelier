import { useNavigate } from 'react-router-dom'
import { Footprints, Sparkles, Shirt, Image, ArrowRight, TrendingUp } from 'lucide-react'
import useAtelierStore from '../../store/atelierStore'

export default function CMSDashboard() {
  const navigate = useNavigate()
  const { shoes, curated, wardrobe, outfits } = useAtelierStore()

  const stats = [
    { label: 'Schuhe', value: shoes.length, icon: Footprints, to: '/cms/shoes', color: 'bg-blue-500/10 text-blue-400', border: 'border-blue-500/20' },
    { label: 'Curated Items', value: curated.length, icon: Sparkles, to: '/cms/curated', color: 'bg-purple-500/10 text-purple-400', border: 'border-purple-500/20' },
    { label: 'Garderobe', value: wardrobe.length, icon: Shirt, to: '/cms/wardrobe', color: 'bg-emerald-500/10 text-emerald-400', border: 'border-emerald-500/20' },
    { label: 'Outfits', value: outfits.length, icon: Image, to: '/cms/outfits', color: 'bg-amber-500/10 text-amber-400', border: 'border-amber-500/20' },
  ]

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Verwalte alle Inhalte der ATELIER App</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, to, color, border }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className={`bg-white border ${border} rounded-xl p-5 text-left hover:bg-gray-100 transition-all group border-0 outline-none`}
            style={{ border: `1px solid` }}
          >
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
                <Icon size={18} />
              </div>
              <ArrowRight size={14} className="text-gray-400 group-hover:text-gray-400 transition-colors mt-1" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-4">{value}</p>
            <p className="text-xs font-medium text-gray-400 mt-1">{label}</p>
          </button>
        ))}
      </div>

      {/* Recent Shoes */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Footprints size={14} className="text-gray-500" />
            <span className="text-sm font-semibold text-gray-900">Aktuelle Schuhe</span>
          </div>
          <button onClick={() => navigate('/cms/shoes')} className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors bg-transparent border-0 flex items-center gap-1">
            Alle ansehen <ArrowRight size={10} />
          </button>
        </div>
        <div className="divide-y divide-gray-200">
          {shoes.slice(0, 4).map((shoe) => (
            <div key={shoe.id} className="flex items-center gap-4 px-5 py-3">
              <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: shoe.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{shoe.name}</p>
                <p className="text-xs text-gray-400">{shoe.category} · {shoe.material}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-gray-900">{shoe.price}</p>
                {shoe.tag && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{shoe.tag}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Schuh hinzufügen', to: '/cms/shoes', color: 'bg-blue-600 hover:bg-blue-500' },
          { label: 'Outfit erstellen', to: '/cms/outfits', color: 'bg-purple-600 hover:bg-purple-500' },
        ].map(({ label, to, color }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className={`${color} text-white text-xs font-medium py-2.5 rounded-lg transition-colors border-0`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
