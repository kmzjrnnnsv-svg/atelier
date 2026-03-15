import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, ShoppingBag } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'

export default function Wishlist() {
  const navigate = useNavigate()
  const { shoes, favorites, toggleFavorite } = useAtelierStore()

  const wishlist = shoes.filter(s => favorites.includes(s.id))

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-black/5 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center border-0 bg-transparent">
          <ArrowLeft size={18} className="text-black" strokeWidth={1.5} />
        </button>
        <div className="text-center">
          <span className="text-[11px] text-black" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>Wishlist</span>
          {favorites.length > 0 && (
            <span className="ml-2 text-[10px] text-black/30">({favorites.length})</span>
          )}
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        {wishlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-black/5 flex items-center justify-center mb-4">
              <Heart size={28} className="text-black/20" strokeWidth={1.5} />
            </div>
            <p className="text-[12px] text-black">Noch keine Favoriten</p>
            <p className="text-[10px] text-black/35 mt-1.5 max-w-[200px] leading-relaxed">
              Markiere Schuhe in der Kollektion mit einem Herz
            </p>
            <button
              onClick={() => navigate('/collection')}
              className="mt-5 px-6 py-3 bg-black text-white text-[10px] border-0"
              style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}
            >
              Kollektion entdecken
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-px bg-black/8">
            {wishlist.map(product => (
              <div
                key={product.id}
                className="bg-white overflow-hidden cursor-pointer active:scale-95 transition-transform"
                onClick={() => navigate('/customize', { state: { product } })}
              >
                <div className="relative bg-[#f6f5f3] h-36 flex items-center justify-center">
                  <button
                    className="absolute top-2 right-2 w-7 h-7 bg-white/80 flex items-center justify-center border-0 z-10"
                    onClick={e => { e.stopPropagation(); toggleFavorite(product.id) }}
                  >
                    <Heart size={13} className="text-black fill-black" />
                  </button>

                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <svg viewBox="0 0 200 90" className="w-40 opacity-80">
                      <ellipse cx="100" cy="82" rx="88" ry="9" fill="#00000008" />
                      <path d="M15 75 Q12 80 28 84 L172 84 Q186 84 186 75 L182 62 Q178 50 165 48 L55 48 Q36 48 31 54 Z" fill={product.color || '#374151'} />
                      <path d="M31 54 Q27 37 50 28 L100 24 Q128 22 150 33 Q168 42 182 62 L165 48 Q140 41 112 42 L68 43 Q45 44 31 54 Z" fill={product.color || '#374151'} opacity="0.85" />
                    </svg>
                  )}
                </div>

                <div className="p-3">
                  <p className="text-[8px] text-black/35" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>{product.category}</p>
                  <p className="text-[12px] text-black mt-0.5 leading-tight">{product.name}</p>
                  <p className="text-[10px] text-black/35 mt-0.5">{product.material}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[12px] text-black">{product.price}</p>
                    <button
                      className="w-7 h-7 bg-black flex items-center justify-center border-0"
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
