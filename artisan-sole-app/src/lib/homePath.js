/**
 * Startseite der jeweiligen Domain.
 *
 * Nach dem Abmelden landet man hier statt auf der Anmeldemaske: Wer sich
 * abmeldet, will die Seite meist weiter ansehen, nicht sofort wieder ein
 * Formular sehen.
 *
 * Bewusst als eigene Datei und nicht als weiterer Export in App.jsx — dort
 * stehen bereits die Komponenten, und jeder zusätzliche Nicht-Komponenten-
 * Export kostet dem Entwicklungsserver das schnelle Nachladen.
 */
import { Capacitor } from '@capacitor/core'

const HOSTNAME = typeof window !== 'undefined' ? window.location.hostname : ''
const isBusinessHost = !Capacitor.isNativePlatform() && /^business\./i.test(HOSTNAME)

// Auf der Business-Subdomain ist / die Startseite, sonst die Kollektion.
export const HOME_PATH = isBusinessHost ? '/' : '/collection'
