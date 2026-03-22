import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp, MessageSquare, CheckCircle2, Send } from 'lucide-react'
import useAtelierStore from '../store/atelierStore'
import { apiFetch } from '../hooks/useApi'

const TICKET_TYPES = ['Feedback', 'Beschwerde', 'Frage', 'Retoure']

const STATUS_MAP = {
  open:          'Offen',
  in_progress:   'In Bearbeitung',
  resolved:      'Gelöst',
  closed:        'Geschlossen',
}

export default function Feedback() {
  const navigate = useNavigate()
  const { orders } = useAtelierStore()

  // Form state
  const [type, setType] = useState('Feedback')
  const [orderId, setOrderId] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Tickets state
  const [tickets, setTickets] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [expandedTicket, setExpandedTicket] = useState(null)

  const fetchTickets = async () => {
    setLoadingTickets(true)
    try {
      const data = await apiFetch('/api/feedback/mine')
      setTickets(Array.isArray(data) ? data : [])
    } catch {
      setTickets([])
    } finally {
      setLoadingTickets(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim() || submitting) return
    setSubmitting(true)
    try {
      await apiFetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          type,
          order_id: orderId || null,
          subject: subject.trim(),
          message: message.trim(),
        }),
      })
      setSubmitted(true)
      setType('Feedback')
      setOrderId('')
      setSubject('')
      setMessage('')
      fetchTickets()
      setTimeout(() => setSubmitted(false), 4000)
    } catch {
      // silent
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-white">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-black/5 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center border-0 bg-transparent">
          <ArrowLeft size={18} className="text-black" strokeWidth={1.5} />
        </button>
        <span className="text-[11px] text-black" style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Feedback &amp; Hilfe
        </span>
        <div className="w-10" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1">

        {/* ── New ticket form ── */}
        <div className="px-5 pt-5 pb-6 border-b border-black/5">

          {/* Section label */}
          <p className="text-[9px] text-black/35 mb-4" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Neue Anfrage
          </p>

          {/* Type selector pills */}
          <div className="flex gap-2 flex-wrap mb-5">
            {TICKET_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1.5 text-[9px] border transition-all ${
                  type === t ? 'bg-black text-white border-black' : 'bg-transparent text-black/40 border-black/10'
                }`}
                style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Order reference dropdown */}
          <div className="mb-4">
            <label className="block text-[9px] text-black/35 mb-1.5" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Bestellung (optional)
            </label>
            <div className="relative">
              <select
                value={orderId}
                onChange={e => setOrderId(e.target.value)}
                className="w-full appearance-none bg-transparent border border-black/5 px-3 py-2.5 text-[11px] text-black pr-8 outline-none"
                style={{ borderRadius: 0 }}
              >
                <option value="">Keine Bestellung</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.shoe_name} — {o.order_ref || `#${o.id}`}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/25 pointer-events-none" strokeWidth={1.5} />
            </div>
          </div>

          {/* Subject input */}
          <div className="mb-4">
            <label className="block text-[9px] text-black/35 mb-1.5" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Betreff
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Kurzer Betreff"
              className="w-full border border-black/5 px-3 py-2.5 text-[11px] text-black placeholder:text-black/20 outline-none bg-transparent"
              style={{ borderRadius: 0 }}
            />
          </div>

          {/* Message textarea */}
          <div className="mb-5">
            <label className="block text-[9px] text-black/35 mb-1.5" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Nachricht
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Beschreiben Sie Ihr Anliegen..."
              rows={4}
              className="w-full border border-black/5 px-3 py-2.5 text-[11px] text-black placeholder:text-black/20 outline-none bg-transparent resize-none leading-relaxed"
              style={{ borderRadius: 0 }}
            />
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!subject.trim() || !message.trim() || submitting}
            className="w-full bg-black text-white text-[10px] py-3 border-0 disabled:opacity-30 transition-opacity flex items-center justify-center gap-2"
            style={{ letterSpacing: '0.18em', textTransform: 'uppercase', borderRadius: 0 }}
          >
            <Send size={12} strokeWidth={1.5} />
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </button>

          {/* Success message */}
          {submitted && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-black/5">
              <CheckCircle2 size={14} className="text-black/50" strokeWidth={1.5} />
              <p className="text-[10px] text-black/60">Ihre Anfrage wurde erfolgreich gesendet.</p>
            </div>
          )}
        </div>

        {/* ── My tickets list ── */}
        <div className="px-5 pt-5 pb-6">

          <p className="text-[9px] text-black/35 mb-4" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Meine Anfragen
          </p>

          {loadingTickets ? (
            <div className="py-12 text-center">
              <p className="text-[10px] text-black/30">Laden...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 bg-black/5 flex items-center justify-center mb-3">
                <MessageSquare size={24} className="text-black/15" strokeWidth={1.5} />
              </div>
              <p className="text-[12px] text-black">Keine Anfragen</p>
              <p className="text-[10px] text-black/35 mt-1">Ihre Anfragen erscheinen hier</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map(ticket => {
                const isExpanded = expandedTicket === ticket.id
                const statusLabel = STATUS_MAP[ticket.status] || ticket.status

                return (
                  <div key={ticket.id} className="border border-black/5 overflow-hidden">
                    <button
                      onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)}
                      className="w-full flex items-start justify-between p-4 bg-transparent border-0 text-left"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        {/* Type badge */}
                        <span
                          className="inline-block text-[8px] text-black/50 bg-black/5 px-2 py-0.5 mb-1.5"
                          style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}
                        >
                          {ticket.type}
                        </span>
                        <p className="text-[12px] text-black leading-tight truncate">{ticket.subject}</p>
                        <p className="text-[9px] text-black/30 mt-1">
                          {new Date(ticket.created_at).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                        {/* Status badge */}
                        <span
                          className="text-[8px] text-black/50 bg-black/5 px-2 py-0.5"
                          style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}
                        >
                          {statusLabel}
                        </span>
                        {isExpanded
                          ? <ChevronUp size={13} className="text-black/30" strokeWidth={1.5} />
                          : <ChevronDown size={13} className="text-black/30" strokeWidth={1.5} />
                        }
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-black/5 px-4 py-4 bg-black/[0.02] space-y-3">
                        <div>
                          <p className="text-[9px] text-black/35 mb-1" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                            Nachricht
                          </p>
                          <p className="text-[10px] text-black/60 leading-relaxed whitespace-pre-wrap">{ticket.message}</p>
                        </div>

                        {ticket.admin_notes && (
                          <div className="border-t border-black/5 pt-3">
                            <p className="text-[9px] text-black/35 mb-1" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                              Antwort
                            </p>
                            <p className="text-[10px] text-black/60 leading-relaxed whitespace-pre-wrap">{ticket.admin_notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
