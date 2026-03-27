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
 <div className="px-10 py-10 lg:px-14 lg:py-12">
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div>
 <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Legal</p>
 <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Rechtliches</h1>
 <p className="text-[13px] text-black/30 mt-2 font-light">Rechtliche Dokumente verwalten · in der App unter Einstellungen sichtbar</p>
 </div>
 </div>

 {/* Tab Bar */}
 <div className="flex gap-6 mb-6 border-b border-black/[0.06]">
 {LEGAL_TABS.map(tab => (
 <button
 key={tab.key}
 onClick={() => setActiveTab(tab.key)}
 className={`pb-3 text-[11px] uppercase tracking-[0.15em] font-light border-0 bg-transparent transition-all ${
 activeTab === tab.key
 ? 'border-b-2 border-black text-black/70'
 : 'text-black/25 hover:text-black/50'
 }`}
 >
 {tab.label}
 </button>
 ))}
 </div>

 {/* Editor Panel */}
 <div className="bg-white p-7">
 <div className="flex items-center justify-between mb-4">
 <div>
 <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-2 font-light">{currentTabInfo?.description}</p>
 {currentDoc?.updated_at && (
 <p className="text-[10px] text-black/25 font-light">
 Zuletzt gespeichert: {new Date(currentDoc.updated_at).toLocaleString('de-DE')}
 </p>
 )}
 </div>
 {savedTab === activeTab && (
 <div className="flex items-center gap-1.5 text-black/30">
 <Check size={12} />
 <span className="text-[11px] font-light">Gespeichert</span>
 </div>
 )}
 </div>

 {loading ? (
 <div className="flex items-center justify-center py-20">
 <div className="w-5 h-5 border border-black/10 border-t-black/40 animate-spin mr-3" />
 <span className="text-[13px] text-black/25 font-light">Lade Dokument...</span>
 </div>
 ) : (
 <div className="space-y-4">
 {/* Title */}
 <div>
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] block mb-1.5 font-light">Titel *</label>
 <input
 value={form.title}
 onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
 placeholder={`z.B."Datenschutzrichtlinie"`}
 className="w-full h-10 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15"
 />
 </div>

 {/* Content */}
 <div>
 <div className="flex items-center justify-between mb-1.5">
 <label className="text-[10px] text-black/30 uppercase tracking-[0.2em] font-light">
 Inhalt * <span className="text-black/20 font-light normal-case tracking-normal">(Leerzeilen trennen Absätze)</span>
 </label>
 <span className="text-[10px] text-black/25 font-light">{form.content.length} Zeichen</span>
 </div>
 <textarea
 value={form.content}
 onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
 placeholder={"§1 Allgemeines\nDer Schutz Ihrer persönlichen Daten...\n\n§2 Datenerhebung\nWir erheben folgende Daten..."}
 rows={15}
 className="w-full py-3 px-4 border-b border-black/[0.08] text-[13px] bg-transparent outline-none focus:border-black/25 transition-colors font-light text-black/70 placeholder-black/15 resize-y font-mono leading-relaxed"
 />
 </div>

 {/* Save Button */}
 <div className="flex items-center gap-3 pt-1">
 <button
 onClick={handleSave}
 disabled={!form.title.trim() || !form.content.trim() || saving}
 className="px-8 h-11 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all duration-300 uppercase tracking-[0.2em] font-light disabled:opacity-30 flex items-center gap-2"
 >
 {saving ? (
 <>
 <div className="w-5 h-5 border border-black/10 border-t-black/40 animate-spin" />
 Speichern...
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
 className="px-6 h-11 text-[11px] text-black/30 hover:text-black/60 bg-transparent border-0 transition-colors font-light"
 >
 Zurücksetzen
 </button>
 )}
 </div>
 </div>
 )}
 </div>

 {/* Info Box */}
 <div className="mt-4 bg-white p-7">
 <p className="text-[9px] text-black/25 uppercase tracking-[0.25em] mb-3 font-light">Hinweis</p>
 <p className="text-[13px] text-black/30 font-light leading-relaxed">
 Änderungen werden sofort für alle Nutzer sichtbar. Absätze werden durch Leerzeilen getrennt.
 Der Inhalt wird in der App unter <strong className="text-black/50 font-light">Einstellungen → {currentTabInfo?.label}</strong> angezeigt.
 </p>
 </div>
 </div>
 )
}
