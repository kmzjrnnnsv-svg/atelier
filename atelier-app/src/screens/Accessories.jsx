/**
 * Accessories.jsx — Customer-facing accessories browsing page
 * Allows independent browsing and adding accessories to cart
 */
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Plus, Check } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'

export default function Accessories() {
  const navigate = useNavigate()
  const { accessories, cart, addToCart } = useAtelierStore()

  const activeAccessories = (accessories || []).filter(a => a.is_active !== 0)
  const cartIds = cart.filter(c => c.isAccessory).map(c => c.id)

  const handleAdd = (acc) => {
    if (cartIds.includes(`acc-${acc.id}`)) return
    addToCart({
      id: `acc-${acc.id}`,
      name: acc.name,
      price: `€ ${parseFloat(acc.price) || 0}`,
      material: 'Zubehör',
      image: acc.image_data || null,
      isAccessory: true,
      shoeId: null,
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <p className="text-[28px] font-bold text-black tracking-tight">Zubehör</p>
        <p className="text-[13px] text-black/40 mt-1">Pflege, Schutz und Extras für deine Schuhe.</p>
      </div>

      {/* Grid */}
      <div className="flex-1 px-5 pb-8">
        {activeAccessories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-black/5 flex items-center justify-center mb-4">
              <ShoppingBag size={28} className="text-black/15" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] text-black">Kein Zubehör verfügbar</p>
            <p className="text-[11px] text-black/35 mt-1">Bald findest du hier passendes Zubehör.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {activeAccessories.map(acc => {
              const inCart = cartIds.includes(`acc-${acc.id}`)
              return (
                <div key={acc.id} className="bg-white overflow-hidden border border-black/5">
                  <div className="aspect-square bg-black/[0.02] flex items-center justify-center">
                    {acc.image_data ? (
                      <img src={acc.image_data} alt={acc.name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag size={24} className="text-black/10" strokeWidth={1} />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[13px] font-medium text-black leading-tight">{acc.name}</p>
                    {acc.description && (
                      <p className="text-[11px] text-black/35 mt-0.5 line-clamp-2">{acc.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[13px] font-semibold text-black">€ {parseFloat(acc.price) || 0}</p>
                      <button
                        onClick={() => handleAdd(acc)}
                        disabled={inCart}
                        className={`w-8 h-8 flex items-center justify-center border-0 transition-all ${
                          inCart ? 'bg-black/10 text-black/30' : 'bg-black text-white active:opacity-80'
                        }`}
                      >
                        {inCart ? <Check size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={2} />}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
