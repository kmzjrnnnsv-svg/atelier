import { useState, useEffect } from 'react'
import { Star, X, Check, Loader } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'
import useAtelierStore from '../../store/atelierStore'

export default function FeaturedShoesPanel() {
  const { shoes } = useAtelierStore()
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    apiFetch('/api/settings/featured-shoes')
      .then(data => setSelected((data || []).map(s => s.id)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggle = (id) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      await apiFetch('/api/settings/featured-shoes', {
        method: 'PUT',
        body: JSON.stringify({ shoe_ids: selected }),
      })
      setToast('Gespeichert')
      setTimeout(() => setToast(''), 2000)
    } catch {
      setToast('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size={20} className="animate-spin text-black/30" />
      </div>
    )
  }

  return (
    <div className="px-10 py-10 lg:px-14 lg:py-12">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Kollektion</p>
          <h2 className="text-[28px] font-extralight text-black/85 tracking-tight">Empfehlungen Startseite</h2>
          <p className="text-[13px] text-black/30 mt-2 font-light">Bis zu 3 Schuhe für die "Für dich"-Seite auswählen</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-[0.2em] font-light disabled:opacity-30"
        >
          {saving ? 'Speichern…' : 'Speichern'}
        </button>
      </div>

      {toast && (
        <div className="mb-3 bg-black text-white text-[11px] font-light px-4 py-2.5 flex items-center gap-2">
          <Check size={12} /> {toast}
        </div>
      )}

      <p className="text-[10px] text-black/25 font-light mb-3">{selected.length}/3 ausgewählt</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {shoes.map(shoe => {
          const isSelected = selected.includes(shoe.id)
          return (
            <button
              key={shoe.id}
              onClick={() => toggle(shoe.id)}
              className={`text-left border-0 p-0 overflow-hidden transition-all ${
                isSelected ? 'ring-1 ring-black' : 'opacity-60 hover:opacity-90'
              } ${!isSelected && selected.length >= 3 ? 'opacity-20' : ''}`}
            >
              <div className="aspect-square bg-[#f6f5f3] flex items-center justify-center relative">
                {shoe.image ? (
                  <img src={shoe.image} alt={shoe.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-black/20 text-[11px]">Kein Bild</span>
                )}
                {isSelected && (
                  <div className="absolute top-2 left-2 bg-black flex items-center justify-center w-5 h-5">
                    <Star size={12} className="text-white fill-white" />
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-[12px] font-light text-black/70 truncate">{shoe.name}</p>
                <p className="text-[11px] text-black/30 font-light">{shoe.price}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
