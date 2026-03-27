import { useState, useRef, useEffect } from 'react'
import { Upload, X, Image, ChevronDown, Loader2 } from 'lucide-react'
import { apiFetch } from '../hooks/useApi'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function ImagePicker({ value, onChange, label }) {
  const [open, setOpen] = useState(false)
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const dropRef = useRef()

  // close on outside click
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const loadMedia = () => {
    if (media.length) return
    setLoading(true)
    apiFetch('/api/media')
      .then(data => setMedia(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleOpen = () => {
    setOpen(!open)
    if (!open) loadMedia()
  }

  const resolveUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http') || url.startsWith('data:')) return url
    return `${API_BASE}${url}`
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch(`${API_BASE}/api/media`, {
        method: 'POST',
        body: form,
        credentials: 'include',
      }).then(r => r.json())
      if (res?.id) {
        const newItem = { id: res.id, name: res.name, url: res.url }
        setMedia(prev => [newItem, ...prev])
        onChange(res.url)
      }
    } catch {}
    setUploading(false)
    setOpen(false)
    e.target.value = ''
  }

  const handleSelect = (item) => {
    onChange(item.url)
    setOpen(false)
  }

  const displayUrl = resolveUrl(value)

  return (
    <div ref={dropRef} className="relative">
      <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">{label}</label>

      {/* Selected preview or trigger */}
      {value ? (
        <div className="relative group">
          <div className="w-full overflow-hidden bg-[#fafaf9]" style={{ aspectRatio: '16 / 5', maxHeight: 140 }}>
            <img src={displayUrl} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              onClick={handleOpen}
              className="px-4 h-8 bg-white text-[10px] text-black uppercase tracking-[0.15em] font-light border-0 hover:bg-black hover:text-white transition-all"
            >
              Ändern
            </button>
            <button
              onClick={() => onChange('')}
              className="w-8 h-8 bg-white text-black flex items-center justify-center border-0 hover:bg-red-500 hover:text-white transition-all"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleOpen}
          className="w-full py-6 border border-dashed border-black/[0.08] text-black/25 text-[11px] flex items-center justify-center gap-2 bg-transparent hover:border-black/25 font-light uppercase tracking-[0.15em] transition-all"
        >
          <Image size={14} strokeWidth={1.25} />
          Bild auswählen
          <ChevronDown size={12} strokeWidth={1.25} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-black/[0.08] shadow-lg max-h-[320px] overflow-y-auto">
          {/* Upload row */}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full px-4 py-3 flex items-center gap-2.5 text-[11px] text-black/50 hover:bg-black/[0.02] border-0 border-b border-black/[0.04] bg-transparent font-light uppercase tracking-[0.15em] transition-all disabled:opacity-40"
          >
            {uploading ? <Loader2 size={13} strokeWidth={1.25} className="animate-spin" /> : <Upload size={13} strokeWidth={1.25} />}
            {uploading ? 'Wird hochgeladen …' : 'Neues Bild hochladen'}
          </button>

          {/* Media grid */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={16} strokeWidth={1.25} className="animate-spin text-black/20" />
            </div>
          ) : media.length === 0 ? (
            <p className="text-center text-[11px] text-black/20 py-8 font-light">Noch keine Bilder vorhanden</p>
          ) : (
            <div className="grid grid-cols-3 gap-[1px] bg-black/[0.04] p-[1px]">
              {media.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="relative group/item bg-white border-0 p-0 cursor-pointer overflow-hidden"
                  style={{ aspectRatio: '1' }}
                >
                  <img src={resolveUrl(item.url)} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 group-hover/item:scale-[1.05]" />
                  <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/20 transition-colors" />
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <p className="text-[8px] text-white/80 truncate font-light">{item.name}</p>
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
