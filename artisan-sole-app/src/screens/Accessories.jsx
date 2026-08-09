/**
 * Accessories.jsx, LV-inspired accessories browsing page
 * Clean, luxurious grid with warm tones and elegant typography
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Plus, Check } from 'lucide-react'
import useStore from '../store/store'
import { apiFetch } from '../hooks/useApi'
import CtaBanner from '../components/CtaBanner'
import { accessoryImages } from '../lib/accessoryImages'

const CATEGORY_LABELS = {
  OXFORD: 'Oxford', DERBY: 'Derby', LOAFER: 'Loafer',
  MONK: 'Monk', BOOT: 'Boot', SNEAKER: 'Sneaker',
}


export default function Accessories() {
  const navigate = useNavigate()
  const { cart, addToCart, removeFromCart } = useStore()
  const [accessoriesList, setAccessoriesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    setLoading(true)
    apiFetch('/api/accessories')
      .then(data => {
        const items = Array.isArray(data) ? data.filter(a => a.is_active) : []
        setAccessoriesList(items)
      })
      .catch(() => setAccessoriesList([]))
      .finally(() => setLoading(false))
  }, [])

  // Kein Filter mehr: Bei fünf Artikeln ist eine Reiterleiste Zierrat, und
  // die alte fragte ohnehin nach Schlüsseln, die es nicht mehr gibt — jeder
  // Reiter wäre leer geblieben.
  const filtered = accessoriesList

  const cartIds = cart.filter(c => c.isAccessory).map(c => c.id)

  const handleToggleCart = (acc, e) => {
    e.stopPropagation()
    const accId = `acc-${acc.id}`
    if (cartIds.includes(accId)) {
      removeFromCart(accId)
    } else {
      addToCart({
        id: accId,
        name: acc.name,
        price: `€ ${parseFloat(acc.price) || 0}`,
        material: 'Zubehör',
        image: accessoryImages(acc)[0] || null,
        isAccessory: true,
        shoeId: null,
      })
    }
  }

  return (
    <div className="min-h-full bg-white">

      {/* ── Hero, image then text below (LV-style) ──────────────── */}
      <div className="text-center px-5 lg:px-16 pt-10 lg:pt-14 pb-6 lg:pb-8">
        <p className="text-[10px] text-black/30 uppercase tracking-[0.25em] mb-3">Artisan Sole Kollektion</p>
        <h1 className="text-[24px] lg:text-[32px] font-extralight text-black leading-[1.1] tracking-tight">
          Zubehör & Pflege
        </h1>
      </div>

      {/* ── Product count ───────────────────────────────────────── */}
      {!loading && (
        <div className="px-5 lg:px-16 pt-5 lg:pt-6 pb-2">
          <p className="text-[11px] text-black/25 font-light">{filtered.length} {filtered.length === 1 ? 'Produkt' : 'Produkte'}</p>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-5 h-5 border border-black/15 border-t-black/60 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-5">
          <ShoppingBag size={32} className="text-black/10 mb-4" strokeWidth={1} />
          <p className="text-[14px] font-light text-black/60">Keine Produkte in dieser Kategorie</p>
        </div>
      ) : (

        /* ── Product Grid ──────────────────────────────────────── */
        <div className="px-5 lg:px-16 pb-16 pt-2">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 lg:gap-x-6 lg:gap-y-12">
            {filtered.map(acc => {
              const inCart = cartIds.includes(`acc-${acc.id}`)
              const recommended = JSON.parse(acc.recommended_for || '[]')
              // Erstes Bild steht, zweites erscheint beim Überfahren — dieselbe
              // Regel wie in der Schuhübersicht.
              const imgs = accessoryImages(acc)
              const hoverImg = imgs[1] || null

              return (
                <div key={acc.id} className="group">

                  {/* Product image */}
                  <div
                    className="relative w-full overflow-hidden flex items-center justify-center bg-[#f6f5f3] mb-3 lg:mb-4 transition-all duration-500 group-hover:bg-[#efeee9]"
                    style={{ aspectRatio: '3 / 4' }}
                  >
                    {imgs[0] ? (
                      <>
                        <img
                          src={imgs[0]}
                          alt={acc.name}
                          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.03] ${hoverImg ? 'group-hover:opacity-0' : ''}`}
                        />
                        {hoverImg && (
                          <img
                            src={hoverImg}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                          />
                        )}
                      </>
                    ) : (
                      <ShoppingBag size={32} strokeWidth={0.6} className="text-black/[0.07]" />
                    )}
                  </div>

                  {/* Product info */}
                  <p className="text-[12px] lg:text-[13px] text-black font-normal leading-snug">{acc.name}</p>
                  {/* Zwei Zeilen als Anriss, der Rest auf Wunsch. Die
                      Pflegesets führen auf, was in der Schachtel liegt — das
                      gehört sichtbar, aber nicht in jede Kachel der Übersicht.
                      whitespace-pre-line erhält die Absätze des Fließtextes. */}
                  {acc.description && (
                    <div className="mt-1">
                      <p className={`text-[11px] text-black/30 leading-relaxed font-light whitespace-pre-line ${expanded === acc.id ? '' : 'line-clamp-2'}`}>
                        {acc.description}
                      </p>
                      {acc.description.length > 110 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpanded(expanded === acc.id ? null : acc.id) }}
                          className="mt-1 bg-transparent border-0 p-0 text-[10px] text-black/40 hover:text-black/70 underline underline-offset-2"
                        >
                          {expanded === acc.id ? 'Weniger' : 'Details'}
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-[12px] lg:text-[13px] text-black/60 mt-1.5 font-light">€ {parseFloat(acc.price) || 0}</p>

                  {/* Category tags */}
                  {recommended.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {recommended.slice(0, 3).map(cat => (
                        <span key={cat} className="text-[8px] lg:text-[9px] uppercase tracking-wider text-black/25 font-light">
                          {CATEGORY_LABELS[cat] || cat}{recommended.indexOf(cat) < Math.min(recommended.length, 3) - 1 ? ' ·' : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Add to cart */}
                  <button
                    onClick={(e) => handleToggleCart(acc, e)}
                    className={`mt-3 w-full h-10 lg:h-11 flex items-center justify-center gap-2 text-[11px] lg:text-[12px] transition-all duration-300 border ${
                      inCart
                        ? 'bg-black text-white border-black hover:bg-white hover:text-black'
                        : 'bg-white text-black border-black/15 hover:bg-black hover:text-white hover:border-black'
                    }`}
                    style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}
                  >
                    {inCart
                      ? <><Check size={13} strokeWidth={2} /> Hinzugefügt</>
                      : 'In den Warenkorb'
                    }
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── CTA Banner (CMS-controlled) ──────────────────────── */}
      <div className="px-5 lg:px-16 pb-16">
        <CtaBanner page="accessories" />
      </div>
    </div>
  )
}
