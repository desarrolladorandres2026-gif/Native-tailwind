// CallScreen.tsx — Pantalla de llamada con WebRTC real (audio + video)
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, Pressable,
  Dimensions, Animated, StatusBar, Platform, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { useCall } from '../../context/CallContext';
import * as Haptics from 'expo-haptics';
import { boxShadow, textShadow } from '../utils/shadow';

// RTCView solo disponible en build nativo (no en Expo Go)
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';
const RTCView: any = IS_EXPO_GO
  ? null
  : (() => { try { return require('react-native-webrtc').RTCView; } catch { return null; } })();

// InCallManager para routing de audio (altavoz / auricular)
let InCallManager: any = null;
if (!IS_EXPO_GO) {
  try { InCallManager = require('react-native-incall-manager').default; } catch {}
}

const { width, height } = Dimensions.get('window');

export default function CallScreen() {
  const { userId, name, photo, isVideo, type } = useLocalSearchParams<{
    userId: string;
    name: string;
    photo: string;
    isVideo: string;
    type: 'incoming' | 'outgoing' | 'active';
  }>();

  const {
    endCall, acceptCall, rejectCall,
    toggleMute, toggleCamera,
    localStream, remoteStream,
  } = useCall();

  // ── Estado ─────────────────────────────────────────────────────────────────
  const [currentType, setCurrentType] = useState(type);
  const [timer, setTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  // El hook fuerza altavoz al iniciar videollamadas; reflejarlo en la UI
  const [isSpeaker, setIsSpeaker] = useState(isVideo === 'true');
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  // Visibilidad de cabecera y controles (auto-ocultado estilo WhatsApp)
  const [controlsVisible, setControlsVisible] = useState(true);

  // ── Modo videollamada ──────────────────────────────────────────────────────
  const showVideo = isVideo === 'true';
  // Videollamada conectada con stream remoto → modo pantalla completa estilo
  // WhatsApp: el video del otro usuario ocupa toda la pantalla y se ocultan el
  // avatar central y los anillos para que no queden encima del video.
  const isVideoActive = showVideo && isConnected && !!remoteStream && !!RTCView;

  // Detectar cuando el stream remoto llega → llamada conectada
  useEffect(() => {
    if (remoteStream && !isConnected) {
      console.log('🔊 [CallScreen] Stream remoto recibido → llamada activa');
      setIsConnected(true);
      setCurrentType('active');
    }
  }, [remoteStream]);

  // ── Animaciones ────────────────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ring1Anim = useRef(new Animated.Value(1)).current;
  const ring2Anim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const btnScaleAnim = useRef(new Animated.Value(0.85)).current;
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    Animated.spring(btnScaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();
  }, []);

  // ── Auto-ocultado de controles en videollamada (estilo WhatsApp) ────────────
  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
  }, [clearHideTimer]);

  // Tocar la pantalla alterna la visibilidad de cabecera y controles
  const handleScreenTap = useCallback(() => {
    setControlsVisible(prev => {
      const next = !prev;
      if (next) scheduleHide(); else clearHideTimer();
      return next;
    });
  }, [scheduleHide, clearHideTimer]);

  // Al entrar/salir de videollamada activa: mostrar controles y (si activa)
  // arrancar el temporizador de auto-ocultado. Fuera de video siempre visibles.
  useEffect(() => {
    if (isVideoActive) {
      setControlsVisible(true);
      scheduleHide();
    } else {
      clearHideTimer();
      setControlsVisible(true);
    }
    return clearHideTimer;
  }, [isVideoActive, scheduleHide, clearHideTimer]);

  // Animar la opacidad de cabecera/controles/gradientes al cambiar visibilidad
  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: controlsVisible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [controlsVisible]);

  useEffect(() => {
    if (!isConnected) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      const ring1 = Animated.loop(
        Animated.sequence([
          Animated.timing(ring1Anim, { toValue: 1.5, duration: 1800, useNativeDriver: true }),
          Animated.timing(ring1Anim, { toValue: 1, duration: 0, useNativeDriver: true }),
        ])
      );
      const ring2 = Animated.loop(
        Animated.sequence([
          Animated.timing(ring2Anim, { toValue: 1.9, duration: 1800, useNativeDriver: true }),
          Animated.timing(ring2Anim, { toValue: 1, duration: 0, useNativeDriver: true }),
        ])
      );
      pulse.start(); ring1.start();
      setTimeout(() => ring2.start(), 400);
      return () => { pulse.stop(); ring1.stop(); ring2.stop(); };
    }
  }, [isConnected]);

  // Timer de llamada activa
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isConnected) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const statusText = () => {
    if (isConnected) return formatTime(timer);
    if (currentType === 'outgoing') return 'Llamando...';
    if (currentType === 'incoming') return isVideo === 'true' ? 'Video llamada entrante' : 'Llamada entrante';
    return 'Conectando...';
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleEnd = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    endCall();
  }, [endCall]);

  // Botón "atrás" de Android: colgar correctamente en vez de abandonar la
  // pantalla dejando la llamada (y el tono/audio) sonando en segundo plano.
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleEnd();
        return true; // bloquear el pop por defecto; endCall ya navega atrás
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [handleEnd])
  );

  const handleAccept = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    acceptCall();
  }, [acceptCall]);

  const handleReject = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    rejectCall();
  }, [rejectCall]);

  // Al interactuar con un control reiniciamos el temporizador para que los
  // controles no se oculten justo después de tocarlos.
  const bumpControls = useCallback(() => {
    if (isVideoActive) scheduleHide();
  }, [isVideoActive, scheduleHide]);

  const handleMuteToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bumpControls();
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    toggleMute(newMuted);   // ← conecta con WebRTC real
  };

  const handleSpeakerToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bumpControls();
    const newSpeaker = !isSpeaker;
    setIsSpeaker(newSpeaker);
    try {
      InCallManager?.setSpeakerphoneOn(newSpeaker);
      InCallManager?.setForceSpeakerphoneOn(newSpeaker);
      console.log('🔊 [CallScreen] Altavoz:', newSpeaker ? 'ENCENDIDO' : 'APAGADO');
    } catch (e) {
      console.warn('[CallScreen] InCallManager.setSpeakerphoneOn falló:', e);
    }
  };

  const handleCameraToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bumpControls();
    const newOff = !isCameraOff;
    setIsCameraOff(newOff);
    toggleCamera(newOff);   // ← conecta con WebRTC real
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Fondo: video remoto o foto ────────────────────────────────────── */}
      {showVideo && remoteStream && RTCView ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={StyleSheet.absoluteFill}
          objectFit="cover"
          mirror={false}
        />
      ) : (
        <>
          <Image
            source={{ uri: photo || 'https://via.placeholder.com/600' }}
            style={StyleSheet.absoluteFill}
            blurRadius={Platform.OS === 'android' ? 12 : 0}
            resizeMode="cover"
          />
          {Platform.OS === 'ios' && (
            <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFill} />
          )}
        </>
      )}

      {/* Overlay degradado:
          - En videollamada activa solo oscurecemos arriba y abajo para que el
            nombre y los controles se lean, dejando el video visible en el centro.
          - En el resto de casos cubrimos toda la pantalla. */}
      {isVideoActive ? (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: controlsOpacity }]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['rgba(5,0,20,0.75)', 'transparent']}
            style={s.topGradient}
          />
          <LinearGradient
            colors={['transparent', 'rgba(5,0,20,0.85)']}
            style={s.bottomGradient}
          />
        </Animated.View>
      ) : (
        <LinearGradient
          colors={['rgba(5,0,20,0.65)', 'rgba(10,0,35,0.8)', 'rgba(5,0,20,0.9)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}

      {/* Capa táctil de fondo: cuando los controles están ocultos el contenido
          es pointerEvents="none", así que cualquier toque llega aquí y los vuelve
          a mostrar. (Para ocultarlos cuando están visibles está la zona central.) */}
      {isVideoActive && (
        <Pressable style={StyleSheet.absoluteFill} onPress={handleScreenTap} />
      )}

      <Animated.View
        style={[{ flex: 1, opacity: Animated.multiply(fadeAnim, controlsOpacity) }]}
        pointerEvents={isVideoActive && !controlsVisible ? 'none' : 'auto'}
      >
        <SafeAreaView style={s.safe}>

          {/* ── Cabecera ──────────────────────────────────────────────────── */}
          <View style={s.topBar}>
            <View style={s.callTypeBadge}>
              <Ionicons
                name={isVideo === 'true' ? 'videocam' : 'call'}
                size={13}
                color="rgba(255,255,255,0.8)"
              />
              <Text style={s.callTypeText}>
                {isVideo === 'true' ? 'Video llamada' : 'Llamada de voz'}
              </Text>
            </View>

            {/* En videollamada activa el nombre y el cronómetro van arriba,
                porque el centro lo ocupa el video del otro usuario. */}
            {isVideoActive && (
              <>
                <Text style={s.videoHeaderName} numberOfLines={1}>{name}</Text>
                <Text style={s.videoHeaderTimer}>{statusText()}</Text>
              </>
            )}
          </View>

          {/* ── Centro: Avatar con anillos · oculto en videollamada activa ─── */}
          {!isVideoActive && (
          <View style={s.avatarSection}>
            {!isConnected && (
              <>
                <Animated.View style={[s.ring, s.ring1, { transform: [{ scale: ring1Anim }] }]} />
                <Animated.View style={[s.ring, s.ring2, { transform: [{ scale: ring2Anim }] }]} />
              </>
            )}

            <Animated.View style={[s.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={['rgba(139,92,246,0.6)', 'rgba(217,70,239,0.6)']}
                style={s.avatarGradientBorder}
              >
                <Image
                  source={{ uri: photo || 'https://via.placeholder.com/200' }}
                  style={s.avatar}
                />
              </LinearGradient>
            </Animated.View>

            <Text style={s.callerName}>{name}</Text>
            <Text style={s.statusText}>{statusText()}</Text>

            {/* Indicador de stream activo */}
            {isConnected && (
              <View style={s.streamIndicator}>
                <View style={s.streamDot} />
                <Text style={s.streamText}>Audio activo</Text>
              </View>
            )}
          </View>
          )}

          {/* ── Centro táctil: en videollamada llena el espacio entre cabecera
                 y controles; al tocarlo se alternan (ocultar cuando visibles). */}
          {isVideoActive && (
            <Pressable style={s.videoTapZone} onPress={handleScreenTap} />
          )}

          {/* ── Footer: controles ─────────────────────────────────────────── */}
          <Animated.View style={[s.footer, { transform: [{ scale: btnScaleAnim }] }]}>

            {currentType === 'incoming' && !isConnected ? (
              /* Incoming: rechazar / aceptar */
              <View style={s.incomingRow}>
                <View style={s.ctrlGroup}>
                  <TouchableOpacity
                    style={[s.bigBtn, { backgroundColor: '#FF3B30' }]}
                    onPress={handleReject}
                  >
                    <Ionicons name="close" size={34} color="white" />
                  </TouchableOpacity>
                  <Text style={s.bigBtnLabel}>Rechazar</Text>
                </View>

                <View style={s.ctrlGroup}>
                  <TouchableOpacity
                    style={[s.bigBtn, { backgroundColor: '#34C759' }]}
                    onPress={handleAccept}
                  >
                    <Ionicons name={isVideo === 'true' ? 'videocam' : 'call'} size={32} color="white" />
                  </TouchableOpacity>
                  <Text style={s.bigBtnLabel}>Aceptar</Text>
                </View>
              </View>
            ) : (
              /* Outgoing/Active: controles + colgar */
              <>
                <View style={s.controlsRow}>
                  <View style={s.ctrlGroup}>
                    <TouchableOpacity
                      style={[s.ctrlBtn, isMuted && s.ctrlBtnActive]}
                      onPress={handleMuteToggle}
                    >
                      <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={22} color="white" />
                    </TouchableOpacity>
                    <Text style={s.ctrlLabel}>{isMuted ? 'Activar mic' : 'Silenciar'}</Text>
                  </View>

                  <View style={s.ctrlGroup}>
                    <TouchableOpacity
                      style={[s.ctrlBtn, isSpeaker && s.ctrlBtnActive]}
                      onPress={handleSpeakerToggle}
                    >
                      <Ionicons name={isSpeaker ? 'volume-high' : 'volume-medium'} size={22} color="white" />
                    </TouchableOpacity>
                    <Text style={s.ctrlLabel}>{isSpeaker ? 'Auricular' : 'Altavoz'}</Text>
                  </View>

                  {isVideo === 'true' && (
                    <View style={s.ctrlGroup}>
                      <TouchableOpacity
                        style={[s.ctrlBtn, isCameraOff && s.ctrlBtnActive]}
                        onPress={handleCameraToggle}
                      >
                        <Ionicons name={isCameraOff ? 'videocam-off' : 'videocam'} size={22} color="white" />
                      </TouchableOpacity>
                      <Text style={s.ctrlLabel}>{isCameraOff ? 'Cámara off' : 'Cámara'}</Text>
                    </View>
                  )}
                </View>

                <View style={s.hangupRow}>
                  <TouchableOpacity style={s.hangupBtn} onPress={handleEnd}>
                    <Ionicons name="call" style={{ transform: [{ rotate: '135deg' }] }} size={32} color="white" />
                  </TouchableOpacity>
                  <Text style={s.ctrlLabel}>Colgar</Text>
                </View>
              </>
            )}
          </Animated.View>

        </SafeAreaView>
      </Animated.View>

      {/* ── Video local en miniatura ──────────────────────────────────────────
          Fuera del contenedor que se desvanece: permanece visible aunque se
          oculten los controles, como en WhatsApp. */}
      {showVideo && localStream && isConnected && RTCView && (
        <View style={s.localVideoContainer} pointerEvents="none">
          <RTCView
            streamURL={localStream.toURL()}
            style={s.localVideo}
            objectFit="cover"
            mirror
          />
        </View>
      )}
    </View>
  );
}

const AVATAR_SIZE = Math.min(width * 0.42, 180);
const RING_BASE = AVATAR_SIZE + 20;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050010' },
  safe: { flex: 1, justifyContent: 'space-between', paddingVertical: 20 },

  topBar: { alignItems: 'center', paddingTop: 8 },
  callTypeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
  },
  callTypeText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },

  // Gradientes parciales en modo videollamada (solo arriba y abajo)
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 280 },

  // Zona central táctil para alternar controles sobre el video
  videoTapZone: { flex: 1 },

  // Nombre y cronómetro en la cabecera durante la videollamada
  videoHeaderName: {
    color: 'white', fontSize: 22, fontWeight: '800',
    marginTop: 12, letterSpacing: -0.4,
    ...textShadow('rgba(0,0,0,0.6)', 1, 5),
  },
  videoHeaderTimer: {
    color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600',
    marginTop: 2,
    ...textShadow('rgba(0,0,0,0.6)', 1, 4),
  },

  avatarSection: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: RING_BASE,
    height: RING_BASE,
    borderRadius: RING_BASE / 2,
    borderWidth: 1.5,
  },
  ring1: { borderColor: 'rgba(139,92,246,0.35)' },
  ring2: { borderColor: 'rgba(217,70,239,0.2)' },
  avatarContainer: { boxShadow: boxShadow('#8B5CF6', 0, 30, 0.5) },
  avatarGradientBorder: {
    width: AVATAR_SIZE + 6,
    height: AVATAR_SIZE + 6,
    borderRadius: (AVATAR_SIZE + 6) / 2,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  callerName: {
    fontSize: 30, fontWeight: '800', color: 'white',
    marginTop: 24, letterSpacing: -0.5,
    ...textShadow('rgba(0,0,0,0.5)', 2, 6),
  },
  statusText: {
    fontSize: 17, color: 'rgba(255,255,255,0.65)',
    marginTop: 6, fontWeight: '500',
  },

  // Indicador de audio activo
  streamIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(52,199,89,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.4)',
  },
  streamDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#34C759',
  },
  streamText: { color: '#34C759', fontSize: 12, fontWeight: '600' },

  // Video local en miniatura
  localVideoContainer: {
    position: 'absolute',
    top: 90,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    boxShadow: boxShadow('#000', 4, 8, 0.3),
  },
  localVideo: { flex: 1 },

  // Footer controls
  footer: { paddingHorizontal: 30, paddingBottom: 10, alignItems: 'center' },
  incomingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 10,
  },
  ctrlGroup: { alignItems: 'center', gap: 8 },
  bigBtn: {
    width: 74, height: 74, borderRadius: 37,
    alignItems: 'center', justifyContent: 'center',
    boxShadow: boxShadow('#000', 4, 8, 0.4),
  },
  bigBtnLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },

  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 32,
  },
  ctrlBtn: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  ctrlBtnActive: {
    backgroundColor: 'rgba(139,92,246,0.6)',
    borderColor: 'rgba(139,92,246,0.8)',
  },
  ctrlLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '500', marginTop: 2 },

  hangupRow: { alignItems: 'center', gap: 6 },
  hangupBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#FF3B30',
    alignItems: 'center', justifyContent: 'center',
    boxShadow: boxShadow('#FF3B30', 6, 12, 0.6),
  },
});
