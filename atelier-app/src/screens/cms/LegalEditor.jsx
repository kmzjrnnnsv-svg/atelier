import { useState, useEffect } from 'react'
import { FileText, Save, Check } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const LEGAL_TABS = [
  { key: 'datenschutz', label: 'Datenschutz', description: 'Datenschutzrichtlinie / Privacy Policy' },
  { key: 'agb',         label: 'AGB',         description: 'Allgemeine Geschäftsbedingungen' },
  { key: 'impressum',   label: 'Impressum',   description: 'Impressum & Kontakt' },
]

export default function LegalEditor() {
  const [activeTab, setActiveTab] = useState('datenschutz')
  const [docs, setDocs] = useState({}) // { datenschutz: { title, content, updated_at }, ... }
  const [form, setForm] = useState({ title: '', content: '' })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedTab, setSavedTab] = useState(null)

  // Load doc when tab changes
  useEffect(() => {
    if (docs[activeTab]) {
      setForm({ title: docs[activeTab].title || '', content: docs[activeTab].content || '' })
      return
    }
    setLoading(true)
    apiFetch(`/api/legal/${activeTab}`)
      .then(doc => {
        setDocs(d => ({ ...d, [activeTab]: doc }))
        setForm({ title: doc.title || '', content: doc.content || '' })
      })
      .catch(() => {
        setDocs(d => ({ ...d, [activeTab]: { title: '', content: '' } }))
        setForm({ title: '', content: '' })
      })
      .finally(() => setLoading(false))
  }, [activeTab])

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) return
    setSaving(true)
    try {
      const doc = await apiFetch(`/api/legal/${activeTab}`, {
        method: 'PUT',
        body: JSON.stringify({ title: form.title, content: form.content }),
      })
      setDocs(d => ({ ...d, [activeTab]: doc }))
      setSavedTab(activeTab)
      setTimeout(() => setSavedTab(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const currentDoc = docs[activeTab]
  const currentTabInfo = LEGAL_TABS.find(t => t.key === activeTab)
  const isDirty = currentDoc && (form.title !== (currentDoc.title || '') || form.content !== (currentDoc.content || ''))

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText size={18} className="text-blue-400" />
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Rechtliches</h1>
          </div>
          <p className="text-xs text-gray-500">Rechtliche Dokumente verwalten · in der App unter Einstellungen sichtbar</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-100 mb-6 w-fit">
        {LEGAL_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-lg text-xs font-medium border-0 transition-all ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'bg-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Editor Panel */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-700">{currentTabInfo?.description}</p>
            {currentDoc?.updated_at && (
              <p className="text-xs text-gray-400 mt-0.5">
                Zuletzt gespeichert: {new Date(currentDoc.updated_at).toLocaleString('de-DE')}
              </p>
            )}
          </div>
          {savedTab === activeTab && (
            <div className="flex items-center gap-1.5 bg-teal-500/20 text-teal-400 px-3 py-1.5 rounded-xl">
              <Check size={12} />
              <span className="text-xs font-medium">Gespeichert</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mr-3" />
            <span className="text-sm">Lade Dokument…</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Titel *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={`z.B. "Datenschutzrichtlinie"`}
                className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400"
              />
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-400">
                  Inhalt * <span className="text-gray-400 font-normal">(Leerzeilen trennen Absätze)</span>
                </label>
                <span className="text-xs text-gray-400">{form.content.length} Zeichen</span>
              </div>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder={"§1 Allgemeines\nDer Schutz Ihrer persönlichen Daten...\n\n§2 Datenerhebung\nWir erheben folgende Daten..."}
                rows={15}
                className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-300 resize-y font-mono leading-relaxed focus:outline-none focus:border-gray-400"
              />
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={!form.title.trim() || !form.content.trim() || saving}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium border-0 transition-all ${
                  form.title.trim() && form.content.trim() && !saving
                    ? 'bg-gray-900 text-white hover:bg-black'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <>
                    <div className="w-3 h-3 border border-gray-400 border-t-black rounded-full animate-spin" />
                    Speichern…
                  </>
                ) : (
                  <>
                    <Save size={13} />
                    {currentDoc?.content ? 'Aktualisieren' : 'Erstellen'}
                  </>
                )}
              </button>

              {isDirty && !saving && (
                <button
                  onClick={() => setForm({ title: currentDoc.title || '', content: currentDoc.content || '' })}
                  className="px-4 py-3 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-900 bg-transparent border-0 transition-all"
                >
                  Zurücksetzen
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-medium text-gray-400 mb-1">Hinweis</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          Änderungen werden sofort für alle Nutzer sichtbar. Absätze werden durch Leerzeilen getrennt.
          Der Inhalt wird in der App unter <strong className="text-gray-700">Einstellungen → {currentTabInfo?.label}</strong> angezeigt.
        </p>
      </div>
    </div>
  )
}
