// IncomingCallScreen.tsx
// Pantalla completa de llamada entrante estilo WhatsApp
// Se muestra como Modal encima de toda la app mientras haya una llamada entrante.

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Platform, StatusBar, Modal,
  Vibration,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { boxShadow, textShadow } from '../utils/shadow';

const { width, height } = Dimensions.get('window');

// Patrón de vibración estilo WhatsApp: largo-corto-largo-corto
const VIBRATION_PATTERN = [0, 1000, 500, 1000, 500, 1000];

interface CallInfo {
  fromId: string;
  callerName: string;
  callerPhoto?: string;
  isVideo: boolean;
  signalData?: any;
}

interface Props {
  call: CallInfo;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallScreen({ call, onAccept, onReject }: Props) {
  // ── Animaciones ────────────────────────────────────────────────────────────
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(80)).current;
  const pulse1Anim = useRef(new Animated.Value(1)).current;
  const pulse2Anim = useRef(new Animated.Value(1)).current;
  const pulse3Anim = useRef(new Animated.Value(1)).current;
  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const btnAcceptAnim = useRef(new Animated.Value(0.85)).current;
  const btnRejectAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    // Entrada de pantalla
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, {
        toValue: 0, tension: 50, friction: 8, useNativeDriver: true,
      }),
      Animated.spring(btnAcceptAnim, {
        toValue: 1, tension: 60, friction: 7, useNativeDriver: true,
      }),
      Animated.spring(btnRejectAnim, {
        toValue: 1, tension: 60, friction: 7, delay: 80, useNativeDriver: true,
      }),
    ]).start();

    // Ondas de pulso (estilo whatsapp)
    const makePulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 2.2, duration: 1800, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1,   duration: 0,    useNativeDriver: true }),
        ])
      );

    const p1 = makePulse(pulse1Anim, 0);
    const p2 = makePulse(pulse2Anim, 600);
    const p3 = makePulse(pulse3Anim, 1200);
    p1.start(); p2.start(); p3.start();

    // Shake del icono de llamada
    const shake = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -12, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue:  12, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue:  -8, duration: 80,  useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue:   8, duration: 80,  useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue:   0, duration: 60,  useNativeDriver: true }),
        Animated.delay(1200),
      ])
    );
    shake.start();

    // Vibración
    Vibration.vibrate(VIBRATION_PATTERN, true);

    return () => {
      p1.stop(); p2.stop(); p3.stop();
      shake.stop();
      Vibration.cancel();
    };
  }, []);

  const dismiss = useCallback((action: 'accept' | 'reject') => {
    Vibration.cancel();
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 100, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      if (action === 'accept') onAccept();
      else onReject();
    });
  }, [onAccept, onReject]);

  const AVATAR_SIZE = Math.min(width * 0.38, 160);
  const PULSE_BASE  = AVATAR_SIZE + 12;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => dismiss('reject')}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Fondo: foto del llamante con blur fuerte */}
      {call.callerPhoto ? (
        <Image
          source={{ uri: call.callerPhoto }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          blurRadius={Platform.OS === 'android' ? 18 : 0}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, s.defaultBg]} />
      )}

      {/* Blur en iOS */}
      {Platform.OS === 'ios' && call.callerPhoto && (
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
      )}

      {/* Overlay oscuro degradado */}
      <LinearGradient
        colors={[
          'rgba(0,0,0,0.55)',
          'rgba(5,0,20,0.75)',
          'rgba(5,0,20,0.90)',
          'rgba(5,0,20,0.98)',
        ]}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[s.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        {/* ── Parte superior: info del llamante ──────────────────────────── */}
        <View style={s.topSection}>

          {/* Badge de tipo de llamada */}
          <View style={s.callBadge}>
            <Animated.View style={{ transform: [{ rotate: shakeAnim.interpolate({
              inputRange: [-12, 12],
              outputRange: ['-12deg', '12deg'],
            }) }] }}>
              <Ionicons
                name={call.isVideo ? 'videocam' : 'call'}
                size={14}
                color="rgba(255,255,255,0.9)"
              />
            </Animated.View>
            <Text style={s.callBadgeText}>
              {call.isVideo ? 'Videollamada entrante' : 'Llamada de voz entrante'}
            </Text>
          </View>

          {/* Avatar con ondas de pulso */}
          <View style={[s.pulseContainer, { width: PULSE_BASE * 2.4, height: PULSE_BASE * 2.4 }]}>
            {/* Onda 1 */}
            <Animated.View style={[
              s.pulseRing,
              {
                width: PULSE_BASE,
                height: PULSE_BASE,
                borderRadius: PULSE_BASE / 2,
                transform: [{ scale: pulse1Anim }],
                opacity: pulse1Anim.interpolate({ inputRange: [1, 2.2], outputRange: [0.4, 0] }),
              },
            ]} />
            {/* Onda 2 */}
            <Animated.View style={[
              s.pulseRing,
              {
                width: PULSE_BASE,
                height: PULSE_BASE,
                borderRadius: PULSE_BASE / 2,
                transform: [{ scale: pulse2Anim }],
                opacity: pulse2Anim.interpolate({ inputRange: [1, 2.2], outputRange: [0.3, 0] }),
              },
            ]} />
            {/* Onda 3 */}
            <Animated.View style={[
              s.pulseRing,
              {
                width: PULSE_BASE,
                height: PULSE_BASE,
                borderRadius: PULSE_BASE / 2,
                transform: [{ scale: pulse3Anim }],
                opacity: pulse3Anim.interpolate({ inputRange: [1, 2.2], outputRange: [0.2, 0] }),
              },
            ]} />

            {/* Avatar con borde gradiente */}
            <LinearGradient
              colors={['#25D366', '#128C7E']}
              style={[s.avatarBorder, { width: AVATAR_SIZE + 8, height: AVATAR_SIZE + 8, borderRadius: (AVATAR_SIZE + 8) / 2 }]}
            >
              <Image
                source={{ uri: call.callerPhoto || 'https://via.placeholder.com/160' }}
                style={[s.avatar, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }]}
              />
            </LinearGradient>
          </View>

          {/* Nombre */}
          <Text style={s.callerName} numberOfLines={2}>{call.callerName}</Text>
          <Text style={s.subText}>Debuta · {call.isVideo ? 'Videollamada' : 'Llamada de voz'}</Text>
        </View>

        {/* ── Botones de acción estilo WhatsApp ─────────────────────────── */}
        <View style={s.actionsSection}>

          {/* Rechazar */}
          <View style={s.actionItem}>
            <Animated.View style={{ transform: [{ scale: btnRejectAnim }] }}>
              <TouchableOpacity
                style={[s.actionBtn, s.rejectBtn]}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  dismiss('reject');
                }}
              >
                <LinearGradient
                  colors={['#FF453A', '#FF3B30']}
                  style={s.btnGradient}
                >
                  <Ionicons name="call" size={34} color="white"
                    style={{ transform: [{ rotate: '135deg' }] }}
                  />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
            <Text style={s.actionLabel}>Rechazar</Text>
          </View>

          {/* Silenciar sin rechazar (snooze) */}
          <TouchableOpacity
            style={s.snoozeBtn}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Vibration.cancel();
            }}
          >
            <Ionicons name="volume-mute" size={20} color="rgba(255,255,255,0.7)" />
            <Text style={s.snoozeLabel}>Silenciar</Text>
          </TouchableOpacity>

          {/* Aceptar */}
          <View style={s.actionItem}>
            <Animated.View style={{ transform: [{ scale: btnAcceptAnim }] }}>
              <TouchableOpacity
                style={[s.actionBtn, s.acceptBtn]}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  dismiss('accept');
                }}
              >
                <LinearGradient
                  colors={['#34C759', '#25D366']}
                  style={s.btnGradient}
                >
                  <Ionicons
                    name={call.isVideo ? 'videocam' : 'call'}
                    size={32}
                    color="white"
                  />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
            <Text style={s.actionLabel}>Aceptar</Text>
          </View>

        </View>

      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 50 : 60,
    paddingBottom: Platform.OS === 'android' ? 48 : 54,
    paddingHorizontal: 24,
  },
  defaultBg: {
    backgroundColor: '#050010',
  },

  // ── Top Section ─────────────────────────────────────────────────────────────
  topSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  callBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 44,
  },
  callBadgeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Pulso y avatar
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  pulseRing: {
    position: 'absolute',
    backgroundColor: '#25D366',
  },
  avatarBorder: {
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: boxShadow('#25D366', 8, 20, 0.5),
  },
  avatar: {
    backgroundColor: '#1a1a2e',
  },

  // Texto
  callerName: {
    color: 'white',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
    textShadow: textShadow('rgba(0,0,0,0.6)', 2, 8),
  },
  subText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // ── Actions ─────────────────────────────────────────────────────────────────
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 20,
  },
  actionItem: {
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    elevation: 12,
  },
  btnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    boxShadow: boxShadow('#FF3B30', 6, 14, 0.55),
  },
  acceptBtn: {
    boxShadow: boxShadow('#25D366', 6, 14, 0.55),
  },
  actionLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '600',
  },

  // Botón silenciar central
  snoozeBtn: {
    alignItems: 'center',
    gap: 6,
    padding: 10,
  },
  snoozeLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '500',
  },
});
