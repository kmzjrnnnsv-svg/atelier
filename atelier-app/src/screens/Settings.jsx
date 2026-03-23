import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, Mail, Lock, LogOut, ChevronRight,
  Shield, FileText, HelpCircle, Star, Trash2, Check, X, Eye, EyeOff, MapPin,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../hooks/useApi'
import useAtelierStore from '../store/atelierStore'

// ── Badge-Farben je Rolle ─────────────────────────────────────────────────────
const roleMeta = {
  admin:   { label: 'Admin',   bg: 'bg-red-500/8',    text: 'text-red-600',    border: 'border-red-600/20'    },
  curator: { label: 'Curator', bg: 'bg-purple-500/8', text: 'text-purple-600', border: 'border-purple-600/20' },
  user:    { label: 'Member',  bg: 'bg-amber-500/8',  text: 'text-amber-600',  border: 'border-amber-600/20'  },
}

// ── Kleine Hilfskomponenten ────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="text-[9px] uppercase tracking-[0.15em] text-black/35 font-semibold px-5 mb-1 mt-5">
      {children}
    </p>
  )
}

function SettingsRow({ icon: Icon, label, sub, onPress, chevron = true, danger = false, rightEl }) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 px-5 py-3.5 bg-transparent border-0 text-left active:bg-black/3 transition-colors"
    >
      <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-500/8' : 'bg-black/5'}`}>
        <Icon size={15} className={danger ? 'text-red-500' : 'text-black/60'} strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-red-500' : 'text-black'}`}>{label}</p>
        {sub && <p className="text-[10px] text-black/35 mt-0.5">{sub}</p>}
      </div>
      {rightEl}
      {chevron && !rightEl && <ChevronRight size={15} className="text-black/20 flex-shrink-0" />}
    </button>
  )
}

function Divider() {
  return <div className="h-px bg-black/5" />
}

// ── Inline-Edit-Feld ──────────────────────────────────────────────────────────
function EditableField({ label, value, type = 'text', placeholder, onChange }) {
  return (
    <div className="px-5 py-3">
      <label className="text-[9px] uppercase tracking-[0.15em] text-black/35 font-semibold block mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full text-sm text-black bg-[#f6f5f3] border border-black/10 px-3.5 py-2.5 outline-none focus:border-black transition-colors"
        style={{ fontFamily: 'inherit' }}
      />
    </div>
  )
}

// ── Passwort-Feld mit Sichtbarkeits-Toggle ────────────────────────────────────
function PasswordField({ label, value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="px-5 py-3">
      <label className="text-[9px] uppercase tracking-[0.15em] text-black/35 font-semibold block mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          placeholder={placeholder ?? '••••••••'}
          onChange={e => onChange(e.target.value)}
          className="w-full text-sm text-black bg-[#f6f5f3] border border-black/10 px-3.5 py-2.5 pr-10 outline-none focus:border-black transition-colors"
          style={{ fontFamily: 'inherit' }}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 p-0 text-black/35"
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  )
}

