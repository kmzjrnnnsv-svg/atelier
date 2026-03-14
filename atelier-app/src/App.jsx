import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute, CMSRoute, AdminRoute } from './components/ProtectedRoute'
import BottomNav from './components/BottomNav'
import useAtelierStore from './store/atelierStore'
import ErrorBoundary from './components/ErrorBoundary'
import NotFound from './screens/NotFound'

import Login from './screens/Login'
import Registration from './screens/Registration'
import ShoeCollection from './screens/ShoeCollection'
import Customize from './screens/Customize'
import Profile from './screens/Profile'
import FootScan from './screens/FootScan'
import OutfitVisualizer from './screens/OutfitVisualizer'
import Mirror   from './screens/Mirror'
import Explore  from './screens/Explore'
import HealthInfo from './screens/HealthInfo'
import Learn from './screens/Learn'
import Settings from './screens/Settings'

import Wishlist    from './screens/Wishlist'
import Orders      from './screens/Orders'
import Checkout    from './screens/Checkout'
import HelpSupport from './screens/HelpSupport'
import LegalDoc    from './screens/LegalDoc'
import MyScans     from './screens/MyScans'

import CMSLayout from './screens/cms/CMSLayout'
import CMSDashboard from './screens/cms/CMSDashboard'
import ShoeEditor from './screens/cms/ShoeEditor'
import CuratedEditor from './screens/cms/CuratedEditor'
import WardrobeEditor from './screens/cms/WardrobeEditor'
import OutfitEditor from './screens/cms/OutfitEditor'
import UsersPanel from './screens/cms/UsersPanel'
import ScansPanel from './screens/cms/ScansPanel'
import ArticleEditor from './screens/cms/ArticleEditor'
import FAQEditor    from './screens/cms/FAQEditor'
import LegalEditor  from './screens/cms/LegalEditor'
import OrdersPanel  from './screens/cms/OrdersPanel'
import MFASetup      from './screens/cms/MFASetup'
import BankSettings  from './screens/cms/BankSettings'
import EmailSettings from './screens/cms/EmailSettings'
import EmailTemplatesPanel from './screens/cms/EmailTemplatesPanel'

// Routes where the global bottom nav should NOT appear
const NO_NAV_PATHS = ['/login', '/register', '/scan', '/customize', '/settings']

function AppRoutes() {
  const location = useLocation()
  const { user } = useAuth()
  const { initStore } = useAtelierStore()
  const isCMS = location.pathname.startsWith('/cms')
  const showNav = !isCMS && !NO_NAV_PATHS.includes(location.pathname)

  // Load store data from DB whenever a user session is active
  useEffect(() => {
    if (user) initStore()
  }, [user])

  if (isCMS) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
        <Routes>
          <Route path="/cms" element={<CMSRoute><CMSLayout /></CMSRoute>}>
            <Route index        element={<CMSDashboard />} />
            <Route path="shoes"    element={<ShoeEditor />} />
            <Route path="curated"  element={<CuratedEditor />} />
            <Route path="wardrobe" element={<WardrobeEditor />} />
            <Route path="outfits"  element={<OutfitEditor />} />
            <Route path="users"    element={<AdminRoute><UsersPanel /></AdminRoute>} />
            <Route path="scans"    element={<ScansPanel />} />
            <Route path="articles" element={<ArticleEditor />} />
            <Route path="orders"   element={<OrdersPanel />} />
            <Route path="faq"      element={<FAQEditor />} />
            <Route path="legal"    element={<LegalEditor />} />
            <Route path="mfa"      element={<AdminRoute><MFASetup /></AdminRoute>} />
            <Route path="bank"     element={<AdminRoute><BankSettings /></AdminRoute>} />
            <Route path="email"    element={<AdminRoute><EmailSettings /></AdminRoute>} />
            <Route path="email-templates" element={<EmailTemplatesPanel />} />
          </Route>
        </Routes>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/"           element={<Navigate to="/login" replace />} />
          <Route path="/login"      element={<Login />} />
          <Route path="/register"   element={<Registration />} />
          <Route path="/collection" element={<ProtectedRoute><ShoeCollection /></ProtectedRoute>} />
          <Route path="/customize"  element={<ProtectedRoute><Customize /></ProtectedRoute>} />
          <Route path="/profile"    element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/scan"       element={<ProtectedRoute><FootScan /></ProtectedRoute>} />
          <Route path="/visualizer" element={<ProtectedRoute><OutfitVisualizer /></ProtectedRoute>} />
          <Route path="/mirror"     element={<ProtectedRoute><Mirror /></ProtectedRoute>} />
          <Route path="/explore"    element={<ProtectedRoute><Explore /></ProtectedRoute>} />
          <Route path="/health"     element={<ProtectedRoute><HealthInfo /></ProtectedRoute>} />
          <Route path="/learn"      element={<ProtectedRoute><Learn /></ProtectedRoute>} />
          <Route path="/settings"    element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/wishlist"    element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
          <Route path="/orders"      element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/checkout"    element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/help"        element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
          <Route path="/legal/:type" element={<ProtectedRoute><LegalDoc /></ProtectedRoute>} />
          <Route path="/my-scans"    element={<ProtectedRoute><MyScans /></ProtectedRoute>} />
          <Route path="*"            element={<NotFound />} />
        </Routes>
      </div>
      {showNav && <BottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
