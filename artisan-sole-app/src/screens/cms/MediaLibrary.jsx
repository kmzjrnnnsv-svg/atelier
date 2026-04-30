import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Loader2, Image, Copy, Check } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function MediaLibrary() {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState(null)
  const fileRef = useRef()

  const load = () => {
    setLoading(true)
    apiFetch('/api/media')
      .then(data => setMedia(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      const form = new FormData()
      form.append('file', file)
      try {
        const res = await fetch(`${API_BASE}/api/media`, {
          method: 'POST',
          body: form,
          credentials: 'include',
        }).then(r => r.json())
        if (res?.id) setMedia(prev => [{ id: res.id, name: res.name, url: res.url }, ...prev])
      } catch {}
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleDelete = async (item) => {
    if (!confirm(`"${item.name}" löschen?`)) return
    await apiFetch(`/api/media/${item.id}`, { method: 'DELETE' }).catch(() => {})
    setMedia(prev => prev.filter(m => m.id !== item.id))
  }

  const handleCopy = (item) => {
    const fullUrl = `${API_BASE}${item.url}`
    navigator.clipboard.writeText(fullUrl).catch(() => {})
    setCopied(item.id)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="px-10 py-10 lg:px-14 lg:py-12 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Verwaltung</p>
          <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Mediathek</h1>
          <p className="text-[13px] text-black/30 mt-2 font-light">{media.length} Bilder</p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-6 h-10 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white uppercase tracking-[0.2em] font-light transition-all disabled:opacity-40"
          >
            {uploading
              ? <><Loader2 size={13} strokeWidth={1.25} className="animate-spin" /> Hochladen …</>
              : <><Upload size={13} strokeWidth={1.25} /> Bild hochladen</>
            }
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} strokeWidth={1.25} className="animate-spin text-black/20" />
        </div>
      ) : media.length === 0 ? (
        <div className="text-center py-20">
          <Image size={32} strokeWidth={0.75} className="text-black/10 mx-auto mb-4" />
          <p className="text-[13px] text-black/25 font-light">Noch keine Bilder hochgeladen</p>
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-4 px-6 h-10 border border-black/15 text-black/40 text-[11px] bg-transparent hover:border-black hover:text-black uppercase tracking-[0.15em] font-light transition-all"
          >
            Erstes Bild hochladen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[1px] bg-black/[0.04]">
          {media.map(item => (
            <div key={item.id} className="bg-white group relative">
              <div className="w-full overflow-hidden bg-[#fafaf9]" style={{ aspectRatio: '1' }}>
                <img
                  src={`${API_BASE}${item.url}`}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </div>
              {/* Overlay actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => handleCopy(item)}
                  className="w-9 h-9 bg-white text-black flex items-center justify-center border-0 hover:bg-black hover:text-white transition-all"
                  title="URL kopieren"
                >
                  {copied === item.id ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.25} />}
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="w-9 h-9 bg-white text-black flex items-center justify-center border-0 hover:bg-red-500 hover:text-white transition-all"
                  title="Löschen"
                >
                  <Trash2 size={14} strokeWidth={1.25} />
                </button>
              </div>
              {/* Name */}
              <div className="p-2.5">
                <p className="text-[10px] text-black/40 font-light truncate">{item.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
