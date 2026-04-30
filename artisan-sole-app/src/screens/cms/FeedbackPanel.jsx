// @refresh reset
import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, RefreshCw, ChevronDown, ChevronUp, Trash2, Send, AlertCircle, HelpCircle, RotateCcw, MessageCircle } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const STATUS_CONFIG = {
  open: { label: 'Offen', color: 'bg-black/15 text-black/60' },
  in_progress: { label: 'In Bearbeitung', color: 'bg-black/8 text-black/40' },
  resolved: { label: 'Gel\u00f6st', color: 'bg-black/5 text-black/30' },
  closed: { label: 'Geschlossen', color: 'bg-black/[0.03] text-black/25' },
}

const TYPE_CONFIG = {
  feedback: { label: 'Feedback', icon: MessageCircle },
  complaint: { label: 'Beschwerde', icon: AlertCircle },
  question: { label: 'Frage', icon: HelpCircle },
  return: { label: 'Retoure', icon: RotateCcw },
}

const STATUS_FILTERS = [
  { key: 'all', label: 'Alle' },
  { key: 'open', label: 'Offen' },
  { key: 'in_progress', label: 'In Bearbeitung' },
  { key: 'resolved', label: 'Gel\u00f6st' },
  { key: 'closed', label: 'Geschlossen' },
]

const TYPE_FILTERS = [
  { key: 'all', label: 'Alle' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'complaint', label: 'Beschwerde' },
  { key: 'question', label: 'Frage' },
  { key: 'return', label: 'Retoure' },
]

