import rateLimit from 'express-rate-limit'

const isDev = process.env.NODE_ENV !== 'production'

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Login-Versuche, bitte in 15 Minuten erneut versuchen' },
})

// Jeder volle Seiten-Reload verliert das In-Memory-Access-Token und braucht
// genau einen Refresh. 20/15min trifft daher Nutzer, die schnell mehrfach
// neu laden, fälschlich → Sitzungsabbrüche. 100/15min lässt normales
// (auch hektisches) Neuladen zu, bremst aber Brute-Force weiterhin aus.
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 400 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Refresh-Anfragen' },
})

// 60/min war zu eng: initStore feuert ~15 parallele Calls je Seitenaufruf,
// dazu kommen prefetch + Re-Tries. Bei Multi-User-NAT vermehrt sich das.
// 600/min (10/s) gibt normalen Nutzern Luft, schützt aber weiterhin
// gegen aggressives Scraping.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 1000 : 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen, bitte warte kurz' },
})

export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 100 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limit erreicht, bitte in einer Stunde erneut versuchen' },
})
