/**
 * Search.jsx — "Suche" tab (Apple Store Search style)
 * Large title, rounded search bar, suggestions, results grid
 */
import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search as SearchIcon, X, TrendingUp } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'

const SUGGESTIONS = ['Loafer', 'Oxford', 'Derby', 'Chelsea Boot', 'Sneaker', 'Kalbsleder']

export default function Search() {
  const navigate = useNavigate()
  const shoes = useAtelierStore(s => s.shoes)
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return shoes.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q) ||
      s.material?.toLowerCase().includes(q) ||
      s.price?.toLowerCase().includes(q)
    )
  }, [query, shoes])

  const selectShoe = (shoe) => navigate('/customize', { state: { product: shoe } })

  return (
    <div className="min-h-full bg-white">

      {/* ── Large Title Header ────────────────────────────────────── */}
      {!focused && !query && (
        <div className="px-5 lg:px-8 pt-3 lg:pt-8 pb-2">
          <p className="text-[34px] lg:text-[40px] font-bold text-black leading-tight tracking-tight">Suche</p>
        </div>
      )}

      {/* ── Search Bar ────────────────────────────────────────────── */}
      <div className="px-5 lg:px-8 pt-2 pb-3 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2.5 bg-[#F5F5F7] rounded-xl px-3.5 py-2.5">
          <SearchIcon size={18} strokeWidth={1.5} className="text-[#8E8E93] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Schuhe, Materialien, Kategorien"
            className="flex-1 bg-transparent border-0 outline-none text-[17px] text-black placeholder:text-[#8E8E93]"
          />
          {query && (
            <button onClick={() => { setQuery(''); inputRef.current?.focus() }} className="w-5 h-5 rounded-full bg-[#8E8E93] flex items-center justify-center border-0">
              <X size={12} strokeWidth={2.5} className="text-white" />
            </button>
          )}
        </div>
        {(focused || query) && (
          <button
            onClick={() => { setQuery(''); setFocused(false); inputRef.current?.blur() }}
            className="text-[17px] text-[#007AFF] bg-transparent border-0 px-0 flex-shrink-0"
          >
            Abbrechen
          </button>
        )}
      </div>

      {/* ── Suggestions (when no query) ───────────────────────────── */}
      {!query.trim() && (
        <div className="px-5 lg:px-8 pt-2">
          <p className="text-[20px] lg:text-[24px] font-bold text-black mb-3">Entdecken</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => { setQuery(s); setFocused(true) }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F5F5F7] text-[15px] text-black/70 border-0"
              >
                <TrendingUp size={14} strokeWidth={1.5} className="text-[#8E8E93]" />
                {s}
              </button>
            ))}
          </div>

          {/* Recently popular / featured shoes */}
          {shoes.length > 0 && (
            <div className="mt-6">
              <p className="text-[20px] lg:text-[24px] font-bold text-black mb-3">Beliebte Modelle</p>
              <div className="space-y-0">
                {shoes.slice(0, 6).map(shoe => (
                  <button
                    key={shoe.id}
                    onClick={() => selectShoe(shoe)}
                    className="w-full flex items-center gap-4 py-3 border-b border-[#F5F5F7] bg-transparent border-x-0 border-t-0 text-left"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: '#F5F5F7' }}>
                      {shoe.image ? (
                        <img src={shoe.image} alt={shoe.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full" style={{ background: shoe.color || '#ccc', opacity: 0.5 }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-black truncate">{shoe.name}</p>
                      <p className="text-[13px] text-[#8E8E93] mt-0.5">{shoe.category}</p>
                    </div>
                    <span className="text-[15px] text-[#8E8E93] flex-shrink-0">{shoe.price}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Search Results ────────────────────────────────────────── */}
      {query.trim() && (
        <div className="px-5 lg:px-8">
          {results.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[17px] font-semibold text-black/80 mb-1">Keine Ergebnisse</p>
              <p className="text-[15px] text-[#8E8E93]">Versuche einen anderen Suchbegriff.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 pb-6">
              {results.map(shoe => (
                <button
                  key={shoe.id}
                  onClick={() => selectShoe(shoe)}
                  className="w-full bg-transparent border-0 text-left p-0"
                >
                  <div className="w-full rounded-2xl overflow-hidden" style={{ background: '#F5F5F7' }}>
                    <div className="aspect-square flex items-center justify-center">
                      {shoe.image ? (
                        <img src={shoe.image} alt={shoe.name} className="w-full h-full object-cover" />
                      ) : (
                        <svg viewBox="0 0 200 90" className="w-3/4 opacity-50">
                          <path d="M15 75 Q12 80 28 84 L172 84 Q186 84 186 75 L182 62 Q178 50 165 48 L55 48 Q36 48 31 54 Z" fill={shoe.color || '#666'} />
                          <path d="M31 54 Q27 37 50 28 L100 24 Q128 22 150 33 Q168 42 182 62 L165 48 L55 48 Q36 48 31 54 Z" fill={shoe.color || '#666'} opacity="0.85" />
                        </svg>
                      )}
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-[13px] font-medium text-black leading-snug line-clamp-2">{shoe.name}</p>
                      <p className="text-[13px] text-[#8E8E93] mt-0.5">{shoe.price}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
