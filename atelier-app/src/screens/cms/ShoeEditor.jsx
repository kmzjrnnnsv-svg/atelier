import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, Upload } from 'lucide-react'
import useAtelierStore from '../../store/atelierStore'

const CATEGORIES = ['OXFORD', 'LOAFER', 'DERBY', 'BOOT', 'SNEAKER', 'MONK']
const TAGS = [null, 'BESTSELLER', 'NEW', 'LIMITED']

const emptyForm = {
  name: '',
  category: 'OXFORD',
  price: '',
  material: '',
  match: '',
  color: '#1f2937',
  tag: null,
  image: null,
}

function ShoeForm({ initial = emptyForm, onSave, onCancel }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const valid = form.name && form.price && form.material

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => set('image', ev.target.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">{initial.id ? 'Schuh bearbeiten' : 'Neuer Schuh'}</h3>

      {/* Image Upload */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2">Produktbild</label>
        <div className="flex gap-3 items-start">
          <div
            className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ backgroundColor: form.color }}
          >
            {form.image ? (
              <img src={form.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg viewBox="0 0 80 45" className="w-16">
                <path d="M5 36 Q3 39 13 41 L67 41 Q74 41 74 36 L72 28 Q70 22 65 21 L22 21 Q14 21 12 24 Z" fill="white" opacity="0.3" />
                <path d="M12 24 Q10 16 20 12 L40 10 Q52 9 60 15 Q68 20 72 28 L65 21 L22 21 Q14 21 12 24 Z" fill="white" opacity="0.2" />
              </svg>
            )}
          </div>
          <label className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3.5 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
            <Upload size={14} className="text-gray-500" />
            <span className="text-xs text-gray-500">Bild hochladen</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Name *</label>
        <input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="The Heritage Oxford"
          className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400"
        />
      </div>

      {/* Category + Tag row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Kategorie *</label>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Badge</label>
          <select
            value={form.tag ?? ''}
            onChange={(e) => set('tag', e.target.value || null)}
            className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
          >
            <option value="">Kein Badge</option>
            {TAGS.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Price + Match row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Preis *</label>
          <input
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            placeholder="€ 1.450"
            className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Biometric Match</label>
          <input
            value={form.match}
            onChange={(e) => set('match', e.target.value)}
            placeholder="99.4%"
            className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400"
          />
        </div>
      </div>

      {/* Material */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Material *</label>
        <input
          value={form.material}
          onChange={(e) => set('material', e.target.value)}
          placeholder="Full-Grain Calfskin"
          className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400"
        />
      </div>

      {/* Color */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Schuh-Farbe</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={form.color}
            onChange={(e) => set('color', e.target.value)}
            className="w-10 h-10 rounded-lg border border-gray-300 bg-transparent cursor-pointer"
          />
          <input
            value={form.color}
            onChange={(e) => set('color', e.target.value)}
            className="flex-1 bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 font-mono focus:outline-none focus:border-gray-400"
          />
          <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ backgroundColor: form.color }} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => valid && onSave(form)}
          disabled={!valid}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all border-0 ${
            valid ? 'bg-gray-900 text-white hover:bg-black' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Check size={14} /> Speichern
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-all border-0"
        >
          Abbrechen
        </button>
      </div>
    </div>
  )
}

export default function ShoeEditor() {
  const { shoes, addShoe, updateShoe, deleteShoe } = useAtelierStore()
  const [mode, setMode] = useState(null) // null | 'add' | { editing: shoe }
  const [filterCat, setFilterCat] = useState('ALL')

  const filtered = filterCat === 'ALL' ? shoes : shoes.filter((s) => s.category === filterCat)

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Schuhe</h1>
          <p className="text-gray-500 text-sm mt-1">{shoes.length} Produkte verwalten</p>
        </div>
        {!mode && (
          <button
            onClick={() => setMode('add')}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors border-0"
          >
            <Plus size={14} /> Neuer Schuh
          </button>
        )}
      </div>

      {/* Add Form */}
      {mode === 'add' && (
        <div className="mb-6">
          <ShoeForm
            onSave={(f) => { addShoe(f); setMode(null) }}
            onCancel={() => setMode(null)}
          />
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['ALL', ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setFilterCat(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-0 ${
              filterCat === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Shoe List */}
      <div className="space-y-2">
        {filtered.map((shoe) => (
          mode?.editing?.id === shoe.id ? (
            <ShoeForm
              key={shoe.id}
              initial={shoe}
              onSave={(f) => { updateShoe(shoe.id, f); setMode(null) }}
              onCancel={() => setMode(null)}
            />
          ) : (
            <div
              key={shoe.id}
              className="bg-white border border-gray-100 rounded-xl flex items-center gap-4 px-5 py-4 group hover:border-gray-200 transition-all"
            >
              {/* Preview */}
              <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ backgroundColor: shoe.color }}>
                {shoe.image ? (
                  <img src={shoe.image} alt={shoe.name} className="w-full h-full object-cover" />
                ) : (
                  <svg viewBox="0 0 60 35" className="w-12">
                    <path d="M4 28 Q2 31 10 33 L50 33 Q56 33 56 28 L54 20 Q52 14 48 13 L16 13 Q10 13 9 17 Z" fill="white" opacity="0.3" />
                    <path d="M9 17 Q7 10 14 7 L30 5 Q41 4 46 10 Q50 14 54 20 L48 13 L16 13 Q10 13 9 17 Z" fill="white" opacity="0.2" />
                  </svg>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900">{shoe.name}</p>
                  {shoe.tag && (
                    <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md border border-gray-200">
                      {shoe.tag}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">{shoe.category} · {shoe.material}</p>
                {shoe.match && (
                  <p className="text-[9px] text-teal-500 mt-0.5">{shoe.match} Biometric Match</p>
                )}
              </div>

              {/* Price */}
              <p className="text-base font-bold text-gray-900 flex-shrink-0">{shoe.price}</p>

              {/* Actions */}
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setMode({ editing: shoe })}
                  className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors border-0"
                >
                  <Pencil size={13} className="text-gray-700" />
                </button>
                <button
                  onClick={() => { if (confirm(`"${shoe.name}" löschen?`)) deleteShoe(shoe.id) }}
                  className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center hover:bg-red-500/20 transition-colors border-0"
                >
                  <Trash2 size={13} className="text-red-400" />
                </button>
              </div>
            </div>
          )
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">Keine Schuhe in dieser Kategorie</p>
          </div>
        )}
      </div>
    </div>
  )
}
