import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { getDb } from './db/database.js'
import { seedDatabase } from './db/seed.js'
import { apiLimiter } from './middleware/rateLimiter.js'
import authRouter from './routes/auth.js'
import usersRouter from './routes/users.js'
import { shoesRouter, curatedRouter, wardrobeRouter, outfitsRouter, articlesRouter, materialsRouter, colorsRouter, solesRouter } from './routes/content.js'
import scansRouter      from './routes/scans.js'
import favoritesRouter  from './routes/favorites.js'
import ordersRouter     from './routes/orders.js'
import reviewsRouter    from './routes/reviews.js'
import faqsRouter       from './routes/faqs.js'
import legalRouter      from './routes/legal.js'
import settingsRouter   from './routes/settings.js'
import emailTemplatesRouter from './routes/emailTemplates.js'

const app = express()
const PORT = process.env.PORT || 3001

// Trust the Vite dev proxy so rate limiters see the real client IP
app.set('trust proxy', 1)

// Security headers
app.use(helmet())

// CORS — allow Vite dev server + Capacitor iOS WKWebView
const isDev = process.env.NODE_ENV !== 'production'
const allowedOrigins = [
  'http://localhost:5173',
  'https://localhost:5173',  // Vite with basicSsl()
  'http://127.0.0.1:5173',
  'https://127.0.0.1:5173',
  'capacitor://localhost',   // Capacitor iOS
  'ionic://localhost',       // Capacitor iOS (legacy)
  'https://localhost',       // Capacitor iOS (HTTPS mode)
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-MFA-Code'],
}))

app.use(cookieParser())
app.use(express.json({ limit: '4mb' })) // allow image uploads

// Global rate limit
app.use('/api', apiLimiter)

// Routes
app.use('/api/auth',     authRouter)
app.use('/api/users',    usersRouter)
app.use('/api/shoes',    shoesRouter)
app.use('/api/curated',  curatedRouter)
app.use('/api/wardrobe', wardrobeRouter)
app.use('/api/outfits',  outfitsRouter)
app.use('/api/scans',     scansRouter)
app.use('/api/articles',   articlesRouter)
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

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }))

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

// Init
const db = getDb()
await seedDatabase(db)

app.listen(PORT, () => {
  console.log(`🚀 ATELIER Backend running on http://localhost:${PORT}`)
  console.log(`   ENV: ${process.env.NODE_ENV}`)
})
