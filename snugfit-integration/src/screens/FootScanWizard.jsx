/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FootScanWizard.jsx  –  Geführter Fußscan-Assistent
 * ─────────────────────────────────────────────────────────────────────────────
 * Haupt-Bildschirm für den schrittweisen Fußscan-Prozess.
 *
 * Phasen (entsprechen dem useFootScan-Hook):
 *   1. idle (kein Scan)    → Intro-Prompt für linken Fuß
 *   2. scanning:LEFT       → AR-Kamera + Positionierungs-Feedback + Auslöser
 *   3. processing:LEFT     → Mesh-Verarbeitung mit Stages + Fortschrittsbalken
 *   4. idle (links fertig) → Transition-Screen → rechten Fuß starten
 *   5. scanning:RIGHT      → AR-Kamera + Positionierungs-Feedback + Auslöser
 *   6. processing:RIGHT    → Mesh-Verarbeitung
 *   7. uploading           → Upload beider STL-Modelle in den Account
 *   8. complete            → Erfolg mit STL-Info + Maßen + Nächste Schritte
 *   9. error               → Fehlermeldung + Retry / Abbrechen
 *
 * Voraussetzungen:
 *   - OnboardingScreen wurde bereits gezeigt (Navigation via FootScanWizard)
 *   - Kamera-Berechtigung wurde erteilt
 *   - useFootScan-Hook kapselt die komplette SDK-Logik
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ScrollView, SafeAreaView, StatusBar,
  Dimensions, Platform,
} from 'react-native'
import { useFootScan } from '../hooks/useFootScan'
import { SCAN_ANGLES, FOOT_SIDES } from '../constants/scanConfig'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

// ─────────────────────────────────────────────────────────────────────────────
// ── Wiederverwendbare Sub-Komponenten ─────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obere Kopfleiste mit Schließen-Button, Schritt-Indikatoren und Titel.
 */
function WizardHeader({ title, subtitle, step, totalSteps, onClose }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={onClose}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        {step !== undefined && totalSteps && (
          <View style={styles.stepPills}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.stepPill,
                  i < step  && styles.stepPillDone,
                  i === step && styles.stepPillCurrent,
                ]}
              />
            ))}
          </View>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>

      {/* Spacer: gleiche Breite wie der Close-Button, damit der Titel zentriert ist */}
      <View style={{ width: 40 }} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Echtzeit-Positionierungs-Feedback-Leiste.
 * Pulsiert grün wenn der Fuß korrekt positioniert ist.
 */
function PositionFeedbackBar({ feedback, positionStatus }) {
  const pulseAnim = useRef(new Animated.Value(0.96)).current

  useEffect(() => {
    if (positionStatus === 'READY' || positionStatus === 'SCANNING') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.02, duration: 550, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.96, duration: 550, useNativeDriver: true }),
        ])
      )
      pulse.start()
      return () => pulse.stop()
    } else {
      pulseAnim.setValue(1)
    }
  }, [positionStatus])

  if (!feedback) return null

  return (
    <Animated.View
      style={[
        styles.feedbackBar,
        { borderColor: feedback.color + '55', transform: [{ scale: pulseAnim }] },
      ]}
    >
      <View style={[styles.feedbackDot, { backgroundColor: feedback.color }]} />
      <View style={styles.feedbackText}>
        <Text style={[styles.feedbackMessage, { color: feedback.color }]}>
          {feedback.icon}{'  '}{feedback.message}
        </Text>
        {feedback.subtext ? (
          <Text style={styles.feedbackSubtext}>{feedback.subtext}</Text>
        ) : null}
      </View>
    </Animated.View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zeigt alle Scan-Winkel als Chips an.
 * Abgeschlossene Winkel: grün. Aktueller: blau. Optional: gedimmt.
 */
function AngleProgress({ completedAngles, currentAngle }) {
  return (
    <View style={styles.angleProgress}>
      {SCAN_ANGLES.map((angle) => {
        const isDone    = completedAngles.includes(angle.id)
        const isCurrent = currentAngle === angle.id && !isDone
        return (
          <View
            key={angle.id}
            style={[
              styles.angleChip,
              isDone     && styles.angleChipDone,
              isCurrent  && styles.angleChipCurrent,
              !angle.requiredForSTL && styles.angleChipOptional,
            ]}
          >
            <Text style={styles.angleChipIcon}>{angle.icon}</Text>
            <Text style={[styles.angleChipLabel, isDone && styles.angleChipLabelDone]}>
              {angle.label}
            </Text>
            {isDone && <Text style={styles.angleChipCheck}>✓</Text>}
            {!angle.requiredForSTL && !isDone && (
              <Text style={styles.angleChipOptTag}>opt.</Text>
            )}
          </View>
        )
      })}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runder Auslöse-Button.
 * Grün + aktiv wenn der Fuß korrekt positioniert ist.
 */
function CaptureButton({ onPress, disabled, isReady }) {
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.90, duration: 70,  useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.00, duration: 130, useNativeDriver: true }),
    ]).start()
    onPress?.()
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.captureBtn,
          isReady   && styles.captureBtnReady,
          disabled  && styles.captureBtnDisabled,
        ]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.85}
      >
        <View style={[styles.captureBtnInner, isReady && styles.captureBtnInnerReady]} />
      </TouchableOpacity>
    </Animated.View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fortschrittsbalken mit benannten Verarbeitungs-Stages.
 * Stage-Punkte färben sich grün wenn ihr Schwellenwert erreicht ist.
 */
