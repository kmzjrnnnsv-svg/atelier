import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute, CMSRoute, AdminRoute } from './components/ProtectedRoute'
import BottomNav from './components/BottomNav'
import TopBar from './components/TopBar'
import useAtelierStore from './store/atelierStore'
import ErrorBoundary from './components/ErrorBoundary'
import { Capacitor } from '@capacitor/core'

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    // Also reset any internal scroll containers
    document.querySelectorAll('.overflow-y-auto').forEach(el => { el.scrollTop = 0 })
  }, [pathname])
  return null
}

// Eager: needed immediately on first paint
import Login from './screens/Login'
import Registration from './screens/Registration'
import NotFound from './screens/NotFound'

// Lazy import factories — used both by lazy() and prefetchRoute()
const lazyImports = {
  '/foryou':     () => import('./screens/ForYou'),
  '/collection': () => import('./screens/ShoeCollection'),
  '/customize':  () => import('./screens/Customize'),
  '/profile':    () => import('./screens/Profile'),
  '/scan':       () => import('./screens/FootScan'),
  '/mirror':     () => import('./screens/Mirror'),
  '/explore':    () => import('./screens/Explore'),
  '/health':     () => import('./screens/HealthInfo'),
  '/learn':      () => import('./screens/Explore'),
  '/settings':   () => import('./screens/Settings'),
  '/wishlist':   () => import('./screens/Wishlist'),
  '/orders':     () => import('./screens/Orders'),
  '/checkout':    () => import('./screens/Checkout'),
  '/accessories': () => import('./screens/Accessories'),
  '/help':       () => import('./screens/HelpSupport'),
  '/feedback':   () => import('./screens/Feedback'),
  '/legal':      () => import('./screens/LegalDoc'),
  '/my-scans':   () => import('./screens/MyScans'),
  '/welcome':    () => import('./screens/Welcome'),
}

// Prefetch a route's chunk on hover/touch — safe to call multiple times
const prefetched = new Set()
export function prefetchRoute(path) {
  if (prefetched.has(path) || !lazyImports[path]) return
  prefetched.add(path)
  lazyImports[path]()
}

// Lazy: loaded on demand per route
const ForYou            = lazy(lazyImports['/foryou'])
const ShoeCollection    = lazy(lazyImports['/collection'])
const Customize         = lazy(lazyImports['/customize'])
const Profile           = lazy(lazyImports['/profile'])
const FootScan          = lazy(lazyImports['/scan'])
const Mirror            = lazy(lazyImports['/mirror'])
const Explore           = lazy(lazyImports['/explore'])
const HealthInfo        = lazy(lazyImports['/health'])
const Settings          = lazy(lazyImports['/settings'])
const Wishlist          = lazy(lazyImports['/wishlist'])
const Orders            = lazy(lazyImports['/orders'])
const Checkout          = lazy(lazyImports['/checkout'])
const Accessories       = lazy(lazyImports['/accessories'])
const HelpSupport       = lazy(lazyImports['/help'])
const Feedback          = lazy(lazyImports['/feedback'])
const LegalDoc          = lazy(lazyImports['/legal'])
const MyScans           = lazy(lazyImports['/my-scans'])
const Welcome           = lazy(lazyImports['/welcome'])

// CMS
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
const ProductConfigEditor  = lazy(() => import('./screens/cms/ProductConfigEditor'))
const ExploreEditor        = lazy(() => import('./screens/cms/ExploreEditor'))
const LoyaltyEditor        = lazy(() => import('./screens/cms/LoyaltyEditor'))
const FeedbackPanel        = lazy(() => import('./screens/cms/FeedbackPanel'))
const AccessoriesPanel     = lazy(() => import('./screens/cms/AccessoriesPanel'))
const ShippingPanel        = lazy(() => import('./screens/cms/ShippingPanel'))
const CouponsPanel         = lazy(() => import('./screens/cms/CouponsPanel'))
const FeaturedShoesPanel   = lazy(() => import('./screens/cms/FeaturedShoesPanel'))
const CtaBannerPanel       = lazy(() => import('./screens/cms/CtaBannerPanel'))
const RegisterPromotion    = lazy(() => import('./screens/RegisterPromotion'))

