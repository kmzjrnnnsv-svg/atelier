import 'dotenv/config'

// ── Pflicht-Umgebung, bevor irgendetwas startet ──────────────────────────────
//
// Fehlt JWT_ACCESS_SECRET, läuft der Server anstandslos hoch: Katalog, Bilder,
// Rechtstexte — alles antwortet. Erst wer sich anmelden oder registrieren will,
// bekommt „Internal server error", und im Log steht „secretOrPrivateKey must
// have a value". Der Laden sieht von außen heil aus, während niemand ein Konto
// anlegen kann.
//
// Deshalb hier und nicht später: Ein Fehlstart mit klarer Ansage ist besser als
// ein halber Betrieb.
{
  const pflicht = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']
  const fehlend = pflicht.filter(k => !process.env[k])
  if (fehlend.length) {
    console.error('\n✗ Der Server startet nicht: es fehlen Umgebungsvariablen.\n')
    for (const k of fehlend) console.error(`    ${k}`)
    console.error('\n  Sie gehören in die .env neben package.json. Vorlage: .env.example')
    console.error('  Werte erzeugen mit:  openssl rand -hex 32\n')
    process.exit(1)
  }
  // Die Beispielwerte sind keine Geheimnisse — sie stehen im Repository.
  const beispielhaft = pflicht.filter(k => String(process.env[k]).startsWith('change_me'))
  if (beispielhaft.length && process.env.NODE_ENV === 'production') {
    console.error('\n✗ Der Server startet nicht: unveränderte Beispielwerte im Einsatz.\n')
    for (const k of beispielhaft) console.error(`    ${k}`)
    console.error('\n  Sie stehen so in .env.example und damit im Repository.')
    console.error('  Neue Werte:  openssl rand -hex 32\n')
    process.exit(1)
  }
}
import express from 'express'
import path from 'path'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import crypto from 'crypto'
import { execFile } from 'child_process'
import { getDb } from './db/database.js'
import { seedDatabase } from './db/seed.js'
import { apiLimiter } from './middleware/rateLimiter.js'
import authRouter, { issueTokens } from './routes/auth.js'
import usersRouter from './routes/users.js'
import kontoLoeschungRouter from './routes/kontoLoeschung.js'
import affiliatesRouter from './routes/affiliates.js'
import passkeysRouter, { makeLoginVerify, makeSignupVerify, makeRecoverVerify, makeAffiliateVerify } from './routes/passkeys.js'
import recoveryRouter from './routes/recovery.js'
import configsRouter from './routes/configs.js'
import { shoesRouter, shoeCardRouter, materialsRouter, colorsRouter, solesRouter, accessoriesRouter, collectionsRouter } from './routes/content.js'
import scansRouter      from './routes/scans.js'
import favoritesRouter  from './routes/favorites.js'
import ordersRouter     from './routes/orders.js'
import reviewsRouter    from './routes/reviews.js'
import faqsRouter       from './routes/faqs.js'
import legalRouter      from './routes/legal.js'
import settingsRouter   from './routes/settings.js'
import emailTemplatesRouter from './routes/emailTemplates.js'
import loyaltyRouter from './routes/loyalty.js'
import feedbackRouter from './routes/feedback.js'
import shippingRouter from './routes/shipping.js'
import couponsRouter from './routes/coupons.js'
import mediaRouter from './routes/media.js'
import customRequestsRouter from './routes/customRequests.js'
import optionsRouter from './routes/options.js'
import fitRouter from './routes/fit.js'
import lastChartRouter from './routes/lastChart.js'
import businessRouter from './routes/business.js'
import chatRouter from './routes/chat.js'

const app = express()
const PORT = process.env.PORT || 3001

// Trust the Vite dev proxy so rate limiters see the real client IP
app.set('trust proxy', 1)

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'https://artisansole.com', 'https://www.artisansole.com', 'https://business.artisansole.com', 'https://affiliate.artisansole.com'],
      frameSrc:   ["'none'"],
      objectSrc:  ["'none'"],
      baseUri:    ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
}))

