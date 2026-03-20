// @refresh reset
import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, RefreshCw, ChevronDown, ChevronUp, Trash2, Send, AlertCircle, HelpCircle, RotateCcw, MessageCircle } from 'lucide-react'
import { apiFetch } from '../../hooks/useApi'

const STATUS_CONFIG = {
  open: { label: 'Offen', color: 'bg-black/15 text-black/70' },
  in_progress: { label: 'In Bearbeitung', color: 'bg-black/10 text-black/50' },
  resolved: { label: 'Gelöst', color: 'bg-black/5 text-black/35' },
  closed: { label: 'Geschlossen', color: 'bg-black/4 text-black/25' },
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
  { key: 'resolved', label: 'Gelöst' },
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
    <div className="bg-white border border-black/6 overflow-hidden hover:bg-black/3 transition-colors">
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Type badge */}
        <span className="flex items-center gap-1 text-[10px] font-medium bg-black/8 text-black/50 px-2 py-0.5 flex-shrink-0">
          <TypeIcon size={10} strokeWidth={1.5} />
          {typeCfg.label}
        </span>

        {/* Ticket info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-black/90 truncate">{ticket.subject}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] text-black/45">{ticket.user_name}</span>
            <span className="text-[10px] text-black/35">{ticket.user_email}</span>
            {ticket.order_ref && (
              <span className="text-[10px] bg-black/5 text-black/40 px-1.5 py-0.5">
                {ticket.order_ref}
              </span>
            )}
            <span className="text-[10px] text-black/30">
              {new Date(ticket.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('de-DE')}
            </span>
          </div>
        </div>

        {/* Message preview */}
        <span className="text-[10px] text-black/35 max-w-[200px] truncate hidden sm:block flex-shrink-0">
          {ticket.message}
        </span>

        {/* Status badge */}
        <span className={`text-[10px] font-medium px-2 py-0.5 flex-shrink-0 ${statusCfg.color}`}>
          {statusCfg.label}
        </span>

        {/* Expand */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-7 h-7 bg-black/5 flex items-center justify-center flex-shrink-0 border-0 hover:bg-black/10 transition-colors"
        >
          {expanded
            ? <ChevronUp size={12} strokeWidth={1.5} className="text-black/45" />
            : <ChevronDown size={12} strokeWidth={1.5} className="text-black/45" />}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-black/6 px-4 py-4 space-y-4 bg-[#f6f5f3]">
          {/* Customer */}
          <div>
            <p className="text-[10px] font-medium text-black/30 uppercase tracking-wider mb-1.5">Kunde</p>
            <p className="text-xs text-black/65">{ticket.user_name}</p>
            <p className="text-[10px] text-black/45">{ticket.user_email}</p>
            <p className="text-[9px] text-black/35 mt-0.5">USER-{String(ticket.user_id).padStart(5, '0')}</p>
          </div>

          {/* Order reference */}
          {ticket.order_ref && (
            <div>
              <p className="text-[10px] font-medium text-black/30 uppercase tracking-wider mb-1.5">Bestellreferenz</p>
              <p className="text-xs text-black/65">{ticket.order_ref}</p>
              {ticket.shoe_name && (
                <p className="text-[10px] text-black/45">{ticket.shoe_name}</p>
              )}
            </div>
          )}

          {/* Full message */}
          <div>
            <p className="text-[10px] font-medium text-black/30 uppercase tracking-wider mb-1.5">Nachricht</p>
            <p className="text-xs text-black/65 leading-relaxed whitespace-pre-wrap">{ticket.message}</p>
          </div>

          {/* Admin notes */}
          <div>
            <p className="text-[10px] font-medium text-black/30 uppercase tracking-wider mb-1.5">Interne Notizen</p>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Interne Notizen hinzufügen..."
              className="w-full text-xs text-black/65 bg-white border border-black/6 p-3 resize-y min-h-[80px] placeholder:text-black/25 focus:outline-none focus:border-black/15"
            />
            <button
              onClick={handleSaveNotes}
              disabled={updating || adminNotes === (ticket.admin_notes || '')}
              className="mt-2 flex items-center gap-1.5 bg-black/8 text-black/50 hover:bg-black/12 text-[10px] font-medium px-3 py-1.5 border-0 transition-colors disabled:opacity-50"
            >
              <Send size={10} strokeWidth={1.5} />
              Notizen speichern
            </button>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-black/6 flex flex-wrap items-center gap-2">
            {nextOptions.map(s => (
              <button
                key={s}
                disabled={updating}
                onClick={() => handleStatusChange(s)}
                className={`text-[10px] font-medium px-3 py-2 border-0 transition-all disabled:opacity-50 ${
                  s === 'closed'
                    ? 'bg-black/8 text-black/40 hover:bg-black/12'
                    : s === 'resolved'
                      ? 'bg-black text-white hover:bg-black/85'
                      : 'bg-black/8 text-black/50 hover:bg-black/12'
                }`}
              >
                {updating ? '…' : STATUS_CONFIG[s]?.label || s}
              </button>
            ))}

            <div className="flex-1" />

            {/* Delete */}
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-black/45">Wirklich löschen?</span>
                <button
                  onClick={handleDelete}
                  disabled={updating}
                  className="text-[10px] font-medium px-3 py-2 bg-black text-white border-0 transition-all disabled:opacity-50 hover:bg-black/85"
                >
                  {updating ? '…' : 'Ja, löschen'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-[10px] font-medium px-3 py-2 bg-black/8 text-black/50 border-0 transition-all hover:bg-black/12"
                >
                  Abbrechen
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 text-[10px] font-medium px-3 py-2 bg-black/5 text-black/35 border-0 transition-all hover:bg-black/10 hover:text-black/50"
              >
                <Trash2 size={10} strokeWidth={1.5} />
                Löschen
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
    <div className="p-8 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <MessageSquare size={18} strokeWidth={1.5} className="text-black/35" />
            <h1 className="text-xl font-bold text-black/85" style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>Feedback & Beschwerden</h1>
          </div>
          <p className="text-xs text-black/45">{tickets.length} Tickets gesamt</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 bg-black/5 hover:bg-black/10 text-black/65 text-xs px-3 py-2 border-0 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
          Aktualisieren
        </button>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 mb-6">
        {[
          { label: 'Gesamt', value: tickets.length },
          { label: 'Offen', value: statusCounts.open || 0 },
          { label: 'In Bearbeitung', value: statusCounts.in_progress || 0 },
          { label: 'Gelöst', value: statusCounts.resolved || 0 },
        ].map(stat => (
          <div key={stat.label} className="flex-1 bg-white border border-black/6 px-4 py-3">
            <p className="text-[10px] font-medium text-black/30 uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-lg font-bold text-black/85">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`text-xs font-medium px-3 py-1.5 border-0 transition-all ${
              statusFilter === f.key
                ? 'bg-black text-white'
                : 'bg-black/5 text-black/45 hover:bg-black/10 hover:text-black/90'
            }`}
          >
            {f.label}
            {f.key !== 'all' && statusCounts[f.key] ? ` (${statusCounts[f.key]})` : ''}
            {f.key === 'all' ? ` (${tickets.length})` : ''}
          </button>
        ))}
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {TYPE_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setTypeFilter(f.key)}
            className={`text-xs font-medium px-3 py-1.5 border-0 transition-all ${
              typeFilter === f.key
                ? 'bg-black text-white'
                : 'bg-black/5 text-black/45 hover:bg-black/10 hover:text-black/90'
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
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-black/15 border-t-black animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageSquare size={32} strokeWidth={1.5} className="text-black/20 mb-3" />
          <p className="text-sm text-black/45">Keine Tickets gefunden</p>
        </div>
      ) : (
        <div className="space-y-2">
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
