import { useNavigate } from 'react-router-dom'
import { Footprints, Sparkles, Shirt, Image, ArrowRight, ShoppingBag, ScanLine, BookOpen, Users } from 'lucide-react'
import useAtelierStore from '../../store/atelierStore'

export default function CMSDashboard() {
 const navigate = useNavigate()
 const { shoes, curated, wardrobe, outfits, orders, faqs, articles } = useAtelierStore()

 const stats = [
 { label: 'Schuhe', value: shoes.length, icon: Footprints, to: '/cms/shoes' },
 { label: 'Curated', value: curated.length, icon: Sparkles, to: '/cms/curated' },
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
 <div className="px-10 py-10 lg:px-14 lg:py-12">
 {/* Header */}
 <div className="mb-12">
 <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Übersicht</p>
 <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Dashboard</h1>
 </div>

 {/* Stats grid */}
 <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-14">
 {stats.map(({ label, value, icon: Icon, to }) => (
 <button
 key={label}
 onClick={() => navigate(to)}
 className="bg-white p-6 text-left hover:bg-black/[0.01] transition-all group border-0"
 >
 <div className="flex items-center justify-between mb-5">
 <div className="w-8 h-8 flex items-center justify-center">
 <Icon size={16} className="text-black/20" strokeWidth={1.25} />
 </div>
 <ArrowRight size={11} className="text-black/10 group-hover:text-black/30 transition-colors" strokeWidth={1.25} />
 </div>
 <p className="text-[26px] font-extralight text-black/80">{value}</p>
 <p className="text-[9px] text-black/25 mt-1.5 uppercase tracking-[0.2em] font-light">{label}</p>
 </button>
 ))}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 {/* Recent Shoes */}
 <div className="bg-white overflow-hidden">
 <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.04]">
 <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] font-light">Aktuelle Schuhe</p>
 <button onClick={() => navigate('/cms/shoes')} className="text-[10px] text-black/25 hover:text-black/50 transition-colors bg-transparent border-0 flex items-center gap-1.5 font-light">
 Alle ansehen <ArrowRight size={9} strokeWidth={1.25} />
 </button>
 </div>
 <div className="divide-y divide-black/[0.04]">
 {shoes.slice(0, 5).map((shoe) => (
 <div key={shoe.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/[0.01] transition-colors">
 <div className="w-10 h-10 flex-shrink-0 overflow-hidden" style={{ backgroundColor: shoe.color }}>
 {shoe.image && <img src={shoe.image} alt="" className="w-full h-full object-cover" />}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-[13px] font-light text-black/75 truncate">{shoe.name}</p>
 <p className="text-[10px] text-black/25 font-light">{shoe.category} · {shoe.material}</p>
 </div>
 <div className="text-right flex-shrink-0">
 <p className="text-[13px] font-light text-black/60">{shoe.price}</p>
 {shoe.tag && (
 <span className="text-[8px] text-black/25 uppercase tracking-wider font-light">{shoe.tag}</span>
 )}
 </div>
 </div>
 ))}
 {shoes.length === 0 && (
 <p className="text-[12px] text-black/25 text-center py-10 font-light">Keine Schuhe vorhanden</p>
 )}
 </div>
 </div>

 {/* Quick actions + Recent orders */}
 <div className="space-y-8">
 <div className="bg-white p-6">
 <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-5 font-light">Schnellaktionen</p>
 <div className="grid grid-cols-2 gap-2.5">
 {quickActions.map(({ label, to }) => (
 <button
 key={label}
 onClick={() => navigate(to)}
 className="text-black/40 hover:text-black/70 text-[11px] py-3 px-4 transition-all border border-black/[0.06] hover:border-black/15 text-left font-light bg-transparent"
 >
 {label}
 </button>
 ))}
 </div>
 </div>

 {/* Orders preview */}
 <div className="bg-white overflow-hidden">
 <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.04]">
 <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] font-light">Letzte Bestellungen</p>
 <button onClick={() => navigate('/cms/orders')} className="text-[10px] text-black/25 hover:text-black/50 transition-colors bg-transparent border-0 flex items-center gap-1.5 font-light">
 Alle <ArrowRight size={9} strokeWidth={1.25} />
 </button>
 </div>
 <div className="divide-y divide-black/[0.04]">
 {orders.slice(0, 4).map((o) => (
 <div key={o.id} className="flex items-center gap-3 px-6 py-3.5">
 <div className={`w-1.5 h-1.5 flex-shrink-0 rounded-full ${
 o.status === 'delivered' ? 'bg-black/50' :
 o.status === 'shipped' ? 'bg-black/30' :
 o.status === 'processing' ? 'bg-black/20' :
 o.status === 'cancelled' ? 'bg-black/10' : 'bg-black/15'
 }`} />
 <div className="flex-1 min-w-0">
 <p className="text-[12px] font-light text-black/60 truncate">{o.shoe_name}</p>
 <p className="text-[9px] text-black/25 font-light">{o.order_ref || `#${o.id}`}</p>
 </div>
 <span className="text-[11px] text-black/35 font-light">{o.price}</span>
 </div>
 ))}
 {orders.length === 0 && (
 <p className="text-[12px] text-black/25 text-center py-8 font-light">Keine Bestellungen</p>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 )
}