// CORS — allow Vite dev server + Capacitor iOS WKWebView + production
const isDev = process.env.NODE_ENV !== 'production'
const allowedOrigins = [
  'http://localhost:5173',
  'https://localhost:5173',  // Vite with basicSsl()
  'http://127.0.0.1:5173',
  'https://127.0.0.1:5173',
  'capacitor://localhost',   // Capacitor iOS
  'ionic://localhost',       // Capacitor iOS (legacy)
  'https://localhost',       // Capacitor iOS (HTTPS mode)
  'https://raza.work',          // Production (legacy)
  'https://www.raza.work',      // Production (legacy www)
  'https://artisansole.com',    // Production
  'https://www.artisansole.com', // Production (www)
  'https://business.artisansole.com', // Production (B2B-Subdomain)
  // Der Affiliate-Bereich läuft auf einer eigenen Subdomain, spricht aber
  // dieselbe API. Sie fehlte hier — jeder Aufruf von dort wurde abgewiesen,
  // und im Browser sah es aus wie ein Serverausfall.
  'https://affiliate.artisansole.com', // Production (Affiliate-Subdomain)
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
]
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (native mobile, curl, Postman)
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    // In dev, allow any localhost/IP origin (iPhone Simulator, LAN access)
    if (isDev && (origin.includes('localhost') || /^https?:\/\/(\d+\.){3}\d+/.test(origin))) {
      return cb(null, true)
    }
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-MFA-Code', 'X-Requested-With'],
}))

app.use(cookieParser())
app.use(express.json({ limit: '25mb' })) // LiDAR point clouds (~2MB) + photogrammetry 16 images (~20MB)

// CSRF protection — require X-Requested-With header on state-changing requests
// Browsers block cross-origin custom headers via CORS preflight
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  if (!req.get('Origin') || req.get('X-Requested-With')) return next()
  res.status(403).json({ error: 'Missing CSRF header' })
})

// Static file serving for uploaded media.
// Defense-in-Depth zusätzlich zur Upload-Prüfung in routes/media.js: nosniff
// verhindert MIME-Sniffing, die CSP (sandbox ohne allow-scripts, script/object
// = none) unterbindet jede Skriptausführung — auch bei einer versehentlich
// abgelegten HTML/SVG-Datei.
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Security-Policy', "script-src 'none'; object-src 'none'; sandbox")
  },
}))

// Global rate limit
app.use('/api', apiLimiter)

// Routes
// Der Anmeldeschritt hängt unter /api/auth, damit die Ratenbegrenzung der
// Anmeldung greift; die Verwaltung der Schlüssel liegt getrennt darunter.
app.post('/api/auth/passkey/login/verify', makeLoginVerify(issueTokens))
// Registrierung ohne Passwort. Steht hier oben, weil sie wie die Anmeldung
// Sitzungstoken ausstellt und deshalb issueTokens braucht.
app.post('/api/auth/passkey/signup/verify', makeSignupVerify(issueTokens))
app.post('/api/auth/passkey/recover/verify', makeRecoverVerify(issueTokens))
// Affiliate nimmt seine Einladung an — ohne Passwort, per QR-Code eingescannt.
app.post('/api/auth/passkey/affiliate/verify', makeAffiliateVerify(issueTokens))
app.use('/api/auth/passkey', passkeysRouter)
// Zugang wiederherstellen (Ausweis über eine Bestellung). Eigener Pfad, damit
// die Ratenbegrenzung dort und nicht auf der Anmeldung sitzt.
app.use('/api/auth/recover', recoveryRouter)
app.use('/api/configs',  configsRouter)
app.use('/api/auth',     authRouter)
// Löschverfahren zuerst: Es lässt Kuratoren mitwirken, die übrigen
// Benutzerrouten nicht. Ohne zweite Person ließe sich das Vier-Augen-Prinzip
// bei nur einem Administrator nie zu Ende führen.
app.use('/api/users',    kontoLoeschungRouter)
app.use('/api/users',    usersRouter)
// shoeCardRouter zuerst: shoesRouter hat ein generisches GET /:id, das
// '/color-summary' sonst als id auffassen und mit 404 beantworten würde.
app.use('/api/affiliates', affiliatesRouter)
app.use('/api/shoes',    shoeCardRouter)
app.use('/api/shoes',    shoesRouter)
app.use('/api/scans',     scansRouter)
app.use('/api/collections', collectionsRouter)
app.use('/api/materials',  materialsRouter)
app.use('/api/colors',     colorsRouter)
app.use('/api/soles',      solesRouter)
app.use('/api/favorites', favoritesRouter)
app.use('/api/orders',    ordersRouter)
app.use('/api/reviews',   reviewsRouter)
app.use('/api/faqs',      faqsRouter)
app.use('/api/legal',     legalRouter)
app.use('/api/settings',  settingsRouter)
app.use('/api/email-templates', emailTemplatesRouter)
app.use('/api/loyalty', loyaltyRouter)
app.use('/api/feedback', feedbackRouter)
app.use('/api/accessories', accessoriesRouter)
app.use('/api/shipping', shippingRouter)
app.use('/api/coupons', couponsRouter)
app.use('/api/media', mediaRouter)
app.use('/api/custom-requests', customRequestsRouter)
// Konfigurator-Optionen — mountet sowohl /api/option-groups als auch
// /api/shoes/:id/options und /api/category-templates/:cat
app.use('/api', optionsRouter)
app.use('/api/fit', fitRouter)
app.use('/api/last-size-chart', lastChartRouter)
app.use('/api/business', businessRouter)
app.use('/api/chat',     chatRouter)

