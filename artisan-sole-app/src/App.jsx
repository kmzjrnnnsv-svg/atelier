import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute, CMSRoute, AdminRoute, BusinessRoute } from './components/ProtectedRoute'
import BottomNav from './components/BottomNav'
import TopBar from './components/TopBar'
import Footer from './components/Footer'
import useStore from './store/store'
import ErrorBoundary from './components/ErrorBoundary'
import LogoSplash from './components/LogoSplash'
import { Capacitor } from '@capacitor/core'
import useDeviceInfo from './hooks/useDeviceInfo'

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    // Reset document scroll (mobile web)
    window.scrollTo(0, 0)
    // Reset all internal scroll containers (native + desktop fixed layouts)
    const resetContainers = () =>
      document.querySelectorAll('.overflow-y-auto:not([data-keep-scroll])').forEach(el => { el.scrollTop = 0 })
    resetContainers()
    // Also reset after React has rendered the new route content
    requestAnimationFrame(resetContainers)
  }, [pathname])
  return null
}

// Page transition wrapper, re-triggers fade-in animation on route change
function PageTransition({ children }) {
  const { pathname } = useLocation()
  const [key, setKey] = useState(pathname)
  useEffect(() => { setKey(pathname) }, [pathname])
  return <div key={key} className="page-transition">{children}</div>
}

// Eager: needed immediately on first paint
import Login from './screens/Login'
import Registration from './screens/Registration'
import NotFound from './screens/NotFound'

