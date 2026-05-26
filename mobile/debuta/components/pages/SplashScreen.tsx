import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FloatingHearts from '../ui/FloatingHearts';
import { useTheme } from '../../theme/ThemeContext';

const { width: W, height: H } = Dimensions.get('window');

export default function SplashScreen() {
  const { colors, isDark } = useTheme();
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const dotsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
      Animated.timing(tagOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(dotsAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        const rulesAccepted = await AsyncStorage.getItem('debuta_rules_accepted');
        const userRole = await AsyncStorage.getItem('user_role');

        if (!rulesAccepted) {
          router.replace('/rules');
        } else if (token) {
          // Redirigir según el rol del usuario
          if (userRole === 'asociado') {
            router.replace('/partner');
          } else {
            router.replace('/(tabs)');
          }
        } else {
          router.replace('/onboarding');
        }
      } catch {
        router.replace('/rules');
      }
    }, 2600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg[0] }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Fondo */}
      <Animated.View style={styles.bgWrap}>
        <LinearGradient
          colors={colors.bg}
          start={[0, 0]}
          end={[1, 1]}
          style={styles.bgGradient}
        />
        <LinearGradient
          colors={[`${colors.primary}25`, 'transparent']}
          style={[styles.bgAccent, { left: -W * 0.15 }]}
        />
        <LinearGradient
          colors={[`${colors.secondary}25`, 'transparent']}
          style={[styles.bgAccent, { right: -W * 0.15, top: H * 0.05 }]}
        />
        {/* Capa de suavizado para look minimalista */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.85)' }]} />
      </Animated.View>

      {/* Corazones Flotantes */}
      <FloatingHearts />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Animated.View style={[styles.iconOuter, { shadowColor: colors.primary }]}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={[0, 0]}
            end={[1, 1]}
            style={styles.iconGradient}
          />
          <View style={[styles.iconInner, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <Ionicons name="heart" size={44} color={colors.primary} />
          </View>
        </Animated.View>

        <Text style={[styles.logoText, { color: isDark ? '#FFF' : colors.text, shadowColor: colors.secondary }]}>Debuta</Text>
      </Animated.View>

      {/* Texto */}
      <Animated.Text style={[styles.tagline, { opacity: tagOpacity, color: colors.textLight }]}>
        Conexiones Reales
      </Animated.Text>

      {/* Dots */}
      <Animated.View style={[styles.dotsRow, { opacity: dotsAnim }]}>
        <FancyDots colors={colors} />
      </Animated.View>

    </View>
  );
}

function FancyDots({ colors }: { colors: any }) {
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const d3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loopDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 420, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.25, duration: 420, useNativeDriver: true }),
        ])
      ).start();

    loopDot(d1, 0);
    loopDot(d2, 180);
    loopDot(d3, 360);
  }, []);

  const scaleStyle = (dot: Animated.Value) => ({
    transform: [{ scale: dot.interpolate({ inputRange: [0.25, 1], outputRange: [0.6, 1.4] }) }],
    opacity: dot.interpolate({ inputRange: [0.25, 1], outputRange: [0.35, 1] }),
  });

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[styles.fDot, scaleStyle(d1), { backgroundColor: colors.primary, shadowColor: colors.primary }]} />
      <Animated.View style={[styles.fDot, scaleStyle(d2), { backgroundColor: colors.secondary, shadowColor: colors.secondary }]} />
      <Animated.View style={[styles.fDot, scaleStyle(d3), { backgroundColor: colors.tertiary, shadowColor: colors.tertiary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  bgWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  bgGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  bgAccent: {
    position: 'absolute',
    width: W * 0.9,
    height: W * 0.9,
    borderRadius: W * 0.45,
    top: -W * 0.25,
  },

  logoWrap: {
    alignItems: 'center',
    gap: 12,
    zIndex: 3,
  },

  iconOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: Platform.OS === 'ios' ? 0.25 : 0.4,
    shadowRadius: 18,
    elevation: 10,
  },

  iconGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 55,
  },

  iconInner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  logoText: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },

  tagline: {
    fontSize: 16,
    marginTop: 14,
    letterSpacing: 0.6,
    zIndex: 3,
  },

  dotsRow: {
    marginTop: 44,
    zIndex: 3,
  },

  dotsContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
});