// Only show spinner after 300ms to avoid flicker on fast connections
function DelayedSpinner() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 300)
    return () => clearTimeout(t)
  }, [])
  if (!show) return null
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin-custom" />
    </div>
  )
}

// Routes where the global bottom nav should NOT appear
const NO_NAV_PATHS = ['/login', '/register', '/welcome', '/scan', '/customize']

export const isNative = Capacitor.isNativePlatform()

// Detect mobile web (iOS/Android browser, not Capacitor)
export const isMobileWeb = !isNative && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

// Add class to <html> so CSS can differentiate
if (isNative) document.documentElement.classList.add('native')
if (isMobileWeb) document.documentElement.classList.add('mobile-web')

// Track window.innerHeight for browser mode — this is the only value
// that dynamically follows Safari's toolbar resize (shrink on scroll).
function useViewportHeight() {
  const [vh, setVh] = useState(window.innerHeight)
  const update = useCallback(() => setVh(window.innerHeight), [])
  useEffect(() => {
    if (isNative) return
    window.addEventListener('resize', update)
    // visualViewport fires more reliably on iOS Safari toolbar changes
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [update])
  return vh
}

function AppRoutes() {
  const location = useLocation()
  const { user } = useAuth()
  const { initStore } = useAtelierStore()
  const isCMS = location.pathname.startsWith('/cms')
  const showNav = !isCMS && !NO_NAV_PATHS.includes(location.pathname)
  const viewportHeight = useViewportHeight()

  // Configure native status bar for edge-to-edge rendering
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        StatusBar.setOverlaysWebView({ overlay: true })
        StatusBar.setStyle({ style: Style.Dark })
      })
    }
  }, [])

  // Load store data from DB whenever a user session is active
  useEffect(() => {
    if (user) initStore()
  }, [user])

  if (isCMS) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: isNative ? '100dvh' : viewportHeight, zIndex: 50, overflow: 'hidden', boxSizing: 'border-box', ...(isNative && { paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }) }}>
        <Suspense fallback={<DelayedSpinner />}>
          <Routes>
            <Route path="/cms" element={<CMSRoute><CMSLayout /></CMSRoute>}>
              <Route index        element={<CMSDashboard />} />
              <Route path="shoes"    element={<ShoeEditor />} />
              <Route path="curated"  element={<CuratedEditor />} />
              <Route path="wardrobe" element={<WardrobeEditor />} />
              <Route path="outfits"  element={<OutfitEditor />} />
              <Route path="users"    element={<AdminRoute><UsersPanel /></AdminRoute>} />
              <Route path="scans"    element={<ScansPanel />} />
              <Route path="explore"  element={<ExploreEditor />} />
              <Route path="loyalty"  element={<LoyaltyEditor />} />
              <Route path="articles" element={<ArticleEditor />} />
              <Route path="cta-banner" element={<CtaBannerPanel />} />
              <Route path="orders"   element={<OrdersPanel />} />
              <Route path="faq"      element={<FAQEditor />} />
              <Route path="legal"    element={<LegalEditor />} />
              <Route path="mfa"      element={<AdminRoute><MFASetup /></AdminRoute>} />
              <Route path="bank"     element={<AdminRoute><BankSettings /></AdminRoute>} />
              <Route path="email"    element={<AdminRoute><EmailSettings /></AdminRoute>} />
              <Route path="email-templates" element={<EmailTemplatesPanel />} />
              <Route path="leisten"       element={<LastSettings />} />
              <Route path="product-config" element={<ProductConfigEditor />} />
              <Route path="feedback" element={<FeedbackPanel />} />
              <Route path="accessories" element={<AccessoriesPanel />} />
              <Route path="shipping" element={<AdminRoute><ShippingPanel /></AdminRoute>} />
              <Route path="coupons"  element={<AdminRoute><CouponsPanel /></AdminRoute>} />
              <Route path="featured" element={<FeaturedShoesPanel />} />
            </Route>
          </Routes>
        </Suspense>
      </div>
    )
  }

  // ── Native: fixed container with internal scroll (Capacitor) ──
  if (isNative) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', background: '#FFFFFF', overflow: 'hidden', boxSizing: 'border-box', paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex-1 overflow-y-auto relative">
          <Suspense fallback={<DelayedSpinner />}>
            <Routes>
              <Route path="/"           element={<Navigate to="/foryou" replace />} />
              <Route path="/login"      element={<Login />} />
              <Route path="/register"   element={<Registration />} />
              <Route path="/register-promotion" element={<RegisterPromotion />} />
              <Route path="/foryou"    element={<ProtectedRoute><ForYou /></ProtectedRoute>} />
              <Route path="/collection" element={<ProtectedRoute><ShoeCollection /></ProtectedRoute>} />
              <Route path="/customize"  element={<ProtectedRoute><Customize /></ProtectedRoute>} />
              <Route path="/profile"    element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/welcome"    element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
              <Route path="/scan"       element={<ProtectedRoute><FootScan /></ProtectedRoute>} />

              <Route path="/mirror"     element={<ProtectedRoute><Mirror /></ProtectedRoute>} />
              <Route path="/explore"    element={<ProtectedRoute><Explore /></ProtectedRoute>} />
              <Route path="/health"     element={<ProtectedRoute><HealthInfo /></ProtectedRoute>} />
              <Route path="/learn"      element={<Navigate to="/explore" replace />} />
              <Route path="/settings"    element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/wishlist"    element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
              <Route path="/orders"      element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/checkout"    element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
              <Route path="/accessories" element={<ProtectedRoute><Accessories /></ProtectedRoute>} />
              <Route path="/help"        element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
              <Route path="/feedback"    element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
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

  const routes = (
    <Routes>
      <Route path="/"           element={<Navigate to="/foryou" replace />} />
      <Route path="/login"      element={<Login />} />
      <Route path="/register"   element={<Registration />} />
      <Route path="/register-promotion" element={<RegisterPromotion />} />
      <Route path="/foryou"    element={<ProtectedRoute><ForYou /></ProtectedRoute>} />
      <Route path="/collection" element={<ProtectedRoute><ShoeCollection /></ProtectedRoute>} />
      <Route path="/customize"  element={<ProtectedRoute><Customize /></ProtectedRoute>} />
      <Route path="/profile"    element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/welcome"    element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
      <Route path="/scan"       element={<ProtectedRoute><FootScan /></ProtectedRoute>} />
      <Route path="/mirror"     element={<ProtectedRoute><Mirror /></ProtectedRoute>} />
      <Route path="/explore"    element={<ProtectedRoute><Explore /></ProtectedRoute>} />
      <Route path="/health"     element={<ProtectedRoute><HealthInfo /></ProtectedRoute>} />
      <Route path="/learn"      element={<Navigate to="/explore" replace />} />
      <Route path="/settings"    element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/wishlist"    element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
      <Route path="/orders"      element={<ProtectedRoute><Orders /></ProtectedRoute>} />
      <Route path="/checkout"    element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
      <Route path="/accessories" element={<ProtectedRoute><Accessories /></ProtectedRoute>} />
      <Route path="/help"        element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
      <Route path="/feedback"    element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
      <Route path="/legal/:type" element={<ProtectedRoute><LegalDoc /></ProtectedRoute>} />
      <Route path="/my-scans"    element={<ProtectedRoute><MyScans /></ProtectedRoute>} />
      <Route path="*"            element={<NotFound />} />
    </Routes>
  )

  // ── Mobile web: TopBar (burger menu), natural document scroll ──
  if (isMobileWeb) {
    return (
      <div style={{ minHeight: '100dvh', background: '#FFFFFF' }}>
        {showNav && <TopBar />}
        <Suspense fallback={<DelayedSpinner />}>{routes}</Suspense>
      </div>
    )
  }

  // ── Desktop web: fixed container, internal scroll, white bg ──
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: viewportHeight, display: 'flex', flexDirection: 'column', background: '#FFFFFF', overflow: 'hidden', boxSizing: 'border-box' }}>
      {showNav && <TopBar />}
      <div className="flex-1 overflow-y-auto relative">
        <div className="max-w-5xl mx-auto w-full">
          <Suspense fallback={<DelayedSpinner />}>{routes}</Suspense>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
