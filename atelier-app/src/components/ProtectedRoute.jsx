import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Spinner shown while session is being restored on page load
function Spinner() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin-custom" />
    </div>
  )
}

// General: requires any authenticated user
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

// CMS: requires admin or curator role
export function CMSRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin' && user.role !== 'curator') {
    return <Navigate to="/collection" replace />
  }
  return children
}

// Admin only
export function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/cms" replace />
  return children
}
