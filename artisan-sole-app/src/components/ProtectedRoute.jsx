import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Spinner shown while session is being restored on page load
function Spinner() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin-custom" />
    </div>
  )
}

// General: requires any authenticated user, preserves intended destination
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (!user) {
    const from = location.pathname + location.search + location.hash
    return <Navigate to="/login" replace state={{ from }} />
  }
  return children
}

// CMS: requires admin or curator role
export function CMSRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (!user) {
    const from = location.pathname + location.search + location.hash
    return <Navigate to="/login" replace state={{ from }} />
  }
  if (user.role !== 'admin' && user.role !== 'curator') {
    return <Navigate to="/collection" replace />
  }
  return children
}

// Business: requires an authenticated user who owns a Firmenkonto
export function BusinessRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (!user) {
    const from = location.pathname + location.search + location.hash
    return <Navigate to="/login" replace state={{ from }} />
  }
  if (!user.is_business) return <Navigate to="/collection" replace />
  return children
}

/**
 * Wohin ein angemeldeter Nutzer gehört, wenn er nicht Kunde ist.
 * Reihenfolge: Verwaltungsrolle vor Firma vor Affiliate — dieselbe wie bei
 * der Anmeldung, damit ein Administrator, der nebenbei Affiliate ist, nicht
 * plötzlich woanders herauskommt.
 */
export function ownAreaFor(user) {
  if (!user) return null
  if (user.role === 'admin' || user.role === 'curator') return null  // dürfen alles sehen
  if (user.is_business) return '/business/dashboard'
  if (user.is_affiliate) return '/affiliate'
  return null
}

/**
 * Laden-Seiten: Firmenkonten und Affiliates werden in ihren eigenen Bereich
 * geschickt. Sie sollen nach der Anmeldung nicht im Verkauf landen — ihr
 * Verhältnis zum Haus ist ein anderes, und die Kollektion mit Warenkorb ist
 * für sie eher verwirrend als nützlich.
 *
 * Gäste bleiben unberührt: Der Laden ist ohne Anmeldung offen, und das soll
 * er bleiben.
 */
export function ShopRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  const area = ownAreaFor(user)
  if (area) return <Navigate to={area} replace />
  return children
}

// Admin only
export function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (!user) {
    const from = location.pathname + location.search + location.hash
    return <Navigate to="/login" replace state={{ from }} />
  }
  if (user.role !== 'admin') return <Navigate to="/cms" replace />
  return children
}
