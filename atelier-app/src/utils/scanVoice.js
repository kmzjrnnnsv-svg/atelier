// ─────────────────────────────────────────────────────────────────────────────
// Voice guidance + haptic feedback for LiDAR foot scanning
//
// Uses Web Speech API (works in iOS WKWebView / Capacitor) for German TTS.
// Provides spoken step-by-step instructions so the user doesn't need to
// look at the screen while scanning.
// ─────────────────────────────────────────────────────────────────────────────

let speechEnabled = true
let lastSpoken = ''
let lastSpokenTime = 0

/** Minimum ms between repeated identical messages */
const DEBOUNCE_MS = 4000

/**
 * Speak a German text via Web Speech API.
 * Debounces repeated identical messages.
 * Interrupts any currently playing speech for urgent messages.
 */
export function speak(text, { urgent = false, force = false } = {}) {
  if (!speechEnabled || !window.speechSynthesis) return

  const now = Date.now()
  if (!force && text === lastSpoken && now - lastSpokenTime < DEBOUNCE_MS) return

  if (urgent) {
    window.speechSynthesis.cancel()
  }

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'de-DE'
  utterance.rate = 1.05
  utterance.pitch = 1.0
  utterance.volume = 1.0

  // Prefer a German voice if available
  const voices = window.speechSynthesis.getVoices()
  const deVoice = voices.find(v => v.lang.startsWith('de') && v.localService)
    || voices.find(v => v.lang.startsWith('de'))
  if (deVoice) utterance.voice = deVoice

  window.speechSynthesis.speak(utterance)
  lastSpoken = text
  lastSpokenTime = now
}

/** Cancel any active speech */
export function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  lastSpoken = ''
}

/** Enable/disable voice guidance */
export function setVoiceEnabled(enabled) {
  speechEnabled = enabled
  if (!enabled) stopSpeaking()
}

export function isVoiceEnabled() {
  return speechEnabled
}

// ─── Haptic feedback (native vibration API) ─────────────────────────────────

/** Light tap feedback (progress milestones) */
export function hapticLight() {
  try { navigator?.vibrate?.(10) } catch { /* not available */ }
}

/** Medium feedback (phase transitions) */
export function hapticMedium() {
  try { navigator?.vibrate?.(25) } catch { /* not available */ }
}

/** Strong feedback (errors, warnings) */
export function hapticStrong() {
  try { navigator?.vibrate?.([40, 80, 40]) } catch { /* not available */ }
}

/** Success pattern (scan complete) */
export function hapticSuccess() {
  try { navigator?.vibrate?.([15, 60, 15, 60, 30]) } catch { /* not available */ }
}

/** Selection tap (tab switches, toggles) */
export function hapticSelection() {
  try { navigator?.vibrate?.(8) } catch { /* not available */ }
}

/** Warning double-tap (quality issues, lost tracking) */
export function hapticWarning() {
  try { navigator?.vibrate?.([20, 40, 20]) } catch { /* not available */ }
}

// ─── Pre-built scan guidance messages ────────────────────────────────────────

export const SCAN_MESSAGES = {
  // Pre-scan
  ready: (side) => `Stelle deinen ${side === 'right' ? 'rechten' : 'linken'} Fuß auf den Boden. Halte das iPhone etwa 30 Zentimeter darüber.`,
  startScan: 'Der Scan beginnt. Bewege das iPhone langsam im Kreis um deinen Fuß.',

  // During scan — progressive guidance
  phase1: 'Gut. Halte das iPhone ruhig über dem Fuß.',
  phase2: 'Jetzt langsam zur Seite bewegen. Kamera auf den Fuß gerichtet halten.',
  phase3: 'Weiter um den Fuß herum. Auch die Ferse erfassen.',
  phase4: 'Fast fertig. Halte kurz die Position.',

  // Quality warnings (urgent)
  tooFewPoints: 'Zu wenige Punkte. Bewege das iPhone langsamer und näher am Fuß.',
  moveAround: 'Bitte auch die andere Seite scannen. Bewege das Gerät weiter um den Fuß.',
  tooFast: 'Etwas langsamer bitte. Die Kamera muss den Fuß scharf sehen.',

  // Environment quality warnings (Etappe 1)
  lowLight: 'Bitte für mehr Licht sorgen. Der Scan braucht gute Beleuchtung.',
  trackingLost: 'Bitte langsamer bewegen. Das Tracking hat den Überblick verloren.',
  insufficientFeatures: 'Bitte auf einem texturierten Untergrund scannen.',

  // Completion
  sideComplete: (side) => `${side === 'right' ? 'Rechter' : 'Linker'} Fuß erfasst.`,
  switchFoot: 'Jetzt den linken Fuß aufstellen. Der Scan startet automatisch.',
  processing: 'Beide Füße erfasst. Maße werden jetzt berechnet. Du kannst dein Handy weglegen.',
  processingHalf: 'Berechnung läuft noch. Gleich geschafft.',
  done: 'Fertig! Deine Fußmaße wurden gespeichert. Du kannst das Ergebnis jetzt auf dem Bildschirm sehen.',

  // Errors (reassuring tone — user shouldn't panic)
  error: 'Das hat leider nicht geklappt. Kein Problem — versuche es einfach nochmal.',
  lowQuality: 'Nicht genug erfasst. Bitte nochmal mit etwas mehr Licht versuchen.',
  autoRetry: 'Kleiner Fehler. Neuer Versuch startet gleich automatisch.',
}
