import rateLimit from 'express-rate-limit'

const isDev = process.env.NODE_ENV !== 'production'

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Login-Versuche, bitte in 15 Minuten erneut versuchen' },
})

export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 20,
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
