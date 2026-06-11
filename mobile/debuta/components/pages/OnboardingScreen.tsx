// components/pages/OnboardingScreen.tsx
// Pantalla de bienvenida — Diseño Debuta (Sin emojis)

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Platform,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import FloatingHearts from '../ui/FloatingHearts';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { boxShadow, textShadow } from '../utils/shadow';
import { useTheme } from '../../theme/ThemeContext';

const { width: W, height: H } = Dimensions.get('window');
const ONBOARDING_KEY = 'debuta_onboarding_done';

// ─── Slides ───────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 0,
    gradient: ['#FF5864', '#FF655B'] as [string, string],
    title:    'Tu próxima conexión te espera',
    subtitle: 'La app que te conecta con personas reales en tu ciudad.',
    detail:   'Crea tu perfil, muestra quién eres y empieza a descubrir.',
    icon:     'heart' as const,
    accent:   '#FD297B',
  },
  {
    id: 1,
    gradient: ['#FF655B', '#FD297B'] as [string, string],
    title:    'Swipe & Match',
    subtitle: 'Desliza para conectar con personas que comparten tus intereses.',
    detail:   'Cuando dos personas se gustan mutuamente, ¡es un Match!',
    icon:     'flash' as const,
    accent:   '#FF655B',
  },
  {
    id: 2,
    gradient: ['#FD297B', '#FF5864'] as [string, string],
    title:    'Citas Reales',
    subtitle: 'Cuando haces match, te sugerimos el restaurante perfecto para su primera cita.',
    detail:   'Vivir el romance nunca fue tan fácil.',
    icon:     'restaurant' as const,
    accent:   '#FF5864',
  },
  {
    id: 3,
    gradient: ['#FF5864', '#FD297B'] as [string, string],
    title:    '¡Empieza Ahora!',
    subtitle: 'Tu próxima historia de amor comienza aquí.',
    detail:   'Únete a miles de personas que ya encontraron su match en Debuta.',
    icon:     'star' as const,
    accent:   '#FD297B',
  },
];