// ── Toast-Notification ────────────────────────────────────────────────────────
function Toast({ message, type }) {
  if (!message) return null
  const isOk = type === 'success'
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 shadow-lg text-xs font-semibold ${isOk ? 'bg-black text-white' : 'bg-red-500 text-white'}`}
      style={{ width: 'max-content', maxWidth: 300 }}
    >
      {isOk ? <Check size={13} /> : <X size={13} />}
      {message}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Haupt-Komponente
// ─────────────────────────────────────────────────────────────────────────────

export default function Settings() {
  const navigate  = useNavigate()
  const { user, logout } = useAuth()

  // Toast
  const [toast, setToast] = useState({ message: '', type: 'success' })
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000)
  }

  // ── Abschnitt: Profil bearbeiten ───────────────────────────────────────────
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileName,  setProfileName]  = useState(user?.name  ?? '')
  const [profileEmail, setProfileEmail] = useState(user?.email ?? '')
  const [profileSaving, setProfileSaving] = useState(false)

  const saveProfile = async () => {
    if (!profileName.trim() || !profileEmail.trim()) {
      showToast('Name und E-Mail sind erforderlich', 'error'); return
    }
    setProfileSaving(true)
    try {
      await apiFetch('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: profileName.trim(), email: profileEmail.trim() }),
      })
      showToast('Profil gespeichert ✓')
      setProfileOpen(false)
    } catch (err) {
      showToast(err?.error ?? 'Fehler beim Speichern', 'error')
    } finally {
      setProfileSaving(false)
    }
  }

  // ── Abschnitt: Passwort ändern ─────────────────────────────────────────────
  const [pwOpen,    setPwOpen]    = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew,     setPwNew]     = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwSaving,  setPwSaving]  = useState(false)

  const savePassword = async () => {
    if (!pwCurrent) { showToast('Aktuelles Passwort eingeben', 'error'); return }
    if (pwNew.length < 8) { showToast('Neues Passwort min. 8 Zeichen', 'error'); return }
    if (pwNew !== pwConfirm) { showToast('Passwörter stimmen nicht überein', 'error'); return }
    setPwSaving(true)
    try {
      await apiFetch('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      })
      showToast('Passwort geändert ✓')
      setPwOpen(false)
      setPwCurrent(''); setPwNew(''); setPwConfirm('')
    } catch (err) {
      showToast(err?.error ?? 'Fehler beim Ändern', 'error')
    } finally {
      setPwSaving(false)
    }
  }

  // ── Abschnitt: Adressen ────────────────────────────────────────────────────
  const { savedDeliveryAddress, savedBillingAddress, saveAddresses } = useAtelierStore()
  const [addrOpen, setAddrOpen] = useState(false)
  const emptyAddr = { name:'', street:'', zip:'', city:'', country:'Deutschland', phone:'' }
  const [addrDelivery, setAddrDelivery] = useState(savedDeliveryAddress || emptyAddr)
  const [addrBilling,  setAddrBilling]  = useState(savedBillingAddress || emptyAddr)
  const [addrSaving,   setAddrSaving]   = useState(false)

  const saveAddr = async () => {
    setAddrSaving(true)
    try {
      const d = addrDelivery.name ? addrDelivery : null
      const b = addrBilling.name ? addrBilling : null
      await saveAddresses(d, b)
      showToast('Adressen gespeichert')
      setAddrOpen(false)
    } catch {
      showToast('Fehler beim Speichern', 'error')
    } finally {
      setAddrSaving(false)
    }
  }

  const clearAddresses = async () => {
    setAddrSaving(true)
    try {
      await saveAddresses(null, null)
      setAddrDelivery(emptyAddr)
      setAddrBilling(emptyAddr)
      showToast('Adressen gelöscht')
    } catch {
      showToast('Fehler', 'error')
    } finally {
      setAddrSaving(false)
    }
  }

  // ── Abmelden ───────────────────────────────────────────────────────────────
  const [logoutConfirm, setLogoutConfirm] = useState(false)
  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const role = roleMeta[user?.role ?? 'user']

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <Toast message={toast.message} type={toast.type} />

      {/* Header */}
      <div className="bg-white flex items-center justify-between px-5 pt-4 pb-4 border-b border-black/5 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="bg-transparent border-0 p-0">
          <ArrowLeft size={22} strokeWidth={1.5} className="text-black/80" />
        </button>
        <span className="text-sm font-bold uppercase tracking-[0.12em] text-black">Einstellungen</span>
        <div className="w-6" />
      </div>

      <div className="flex-1 overflow-y-auto pb-10">

        {/* ── Nutzer-Info-Karte ─────────────────────────────────────────────── */}
        <div className="bg-white border-b border-black/8 p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-black/8 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-black/45 font-playfair">
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-black truncate">{user?.name}</p>
            <p className="text-[11px] text-black/35 truncate">{user?.email}</p>
            <span className={`inline-block mt-1.5 text-[8px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 border ${role.bg} ${role.text} ${role.border}`}>
              {role.label}
            </span>
          </div>
        </div>

        {/* ── KONTO ────────────────────────────────────────────────────────── */}
        <SectionLabel>Konto</SectionLabel>
        <div className="bg-white border-b border-black/5 overflow-hidden">

          {/* Profil bearbeiten */}
          <SettingsRow
            icon={User}
            label="Profil bearbeiten"
            sub={user?.name}
            onPress={() => { setProfileOpen(o => !o); setPwOpen(false) }}
            rightEl={
              <ChevronRight
                size={15}
                className={`text-black/20 flex-shrink-0 transition-transform ${profileOpen ? 'rotate-90' : ''}`}
              />
            }
          />
          {profileOpen && (
            <div className="bg-[#f6f5f3] border-t border-black/5">
              <EditableField
                label="Name"
                value={profileName}
                placeholder="Dein Name"
                onChange={setProfileName}
              />
              <EditableField
                label="E-Mail"
                value={profileEmail}
                type="email"
                placeholder="deine@email.de"
                onChange={setProfileEmail}
              />
              <div className="px-5 pb-4 pt-1 flex gap-3">
                <button
                  onClick={() => setProfileOpen(false)}
                  className="flex-1 py-2.5 border border-black/10 text-xs font-semibold text-black/45 bg-white"
                >
                  Abbrechen
                </button>
                <button
                  onClick={saveProfile}
                  disabled={profileSaving}
                  className="flex-1 py-2.5 bg-black text-white text-xs font-semibold border-0 disabled:opacity-50"
                >
                  {profileSaving ? 'Speichern…' : 'Speichern'}
                </button>
              </div>
            </div>
          )}

          <Divider />

          {/* Passwort ändern */}
          <SettingsRow
            icon={Lock}
            label="Passwort ändern"
            sub="Letztes Update: –"
            onPress={() => { setPwOpen(o => !o); setProfileOpen(false) }}
            rightEl={
              <ChevronRight
                size={15}
                className={`text-black/20 flex-shrink-0 transition-transform ${pwOpen ? 'rotate-90' : ''}`}
              />
            }
          />
          {pwOpen && (
            <div className="bg-[#f6f5f3] border-t border-black/5">
              <PasswordField
                label="Aktuelles Passwort"
                value={pwCurrent}
                onChange={setPwCurrent}
              />
              <PasswordField
                label="Neues Passwort"
                value={pwNew}
                onChange={setPwNew}
                placeholder="Min. 8 Zeichen, Zahl, Sonderzeichen"
              />
              <PasswordField
                label="Neues Passwort wiederholen"
                value={pwConfirm}
                onChange={setPwConfirm}
              />
              {/* Passwort-Stärke */}
              {pwNew.length > 0 && (
                <div className="px-5 pb-2">
                  <div className="flex gap-1 mb-1">
                    {[
                      pwNew.length >= 8,
                      /[0-9]/.test(pwNew),
                      /[^a-zA-Z0-9]/.test(pwNew),
                      pwNew.length >= 12,
                    ].map((ok, i) => (
                      <div key={i} className={`flex-1 h-1 ${ok ? 'bg-black' : 'bg-black/10'}`} />
                    ))}
                  </div>
                  <p className="text-[9px] text-black/35">
                    {[pwNew.length >= 8, /[0-9]/.test(pwNew), /[^a-zA-Z0-9]/.test(pwNew)].filter(Boolean).length < 2
                      ? 'Schwach — min. 8 Zeichen, Zahl und Sonderzeichen'
                      : pwNew.length >= 12 ? 'Stark 💪' : 'Gut'}
                  </p>
                </div>
              )}
              <div className="px-5 pb-4 pt-1 flex gap-3">
                <button
                  onClick={() => { setPwOpen(false); setPwCurrent(''); setPwNew(''); setPwConfirm('') }}
                  className="flex-1 py-2.5 border border-black/10 text-xs font-semibold text-black/45 bg-white"
                >
                  Abbrechen
                </button>
                <button
                  onClick={savePassword}
                  disabled={pwSaving}
                  className="flex-1 py-2.5 bg-black text-white text-xs font-semibold border-0 disabled:opacity-50"
                >
                  {pwSaving ? 'Speichern…' : 'Passwort ändern'}
                </button>
              </div>
            </div>
          )}

          <Divider />

          {/* Adressen */}
          <SettingsRow
            icon={MapPin}
            label="Lieferadresse"
            sub={savedDeliveryAddress ? `${savedDeliveryAddress.street}, ${savedDeliveryAddress.city}` : 'Noch nicht gespeichert'}
            onPress={() => { setAddrOpen(o => !o); setProfileOpen(false); setPwOpen(false) }}
            rightEl={
              <ChevronRight
                size={15}
                className={`text-black/20 flex-shrink-0 transition-transform ${addrOpen ? 'rotate-90' : ''}`}
              />
            }
          />
          {addrOpen && (
            <div className="bg-[#f6f5f3] border-t border-black/5">
              <p className="text-[9px] uppercase tracking-[0.15em] text-black/35 font-semibold px-5 pt-3 mb-1">Lieferadresse</p>
              <EditableField label="Name" value={addrDelivery.name} placeholder="Vollständiger Name" onChange={v => setAddrDelivery(a => ({...a, name: v}))} />
              <EditableField label="Straße" value={addrDelivery.street} placeholder="Straße + Hausnummer" onChange={v => setAddrDelivery(a => ({...a, street: v}))} />
              <div className="flex gap-2 px-5">
                <div className="w-[35%]">
                  <EditableField label="PLZ" value={addrDelivery.zip} placeholder="PLZ" onChange={v => setAddrDelivery(a => ({...a, zip: v}))} />
                </div>
                <div className="flex-1">
                  <EditableField label="Stadt" value={addrDelivery.city} placeholder="Stadt" onChange={v => setAddrDelivery(a => ({...a, city: v}))} />
                </div>
              </div>
              <EditableField label="Land" value={addrDelivery.country} placeholder="Land" onChange={v => setAddrDelivery(a => ({...a, country: v}))} />
              <EditableField label="Telefon" value={addrDelivery.phone} placeholder="Optional" onChange={v => setAddrDelivery(a => ({...a, phone: v}))} />

              <div className="px-5 pb-4 pt-2 flex gap-3">
                {savedDeliveryAddress && (
                  <button onClick={clearAddresses} disabled={addrSaving} className="py-2.5 px-4 border border-red-300 text-xs font-semibold text-red-500 bg-white">
                    Löschen
                  </button>
                )}
                <button onClick={() => setAddrOpen(false)} className="flex-1 py-2.5 border border-black/10 text-xs font-semibold text-black/45 bg-white">
                  Abbrechen
                </button>
                <button onClick={saveAddr} disabled={addrSaving} className="flex-1 py-2.5 bg-black text-white text-xs font-semibold border-0 disabled:opacity-50">
                  {addrSaving ? 'Speichern…' : 'Speichern'}
                </button>
              </div>
            </div>
          )}

          <Divider />

          {/* CMS-Zugang — nur für Admins/Curators */}
          {(user?.role === 'admin' || user?.role === 'curator') && (
            <>
              <SettingsRow
                icon={Shield}
                label="CMS Studio öffnen"
                sub={user?.role === 'admin' ? 'Voller Admin-Zugang' : 'Curator-Zugang'}
                onPress={() => navigate('/cms')}
              />
              <Divider />
            </>
          )}

          {/* Abmelden */}
          {!logoutConfirm ? (
            <SettingsRow
              icon={LogOut}
              label="Abmelden"
              sub={user?.email}
              onPress={() => setLogoutConfirm(true)}
              danger
              chevron={false}
            />
          ) : (
            <div className="px-5 py-4">
              <p className="text-[11px] text-black/45 mb-3 text-center">Wirklich abmelden?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setLogoutConfirm(false)}
                  className="flex-1 py-2.5 border border-black/10 text-xs font-semibold text-black/45 bg-white"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2.5 bg-red-500 text-white text-xs font-semibold border-0"
                >
                  Abmelden
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── APP ──────────────────────────────────────────────────────────── */}
        <SectionLabel>App</SectionLabel>
        <div className="bg-white border-b border-black/5 overflow-hidden">
          <SettingsRow
            icon={Star}
            label="App bewerten"
            sub="Hilfreich? Hinterlasse eine Bewertung"
            onPress={() => {}}
          />
          <Divider />
          <SettingsRow
            icon={HelpCircle}
            label="Hilfe & Support"
            sub="Häufige Fragen, Kontakt"
            onPress={() => navigate('/help')}
          />
        </div>

        {/* ── RECHTLICHES ──────────────────────────────────────────────────── */}
        <SectionLabel>Rechtliches</SectionLabel>
        <div className="bg-white border-b border-black/5 overflow-hidden">
          <SettingsRow
            icon={FileText}
            label="Datenschutzrichtlinie"
            onPress={() => navigate('/legal/datenschutz')}
          />
          <Divider />
          <SettingsRow
            icon={FileText}
            label="Allgemeine Geschäftsbedingungen"
            onPress={() => navigate('/legal/agb')}
          />
          <Divider />
          <SettingsRow
            icon={FileText}
            label="Impressum"
            onPress={() => navigate('/legal/impressum')}
          />
        </div>

        {/* ── Version ──────────────────────────────────────────────────────── */}
        <div className="mt-6 mb-4 flex flex-col items-center gap-1">
          <div className="w-6 h-6 bg-black flex items-center justify-center">
            <span className="text-white font-bold text-[10px] font-playfair">A</span>
          </div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-black/35">ATELIER v1.0.0</p>
          <p className="text-[8px] text-black/20">Made with precision, crafted with care.</p>
        </div>

        {/* ── Konto löschen ─────────────────────────────────────────────────── */}
        <div className="mb-6">
          <button
            onClick={() => showToast('Bitte kontaktiere den Support für die Konto-Löschung', 'error')}
            className="w-full py-3 text-[10px] uppercase tracking-[0.15em] text-red-400 bg-transparent border-0 font-medium"
          >
            <Trash2 size={11} className="inline mr-1.5 mb-0.5" />
            Konto löschen
          </button>
        </div>

      </div>
    </div>
  )
}
