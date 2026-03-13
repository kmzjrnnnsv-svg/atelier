/**
 * ─────────────────────────────────────────────────────────────────────────────
 * OnboardingScreen.jsx  –  Einführungs-Screens vor dem Fußscan
 * ─────────────────────────────────────────────────────────────────────────────
 * Zeigt 4 informative Slides, bevor der eigentliche Scan startet:
 *   1. Willkommen → Was macht diese App?
 *   2. Vorbereitung → Was brauche ich?
 *   3. Scan-Ablauf → Wie funktioniert es?
 *   4. Datenschutz → Wie werden meine Daten verwendet?
 *
 * Kann per `skipOnboarding`-Flag übersprungen werden (Demo-Modus).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, Animated, SafeAreaView, StatusBar,
} from 'react-native'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

// ── Onboarding-Content ────────────────────────────────────────────────────────
const SLIDES = [
  {
    id:          '1',
    emoji:       '🦶',
    title:       'Dein Fuß.\nDein Schuh.',
    description: 'ATELIER scannt deinen Fuß in 3D und erstellt daraus maßgefertigte Schuhe, die perfekt passen — auf den halben Millimeter genau.',
    color:       '#0f172a',
    accent:      '#10b981',
  },
  {
    id:          '2',
    emoji:       '📋',
    title:       'Vorbereitung',
    description: 'Du brauchst:\n\n✓  Helle, ebene Oberfläche\n✓  Gute Beleuchtung\n✓  Socken ausziehen\n✓  Ca. 5 Minuten Zeit',
    color:       '#1e3a5f',
    accent:      '#3b82f6',
  },
  {
    id:          '3',
    emoji:       '📡',
    title:       'So funktioniert der Scan',
    description: 'Zuerst linker Fuß, dann rechter Fuß.\n\nFür jeden Fuß wirst du durch 3 Aufnahmen geführt. Die KI erstellt daraus automatisch ein präzises 3D-Modell.',
    color:       '#1a1a2e',
    accent:      '#8b5cf6',
  },
  {
    id:          '4',
    emoji:       '🔒',
    title:       'Deine Daten sind sicher',
    description: 'Deine 3D-Fußmodelle werden verschlüsselt in deinem persönlichen Account gespeichert.\n\nSie werden ausschließlich für deine Schuhbestellungen verwendet.',
    color:       '#0f2027',
    accent:      '#f59e0b',
  },
]

// ─────────────────────────────────────────────────────────────────────────────

export default function OnboardingScreen({ navigation, onComplete, isDemoUser = false }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const flatListRef                      = useRef(null)
  const scrollX                          = useRef(new Animated.Value(0)).current

  const isLast = currentIndex === SLIDES.length - 1

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goToNext = () => {
    if (isLast) {
      handleStart()
    } else {
      const next = currentIndex + 1
      flatListRef.current?.scrollToIndex({ index: next, animated: true })
      setCurrentIndex(next)
    }
  }

  const handleStart = () => {
    onComplete?.()
    navigation?.navigate('FootScanWizard', { isDemoUser })
  }

  const handleSkip = () => {
    onComplete?.()
    navigation?.navigate('FootScanWizard', { isDemoUser })
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { backgroundColor: item.color }]}>
      <View style={styles.slideContent}>

        {/* Großes Emoji / Illustration */}
        <View style={[styles.emojiContainer, { backgroundColor: item.accent + '20' }]}>
          <Text style={styles.emoji}>{item.emoji}</Text>
        </View>

        {/* Titel */}
        <Text style={[styles.title, { color: '#ffffff' }]}>
          {item.title}
        </Text>

        {/* Beschreibung */}
        <Text style={[styles.description, { color: 'rgba(255,255,255,0.75)' }]}>
          {item.description}
        </Text>

        {/* Accent-Linie */}
        <View style={[styles.accentLine, { backgroundColor: item.accent }]} />
      </View>
    </View>
  )

  const currentSlide = SLIDES[currentIndex]

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentSlide.color }]}>
      <StatusBar barStyle="light-content" backgroundColor={currentSlide.color} />

      {/* Skip-Button */}
      {!isLast && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Überspringen</Text>
        </TouchableOpacity>
      )}

      {/* Demo-Badge */}
      {isDemoUser && (
        <View style={styles.demoBadge}>
          <Text style={styles.demoBadgeText}>DEMO</Text>
        </View>
      )}

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}    // Nur Button-Navigation (kein Swipe)
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        style={styles.flatList}
      />

      {/* Untere Navigation */}
      <View style={styles.bottomNav}>

        {/* Progress-Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [
              (i - 1) * SCREEN_W,
              i * SCREEN_W,
              (i + 1) * SCREEN_W,
            ]
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            })
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            })

            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    width:            dotWidth,
                    opacity,
                    backgroundColor:  currentSlide.accent,
                  }
                ]}
              />
            )
          })}
        </View>

        {/* Weiter / Start-Button */}
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: currentSlide.accent }]}
          onPress={goToNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>
            {isLast ? (isDemoUser ? '🚀 Demo starten' : 'Los geht\'s') : 'Weiter →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width:   SCREEN_W,
    height:  SCREEN_H - 160,   // Platz für BottomNav
    padding: 0,
  },
  slideContent: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emojiContainer: {
    width:          120,
    height:         120,
    borderRadius:   60,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   36,
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    fontSize:   28,
    fontWeight: '700',
    textAlign:  'center',
    lineHeight: 36,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  description: {
    fontSize:   15,
    lineHeight: 24,
    textAlign:  'center',
  },
  accentLine: {
    width:        40,
    height:       3,
    borderRadius: 2,
    marginTop:    28,
  },

  // Skip
  skipButton: {
    position:   'absolute',
    top:        56,
    right:      24,
    zIndex:     10,
    padding:    8,
  },
  skipText: {
    color:    'rgba(255,255,255,0.6)',
    fontSize: 14,
  },

  // Demo-Badge
  demoBadge: {
    position:         'absolute',
    top:              56,
    left:             24,
    zIndex:           10,
    backgroundColor:  'rgba(16,185,129,0.2)',
    borderRadius:     8,
    paddingHorizontal: 10,
    paddingVertical:  5,
    borderWidth:      1,
    borderColor:      '#10b981',
  },
  demoBadgeText: {
    color:      '#10b981',
    fontSize:   10,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // Bottom Navigation
  bottomNav: {
    height:           160,
    paddingHorizontal: 32,
    paddingBottom:    32,
    alignItems:       'center',
    justifyContent:   'flex-end',
    gap:              20,
  },
  dots: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
    marginBottom:   8,
  },
  dot: {
    height:       8,
    borderRadius: 4,
  },
  nextButton: {
    width:          '100%',
    paddingVertical: 18,
    borderRadius:   20,
    alignItems:     'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color:      '#ffffff',
    fontSize:   16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})
