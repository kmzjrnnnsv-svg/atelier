import { useNavigate } from 'react-router-dom'
import { Footprints, Sparkles, Shirt, Image, ArrowRight, ShoppingBag, ScanLine, BookOpen, Users } from 'lucide-react'
import useAtelierStore from '../../store/atelierStore'

export default function CMSDashboard() {
 const navigate = useNavigate()
 const { shoes, curated, wardrobe, outfits, orders, faqs, articles } = useAtelierStore()

 const stats = [
 { label: 'Schuhe', value: shoes.length, icon: Footprints, to: '/cms/shoes' },
 { label: 'Curated Items', value: curated.length, icon: Sparkles, to: '/cms/curated' },
 { label: 'Garderobe', value: wardrobe.length, icon: Shirt, to: '/cms/wardrobe' },
 { label: 'Outfits', value: outfits.length, icon: Image, to: '/cms/outfits' },
 { label: 'Bestellungen', value: orders.length, icon: ShoppingBag, to: '/cms/orders' },
 { label: 'Artikel', value: articles.length, icon: BookOpen, to: '/cms/articles' },
 ]

 const quickActions = [
 { label: 'Schuh hinzufügen', to: '/cms/shoes' },
 { label: 'Outfit erstellen', to: '/cms/outfits' },
 { label: 'Bestellungen', to: '/cms/orders' },
 { label: 'Foot Scans', to: '/cms/scans' },
 ]

 return (
 <div className="p-8">
 {/* Header */}
 <div className="mb-8">
 <h1 className="text-xl font-bold text-black/90" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>Dashboard</h1>
 <p className="text-black/35 text-sm mt-1">Verwalte alle Inhalte der ATELIER App</p>
 </div>

 {/* Stats grid */}
 <div className="grid grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
 {stats.map(({ label, value, icon: Icon, to }) => (
 <button
 key={label}
 onClick={() => navigate(to)}
 className="bg-white border border-black/6 p-5 text-left hover:border-black/15 transition-all group"
 >
 <div className="flex items-center justify-between mb-4">
 <div className="w-9 h-9 bg-black/4 flex items-center justify-center">
 <Icon size={16} className="text-black/40" strokeWidth={1.5} />
 </div>
 <ArrowRight size={12} className="text-black/15 group-hover:text-black/40 transition-colors" />
 </div>
 <p className="text-2xl font-bold text-black/85">{value}</p>
 <p className="text-[10px] font-medium text-black/30 mt-1 uppercase tracking-wider">{label}</p>
 </button>
 ))}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Recent Shoes */}
 <div className="bg-white border border-black/6 overflow-hidden">
 <div className="flex items-center justify-between px-5 py-4 border-b border-black/6">
 <div className="flex items-center gap-2">
 <Footprints size={14} className="text-black/35" strokeWidth={1.5} />
 <span className="text-[11px] font-semibold text-black/70 uppercase tracking-wider">Aktuelle Schuhe</span>
 </div>
 <button onClick={() => navigate('/cms/shoes')} className="text-[10px] font-medium text-black/30 hover:text-black/60 transition-colors bg-transparent border-0 flex items-center gap-1">
 Alle ansehen <ArrowRight size={9} />
 </button>
 </div>
 <div className="divide-y divide-black/5">
 {shoes.slice(0, 5).map((shoe) => (
 <div key={shoe.id} className="flex items-center gap-4 px-5 py-3 hover:bg-black/2 transition-colors">
 <div className="w-9 h-9 flex-shrink-0" style={{ backgroundColor: shoe.color }} />
 <div className="flex-1 min-w-0">
 <p className="text-[13px] font-medium text-black/80 truncate">{shoe.name}</p>
 <p className="text-[10px] text-black/30">{shoe.category} · {shoe.material}</p>
 </div>
 <div className="text-right flex-shrink-0">
 <p className="text-[13px] font-semibold text-black/70">{shoe.price}</p>
 {shoe.tag && (
 <span className="text-[9px] bg-black/4 text-black/40 px-1.5 py-0.5">{shoe.tag}</span>
 )}
 </div>
 </div>
 ))}
 {shoes.length === 0 && (
 <p className="text-[11px] text-black/30 text-center py-8">Keine Schuhe vorhanden</p>
 )}
 </div>
 </div>

 {/* Quick actions + Recent orders */}
 <div className="space-y-6">
 <div className="bg-white border border-black/6 p-5">
 <p className="text-[11px] font-semibold text-black/70 uppercase tracking-wider mb-4">Schnellaktionen</p>
 <div className="grid grid-cols-2 gap-2">
 {quickActions.map(({ label, to }) => (
 <button
 key={label}
 onClick={() => navigate(to)}
 className="bg-black/4 hover:bg-black/8 text-black/60 hover:text-black/80 text-[11px] font-medium py-2.5 px-3 transition-all border-0 text-left"
 >
 {label}
 </button>
 ))}
 </div>
 </div>

 {/* Orders preview */}
 <div className="bg-white border border-black/6 overflow-hidden">
 <div className="flex items-center justify-between px-5 py-4 border-b border-black/6">
 <div className="flex items-center gap-2">
 <ShoppingBag size={14} className="text-black/35" strokeWidth={1.5} />
 <span className="text-[11px] font-semibold text-black/70 uppercase tracking-wider">Letzte Bestellungen</span>
 </div>
 <button onClick={() => navigate('/cms/orders')} className="text-[10px] font-medium text-black/30 hover:text-black/60 transition-colors bg-transparent border-0 flex items-center gap-1">
 Alle <ArrowRight size={9} />
 </button>
 </div>
 <div className="divide-y divide-black/5">
 {orders.slice(0, 4).map((o) => (
 <div key={o.id} className="flex items-center gap-3 px-5 py-3">
 <div className={`w-2 h-2 flex-shrink-0 ${
 o.status === 'delivered' ? 'bg-black/60' :
 o.status === 'shipped' ? 'bg-black/40' :
 o.status === 'processing' ? 'bg-black/30' :
 o.status === 'cancelled' ? 'bg-black/15' : 'bg-black/20'
 }`} />
 <div className="flex-1 min-w-0">
 <p className="text-[11px] font-medium text-black/70 truncate">{o.shoe_name}</p>
 <p className="text-[9px] text-black/30">{o.order_ref || `#${o.id}`}</p>
 </div>
 <span className="text-[10px] text-black/40">{o.price}</span>
 </div>
 ))}
 {orders.length === 0 && (
 <p className="text-[11px] text-black/30 text-center py-6">Keine Bestellungen</p>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 )
}