function StageProgressBar({ progress, stages, accentColor = '#3b82f6' }) {
  const widthAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue:  progress / 100,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }, [progress])

  return (
    <View style={styles.stageProgressContainer}>
      <View style={styles.stageProgressTrack}>
        <Animated.View
          style={[
            styles.stageProgressFill,
            {
              backgroundColor: accentColor,
              width: widthAnim.interpolate({
                inputRange:  [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      {stages && (
        <View style={styles.stagesRow}>
          {stages.map(({ label, minProgress }) => {
            const active = progress >= minProgress
            return (
              <View key={label} style={styles.stageItem}>
                <View style={[styles.stageDot, active && { backgroundColor: accentColor }]} />
                <Text style={[styles.stageLabel, active && { color: accentColor }]}>
                  {label}
                </Text>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * STL-Ergebnis-Karte für den Complete-Screen.
 * Zeigt Genauigkeit, Fußmaße, Dateigröße und Mesh-Qualität.
 */
function STLResultCard({ side, result }) {
  const foot = FOOT_SIDES[side]

  return (
    <View style={styles.stlCard}>
      {/* Header: Fuß-Label + Genauigkeit */}
      <View style={styles.stlCardHeader}>
        <Text style={styles.stlCardEmoji}>{foot.emoji}</Text>
        <View style={styles.stlCardTitleGroup}>
          <Text style={styles.stlCardTitle}>{foot.label}</Text>
          <View style={styles.stlCardBadge}>
            <Text style={styles.stlCardBadgeText}>STL ✓</Text>
          </View>
        </View>
        <View style={styles.stlCardAccuracyBox}>
          <Text style={styles.stlCardAccuracy}>{result.accuracy?.toFixed(1)}%</Text>
          <Text style={styles.stlCardAccuracyLabel}>Genauigkeit</Text>
        </View>
      </View>

      {/* Fußmaße */}
      <View style={styles.stlCardMetrics}>
        {[
          { value: result.measurements?.length?.toFixed(0),       label: 'Länge mm' },
          { value: result.measurements?.width?.toFixed(0),        label: 'Breite mm' },
          { value: result.measurements?.instepHeight?.toFixed(0), label: 'Rist mm' },
          { value: result.measurements?.archHeight?.toFixed(0),   label: 'Gewölbe mm' },
        ].map(({ value, label }) => (
          <View key={label} style={styles.stlMetric}>
            <Text style={styles.stlMetricValue}>{value ?? '–'}</Text>
            <Text style={styles.stlMetricLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Mesh-Qualitäts-Info */}
      <View style={styles.stlCardFooter}>
        <Text style={styles.stlCardFooterText}>
          {result.isWatertight ? '✓ Wasserdicht' : '○ Nicht wasserdicht'}
          {'  ·  '}
          {result.triangleCount?.toLocaleString('de')} Dreiecke
          {'  ·  '}
          {result.fileSize ? (result.fileSize / 1024).toFixed(0) + ' KB' : '–'}
          {result.lidarData && (
            <>{'  ·  '}<Text style={{ color: '#10b981' }}>LiDAR ✓</Text></>
          )}
        </Text>
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Animations-Komponenten ────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/** Drei pulsierende Lade-Punkte */
function LoadingDots() {
  return (
    <View style={styles.initDots}>
      {[0, 1, 2].map((i) => <PulseDot key={i} delay={i * 220} />)}
    </View>
  )
}

function PulseDot({ delay }) {
  const opacityAnim = useRef(new Animated.Value(0.2)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacityAnim, { toValue: 1,   duration: 380, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0.2, duration: 380, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [])

  return <Animated.View style={[styles.initDot, { opacity: opacityAnim }]} />
}

// ─────────────────────────────────────────────────────────────────────────────

/** Rotierende Ringe für die Processing-Animation */
function ProcessingAnimation({ accentColor = '#3b82f6' }) {
  const r1 = useRef(new Animated.Value(0)).current
  const r2 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const a1 = Animated.loop(Animated.timing(r1, { toValue: 1, duration: 1800, useNativeDriver: true }))
    const a2 = Animated.loop(Animated.timing(r2, { toValue: 1, duration: 2800, useNativeDriver: true }))
    a1.start(); a2.start()
    return () => { a1.stop(); a2.stop() }
  }, [])

  const spin1 = r1.interpolate({ inputRange: [0, 1], outputRange: ['0deg',   '360deg'] })
  const spin2 = r2.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg']   })

  return (
    <View style={styles.processingAnimation}>
      <Animated.View
        style={[
          styles.processingRingOuter,
          { borderColor: accentColor + '30', transform: [{ rotate: spin1 }] },
        ]}
      />
      <Animated.View
        style={[
          styles.processingRingInner,
          { borderColor: accentColor, transform: [{ rotate: spin2 }] },
        ]}
      />
      <Text style={styles.processingFootEmoji}>🦶</Text>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Haupt-Komponente ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export default function FootScanWizard({ navigation, route }) {
  const {
    isDemoUser = false,
    userId,
    onScanComplete,
  } = route?.params ?? {}

  const scan = useFootScan({
    userId,
    onComplete: (result) => {
      onScanComplete?.(result)
    },
  })

  // SDK beim ersten Rendern initialisieren
  useEffect(() => {
    scan.initialize()
  }, [])

  const handleClose = () => {
    navigation?.goBack?.()
  }

  // ── Abgeleitete UI-Werte ───────────────────────────────────────────────────

  // Alle Pflicht-Winkel aufgenommen?
  const allRequiredDone = SCAN_ANGLES
    .filter(a => a.requiredForSTL)
    .every(a => scan.completedAngles?.includes(a.id))

  // Aktueller Winkel-Config
  const currentAngleConfig = SCAN_ANGLES.find(a => a.id === scan.currentAngle)

  // Akzentfarbe je nach Fuß
  const accentColor = scan.currentFoot === 'RIGHT' ? '#8b5cf6' : '#3b82f6'

  // ── Phase: Initialisierung ─────────────────────────────────────────────────

  if (scan.phase === 'initializing') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centerContent}>
          <Text style={styles.initEmoji}>🔧</Text>
          <Text style={styles.initTitle}>Scan-System wird vorbereitet</Text>
          <Text style={styles.initSubtitle}>SnugFit SDK wird initialisiert…</Text>
          <LoadingDots />
          {isDemoUser && (
            <View style={[styles.demoBanner, { marginTop: 28 }]}>
              <Text style={styles.demoBannerText}>🚀 Demo-Modus aktiv</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    )
  }

  // ── Phase: Fehler ──────────────────────────────────────────────────────────

  if (scan.hasError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#130808' }]}>
        <StatusBar barStyle="light-content" />
        <WizardHeader title="Fehler aufgetreten" onClose={handleClose} />
        <View style={styles.centerContent}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Scan fehlgeschlagen</Text>
          <Text style={styles.errorMessage}>{scan.error}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: '#ef4444' }]}
              onPress={() => { scan.clearError(); scan.initialize() }}
            >
              <Text style={styles.primaryBtnText}>Erneut versuchen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={handleClose}>
              <Text style={styles.ghostBtnText}>Abbrechen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // ── Phase: Intro — Linken Fuß starten ─────────────────────────────────────

  if (scan.phase === 'idle' && !scan.hasLeftScan) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#0f172a' }]}>
        <StatusBar barStyle="light-content" />
        <WizardHeader
          title="Schritt 1 von 2"
          subtitle="Linker Fuß"
          step={0}
          totalSteps={2}
          onClose={handleClose}
        />

        <View style={styles.introContent}>
          {/* Fuß-Illustration */}
          <View style={[styles.introIllustration, { borderColor: '#3b82f640', backgroundColor: '#3b82f610' }]}>
            <Text style={styles.introEmoji}>🦶</Text>
            <View style={styles.introLabel}>
              <Text style={styles.introLabelText}>← Links</Text>
            </View>
          </View>

          <Text style={styles.introTitle}>Linken Fuß scannen</Text>
          <Text style={styles.introDescription}>
            Stelle deinen linken Fuß barfuß auf eine helle, ebene Fläche.
            Du wirst durch{' '}
            <Text style={{ color: '#3b82f6', fontWeight: '700' }}>
              {SCAN_ANGLES.filter(a => a.requiredForSTL).length} Aufnahme-Positionen
            </Text>
            {' '}geführt.
          </Text>

          {isDemoUser && (
            <View style={styles.demoBanner}>
              <Text style={styles.demoBannerText}>🚀 Demo-Modus — Scan wird simuliert</Text>
            </View>
          )}

          {/* Checkliste */}
          <View style={styles.checkList}>
            {[
              'Socken ausgezogen',
              'Helle, ebene Oberfläche',
              'Gute Beleuchtung',
              'Kamera-Berechtigung erteilt',
            ].map(item => (
              <View key={item} style={styles.checkItem}>
                <Text style={styles.checkIcon}>✓</Text>
                <Text style={styles.checkText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#3b82f6' }]}
            onPress={() => scan.startFootScan('LEFT')}
          >
            <Text style={styles.primaryBtnText}>Linken Fuß scannen  →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ── Phase: Transition — Linker Fuß fertig, Rechten starten ────────────────

  if (scan.phase === 'idle' && scan.hasLeftScan && !scan.hasRightScan) {
    const leftResult = scan.results?.LEFT
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#071a10' }]}>
        <StatusBar barStyle="light-content" />
        <WizardHeader
          title="Schritt 2 von 2"
          subtitle="Rechter Fuß"
          step={1}
          totalSteps={2}
          onClose={handleClose}
        />

        <View style={styles.transitionContent}>
          {/* Erfolgs-Icon */}
          <View style={styles.transitionCheckCircle}>
            <Text style={styles.transitionCheckEmoji}>✅</Text>
          </View>

          <Text style={styles.transitionTitle}>Linker Fuß abgeschlossen!</Text>
          {leftResult?.accuracy != null && (
            <View style={styles.accuracyPill}>
              <Text style={styles.accuracyPillText}>
                Genauigkeit: {leftResult.accuracy.toFixed(1)}%
              </Text>
            </View>
          )}

          <View style={styles.transitionDivider} />

          <Text style={styles.transitionNextLabel}>Weiter: Rechter Fuß</Text>
          <Text style={styles.transitionNextDesc}>
            Stelle nun deinen rechten Fuß an die gleiche Stelle.{'\n'}
            Der Scan-Ablauf ist identisch.
          </Text>

          {/* Fuß-Toggle-Visualisierung */}
          <View style={styles.footToggle}>
            <View style={[styles.footToggleItem, styles.footToggleItemDone]}>
              <Text style={styles.footToggleEmoji}>🦶</Text>
              <Text style={styles.footToggleLabel}>Links ✓</Text>
            </View>
            <Text style={styles.footToggleArrow}>→</Text>
            <View style={[styles.footToggleItem, styles.footToggleItemNext]}>
              <Text style={styles.footToggleEmoji}>🦶</Text>
              <Text style={styles.footToggleLabel}>Rechts</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#8b5cf6' }]}
            onPress={() => scan.startFootScan('RIGHT')}
          >
            <Text style={styles.primaryBtnText}>Rechten Fuß scannen  →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ── Phase: Scanning ────────────────────────────────────────────────────────

  if (scan.phase === 'scanning') {
    const foot = FOOT_SIDES[scan.currentFoot ?? 'LEFT']

    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <StatusBar barStyle="light-content" />

        {/*
         * AR-Kamera-View (PSEUDOCODE)
         * ─────────────────────────────────────────────────────────────────────
         * cameraViewRef wird von useFootScan bereitgestellt.
         * Der SnugFitBridge (iOS/Android) bettet seine ARViewController-View
         * in diesen Container ein, sobald startARPreview aufgerufen wird.
         * Im Demo-Modus und im Web bleibt der Placeholder sichtbar.
         * ─────────────────────────────────────────────────────────────────────
         */}
        <View ref={scan.cameraViewRef} style={styles.cameraView}>
          {/* Placeholder-Kamerabild — wird im echten App durch AR-View überlagert */}
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.cameraPlaceholderIcon}>📷</Text>
            <Text style={styles.cameraPlaceholderText}>AR-Kamera-Feed</Text>
            <Text style={styles.cameraPlaceholderNote}>
              PSEUDOCODE: Nativer AR-View wird hier eingebettet
            </Text>
          </View>

          {/* Targeting-Rahmen — Ecken zeigen den Scan-Bereich an */}
          <View style={styles.targetFrame}>
            {(['TL','TR','BL','BR']).map(pos => (
              <View
                key={pos}
                style={[
                  styles.targetCorner,
                  pos === 'TL' && styles.cornerTL,
                  pos === 'TR' && styles.cornerTR,
                  pos === 'BL' && styles.cornerBL,
                  pos === 'BR' && styles.cornerBR,
                  { borderColor: accentColor },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Oberer Overlay (Header + Anweisungs-Banner) */}
        <SafeAreaView style={styles.overlayTop} pointerEvents="box-none">
          <WizardHeader
            title={`${foot.label} scannen`}
            subtitle={currentAngleConfig?.label ?? ''}
            onClose={handleClose}
          />
          {currentAngleConfig && (
            <View style={[
              styles.instructionBanner,
              { backgroundColor: accentColor + '22', borderColor: accentColor + '55' },
            ]}>
              <Text style={styles.instructionIcon}>{currentAngleConfig.icon}</Text>
              <Text style={[styles.instructionText, { color: accentColor }]}>
                {currentAngleConfig.instruction}
              </Text>
            </View>
          )}
        </SafeAreaView>

        {/* Unterer Overlay (Feedback + Winkel-Chips + Auslöser) */}
        <SafeAreaView style={styles.overlayBottom} pointerEvents="box-none">
          <PositionFeedbackBar
            feedback={scan.positionFeedback}
            positionStatus={scan.positionStatus}
          />

          <AngleProgress
            completedAngles={scan.completedAngles ?? []}
            currentAngle={scan.currentAngle}
          />

          {/* Auslöser-Zeile */}
          <View style={styles.captureRow}>
            {/* Links: Aufnahmen-Zähler oder "Weiter"-Hinweis */}
            <View style={styles.captureInfoArea}>
              {allRequiredDone ? (
                <Text style={styles.captureInfoHint}>Alle{'\n'}Pflicht-{'\n'}Aufnahmen ✓</Text>
              ) : (
                <>
                  <Text style={styles.captureInfoCount}>
                    {scan.completedAngles?.filter(id =>
                      SCAN_ANGLES.find(a => a.id === id)?.requiredForSTL
                    ).length ?? 0}
                    /{SCAN_ANGLES.filter(a => a.requiredForSTL).length}
                  </Text>
                  <Text style={styles.captureInfoLabel}>Pflicht{'\n'}Aufnahmen</Text>
                </>
              )}
            </View>

            {/* Mitte: Auslöse-Button */}
            <CaptureButton
              onPress={() => scan.captureCurrentAngle(scan.currentAngle)}
              isReady={scan.isPositionReady}
              disabled={
                !scan.currentAngle ||
                scan.positionStatus === 'SCANNING' ||
                allRequiredDone
              }
            />

            {/* Rechts: Fuß-Label */}
            <View style={styles.captureInfoArea}>
              <Text style={[styles.captureFoot, { color: accentColor }]}>
                {foot.shortLabel}
              </Text>
              {isDemoUser && (
                <View style={styles.demoMicroBadge}>
                  <Text style={styles.demoMicroBadgeText}>DEMO</Text>
                </View>
              )}
            </View>
          </View>

          {/* "Scan verarbeiten"-Button erscheint wenn alle Pflicht-Winkel fertig sind */}
          {allRequiredDone && (
            <TouchableOpacity
              style={[styles.primaryBtn, styles.processBtn, { backgroundColor: accentColor }]}
              onPress={() => scan.processAndGenerateSTL(scan.currentFoot)}
            >
              <Text style={styles.primaryBtnText}>3D-Modell erstellen  →</Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </View>
    )
  }

  // ── Phase: Processing (Mesh-Verarbeitung) ──────────────────────────────────

  if (scan.phase === 'processing') {
    const isRight   = !!scan.results?.RIGHT
    const footLabel = isRight ? 'Rechter Fuß' : 'Linker Fuß'
    const procColor = isRight ? '#8b5cf6' : '#3b82f6'

    const STAGES = scan.hasLidar
      ? [
          { label: 'Punktwolke',   minProgress: 0  },
          { label: 'LiDAR-Scan',   minProgress: 15 },
          { label: 'Mesh',         minProgress: 30 },
          { label: '3D-Modell',    minProgress: 55 },
          { label: 'Fusion',       minProgress: 75 },
          { label: 'STL',          minProgress: 85 },
          { label: 'Validierung',  minProgress: 95 },
        ]
      : [
          { label: 'Punktwolke',   minProgress: 0  },
          { label: 'Mesh',         minProgress: 22 },
          { label: '3D-Modell',    minProgress: 50 },
          { label: 'STL',          minProgress: 80 },
          { label: 'Validierung',  minProgress: 95 },
        ]

    const lidarHint = scan.hasLidar
      ? scan.isLidarCapturing
        ? 'LiDAR-Sensor aktiv — Tiefendaten werden erfasst…'
        : scan.lidarStatus === 'done'
          ? 'LiDAR + Foto-Fusion aktiv — Genauigkeit bis ±0.5 mm'
          : 'Die KI rekonstruiert dein Fußmodell aus den Kamera-Daten.'
      : 'Die KI rekonstruiert dein Fußmodell aus den Kamera-Daten.'

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#08081a' }]}>
        <StatusBar barStyle="light-content" />
        <WizardHeader title="Wird verarbeitet…" onClose={handleClose} />

        <View style={styles.processingContent}>
          <ProcessingAnimation accentColor={procColor} />

          <Text style={styles.processingTitle}>3D-Fußmodell wird erstellt</Text>
          <Text style={styles.processingSubtitle}>{footLabel}</Text>

          {scan.hasLidar && (
            <View style={styles.lidarBadge}>
              <Text style={styles.lidarBadgeText}>
                {scan.isLidarCapturing ? 'LiDAR' : scan.lidarStatus === 'done' ? 'LiDAR + Foto' : 'LiDAR'}
              </Text>
            </View>
          )}

          <StageProgressBar
            progress={scan.processProgress}
            stages={STAGES}
            accentColor={procColor}
          />

          <Text style={[styles.processingPercentage, { color: procColor }]}>
            {scan.processProgress}%
          </Text>

          <Text style={styles.processingHint}>
            Bitte nicht schließen.{'\n'}
            {lidarHint}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // ── Phase: Uploading ───────────────────────────────────────────────────────

  if (scan.phase === 'uploading') {
    const UPLOAD_STAGES = [
      { label: 'Linker Fuß',  minProgress: 0  },
      { label: 'Rechter Fuß', minProgress: 50 },
      { label: 'Gespeichert', minProgress: 98 },
    ]

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#070f07' }]}>
        <StatusBar barStyle="light-content" />
        <WizardHeader title="Wird hochgeladen…" onClose={handleClose} />

        <View style={styles.processingContent}>
          <Text style={styles.uploadEmoji}>☁️</Text>

          <Text style={styles.processingTitle}>Modelle werden gespeichert</Text>
          <Text style={styles.processingSubtitle}>
            Sicher verschlüsselt in deinem Account
          </Text>

          <StageProgressBar
            progress={scan.uploadProgress}
            stages={UPLOAD_STAGES}
            accentColor="#10b981"
          />

          <Text style={[styles.processingPercentage, { color: '#10b981' }]}>
            {scan.uploadProgress}%
          </Text>

          <Text style={styles.processingHint}>
            Deine 3D-Fußmodelle werden Ende-zu-Ende verschlüsselt übertragen.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // ── Phase: Complete ────────────────────────────────────────────────────────

  if (scan.phase === 'complete') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#071a10' }]}>
        <StatusBar barStyle="light-content" />
        <WizardHeader title="Scan abgeschlossen" onClose={handleClose} />

        <ScrollView
          style={styles.completeScroll}
          contentContainerStyle={styles.completeContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Erfolgs-Header */}
          <View style={styles.completeHeader}>
            <View style={styles.completeCheckCircle}>
              <Text style={styles.completeCheckMark}>✓</Text>
            </View>
            <Text style={styles.completeTitle}>Beide Füße gescannt!</Text>
            <Text style={styles.completeSubtitle}>
              Deine 3D-Fußmodelle sind verschlüsselt in deinem Account gespeichert
              und bereit für die Schuh-Konfiguration.
            </Text>
          </View>

          {/* STL-Ergebnis-Karten */}
          {scan.results?.LEFT && (
            <STLResultCard side="LEFT" result={scan.results.LEFT} />
          )}
          {scan.results?.RIGHT && (
            <STLResultCard side="RIGHT" result={scan.results.RIGHT} />
          )}

          {/* Nächste Schritte */}
          <View style={styles.nextStepsBox}>
            <Text style={styles.nextStepsTitle}>Was passiert als Nächstes?</Text>
            {[
              { icon: '👟', text: 'Schuhkollektion durchstöbern und Modell wählen' },
              { icon: '✏️', text: 'Material, Farbe und Details konfigurieren' },
              { icon: '📦', text: 'Maßgefertigten Schuh verbindlich bestellen' },
              { icon: '🏭', text: 'Deine STL-Dateien gehen direkt ans Produktionssystem' },
            ].map(({ icon, text }) => (
              <View key={text} style={styles.nextStep}>
                <Text style={styles.nextStepIcon}>{icon}</Text>
                <Text style={styles.nextStepText}>{text}</Text>
              </View>
            ))}
          </View>

          {/* Demo-Hinweis */}
          {isDemoUser && (
            <View style={styles.demoNote}>
              <Text style={styles.demoNoteText}>
                🚀 Dies war ein Demo-Scan mit simulierten Daten.{'\n'}
                Im echten Einsatz erzeugt das SnugFit SDK präzise STL-Dateien
                aus echten Kamera- und ToF-Sensor-Daten.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer-Actions */}
        <View style={styles.completeFooter}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#10b981' }]}
            onPress={handleClose}
          >
            <Text style={styles.primaryBtnText}>Zur Schuh-Kollektion  →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={scan.reset}>
            <Text style={styles.ghostBtnText}>Erneut scannen</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // Fallback — sollte bei korrekter Integration nie erscheinen
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// StyleSheet
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  container: {
    flex:            1,
    backgroundColor: '#0f172a',
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 16,
    paddingVertical:   10,
  },
  closeBtn: {
    width: 40, height: 40,
    borderRadius:    20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  closeBtnText: {
    color: '#fff', fontSize: 14, fontWeight: '600',
  },
  headerCenter: {
    flex: 1, alignItems: 'center',
  },
  headerTitle: {
    color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2,
  },
  stepPills: {
    flexDirection: 'row', gap: 4, marginBottom: 5,
  },
  stepPill: {
    width: 20, height: 3, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  stepPillDone: {
    backgroundColor: '#10b981',
  },
  stepPillCurrent: {
    width: 28, backgroundColor: '#3b82f6',
  },

  // ── Center-Content (Initialisierung / Fehler) ────────────────────────────────
  centerContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },

  // ── Initialisierung ──────────────────────────────────────────────────────────
  initEmoji:    { fontSize: 52, marginBottom: 20 },
  initTitle:    { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  initSubtitle: { color: 'rgba(255,255,255,0.45)', fontSize: 14 },
  initDots:     { flexDirection: 'row', gap: 8, marginTop: 24 },
  initDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#3b82f6',
  },

  // ── Fehler ───────────────────────────────────────────────────────────────────
  errorEmoji:   { fontSize: 56, marginBottom: 20 },
  errorTitle:   { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  errorMessage: {
    color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center',
    lineHeight: 22, marginBottom: 28,
  },
  errorActions: { alignSelf: 'stretch', gap: 8 },

  // ── Buttons ──────────────────────────────────────────────────────────────────
  primaryBtn: {
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3,
  },
  ghostBtn:     { paddingVertical: 12, alignItems: 'center' },
  ghostBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },

  // ── Intro-Screen ─────────────────────────────────────────────────────────────
  introContent: {
    flex: 1, alignItems: 'center', padding: 28,
  },
  introIllustration: {
    width: 130, height: 130, borderRadius: 65,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  introEmoji: { fontSize: 56 },
  introLabel: {
    position: 'absolute', bottom: 10, right: 4,
    backgroundColor: '#1e3a5f', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  introLabelText: { color: '#3b82f6', fontSize: 10, fontWeight: '700' },
  introTitle:   { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  introDescription: {
    color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center',
    lineHeight: 22, marginBottom: 20,
  },
  demoBanner: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: 8, borderWidth: 1, borderColor: '#10b981',
    paddingHorizontal: 14, paddingVertical: 6, marginBottom: 20,
  },
  demoBannerText: { color: '#10b981', fontSize: 12, fontWeight: '600' },
  checkList: { alignSelf: 'stretch', gap: 10 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkIcon: { color: '#10b981', fontSize: 13, fontWeight: '700', width: 16 },
  checkText: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },

  bottomActions: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'android' ? 24 : 8,
    gap: 6,
  },

  // ── Transition-Screen ────────────────────────────────────────────────────────
  transitionContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28,
  },
  transitionCheckCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(16,185,129,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  transitionCheckEmoji: { fontSize: 44 },
  transitionTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 10 },
  accuracyPill: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 20, borderWidth: 1, borderColor: '#10b981',
    paddingHorizontal: 14, paddingVertical: 5, marginBottom: 22,
  },
  accuracyPillText: { color: '#10b981', fontSize: 13, fontWeight: '600' },
  transitionDivider: {
    width: '55%', height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 22,
  },
  transitionNextLabel: {
    color: 'rgba(255,255,255,0.4)', fontSize: 10,
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8,
  },
  transitionNextDesc: {
    color: 'rgba(255,255,255,0.65)', fontSize: 14,
    textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },
  footToggle: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  footToggleItem: {
    alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
  },
  footToggleItemDone: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1, borderColor: '#10b981',
  },
  footToggleItemNext: {
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1, borderColor: '#8b5cf6',
  },
  footToggleEmoji: { fontSize: 26 },
  footToggleLabel: { color: '#fff', fontSize: 11, fontWeight: '600' },
  footToggleArrow: { color: 'rgba(255,255,255,0.3)', fontSize: 22 },

  // ── Scan-Screen ──────────────────────────────────────────────────────────────
  cameraView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  cameraPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#111',
  },
  cameraPlaceholderIcon: { fontSize: 64, marginBottom: 12 },
  cameraPlaceholderText: { color: 'rgba(255,255,255,0.4)', fontSize: 15, marginBottom: 6 },
  cameraPlaceholderNote: {
    color: 'rgba(255,255,255,0.2)', fontSize: 10, textAlign: 'center',
    paddingHorizontal: 32,
  },

  // Targeting-Rahmen
  targetFrame: {
    position: 'absolute',
    top:    SCREEN_H * 0.20,
    left:   SCREEN_W * 0.08,
    width:  SCREEN_W * 0.84,
    height: SCREEN_H * 0.42,
  },
  targetCorner: {
    position: 'absolute', width: 28, height: 28, borderWidth: 3,
  },
  cornerTL: { top: 0,    left: 0,    borderBottomWidth: 0, borderRightWidth: 0,  borderTopLeftRadius:     6 },
  cornerTR: { top: 0,    right: 0,   borderBottomWidth: 0, borderLeftWidth: 0,   borderTopRightRadius:    6 },
  cornerBL: { bottom: 0, left: 0,    borderTopWidth: 0,    borderRightWidth: 0,  borderBottomLeftRadius:  6 },
  cornerBR: { bottom: 0, right: 0,   borderTopWidth: 0,    borderLeftWidth: 0,   borderBottomRightRadius: 6 },

  overlayTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  instructionBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  instructionIcon: { fontSize: 18 },
  instructionText: { fontSize: 13, fontWeight: '600', flex: 1 },

  overlayBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'android' ? 16 : 4,
  },

  // Positions-Feedback
  feedbackBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12, paddingVertical: 9,
  },
  feedbackDot: { width: 8, height: 8, borderRadius: 4 },
  feedbackText: { flex: 1 },
  feedbackMessage: { fontSize: 13, fontWeight: '700' },
  feedbackSubtext:  { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 1 },

  // Winkel-Fortschritt
  angleProgress: {
    flexDirection: 'row', gap: 5,
    paddingHorizontal: 16, marginBottom: 10, flexWrap: 'wrap',
  },
  angleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 8, paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  angleChipDone: {
    borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.14)',
  },
  angleChipCurrent: {
    borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.18)',
  },
  angleChipOptional: { opacity: 0.55 },
  angleChipIcon:       { fontSize: 11 },
  angleChipLabel:      { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '500' },
  angleChipLabelDone:  { color: '#10b981' },
  angleChipCheck:      { color: '#10b981', fontSize: 10, fontWeight: '700' },
  angleChipOptTag:     { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontStyle: 'italic' },

  // Auslöser
  captureRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 28, marginBottom: 6,
  },
  captureInfoArea: { width: 72, alignItems: 'center' },
  captureInfoCount: { color: '#fff', fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  captureInfoLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, textAlign: 'center', lineHeight: 12 },
  captureInfoHint:  { color: '#10b981', fontSize: 9, textAlign: 'center', lineHeight: 13, fontWeight: '600' },
  captureFoot: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  demoMicroBadge: {
    marginTop: 4, backgroundColor: 'rgba(16,185,129,0.2)',
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2,
  },
  demoMicroBadgeText: { color: '#10b981', fontSize: 7, fontWeight: '700', letterSpacing: 1 },

  captureBtn: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  captureBtnReady: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16,185,129,0.15)',
  },
  captureBtnDisabled: { opacity: 0.35 },
  captureBtnInner: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  captureBtnInnerReady: { backgroundColor: '#10b981' },

  processBtn: {
    marginHorizontal: 24, marginTop: 4, marginBottom: 6,
  },

  // ── Processing / Upload ──────────────────────────────────────────────────────
  processingContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  processingAnimation: {
    width: 148, height: 148,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  processingRingOuter: {
    position: 'absolute', width: 148, height: 148, borderRadius: 74,
    borderWidth: 3,
    borderTopColor: 'transparent', borderRightColor: 'transparent',
  },
  processingRingInner: {
    position: 'absolute', width: 104, height: 104, borderRadius: 52,
    borderWidth: 3,
    borderTopColor: 'transparent', borderRightColor: 'transparent',
  },
  processingFootEmoji: { fontSize: 48 },
  processingTitle:     { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  processingSubtitle:  { color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 24 },
  processingPercentage: {
    fontSize: 36, fontWeight: '700',
    fontVariant: ['tabular-nums'], marginTop: 18,
  },
  processingHint: {
    color: 'rgba(255,255,255,0.28)', fontSize: 11,
    textAlign: 'center', marginTop: 12, lineHeight: 17,
  },
  lidarBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'center',
    marginBottom: 16,
  },
  lidarBadgeText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  uploadEmoji: { fontSize: 60, marginBottom: 20 },

  // Stage Progress
  stageProgressContainer: { alignSelf: 'stretch', gap: 8 },
  stageProgressTrack: {
    height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  },
  stageProgressFill: { height: '100%', borderRadius: 3 },
  stagesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stageItem: { alignItems: 'center', gap: 3 },
  stageDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.14)' },
  stageLabel:       { color: 'rgba(255,255,255,0.28)', fontSize: 8 },

  // ── Complete-Screen ──────────────────────────────────────────────────────────
  completeScroll:  { flex: 1 },
  completeContent: { padding: 20, paddingBottom: 28, gap: 14 },
  completeHeader:  { alignItems: 'center', paddingVertical: 10 },
  completeCheckCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(16,185,129,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  completeCheckMark: { color: '#10b981', fontSize: 40, fontWeight: '700' },
  completeTitle:    { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  completeSubtitle: {
    color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', lineHeight: 21,
  },
  completeFooter: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'android' ? 24 : 10,
    gap: 2,
  },

  // STL-Karte
  stlCard: {
    borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  stlCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  stlCardEmoji:      { fontSize: 28 },
  stlCardTitleGroup: { flex: 1, gap: 4 },
  stlCardTitle:      { color: '#fff', fontSize: 14, fontWeight: '700' },
  stlCardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderRadius: 4, borderWidth: 1, borderColor: '#10b981',
    paddingHorizontal: 5, paddingVertical: 1,
  },
  stlCardBadgeText: { color: '#10b981', fontSize: 9, fontWeight: '700' },
  stlCardAccuracyBox: { alignItems: 'flex-end' },
  stlCardAccuracy:    { color: '#10b981', fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  stlCardAccuracyLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 9 },
  stlCardMetrics: {
    flexDirection: 'row', padding: 14,
  },
  stlMetric:      { flex: 1, alignItems: 'center' },
  stlMetricValue: {
    color: '#fff', fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'],
  },
  stlMetricLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 9, marginTop: 3 },
  stlCardFooter: {
    paddingHorizontal: 14, paddingBottom: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 8,
  },
  stlCardFooterText: { color: 'rgba(255,255,255,0.25)', fontSize: 9 },

  // Nächste Schritte
  nextStepsBox: {
    borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16, gap: 12,
  },
  nextStepsTitle: {
    color: 'rgba(255,255,255,0.4)', fontSize: 9,
    fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase',
    marginBottom: 2,
  },
  nextStep:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nextStepIcon:  { fontSize: 18, width: 26 },
  nextStepText:  { color: 'rgba(255,255,255,0.65)', fontSize: 13, flex: 1 },

  // Demo-Hinweis
  demoNote: {
    borderRadius: 12, borderWidth: 1, borderColor: '#10b98130',
    backgroundColor: 'rgba(16,185,129,0.06)',
    padding: 14,
  },
  demoNoteText: {
    color: 'rgba(255,255,255,0.45)', fontSize: 11, lineHeight: 17, textAlign: 'center',
  },
})