// Lazy import factories, used both by lazy() and prefetchRoute()
const lazyImports = {
  '/collection': () => import('./screens/ShoeCollection'),
  '/customize':  () => import('./screens/Customize'),
  '/vermittler': () => import('./screens/AffiliatePortal'),
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

// Prefetch a route's chunk on hover/touch, safe to call multiple times
const prefetched = new Set()
export function prefetchRoute(path) {
  if (prefetched.has(path) || !lazyImports[path]) return
  prefetched.add(path)
  lazyImports[path]()
}

// Lazy: loaded on demand per route
const ShoeCollection    = lazy(lazyImports['/collection'])
const Customize         = lazy(lazyImports['/customize'])
const AffiliatePortal   = lazy(lazyImports['/vermittler'])
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
const LastSizeChartEditor  = lazy(() => import('./screens/cms/LastSizeChartEditor'))
const ProductConfigEditor  = lazy(() => import('./screens/cms/ProductConfigEditor'))
const ExploreEditor        = lazy(() => import('./screens/cms/ExploreEditor'))
const LoyaltyEditor        = lazy(() => import('./screens/cms/LoyaltyEditor'))
const FeedbackPanel        = lazy(() => import('./screens/cms/FeedbackPanel'))
const AccessoriesPanel     = lazy(() => import('./screens/cms/AccessoriesPanel'))
const ShippingPanel        = lazy(() => import('./screens/cms/ShippingPanel'))
const CouponsPanel         = lazy(() => import('./screens/cms/CouponsPanel'))
const FeaturedShoesPanel   = lazy(() => import('./screens/cms/FeaturedShoesPanel'))
const HomepageEditor       = lazy(() => import('./screens/cms/HomepageEditor'))
const FooterEditor         = lazy(() => import('./screens/cms/FooterEditor'))
const ProductTextsEditor   = lazy(() => import('./screens/cms/ProductTextsEditor'))
const MediaLibrary         = lazy(() => import('./screens/cms/MediaLibrary'))
const WebsiteImagesPanel   = lazy(() => import('./screens/cms/WebsiteImagesPanel'))
const OptionsEditor        = lazy(() => import('./screens/cms/OptionsEditor'))
const ConfiguratorMatrix   = lazy(() => import('./screens/cms/ConfiguratorMatrix'))
const CtaBannerPanel       = lazy(() => import('./screens/cms/CtaBannerPanel'))
const RegisterPromotion    = lazy(() => import('./screens/RegisterPromotion'))
const CorporateGifting     = lazy(() => import('./screens/CorporateGifting'))
const CorporateOverview    = lazy(() => import('./screens/business/CorporateOverview'))
const RegisterBusiness     = lazy(() => import('./screens/RegisterBusiness'))
const BusinessDashboard    = lazy(() => import('./screens/business/BusinessDashboard'))
const BusinessProfile      = lazy(() => import('./screens/business/BusinessProfile'))
const BusinessCampaigns    = lazy(() => import('./screens/business/BusinessCampaigns'))
const CampaignDashboard    = lazy(() => import('./screens/business/CampaignDashboard'))
const CampaignJoin         = lazy(() => import('./screens/business/CampaignJoin'))
const VerifyEmail          = lazy(() => import('./screens/VerifyEmail'))
const BusinessPanel        = lazy(() => import('./screens/cms/BusinessPanel'))

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
const NO_NAV_PATHS = ['/login', '/register', '/welcome', '/scan', '/customize', '/register-business', '/business/dashboard', '/business/profile', '/business/campaigns', '/verify-email']
// Pfade mit variablem Ende: hier zählt der Anfang, nicht die genaue Adresse.
const NO_NAV_PREFIXES = ['/schuhe/']
const hidesNav = (path) =>
  NO_NAV_PATHS.includes(path) || NO_NAV_PREFIXES.some(p => path.startsWith(p))

export const isNative = Capacitor.isNativePlatform()

// Detect mobile web (iOS/Android browser, not Capacitor)
export const isMobileWeb = !isNative && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

// Domains: business.artisansole.com zeigt den Corporate-Gifting-Bereich,
// die Hauptdomain (artisansole.com) leitet /business dorthin um.
const HOSTNAME = typeof window !== 'undefined' ? window.location.hostname : ''
export const isBusiness = !isNative && /^business\./i.test(HOSTNAME)
const isProdApex = !isNative && /^(www\.)?artisansole\.com$/i.test(HOSTNAME)
const BUSINESS_URL = 'https://business.artisansole.com/'


// Externe Weiterleitung (zur Subdomain)
function ExternalRedirect({ to }) {
  useEffect(() => { window.location.replace(to) }, [to])
  return null
}

// Add class to <html> so CSS can differentiate
if (isNative) document.documentElement.classList.add('native')
if (isMobileWeb) document.documentElement.classList.add('mobile-web')

// Track window.innerHeight for browser mode, this is the only value
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
  const { initStore } = useStore()
  const device = useDeviceInfo()
  const isCMS = location.pathname.startsWith('/cms')
  // Corporate-Onepager bringt eine eigene Kopfzeile mit, globale Shop-Nav ausblenden.
  const isCorporateLanding = location.pathname === '/business' || (isBusiness && location.pathname === '/')
  // Eigenständige Vollbild-Seiten (Firmenbereich, Kampagnen-Beitritt) ohne Shop-Nav.
  const isStandalone = location.pathname.startsWith('/business/') || location.pathname.startsWith('/c/')
  const showNav = !isCMS && !isCorporateLanding && !isStandalone && !hidesNav(location.pathname)
  const FOOTER_PATHS = ['/collection', '/accessories', '/explore', '/business']
  const showFooter = showNav && FOOTER_PATHS.includes(location.pathname)
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

  // Load store data from DB, public catalog runs always (Window Shopping),
  // user-bound endpoints (favorites, orders, scans, cart) gracefully fall back
  // to empty arrays for guests.
  useEffect(() => {
    initStore()
  }, [user])

  if (isCMS) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: isNative ? '100dvh' : viewportHeight, zIndex: 50, overflow: 'hidden', boxSizing: 'border-box', ...(isNative && { paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }) }}>
        {/* CMS nur auf iPad / Desktop (>= 768px) */}
        <div className="flex md:hidden items-center justify-center h-full bg-white px-8">
          <div className="text-center">
            <p className="text-[16px] font-semibold text-black mb-2">CMS Studio</p>
            <p className="text-[13px] text-black/50 font-light leading-relaxed mb-4">Das CMS ist nur auf iPad und Desktop verfügbar.</p>
            <p className="text-[11px] text-black/30 font-light">Erkannt: {device.label}</p>
          </div>
        </div>
        <div className="hidden md:block h-full">
        <Suspense fallback={<DelayedSpinner />}>
          <Routes>
            <Route path="/cms" element={<CMSRoute><CMSLayout /></CMSRoute>}>
              <Route index        element={<CMSDashboard />} />
              <Route path="shoes"    element={<ShoeEditor />} />
              <Route path="curated"  element={<CuratedEditor />} />
              <Route path="wardrobe" element={<WardrobeEditor />} />
              <Route path="outfits"  element={<OutfitEditor />} />
              <Route path="users"    element={<AdminRoute><UsersPanel /></AdminRoute>} />
              <Route path="business" element={<BusinessPanel />} />
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
              <Route path="leisten"       element={<LastSizeChartEditor />} />
              <Route path="product-config" element={<ProductConfigEditor />} />
              <Route path="feedback" element={<FeedbackPanel />} />
              <Route path="accessories" element={<AccessoriesPanel />} />
              <Route path="shipping" element={<AdminRoute><ShippingPanel /></AdminRoute>} />
              <Route path="coupons"  element={<AdminRoute><CouponsPanel /></AdminRoute>} />
              <Route path="featured" element={<FeaturedShoesPanel />} />
              <Route path="homepage" element={<HomepageEditor />} />
              <Route path="footer" element={<FooterEditor />} />
              <Route path="product-texts" element={<ProductTextsEditor />} />
              <Route path="media" element={<MediaLibrary />} />
              <Route path="website-images" element={<WebsiteImagesPanel />} />
              <Route path="options"        element={<OptionsEditor />} />
              <Route path="matrix"         element={<ConfiguratorMatrix />} />
            </Route>
          </Routes>
        </Suspense>
        </div>
      </div>
    )
  }

  // ── Native: fixed container with internal scroll (Capacitor) ──
  if (isNative) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', background: '#FFFFFF', overflow: 'hidden', boxSizing: 'border-box', paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex-1 overflow-y-auto relative">
          <Suspense fallback={<DelayedSpinner />}>
            <PageTransition>
            <Routes>
              <Route path="/"           element={<Navigate to="/collection" replace />} />
              <Route path="/login"      element={<Login />} />
              <Route path="/register"   element={<Registration />} />
              <Route path="/register-promotion" element={<RegisterPromotion />} />
              {/* Public, Window Shopping ohne Login */}
              <Route path="/business"   element={<CorporateGifting />} />
              <Route path="/business/uebersicht" element={<CorporateOverview />} />
              <Route path="/collection" element={<ShoeCollection />} />
              {/* Sprechende Produktadresse. /customize?id=… bleibt gültig und
                  schreibt sich auf diese Form um, damit geteilte Links und
                  Lesezeichen weiter funktionieren. */}
              <Route path="/schuhe/:slug" element={<Customize />} />
              <Route path="/vermittler" element={<ProtectedRoute><AffiliatePortal /></ProtectedRoute>} />
              <Route path="/customize"  element={<Customize />} />
              <Route path="/welcome"    element={<Welcome />} />
              <Route path="/explore"    element={<Explore />} />
              <Route path="/accessories" element={<Accessories />} />
              <Route path="/help"        element={<HelpSupport />} />
              <Route path="/legal/:type" element={<LegalDoc />} />
              <Route path="/learn"      element={<Navigate to="/explore" replace />} />

              {/* Geschützt, Bestellung & persönliche Daten */}
              <Route path="/profile"    element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/scan"       element={<ProtectedRoute><FootScan /></ProtectedRoute>} />
              <Route path="/mirror"     element={<ProtectedRoute><Mirror /></ProtectedRoute>} />
              <Route path="/health"     element={<ProtectedRoute><HealthInfo /></ProtectedRoute>} />
              <Route path="/settings"    element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/wishlist"    element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
              <Route path="/orders"      element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/checkout"    element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
              <Route path="/feedback"    element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
              <Route path="/my-scans"    element={<ProtectedRoute><MyScans /></ProtectedRoute>} />

              <Route path="*"            element={<NotFound />} />
            </Routes>
            </PageTransition>
          </Suspense>
        </div>
        {showNav && <BottomNav />}
      </div>
    )
  }

  const routes = (
    <Routes>
      <Route path="/"           element={isBusiness ? <CorporateGifting /> : <Navigate to="/collection" replace />} />
      <Route path="/login"      element={<Login />} />
      <Route path="/register"   element={<Registration />} />
      <Route path="/register-promotion" element={<RegisterPromotion />} />
      <Route path="/register-business"  element={<RegisterBusiness />} />
      {/* Firmenkonto-Bereich (business.artisansole.com) */}
      <Route path="/business/dashboard" element={<BusinessRoute><BusinessDashboard /></BusinessRoute>} />
      <Route path="/business/profile"   element={<BusinessRoute><BusinessProfile /></BusinessRoute>} />
      <Route path="/business/campaigns" element={<BusinessRoute><BusinessCampaigns /></BusinessRoute>} />
      <Route path="/business/campaigns/:id" element={<BusinessRoute><CampaignDashboard /></BusinessRoute>} />
      {/* Öffentliche Kampagnen-Beitrittsseite (Mitarbeitende) */}
      <Route path="/c/:slug"            element={<CampaignJoin />} />
      <Route path="/verify-email"       element={<VerifyEmail />} />
      {/* Public, Window Shopping ohne Login */}
      {/* Corporate Gifting lebt auf business.artisansole.com; auf der Hauptdomain
          leitet /business dorthin um (Subdomain = kanonisch). Auf der Subdomain
          selbst ist / die kanonische URL, /business leitet intern dorthin um. */}
      <Route path="/business"   element={isProdApex ? <ExternalRedirect to={BUSINESS_URL} /> : isBusiness ? <Navigate to="/" replace /> : <CorporateGifting />} />
      <Route path="/business/uebersicht" element={isProdApex ? <ExternalRedirect to={`${BUSINESS_URL}uebersicht`} /> : <CorporateOverview />} />
      <Route path="/collection" element={<ShoeCollection />} />
      <Route path="/schuhe/:slug" element={<Customize />} />
      <Route path="/vermittler" element={<ProtectedRoute><AffiliatePortal /></ProtectedRoute>} />
      <Route path="/customize"  element={<Customize />} />
      <Route path="/welcome"    element={<Welcome />} />
      <Route path="/explore"    element={<Explore />} />
      <Route path="/accessories" element={<Accessories />} />
      <Route path="/help"        element={<HelpSupport />} />
      <Route path="/legal/:type" element={<LegalDoc />} />
      <Route path="/learn"      element={<Navigate to="/explore" replace />} />

      {/* Geschützt, Bestellung & persönliche Daten */}
      <Route path="/profile"    element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/scan"       element={<ProtectedRoute><FootScan /></ProtectedRoute>} />
      <Route path="/mirror"     element={<ProtectedRoute><Mirror /></ProtectedRoute>} />
      <Route path="/health"     element={<ProtectedRoute><HealthInfo /></ProtectedRoute>} />
      <Route path="/settings"    element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/wishlist"    element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
      <Route path="/orders"      element={<ProtectedRoute><Orders /></ProtectedRoute>} />
      <Route path="/checkout"    element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
      <Route path="/feedback"    element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
      <Route path="/my-scans"    element={<ProtectedRoute><MyScans /></ProtectedRoute>} />
      <Route path="*"            element={<NotFound />} />
    </Routes>
  )

  // ── Mobile web: TopBar (burger menu), natural document scroll ──
  if (isMobileWeb) {
    return (
      <div style={{ minHeight: '100dvh', background: '#FFFFFF' }}>
        {showNav && <TopBar />}
        <Suspense fallback={<DelayedSpinner />}><PageTransition>{routes}</PageTransition></Suspense>
        {showFooter && <Footer />}
      </div>
    )
  }

  // ── Desktop web: fixed container, internal scroll, white bg ──
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: viewportHeight, display: 'flex', flexDirection: 'column', background: '#FFFFFF', overflow: 'hidden', boxSizing: 'border-box' }}>
      {showNav && <TopBar />}
      <div className="flex-1 overflow-y-auto relative">
        <div className="w-full">
          <Suspense fallback={<DelayedSpinner />}><PageTransition>{routes}</PageTransition></Suspense>
          {showFooter && <Footer />}
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
          <LogoSplash />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
