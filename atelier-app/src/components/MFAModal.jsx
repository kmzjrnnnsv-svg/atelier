import { useState, useEffect, useRef } from 'react'
import { ShieldCheck, X, Loader } from 'lucide-react'

/**
 * MFAModal — prompts admin for 6-digit TOTP code before a sensitive action.
 *
 * Props:
 *   open      {bool}    — whether the modal is visible
 *   onClose   {fn}      — called when cancelled
 *   onConfirm {fn(code)} — called with the 6-digit code string when user submits
 *   loading   {bool}    — show spinner on confirm button
 *   error     {string}  — error message from the last attempt
 *   title     {string}  — modal title
 */
export default function MFAModal({ open, onClose, onConfirm, loading, error, title = 'MFA bestätigen' }) {
  const [code, setCode] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setCode('')
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [open])

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (code.length === 6) onConfirm(code)
  }

  const handleKey = (e) => {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onKeyDown={handleKey}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-80 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
              <ShieldCheck size={16} className="text-teal-400" />
            </div>
            <span className="text-sm font-bold text-white">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center border-0 hover:bg-gray-700 transition-colors"
          >
            <X size={13} className="text-gray-400" />
          </button>
        </div>

        <p className="text-[11px] text-gray-400 mb-5 leading-relaxed">
          Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:border-teal-500 transition-colors placeholder-gray-600 mb-3"
            placeholder="000000"
          />

          {error && (
            <p className="text-[10px] text-red-400 text-center mb-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={code.length !== 6 || loading}
            className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-bold text-sm flex items-center justify-center gap-2 border-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? <><Loader size={14} className="animate-spin" /> Wird geprüft…</>
              : <><ShieldCheck size={14} /> Bestätigen</>
            }
          </button>
        </form>
      </div>
    </div>
  )
}
