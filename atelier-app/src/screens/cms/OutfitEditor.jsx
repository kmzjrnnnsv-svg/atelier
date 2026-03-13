import { useState } from 'react'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import useAtelierStore from '../../store/atelierStore'

const emptyForm = {
  style: '',
  description: '',
  top: '',
  bottom: '',
  shoe: '',
  shoeColor: '#111827',
  bgColor: '#f8f9fa',
}

function OutfitForm({ initial = emptyForm, onSave, onCancel }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const valid = form.style && form.description && form.top && form.bottom && form.shoe

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">{initial.id ? 'Outfit bearbeiten' : 'Neues Outfit'}</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Style-Name *</label>
          <input value={form.style} onChange={(e) => set('style', e.target.value)}
            placeholder="Modern Business"
            className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Beschreibung *</label>
          <input value={form.description} onChange={(e) => set('description', e.target.value)}
            placeholder="Power Meeting Look"
            className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Oberteil *</label>
          <input value={form.top} onChange={(e) => set('top', e.target.value)}
            placeholder="Charcoal Suit"
            className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Hose/Unterteil *</label>
          <input value={form.bottom} onChange={(e) => set('bottom', e.target.value)}
            placeholder="Slim Trousers"
            className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Schuh-Name *</label>
        <input value={form.shoe} onChange={(e) => set('shoe', e.target.value)}
          placeholder="Heritage Oxford"
          className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Schuh-Farbe</label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.shoeColor} onChange={(e) => set('shoeColor', e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-200 bg-transparent cursor-pointer" />
            <input value={form.shoeColor} onChange={(e) => set('shoeColor', e.target.value)}
              className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-900 font-mono focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Hintergrund-Farbe</label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.bgColor} onChange={(e) => set('bgColor', e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-200 bg-transparent cursor-pointer" />
            <input value={form.bgColor} onChange={(e) => set('bgColor', e.target.value)}
              className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-900 font-mono focus:outline-none" />
          </div>
        </div>
      </div>

      {/* Mini Preview */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2">Live-Vorschau</label>
        <div className="rounded-xl overflow-hidden p-4 flex items-center justify-center" style={{ backgroundColor: form.bgColor, height: '100px' }}>
          <svg viewBox="0 0 80 100" className="w-16">
            <circle cx="40" cy="12" r="8" fill="#d4a88a" />
            <path d="M22 22 Q32 20 40 20 Q48 20 58 22 L62 55 Q50 60 40 60 Q30 60 18 55 Z" fill="#555" />
            <path d="M18 55 Q30 60 40 60 Q50 60 62 55 L66 90 L50 90 L40 70 L30 90 L14 90 Z" fill="#333" />
            <path d="M14 90 L30 90 L32 100 Q30 102 20 102 L10 102 Q8 101 8 99 Z" fill={form.shoeColor} />
            <path d="M50 90 L66 90 L70 100 Q68 102 58 102 L48 102 Q46 101 46 99 Z" fill={form.shoeColor} />
          </svg>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => valid && onSave(form)} disabled={!valid}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium border-0 ${valid ? 'bg-gray-900 text-white hover:bg-black' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
          <Check size={14} /> Speichern
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-100 border-0">
          Abbrechen
        </button>
      </div>
    </div>
  )
}

export default function OutfitEditor() {
  const { outfits, addOutfit, updateOutfit, deleteOutfit } = useAtelierStore()
  const [mode, setMode] = useState(null)

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Outfits</h1>
          <p className="text-gray-500 text-sm mt-1">{outfits.length} Outfit-Kombinationen</p>
        </div>
        {!mode && (
          <button onClick={() => setMode('add')}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-xs font-medium px-4 py-2 rounded-lg border-0">
            <Plus size={14} /> Neues Outfit
          </button>
        )}
      </div>

      {mode === 'add' && (
        <div className="mb-6">
          <OutfitForm onSave={(f) => { addOutfit(f); setMode(null) }} onCancel={() => setMode(null)} />
        </div>
      )}

      <div className="space-y-3">
        {outfits.map((outfit) => (
          mode?.editing?.id === outfit.id ? (
            <OutfitForm key={outfit.id} initial={outfit}
              onSave={(f) => { updateOutfit(outfit.id, f); setMode(null) }}
              onCancel={() => setMode(null)} />
          ) : (
            <div key={outfit.id} className="bg-white border border-gray-100 rounded-xl flex items-center gap-4 px-5 py-4 group hover:border-gray-200 transition-all">
              {/* Mini preview */}
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: outfit.bgColor }}>
                <svg viewBox="0 0 40 50" className="w-8">
                  <circle cx="20" cy="6" r="4" fill="#d4a88a" />
                  <path d="M11 10 Q16 9 20 9 Q24 9 29 10 L31 27 Q25 30 20 30 Q15 30 9 27 Z" fill="#555" />
                  <path d="M9 27 Q15 30 20 30 Q25 30 31 27 L33 45 L25 45 L20 35 L15 45 L7 45 Z" fill="#333" />
                  <path d="M7 45 L15 45 L16 50 Q15 51 10 51 L5 51 Q4 50 4 49 Z" fill={outfit.shoeColor} />
                  <path d="M25 45 L33 45 L35 50 Q34 51 29 51 L24 51 Q23 50 23 49 Z" fill={outfit.shoeColor} />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{outfit.style}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 italic">{outfit.description}</p>
                <p className="text-[9px] text-gray-400 mt-1">{outfit.top} · {outfit.bottom} · {outfit.shoe}</p>
              </div>

              {/* Color swatches */}
              <div className="flex gap-1.5">
                <div className="w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: outfit.shoeColor }} title="Schuhfarbe" />
                <div className="w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: outfit.bgColor }} title="Hintergrund" />
              </div>

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setMode({ editing: outfit })}
                  className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 border-0">
                  <Pencil size={13} className="text-gray-700" />
                </button>
                <button onClick={() => { if (confirm(`"${outfit.style}" löschen?`)) deleteOutfit(outfit.id) }}
                  className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center hover:bg-red-500/20 border-0">
                  <Trash2 size={13} className="text-red-400" />
                </button>
              </div>
            </div>
          )
        ))}
        {outfits.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">Keine Outfits</div>
        )}
      </div>
    </div>
  )
}
