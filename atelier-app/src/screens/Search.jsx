import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search as SearchIcon, X, ArrowLeft } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'

export default function Search() {
  const navigate = useNavigate()
  const shoes = useAtelierStore(s => s.shoes)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return shoes.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q) ||
      s.price?.toLowerCase().includes(q)
    )
  }, [query, shoes])

  return (
    <div className="min-h-full bg-white flex flex-col">
      {/* Search header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <button onClick={() => navigate(-1)} className="p-1 bg-transparent border-0">
          <ArrowLeft size={22} strokeWidth={1.5} className="text-black" />
        </button>
        <div className="flex-1 flex items-center gap-2 bg-black/5 rounded-xl px-3 py-2.5">
          <SearchIcon size={18} strokeWidth={1.5} className="text-black/40 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Schuhe suchen..."
            className="flex-1 bg-transparent border-0 outline-none text-[15px] text-black placeholder:text-black/35"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-0.5 bg-transparent border-0">
              <X size={16} strokeWidth={1.5} className="text-black/40" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 px-4 pb-4">
        {!query.trim() && (
          <p className="text-center text-black/30 text-sm mt-12">
            Suche nach Name oder Kategorie
          </p>
        )}

        {query.trim() && results.length === 0 && (
          <p className="text-center text-black/30 text-sm mt-12">
            Keine Ergebnisse für "{query}"
          </p>
        )}

        {results.map(shoe => (
          <button
            key={shoe.id}
            onClick={() => {
              useAtelierStore.getState().selectShoe?.(shoe)
              navigate('/customize')
            }}
            className="w-full flex items-center gap-3 py-3 border-b border-black/5 bg-transparent border-x-0 border-t-0 text-left"
          >
            {shoe.image ? (
              <img src={shoe.image} alt={shoe.name} className="w-14 h-14 rounded-lg object-cover bg-black/5" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-black/5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-black truncate">{shoe.name}</p>
              <p className="text-[12px] text-black/40 mt-0.5">{shoe.category}</p>
            </div>
            <span className="text-[14px] font-medium text-black flex-shrink-0">{shoe.price}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