const NEXT_STATUSES = {
  open: ['in_progress', 'resolved', 'closed'],
  in_progress: ['resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
}

function TicketCard({ ticket, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [adminNotes, setAdminNotes] = useState(ticket.admin_notes || '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
  const typeCfg = TYPE_CONFIG[ticket.type] || TYPE_CONFIG.feedback
  const TypeIcon = typeCfg.icon

  const handleStatusChange = async (newStatus) => {
    setUpdating(true)
    try {
      await apiFetch(`/api/feedback/${ticket.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus, admin_notes: adminNotes }),
      })
      onUpdate(ticket.id, { status: newStatus, admin_notes: adminNotes })
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveNotes = async () => {
    setUpdating(true)
    try {
      await apiFetch(`/api/feedback/${ticket.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: ticket.status, admin_notes: adminNotes }),
      })
      onUpdate(ticket.id, { admin_notes: adminNotes })
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    setUpdating(true)
    try {
      await apiFetch(`/api/feedback/${ticket.id}`, { method: 'DELETE' })
      onDelete(ticket.id)
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(false)
      setConfirmDelete(false)
    }
  }

  const nextOptions = NEXT_STATUSES[ticket.status] || []

  return (
    <div className="bg-white px-6 py-5 hover:bg-black/[0.01] border-b border-black/[0.04] transition-colors">
      {/* Row header */}
      <div className="flex items-center gap-4">
        {/* Type badge */}
        <span className="flex items-center gap-1.5 text-[9px] font-light bg-black/8 text-black/40 px-2.5 py-0.5 uppercase tracking-wider flex-shrink-0">
          <TypeIcon size={10} strokeWidth={1} />
          {typeCfg.label}
        </span>

        {/* Ticket info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-light text-black/85 truncate tracking-tight">{ticket.subject}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] text-black/35 font-light">{ticket.user_name}</span>
            <span className="text-[10px] text-black/25 font-light">{ticket.user_email}</span>
            {ticket.order_ref && (
              <span className="text-[9px] bg-black/[0.03] text-black/30 px-2 py-0.5 font-light tracking-wider">
                {ticket.order_ref}
              </span>
            )}
            <span className="text-[10px] text-black/20 font-light">
              {new Date(ticket.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('de-DE')}
            </span>
          </div>
        </div>

        {/* Message preview */}
        <span className="text-[10px] text-black/25 font-light max-w-[200px] truncate hidden sm:block flex-shrink-0">
          {ticket.message}
        </span>

        {/* Status badge */}
        <span className={`text-[9px] font-light px-2.5 py-0.5 uppercase tracking-wider flex-shrink-0 ${statusCfg.color}`}>
          {statusCfg.label}
        </span>

        {/* Expand */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-8 h-8 flex items-center justify-center flex-shrink-0 border-0 bg-transparent hover:bg-black/[0.03] transition-colors"
        >
          {expanded
            ? <ChevronUp size={12} strokeWidth={1} className="text-black/25" />
            : <ChevronDown size={12} strokeWidth={1} className="text-black/25" />}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-5 pt-5 border-t border-black/[0.04] space-y-5">
          {/* Customer */}
          <div>
            <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-2 font-light">Kunde</p>
            <p className="text-[13px] font-light text-black/65">{ticket.user_name}</p>
            <p className="text-[11px] text-black/35 font-light mt-0.5">{ticket.user_email}</p>
            <p className="text-[9px] text-black/25 font-light italic mt-1">USER-{String(ticket.user_id).padStart(5, '0')}</p>
          </div>

          {/* Order reference */}
          {ticket.order_ref && (
            <div>
              <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-2 font-light">Bestellreferenz</p>
              <p className="text-[13px] font-light text-black/65">{ticket.order_ref}</p>
              {ticket.shoe_name && (
                <p className="text-[11px] text-black/35 font-light mt-0.5">{ticket.shoe_name}</p>
              )}
            </div>
          )}

          {/* Full message */}
          <div>
            <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-2 font-light">Nachricht</p>
            <p className="text-[13px] font-light text-black/55 leading-relaxed whitespace-pre-wrap">{ticket.message}</p>
          </div>

          {/* Admin notes */}
          <div>
            <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-2 font-light">Interne Notizen</p>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Interne Notizen hinzuf\u00fcgen..."
              className="w-full text-[13px] font-light text-black/55 bg-white border border-black/[0.06] p-4 resize-y min-h-[80px] placeholder:text-black/20 focus:outline-none focus:border-black/15 transition-colors"
            />
            <button
              onClick={handleSaveNotes}
              disabled={updating || adminNotes === (ticket.admin_notes || '')}
              className="mt-3 px-6 h-10 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all uppercase tracking-[0.2em] font-light disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black flex items-center gap-2"
            >
              <Send size={10} strokeWidth={1} />
              Notizen speichern
            </button>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-black/[0.04] flex flex-wrap items-center gap-3">
            {nextOptions.map(s => (
              <button
                key={s}
                disabled={updating}
                onClick={() => handleStatusChange(s)}
                className={`px-6 h-10 text-[11px] uppercase tracking-[0.2em] font-light transition-all disabled:opacity-30 ${
                  s === 'resolved'
                    ? 'border border-black text-black bg-transparent hover:bg-black hover:text-white'
                    : 'border-0 bg-black/[0.04] text-black/35 hover:bg-black/[0.08] hover:text-black/55'
                }`}
              >
                {updating ? '\u2026' : STATUS_CONFIG[s]?.label || s}
              </button>
            ))}

            <div className="flex-1" />

            {/* Delete */}
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <span className="text-[9px] text-black/25 font-light italic">Wirklich l\u00f6schen?</span>
                <button
                  onClick={handleDelete}
                  disabled={updating}
                  className="px-6 h-10 border border-black text-black text-[11px] bg-transparent hover:bg-black hover:text-white transition-all uppercase tracking-[0.2em] font-light disabled:opacity-30"
                >
                  {updating ? '\u2026' : 'Ja, l\u00f6schen'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-6 h-10 text-[11px] text-black/25 hover:text-black/50 bg-transparent border-0 uppercase tracking-[0.2em] font-light transition-all"
                >
                  Abbrechen
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 text-[11px] text-black/20 hover:text-black/40 bg-transparent border-0 uppercase tracking-[0.2em] font-light transition-all"
              >
                <Trash2 size={10} strokeWidth={1} />
                L\u00f6schen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function FeedbackPanel() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await apiFetch('/api/feedback/all')
      setTickets(Array.isArray(rows) ? rows : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleUpdate = (id, changes) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t))
  }

  const handleDelete = (id) => {
    setTickets(prev => prev.filter(t => t.id !== id))
  }

  const filtered = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (typeFilter !== 'all' && t.type !== typeFilter) return false
    return true
  })

  const statusCounts = {}
  for (const t of tickets) statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
  const typeCounts = {}
  for (const t of tickets) typeCounts[t.type] = (typeCounts[t.type] || 0) + 1

  return (
    <div className="px-10 py-10 lg:px-14 lg:py-12 min-h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-[9px] text-black/20 uppercase tracking-[0.3em] mb-3 font-light">Kundendienst</p>
          <h1 className="text-[28px] font-extralight text-black/85 tracking-tight">Feedback & Beschwerden</h1>
          <p className="text-[13px] text-black/30 mt-2 font-light">{tickets.length} Tickets gesamt</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 h-9 text-[11px] text-black/25 hover:text-black/50 bg-transparent border-0 font-light transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} strokeWidth={1} className={loading ? 'animate-spin' : ''} />
          Aktualisieren
        </button>
      </div>

      {/* Stats row */}
      <div className="flex gap-5 mb-10">
        {[
          { label: 'Gesamt', value: tickets.length },
          { label: 'Offen', value: statusCounts.open || 0 },
          { label: 'In Bearbeitung', value: statusCounts.in_progress || 0 },
          { label: 'Gel\u00f6st', value: statusCounts.resolved || 0 },
        ].map(stat => (
          <div key={stat.label} className="flex-1 bg-white p-6">
            <p className="text-[9px] text-black/25 uppercase tracking-[0.2em] font-light mb-2">{stat.label}</p>
            <p className="text-[26px] font-extralight text-black/80">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 flex-wrap mb-3">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3.5 py-1.5 text-[10px] border-0 tracking-wider font-light transition-all ${
              statusFilter === f.key
                ? 'bg-black text-white'
                : 'text-black/25 hover:text-black/50 bg-transparent'
            }`}
          >
            {f.label}
            {f.key !== 'all' && statusCounts[f.key] ? ` (${statusCounts[f.key]})` : ''}
            {f.key === 'all' ? ` (${tickets.length})` : ''}
          </button>
        ))}
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-1 flex-wrap mb-8">
        {TYPE_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setTypeFilter(f.key)}
            className={`px-3.5 py-1.5 text-[10px] border-0 tracking-wider font-light transition-all ${
              typeFilter === f.key
                ? 'bg-black text-white'
                : 'text-black/25 hover:text-black/50 bg-transparent'
            }`}
          >
            {f.label}
            {f.key !== 'all' && typeCounts[f.key] ? ` (${typeCounts[f.key]})` : ''}
            {f.key === 'all' ? ` (${tickets.length})` : ''}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-5 h-5 border border-black/10 border-t-black/40 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <MessageSquare size={28} strokeWidth={1} className="text-black/15 mb-4" />
          <p className="text-[13px] text-black/30 font-light">Keine Tickets gefunden</p>
        </div>
      ) : (
        <div className="bg-white">
          {filtered.map(ticket => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