// ─── Componente principal ──────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const { colors, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  const slideOpacity    = useRef(new Animated.Value(1)).current;
  const slideTranslateX = useRef(new Animated.Value(0)).current;
  const slideDirection  = useRef(1); // 1 = avanza, -1 = retrocede
  const iconScale       = useRef(new Animated.Value(0)).current;
  const iconRotate      = useRef(new Animated.Value(0)).current;
  const textOpacity     = useRef(new Animated.Value(0)).current;
  const textTranslateY  = useRef(new Animated.Value(30)).current;
  const orb1            = useRef(new Animated.Value(0)).current;
  const orb2            = useRef(new Animated.Value(0)).current;

  const animateSlideIn = useCallback(() => {
    slideOpacity.setValue(0);
    slideTranslateX.setValue(slideDirection.current * 50);
    iconScale.setValue(0);
    iconRotate.setValue(0);
    textOpacity.setValue(0);
    textTranslateY.setValue(30);

    Animated.parallel([
      Animated.timing(slideOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideTranslateX, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(100),
        Animated.spring(iconScale, { toValue: 1, tension: 50, friction: 5, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(textOpacity,    { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(textTranslateY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
        ]),
      ]),
    ]).start();

    Animated.loop(Animated.sequence([
      Animated.timing(orb1, { toValue: 1, duration: 3000, useNativeDriver: true }),
      Animated.timing(orb1, { toValue: 0, duration: 3000, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(orb2, { toValue: 1, duration: 4000, useNativeDriver: true }),
      Animated.timing(orb2, { toValue: 0, duration: 4000, useNativeDriver: true }),
    ])).start();
  }, [currentIndex]);

  const { showAlert } = useCustomAlert();

  useEffect(() => { 
    animateSlideIn(); 
  }, [currentIndex]);

  useEffect(() => {
    // Mostrar límites de la aplicación al inicio (solo una vez)
    setTimeout(() => {
      showAlert({
        title: 'Reglas de la Comunidad',
        message: 'Para mantener Debuta seguro y divertido para todos, por favor acepta nuestras normas:\n\n• Sé tú mismo: Perfiles falsos serán eliminados.\n• Respeto mutuo: No toleramos el acoso ni lenguaje ofensivo.\n• Fotos reales: Asegúrate de que tus fotos cumplan con nuestras guías.\n• Seguridad primero: Nunca compartas contraseñas o datos bancarios.\n• Edad mínima: Debas tener +18 años.',
        icon: 'shield-checkmark-outline',
        iconColor: colors.primary,
        buttons: [{ 
          text: 'Entiendo y Acepto',
          onPress: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }]
      });
    }, 1200);
  }, []);

  // ── Navegación ──────────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (isNavigating) return;
    if (currentIndex < SLIDES.length - 1) {
      setIsNavigating(true);
      slideDirection.current = 1;
      Animated.parallel([
        Animated.timing(slideOpacity,    { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(slideTranslateX, { toValue: -50, duration: 250, useNativeDriver: true }),
      ]).start(() => { setCurrentIndex(i => i + 1); setIsNavigating(false); });
    } else {
      finishOnboarding();
    }
  }, [currentIndex, isNavigating]);

  const goPrev = useCallback(() => {
    if (isNavigating || currentIndex === 0) return;
    setIsNavigating(true);
    slideDirection.current = -1;
    Animated.parallel([
      Animated.timing(slideOpacity,    { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(slideTranslateX, { toValue: 50, duration: 250, useNativeDriver: true }),
    ]).start(() => { setCurrentIndex(i => i - 1); setIsNavigating(false); });
  }, [currentIndex, isNavigating]);

  const finishOnboarding = useCallback(async () => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) router.replace('/(tabs)');
    else        router.replace('/login');
  }, []);

  // ── Swipe Handlers (Evitar stale closures) ──────────────────────────────────
  const swipeHandlers = useRef({ goNext: () => {}, goPrev: () => {} });
  useEffect(() => {
    swipeHandlers.current = { goNext, goPrev };
  }, [goNext, goPrev]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 50) {
          swipeHandlers.current.goPrev();
        } else if (gestureState.dx < -50) {
          swipeHandlers.current.goNext();
        }
      },
    })
  ).current;

  const slide  = SLIDES[currentIndex];
  const isLast = currentIndex === SLIDES.length - 1;

  const orb1TranslateY = orb1.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const orb2TranslateY = orb2.interpolate({ inputRange: [0, 1], outputRange: [0,  20] });
  const iconRotateStr = iconRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '8deg'] });

  return (
    <View style={[s.root, { backgroundColor: colors.bg[0] }]} {...panResponder.panHandlers}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg[0]} />

      {/* ── Fondo animado ── */}
      <Animated.View style={StyleSheet.absoluteFillObject}>
        <LinearGradient colors={colors.bg} start={[0, 0]} end={[1, 1]} style={StyleSheet.absoluteFillObject} />
        <LinearGradient colors={[`${colors.primary}25`, 'transparent']} style={[s.bgBlob, { left: -W * 0.2, top: -W * 0.1 }]} />
        <LinearGradient colors={[`${colors.secondary}25`, 'transparent']} style={[s.bgBlob, { right: -W * 0.2, bottom: W * 0.05 }]} />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.85)" }]} />
      </Animated.View>

      {/* ── Corazones Flotantes ── */}
      <FloatingHearts />

      {/* ── Orbes decorativos ── */}
      <Animated.View style={[s.orb1, { transform: [{ translateY: orb1TranslateY }] }]}>
        <LinearGradient colors={[slide.gradient[0] + '60', 'transparent']} style={StyleSheet.absoluteFillObject} />
      </Animated.View>
      <Animated.View style={[s.orb2, { transform: [{ translateY: orb2TranslateY }] }]}>
        <LinearGradient colors={[slide.gradient[1] + '50', 'transparent']} style={StyleSheet.absoluteFillObject} />
      </Animated.View>

      {/* ── Botón saltar ── */}
      {!isLast && (
        <TouchableOpacity 
          style={[s.skipBtn, { backgroundColor: colors.card, borderColor: colors.glassBorder }]} 
          onPress={finishOnboarding} 
          activeOpacity={0.7}
        >
          <Text style={[s.skipText, { color: colors.textDim }]}>Saltar</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textLight} />
        </TouchableOpacity>
      )}

      {/* ── Contenido principal ── */}
      <Animated.View style={[s.content, { opacity: slideOpacity, transform: [{ translateX: slideTranslateX }] }]}>

        {/* Icono con gradiente */}
        <Animated.View style={[s.iconWrap, { transform: [{ scale: iconScale }, { rotate: iconRotateStr }], boxShadow: boxShadow(colors.primary, 12, 24, 0.20) }]}>
          <LinearGradient colors={slide.gradient} start={[0,0]} end={[1,1]} style={StyleSheet.absoluteFillObject} />
          <View style={[s.iconInner, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <Ionicons name={slide.icon} size={60} color={slide.accent} />
          </View>
        </Animated.View>

        {/* Título + subtítulo */}
        <Animated.View style={[s.textBlock, { opacity: textOpacity, transform: [{ translateY: textTranslateY }] }]}>
          <Text style={[s.title, { color: isDark ? colors.text : slide.accent, textShadow: isDark ? 'none' : textShadow(`${colors.primary}40`, 2, 4) }]}>{slide.title}</Text>
          <Text style={[s.subtitle, { color: colors.textDim }]}>{slide.subtitle}</Text>

          {/* Chip de detalle */}
          <View style={[s.detailChip, { borderColor: slide.gradient[0] + '40', backgroundColor: colors.card }]}>
            <LinearGradient
              colors={[slide.gradient[0] + '10', slide.gradient[1] + '10']}
              style={StyleSheet.absoluteFillObject}
            />
            <Ionicons name={slide.icon} size={15} color={slide.accent} style={{ marginRight: 8 }} />
            <Text style={[s.detailText, { color: colors.text }]}>{slide.detail}</Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* ── Footer ── */}
      <View style={s.footer}>

        {/* Puntos */}
        <View style={s.dotsRow}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => { if (i !== currentIndex && !isNavigating) setCurrentIndex(i); }}>
              <Animated.View
                style={[
                  s.dot,
                  i === currentIndex
                    ? { backgroundColor: isDark ? colors.primary : slide.accent, width: 28, borderRadius: 8 }
                    : { backgroundColor: colors.textLight,  width: 10 },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Botones de navegación */}
        <View style={s.navRow}>
          {/* Atrás */}
          <TouchableOpacity
            style={[s.backBtn, currentIndex === 0 && { opacity: 0 }, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
            onPress={goPrev}
            disabled={currentIndex === 0}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          {/* Siguiente / Empezar */}
          <TouchableOpacity style={[s.nextBtn, { boxShadow: boxShadow(colors.primary, 6, 12, 0.25) }]} onPress={goNext} activeOpacity={0.85}>
            <LinearGradient colors={[colors.primary, colors.secondary]} start={[0,0]} end={[1,0]} style={s.nextBtnGrad}>
              <Text style={s.nextBtnText}>{isLast ? '¡Empezar!' : 'Continuar'}</Text>
              <Ionicons
                name={isLast ? 'rocket-outline' : 'arrow-forward'}
                size={18} color="#fff" style={{ marginLeft: 6 }}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },

  bgBlob: {
    position: 'absolute', width: W * 0.9, height: W * 0.9, borderRadius: W * 0.45,
  },

  orb1: {
    position: 'absolute', width: W * 0.85, height: W * 0.85, borderRadius: W * 0.425,
    top: -W * 0.25, left: -W * 0.2, overflow: 'hidden',
  },
  orb2: {
    position: 'absolute', width: W * 0.75, height: W * 0.75, borderRadius: W * 0.375,
    bottom: -W * 0.3, right: -W * 0.2, overflow: 'hidden',
  },

  skipBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 42,
    right: 24,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1,
    zIndex: 10,
    boxShadow: boxShadow('rgba(0,0,0,0.1)', 4, 8, 0.10),
  },
  skipText: { fontSize: 13, fontWeight: '600' },

  content: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingBottom: 20,
  },

  iconWrap: {
    width: 150, height: 150, borderRadius: 75,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 36,
  },
  iconInner: {
    width: 118, height: 118, borderRadius: 59,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },

  textBlock: { alignItems: 'center', gap: 12, width: '100%' },
  title: {
    fontSize: 34, fontWeight: '900', letterSpacing: 0.5, textAlign: 'center',
  },
  subtitle: {
    fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 8,
  },
  detailChip: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 8, paddingVertical: 12, paddingHorizontal: 18,
    borderRadius: 20, borderWidth: 1, overflow: 'hidden',
    maxWidth: W - 80,
  },
  detailText: { fontSize: 13, fontWeight: '600', flex: 1, flexWrap: 'wrap' },

  footer: {
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    gap: 16, alignItems: 'center',
  },

  dotsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dot:     { height: 10, borderRadius: 5, marginHorizontal: 2 },

  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', gap: 16,
  },
  backBtn: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    boxShadow: boxShadow('rgba(0,0,0,0.1)', 4, 8, 0.10),
  },
  nextBtn: {
    flex: 1, borderRadius: 16, overflow: 'hidden',
  },
  nextBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, paddingHorizontal: 24,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});
