/**
 * Settings.jsx — LV-inspired settings page
 * Warm tones, elegant typography, generous whitespace
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Mail, Lock, LogOut, ChevronRight,
  Shield, FileText, HelpCircle, Star, Trash2, Check, X, Eye, EyeOff, MapPin,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../hooks/useApi'
import useAtelierStore from '../store/atelierStore'

// ── Role labels ─────────────────────────────────────────────────────────────
const roleMeta = {
  admin:   { label: 'Admin' },
  curator: { label: 'Curator' },
  user:    { label: 'Member' },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.25em] text-black/25 font-light px-5 lg:px-16 mb-2 mt-8">
      {children}
    </p>
  )
}

function SettingsRow({ icon: Icon, label, sub, onPress, chevron = true, danger = false, rightEl }) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 px-5 lg:px-16 py-4 bg-transparent border-0 text-left hover:bg-black/[0.01] transition-colors"
    >
      <div className={`w-9 h-9 flex items-center justify-center flex-shrink-0 ${danger ? 'bg-black/[0.03]' : 'bg-[#f6f5f3]'}`}>
        <Icon size={16} className={danger ? 'text-black/30' : 'text-black/40'} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] ${danger ? 'text-black/40' : 'text-black'} font-light`}>{label}</p>
        {sub && <p className="text-[11px] text-black/25 mt-0.5 font-light">{sub}</p>}
      </div>
      {rightEl}
      {chevron && !rightEl && <ChevronRight size={15} className="text-black/15 flex-shrink-0" />}
    </button>
  )
}

function Divider() {
  return <div className="h-px bg-black/[0.04] mx-5 lg:mx-16" />
}

function EditableField({ label, value, type = 'text', placeholder, onChange }) {
  return (
    <div className="px-5 lg:px-16 py-3">
      <label className="text-[10px] uppercase tracking-[0.2em] text-black/25 font-light block mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full text-[13px] text-black bg-[#f6f5f3] border border-black/[0.06] px-4 py-3 outline-none focus:border-black/20 transition-colors font-light"
        style={{ fontFamily: 'inherit' }}
      />
    </div>
  )
}

function PasswordField({ label, value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="px-5 lg:px-16 py-3">
      <label className="text-[10px] uppercase tracking-[0.2em] text-black/25 font-light block mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          placeholder={placeholder ?? '••••••••'}
          onChange={e => onChange(e.target.value)}
          className="w-full text-[13px] text-black bg-[#f6f5f3] border border-black/[0.06] px-4 py-3 pr-10 outline-none focus:border-black/20 transition-colors font-light"
          style={{ fontFamily: 'inherit' }}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 p-0 text-black/25"
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  )
}

function Toast({ message, type }) {
  if (!message) return null
  const isOk = type === 'success'
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 text-[12px] font-light ${isOk ? 'bg-black text-white' : 'bg-black text-white'}`}
      style={{ width: 'max-content', maxWidth: 320, letterSpacing: '0.03em' }}
    >
      {isOk ? <Check size={13} strokeWidth={1.5} /> : <X size={13} strokeWidth={1.5} />}
      {message}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function Settings() {
  const navigate  = useNavigate()
  const { user, logout } = useAuth()

  const [toast, setToast] = useState({ message: '', type: 'success' })
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000)
  }

  // Profile
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
      showToast('Profil gespeichert')
      setProfileOpen(false)
    } catch (err) {
      showToast(err?.error ?? 'Fehler beim Speichern', 'error')
    } finally {
      setProfileSaving(false)
    }
  }

  // Password
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
      showToast('Passwort geändert')
      setPwOpen(false)
      setPwCurrent(''); setPwNew(''); setPwConfirm('')
    } catch (err) {
      showToast(err?.error ?? 'Fehler beim Ändern', 'error')
    } finally {
      setPwSaving(false)
    }
  }

  // Addresses
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

  // Logout
  const [logoutConfirm, setLogoutConfirm] = useState(false)
  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const role = roleMeta[user?.role ?? 'user']

  return (
    <div className="min-h-full bg-white">
      <Toast message={toast.message} type={toast.type} />

      {/* ── Hero header ─────────────────────────────────────────── */}
      <div className="px-5 lg:px-16 pt-8 lg:pt-14 pb-6 lg:pb-10">
        <p className="text-[10px] lg:text-[11px] text-black/30 uppercase tracking-[0.25em] mb-3">Ihr Konto</p>
        <h1 className="text-[32px] lg:text-[44px] font-extralight text-black leading-[1.1] tracking-tight">
          Einstellungen
        </h1>
      </div>

      {/* ── User info ──────────────────────────────────────────── */}
      <div className="px-5 lg:px-16 pb-6 border-b border-black/[0.06]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#f6f5f3] flex items-center justify-center flex-shrink-0">
            <span className="text-[20px] font-extralight text-black/40" style={{ fontFamily: 'Georgia, serif' }}>
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] text-black font-light truncate">{user?.name}</p>
            <p className="text-[12px] text-black/30 truncate font-light">{user?.email}</p>
            <span className="inline-block mt-1.5 text-[9px] uppercase tracking-[0.2em] text-black/30 font-light">
              {role.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── KONTO ────────────────────────────────────────────────── */}
      <SectionLabel>Konto</SectionLabel>

      {/* Profile */}
      <SettingsRow
        icon={User}
        label="Profil bearbeiten"
        sub={user?.name}
        onPress={() => { setProfileOpen(o => !o); setPwOpen(false) }}
        rightEl={
          <ChevronRight size={15} className={`text-black/15 flex-shrink-0 transition-transform ${profileOpen ? 'rotate-90' : ''}`} />
        }
      />
      {profileOpen && (
        <div className="bg-[#f6f5f3]/50 border-y border-black/[0.04]">
          <EditableField label="Name" value={profileName} placeholder="Ihr Name" onChange={setProfileName} />
          <EditableField label="E-Mail" value={profileEmail} type="email" placeholder="ihre@email.de" onChange={setProfileEmail} />
          <div className="px-5 lg:px-16 pb-5 pt-2 flex gap-3">
            <button onClick={() => setProfileOpen(false)}
              className="flex-1 py-3 border border-black/10 text-[12px] text-black/40 bg-white font-light hover:border-black/20 transition-colors">
              Abbrechen
            </button>
            <button onClick={saveProfile} disabled={profileSaving}
              className="flex-1 py-3 bg-black text-white text-[12px] border-0 font-light disabled:opacity-50 hover:bg-black/80 transition-colors">
              {profileSaving ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        </div>
      )}

      <Divider />

      {/* Password */}
      <SettingsRow
        icon={Lock}
        label="Passwort ändern"
        sub="Letztes Update: –"
        onPress={() => { setPwOpen(o => !o); setProfileOpen(false) }}
        rightEl={
          <ChevronRight size={15} className={`text-black/15 flex-shrink-0 transition-transform ${pwOpen ? 'rotate-90' : ''}`} />
        }
      />
      {pwOpen && (
        <div className="bg-[#f6f5f3]/50 border-y border-black/[0.04]">
          <PasswordField label="Aktuelles Passwort" value={pwCurrent} onChange={setPwCurrent} />
          <PasswordField label="Neues Passwort" value={pwNew} onChange={setPwNew} placeholder="Min. 8 Zeichen, Zahl, Sonderzeichen" />
          <PasswordField label="Neues Passwort wiederholen" value={pwConfirm} onChange={setPwConfirm} />
          {pwNew.length > 0 && (
            <div className="px-5 lg:px-16 pb-2">
              <div className="flex gap-1 mb-1.5">
                {[
                  pwNew.length >= 8,
                  /[0-9]/.test(pwNew),
                  /[^a-zA-Z0-9]/.test(pwNew),
                  pwNew.length >= 12,
                ].map((ok, i) => (
                  <div key={i} className={`flex-1 h-px ${ok ? 'bg-black' : 'bg-black/10'}`} />
                ))}
              </div>
              <p className="text-[10px] text-black/25 font-light">
                {[pwNew.length >= 8, /[0-9]/.test(pwNew), /[^a-zA-Z0-9]/.test(pwNew)].filter(Boolean).length < 2
                  ? 'Schwach — min. 8 Zeichen, Zahl und Sonderzeichen'
                  : pwNew.length >= 12 ? 'Stark' : 'Gut'}
              </p>
            </div>
          )}
          <div className="px-5 lg:px-16 pb-5 pt-2 flex gap-3">
            <button onClick={() => { setPwOpen(false); setPwCurrent(''); setPwNew(''); setPwConfirm('') }}
              className="flex-1 py-3 border border-black/10 text-[12px] text-black/40 bg-white font-light hover:border-black/20 transition-colors">
              Abbrechen
            </button>
            <button onClick={savePassword} disabled={pwSaving}
              className="flex-1 py-3 bg-black text-white text-[12px] border-0 font-light disabled:opacity-50 hover:bg-black/80 transition-colors">
              {pwSaving ? 'Speichern…' : 'Passwort ändern'}
            </button>
          </div>
        </div>
      )}

      <Divider />

      {/* Address */}
      <SettingsRow
        icon={MapPin}
        label="Lieferadresse"
        sub={savedDeliveryAddress ? `${savedDeliveryAddress.street}, ${savedDeliveryAddress.city}` : 'Noch nicht gespeichert'}
        onPress={() => { setAddrOpen(o => !o); setProfileOpen(false); setPwOpen(false) }}
        rightEl={
          <ChevronRight size={15} className={`text-black/15 flex-shrink-0 transition-transform ${addrOpen ? 'rotate-90' : ''}`} />
        }
      />
      {addrOpen && (
        <div className="bg-[#f6f5f3]/50 border-y border-black/[0.04]">
          <p className="text-[10px] uppercase tracking-[0.2em] text-black/25 font-light px-5 lg:px-16 pt-4 mb-1">Lieferadresse</p>
          <EditableField label="Name" value={addrDelivery.name} placeholder="Vollständiger Name" onChange={v => setAddrDelivery(a => ({...a, name: v}))} />
          <EditableField label="Straße" value={addrDelivery.street} placeholder="Straße + Hausnummer" onChange={v => setAddrDelivery(a => ({...a, street: v}))} />
          <div className="flex gap-2 px-5 lg:px-16">
            <div className="w-[35%]">
              <EditableField label="PLZ" value={addrDelivery.zip} placeholder="PLZ" onChange={v => setAddrDelivery(a => ({...a, zip: v}))} />
            </div>
            <div className="flex-1">
              <EditableField label="Stadt" value={addrDelivery.city} placeholder="Stadt" onChange={v => setAddrDelivery(a => ({...a, city: v}))} />
            </div>
          </div>
          <EditableField label="Land" value={addrDelivery.country} placeholder="Land" onChange={v => setAddrDelivery(a => ({...a, country: v}))} />
          <EditableField label="Telefon" value={addrDelivery.phone} placeholder="Optional" onChange={v => setAddrDelivery(a => ({...a, phone: v}))} />
          <div className="px-5 lg:px-16 pb-5 pt-2 flex gap-3">
            {savedDeliveryAddress && (
              <button onClick={clearAddresses} disabled={addrSaving}
                className="py-3 px-5 border border-black/10 text-[12px] text-black/35 bg-white font-light hover:border-black/20 transition-colors">
                Löschen
              </button>
            )}
            <button onClick={() => setAddrOpen(false)}
              className="flex-1 py-3 border border-black/10 text-[12px] text-black/40 bg-white font-light hover:border-black/20 transition-colors">
              Abbrechen
            </button>
            <button onClick={saveAddr} disabled={addrSaving}
              className="flex-1 py-3 bg-black text-white text-[12px] border-0 font-light disabled:opacity-50 hover:bg-black/80 transition-colors">
              {addrSaving ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        </div>
      )}

      <Divider />

      {/* CMS */}
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

      {/* Logout */}
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
        <div className="px-5 lg:px-16 py-5">
          <p className="text-[12px] text-black/35 mb-4 text-center font-light">Wirklich abmelden?</p>
          <div className="flex gap-3">
            <button onClick={() => setLogoutConfirm(false)}
              className="flex-1 py-3 border border-black/10 text-[12px] text-black/40 bg-white font-light hover:border-black/20 transition-colors">
              Abbrechen
            </button>
            <button onClick={handleLogout}
              className="flex-1 py-3 bg-black text-white text-[12px] border-0 font-light hover:bg-black/80 transition-colors">
              Abmelden
            </button>
          </div>
        </div>
      )}

      {/* ── APP ──────────────────────────────────────────────────── */}
      <SectionLabel>App</SectionLabel>
      <SettingsRow icon={Star} label="App bewerten" sub="Hilfreich? Hinterlassen Sie eine Bewertung" onPress={() => {}} />
      <Divider />
      <SettingsRow icon={HelpCircle} label="Hilfe & Support" sub="Häufige Fragen, Kontakt" onPress={() => navigate('/help')} />

      {/* ── RECHTLICHES ──────────────────────────────────────────── */}
      <SectionLabel>Rechtliches</SectionLabel>
      <SettingsRow icon={FileText} label="Datenschutzrichtlinie" onPress={() => navigate('/legal/datenschutz')} />
      <Divider />
      <SettingsRow icon={FileText} label="Allgemeine Geschäftsbedingungen" onPress={() => navigate('/legal/agb')} />
      <Divider />
      <SettingsRow icon={FileText} label="Impressum" onPress={() => navigate('/legal/impressum')} />

      {/* ── Version ──────────────────────────────────────────────── */}
      <div className="mt-10 mb-4 flex flex-col items-center gap-2">
        <div className="w-7 h-7 bg-[#19110B] flex items-center justify-center">
          <span className="text-white font-extralight text-[11px]" style={{ fontFamily: 'Georgia, serif' }}>A</span>
        </div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-black/20 font-light">ATELIER v1.0.0</p>
        <p className="text-[9px] text-black/15 font-light">Made with precision, crafted with care.</p>
      </div>

      {/* ── Delete account ───────────────────────────────────────── */}
      <div className="mb-8 pb-8">
        <button
          onClick={() => showToast('Bitte kontaktieren Sie den Support für die Konto-Löschung', 'error')}
          className="w-full py-3 text-[10px] uppercase tracking-[0.15em] text-black/25 bg-transparent border-0 font-light hover:text-black/40 transition-colors"
        >
          Konto löschen
        </button>
      </div>
    </div>
  )
}
