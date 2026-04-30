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

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 200 : 60,
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