// GitHub Webhook — auto-deploy on push to website
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const secret = process.env.WEBHOOK_SECRET
  // Fail-closed: Ohne konfiguriertes Secret wird nichts ausgeführt. Der frühere
  // `if (secret)` übersprang bei fehlender Variable die Prüfung komplett und
  // öffnete den Deploy für jeden, der die Adresse kennt.
  if (!secret) {
    console.error('Webhook abgelehnt: WEBHOOK_SECRET ist nicht gesetzt.')
    return res.status(503).json({ error: 'Webhook not configured' })
  }
  const sig = req.headers['x-hub-signature-256']
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(req.body).digest('hex')
  // Konstante Laufzeit + vorheriger Längenvergleich: timingSafeEqual wirft bei
  // abweichender Buffer-Länge, ein `!==` verriete zudem über die Laufzeit,
  // wie viele Zeichen stimmen.
  const sigBuf = Buffer.from(sig || '', 'utf8')
  const expBuf = Buffer.from(expected, 'utf8')
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  let payload
  try {
    payload = JSON.parse(req.body)
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }
  if (payload.ref !== 'refs/heads/website') {
    return res.json({ status: 'ignored', ref: payload.ref })
  }

  console.log('Webhook: deploying website branch...')
  execFile('/home/nrply/app/deploy.sh', (err, stdout, stderr) => {
    if (err) console.error('Deploy failed:', stderr)
    else console.log('Deploy done:', stdout)
  })

  res.json({ status: 'deploying' })
})

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

// Serve frontend dist (production)
const distPath = path.resolve(process.cwd(), '../artisan-sole-app/dist')
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (/[\\/]assets[\\/]/.test(filePath)) {
      // Vite-Assets sind content-hash-benannt → unbegrenzt cachebar
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    } else if (/(index\.html|sw\.js|boot-check\.js)$/i.test(filePath)) {
      // Einstiegspunkt + Service-Worker immer revalidieren, damit zurück-
      // kehrende Besucher nach einem Deploy nie auf veraltete Chunk-Hashes zeigen.
      res.setHeader('Cache-Control', 'no-cache')
    }
  },
}))
app.get('/{*splat}', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next()
  // Fehlende Asset-Datei (mit Endung, z. B. ein altes JS-Chunk) → echtes 404.
  // Niemals index.html als Modul ausliefern — sonst „Failed to fetch
  // dynamically imported module" statt eines sauberen Chunk-Load-Fehlers.
  if (/\.[a-z0-9]+$/i.test(req.path)) return res.status(404).send('Not found')
  res.set('Cache-Control', 'no-cache')
  res.sendFile(path.join(distPath, 'index.html'))
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

// Init
const db = getDb()
await seedDatabase(db)

app.listen(PORT, () => {
  console.log(`🚀 Artisan Sole Backend running on http://localhost:${PORT}`)
  console.log(`   ENV: ${process.env.NODE_ENV}`)
})
