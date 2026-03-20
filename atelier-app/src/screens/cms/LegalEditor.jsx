import { useState, useEffect } from 'react'
import { FileText, Save, Check } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const LEGAL_TABS = [
 { key: 'datenschutz', label: 'Datenschutz', description: 'Datenschutzrichtlinie / Privacy Policy' },
 { key: 'agb', label: 'AGB', description: 'Allgemeine Geschäftsbedingungen' },
 { key: 'impressum', label: 'Impressum', description: 'Impressum & Kontakt' },
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
 <div className="p-8">
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <FileText size={18} className="text-black/35" />
 <h1 className="text-xl font-bold text-black/85" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Rechtliches</h1>
 </div>
 <p className="text-xs text-black/45">Rechtliche Dokumente verwalten · in der App unter Einstellungen sichtbar</p>
 </div>
 </div>

 {/* Tab Bar */}
 <div className="flex gap-1 bg-black/5 p-1 border border-black/6 mb-6 w-fit">
 {LEGAL_TABS.map(tab => (
 <button
 key={tab.key}
 onClick={() => setActiveTab(tab.key)}
 className={`px-5 py-2.5 text-xs font-medium border-0 transition-all ${
 activeTab === tab.key
 ? 'bg-white text-black/90 shadow-sm'
 : 'bg-transparent text-black/45 hover:text-black/90'
 }`}
 >
 {tab.label}
 </button>
 ))}
 </div>

 {/* Editor Panel */}
 <div className="bg-white border border-black/6 p-6">
 <div className="flex items-center justify-between mb-4">
 <div>
 <p className="text-sm font-semibold text-black/65">{currentTabInfo?.description}</p>
 {currentDoc?.updated_at && (
 <p className="text-xs text-black/35 mt-0.5">
 Zuletzt gespeichert: {new Date(currentDoc.updated_at).toLocaleString('de-DE')}
 </p>
 )}
 </div>
 {savedTab === activeTab && (
 <div className="flex items-center gap-1.5 bg-black/4 text-black/40 px-3 py-1.5">
 <Check size={12} />
 <span className="text-xs font-medium">Gespeichert</span>
 </div>
 )}
 </div>

 {loading ? (
 <div className="flex items-center justify-center py-16 text-black/35">
 <div className="w-5 h-5 border-2 border-black/15 border-t-black animate-spin mr-3" />
 <span className="text-sm">Lade Dokument…</span>
 </div>
 ) : (
 <div className="space-y-4">
 {/* Title */}
 <div>
 <label className="block text-xs font-medium text-black/35 mb-1.5">Titel *</label>
 <input
 value={form.title}
 onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
 placeholder={`z.B."Datenschutzrichtlinie"`}
 className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-sm text-black/90 placeholder-black/20 focus:outline-none focus:border-black/20"
 />
 </div>

 {/* Content */}
 <div>
 <div className="flex items-center justify-between mb-1.5">
 <label className="block text-xs font-medium text-black/35">
 Inhalt * <span className="text-black/35 font-normal">(Leerzeilen trennen Absätze)</span>
 </label>
 <span className="text-xs text-black/35">{form.content.length} Zeichen</span>
 </div>
 <textarea
 value={form.content}
 onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
 placeholder={"§1 Allgemeines\nDer Schutz Ihrer persönlichen Daten...\n\n§2 Datenerhebung\nWir erheben folgende Daten..."}
 rows={15}
 className="w-full bg-white border border-black/10 px-3.5 py-2.5 text-xs text-black/90 placeholder-black/20 resize-y font-mono leading-relaxed focus:outline-none focus:border-black/20"
 />
 </div>

 {/* Save Button */}
 <div className="flex items-center gap-3 pt-1">
 <button
 onClick={handleSave}
 disabled={!form.title.trim() || !form.content.trim() || saving}
 className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-0 transition-all ${
 form.title.trim() && form.content.trim() && !saving
 ? 'bg-black text-white hover:bg-black'
 : 'bg-black/5 text-black/35 cursor-not-allowed'
 }`}
 >
 {saving ? (
 <>
 <div className="w-3 h-3 border border-black/20 border-t-black animate-spin" />
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
 className="px-4 py-3 text-xs font-medium text-black/45 hover:text-black/90 bg-transparent border-0 transition-all"
 >
 Zurücksetzen
 </button>
 )}
 </div>
 </div>
 )}
 </div>

 {/* Info Box */}
 <div className="mt-4 bg-[#f6f5f3] border border-black/10 p-4">
 <p className="text-xs font-medium text-black/35 mb-1">Hinweis</p>
 <p className="text-xs text-black/45 leading-relaxed">
 Änderungen werden sofort für alle Nutzer sichtbar. Absätze werden durch Leerzeilen getrennt.
 Der Inhalt wird in der App unter <strong className="text-black/65">Einstellungen → {currentTabInfo?.label}</strong> angezeigt.
 </p>
 </div>
 </div>
 )
}
