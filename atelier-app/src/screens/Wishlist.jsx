import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, ShoppingBag } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'

export default function Wishlist() {
  const navigate = useNavigate()
  const { shoes, favorites, toggleFavorite } = useAtelierStore()

  const wishlist = shoes.filter(s => favorites.includes(s.id))

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">

      {/* Header */}
      <div className="bg-white flex items-center justify-between px-5 pt-4 pb-4 border-b border-gray-100 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center border-0">
          <ArrowLeft size={18} strokeWidth={1.8} className="text-gray-800" />
        </button>
        <div className="text-center">
          <span className="text-sm font-bold tracking-wide text-black">My Wishlist</span>
          {favorites.length > 0 && (
            <span className="ml-2 text-[9px] uppercase tracking-widest text-gray-400">({favorites.length})</span>
          )}
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        {wishlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Heart size={28} className="text-gray-300" strokeWidth={1.5} />
            </div>
            <p className="text-base font-semibold text-black">No favourites yet</p>
            <p className="text-[11px] text-gray-400 mt-1.5 max-w-[200px] leading-relaxed">
              Heart shoes in the collection to save them here
            </p>
            <button
              onClick={() => navigate('/collection')}
              className="mt-5 px-6 py-3 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-2xl border-0"
            >
              Browse Collection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {wishlist.map(product => (
              <div
                key={product.id}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 cursor-pointer active:scale-95 transition-transform"
                onClick={() => navigate('/customize', { state: { product } })}
              >
                <div className="relative bg-gray-50 h-36 flex items-center justify-center">
                  <button
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center border-0 z-10"
                    onClick={e => { e.stopPropagation(); toggleFavorite(product.id) }}
                  >
                    <Heart size={13} className="text-red-500 fill-red-500" />
                  </button>

                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <svg viewBox="0 0 200 90" className="w-40 opacity-80">
                      <ellipse cx="100" cy="82" rx="88" ry="9" fill="#e5e7eb" />
                      <path d="M15 75 Q12 80 28 84 L172 84 Q186 84 186 75 L182 62 Q178 50 165 48 L55 48 Q36 48 31 54 Z" fill={product.color || '#374151'} />
                      <path d="M31 54 Q27 37 50 28 L100 24 Q128 22 150 33 Q168 42 182 62 L165 48 Q140 41 112 42 L68 43 Q45 44 31 54 Z" fill={product.color || '#374151'} opacity="0.85" />
                    </svg>
                  )}
                </div>

                <div className="p-3">
                  <p className="text-[8px] uppercase tracking-widest text-gray-400">{product.category}</p>
                  <p className="text-sm font-bold text-black mt-0.5 leading-tight">{product.name}</p>
                  <p className="text-[10px] text-gray-400 italic mt-0.5">{product.material}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-sm font-semibold text-black">{product.price}</p>
                    <button
                      className="w-7 h-7 rounded-full bg-black flex items-center justify-center border-0"
                      onClick={e => { e.stopPropagation(); navigate('/customize', { state: { product } }) }}
                    >
                      <ShoppingBag size={12} className="text-white" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
