import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute, CMSRoute, AdminRoute } from './components/ProtectedRoute'
import BottomNav from './components/BottomNav'
import useAtelierStore from './store/atelierStore'
import ErrorBoundary from './components/ErrorBoundary'

// Eager: needed immediately on first paint
import Login from './screens/Login'
import Registration from './screens/Registration'
import NotFound from './screens/NotFound'

// Lazy: loaded on demand per route
const ShoeCollection    = lazy(() => import('./screens/ShoeCollection'))
const Customize         = lazy(() => import('./screens/Customize'))
const Profile           = lazy(() => import('./screens/Profile'))
const FootScan          = lazy(() => import('./screens/FootScan'))
const OutfitVisualizer  = lazy(() => import('./screens/OutfitVisualizer'))
const Mirror            = lazy(() => import('./screens/Mirror'))
const Explore           = lazy(() => import('./screens/Explore'))
const HealthInfo        = lazy(() => import('./screens/HealthInfo'))
const Learn             = lazy(() => import('./screens/Learn'))
const Settings          = lazy(() => import('./screens/Settings'))
const Wishlist          = lazy(() => import('./screens/Wishlist'))
const Orders            = lazy(() => import('./screens/Orders'))
const Checkout          = lazy(() => import('./screens/Checkout'))
const HelpSupport       = lazy(() => import('./screens/HelpSupport'))
const LegalDoc          = lazy(() => import('./screens/LegalDoc'))
const MyScans           = lazy(() => import('./screens/MyScans'))
const Welcome           = lazy(() => import('./screens/Welcome'))

// CMS — single chunk via webpackChunkName-style magic comment
const CMSLayout            = lazy(() => import('./screens/cms/CMSLayout'))
const CMSDashboard         = lazy(() => import('./screens/cms/CMSDashboard'))
const ShoeEditor           = lazy(() => import('./screens/cms/ShoeEditor'))
const CuratedEditor        = lazy(() => import('./screens/cms/CuratedEditor'))
const WardrobeEditor       = lazy(() => import('./screens/cms/WardrobeEditor'))
const OutfitEditor         = lazy(() => import('./screens/cms/OutfitEditor'))
const UsersPanel           = lazy(() => import('./screens/cms/UsersPanel'))
const ScansPanel           = lazy(() => import('./screens/cms/ScansPanel'))
const ArticleEditor        = lazy(() => import('./screens/cms/ArticleEditor'))
const FAQEditor            = lazy(() => import('./screens/cms/FAQEditor'))
const LegalEditor          = lazy(() => import('./screens/cms/LegalEditor'))
const OrdersPanel          = lazy(() => import('./screens/cms/OrdersPanel'))
const MFASetup             = lazy(() => import('./screens/cms/MFASetup'))
const BankSettings         = lazy(() => import('./screens/cms/BankSettings'))
const EmailSettings        = lazy(() => import('./screens/cms/EmailSettings'))
const EmailTemplatesPanel  = lazy(() => import('./screens/cms/EmailTemplatesPanel'))
const LastSettings         = lazy(() => import('./screens/cms/LastSettings'))

function LazySpinner() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin-custom" />
    </div>
  )
}

// Routes where the global bottom nav should NOT appear
const NO_NAV_PATHS = ['/login', '/register', '/welcome', '/scan', '/customize', '/settings']

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
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
        <Suspense fallback={<LazySpinner />}>
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
              <Route path="leisten"       element={<LastSettings />} />
            </Route>
          </Routes>
        </Suspense>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<LazySpinner />}>
          <Routes>
            <Route path="/"           element={<Navigate to="/login" replace />} />
            <Route path="/login"      element={<Login />} />
            <Route path="/register"   element={<Registration />} />
            <Route path="/collection" element={<ProtectedRoute><ShoeCollection /></ProtectedRoute>} />
            <Route path="/customize"  element={<ProtectedRoute><Customize /></ProtectedRoute>} />
            <Route path="/profile"    element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/welcome"    element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
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
        </Suspense>
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
