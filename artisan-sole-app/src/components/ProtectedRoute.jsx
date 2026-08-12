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
 * Laden-Seiten. Offen für alle — auch für Firmenkonten und Affiliates.
 *
 * Bis hierher wurden beide aus dem Verkauf heraus in ihren eigenen Bereich
 * geschickt. Der Gedanke war, sie nicht mit einem Warenkorb zu behelligen,
 * den sie nicht brauchen. In der Sache ging er daneben: Ein Affiliate, der
 * nicht sehen kann, was er empfiehlt, kann es nicht empfehlen, und ein
 * Firmenkonto wählt für seine Kampagne Modelle aus, die es nie zu Gesicht
 * bekam. Auf den Unterdomänen stand die Kollektion deshalb leer da.
 *
 * Wohin es nach der Anmeldung geht, bleibt unverändert: Die Wurzel führt
 * jeden in seinen Bereich (siehe StartRoute). Wer von dort aus in den Laden
 * geht, darf ihn jetzt auch sehen.
 */
export function ShopRoute({ children }) {
  const { loading } = useAuth()
  if (loading) return <Spinner />
  return children
}

/**
 * Die Wurzel der Domain: Jeder landet in seinem Bereich, alle anderen in der
 * Kollektion. Diese Weiterleitung trug vorher ShopRoute — sie gehört aber nur
 * hierher, sonst sperrt sie den Laden gleich mit zu.
 */
export function StartRoute() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  return <Navigate to={ownAreaFor(user) || '/collection'} replace />
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
