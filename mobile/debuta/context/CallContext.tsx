// CallContext.tsx — Gestión global de llamadas con toast premium
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from './SocketContext';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  StyleSheet, View, Text, Image, TouchableOpacity,
  Animated, Dimensions, Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer } from 'expo-audio';
// SafeAreaInsets is handled via Platform constants below

const { width } = Dimensions.get('window');

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface CallInfo {
  fromId: string;
  callerName: string;
  callerPhoto?: string;
  isVideo: boolean;
  signalData?: any;
}

interface CallContextType {
  incomingCall: CallInfo | null;
  activeCall: CallInfo | null;
  isOutgoing: boolean;
  initiateCall: (toId: string, name: string, photo: string | undefined, isVideo: boolean) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
}

const CallContext = createContext<CallContextType>({
  incomingCall: null,
  activeCall: null,
  isOutgoing: false,
  initiateCall: () => {},
  acceptCall: () => {},
  rejectCall: () => {},
  endCall: () => {},
});

// ── Toast de llamada entrante ─────────────────────────────────────────────────
function IncomingCallToast({ call, onAccept, onReject }: {
  call: CallInfo;
  onAccept: () => void;
  onReject: () => void;
}) {
  const safeTop = Platform.OS === 'ios' ? 50 : 30;
  const slideAnim = useRef(new Animated.Value(-160)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Slide down from top
    Animated.spring(slideAnim, {
      toValue: safeTop,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();

    // Pulse animation for the icon
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  const dismiss = (action: 'accept' | 'reject') => {
    Animated.timing(slideAnim, {
      toValue: -200,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      if (action === 'accept') onAccept();
      else onReject();
    });
  };

  return (
    <Animated.View style={[
      s.toast,
      { transform: [{ translateY: slideAnim }] },
    ]}>
      <BlurView intensity={95} tint="dark" style={s.toastBlur}>
        <LinearGradient
          colors={['rgba(139,92,246,0.25)', 'rgba(217,70,239,0.15)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={s.toastInner}>
          {/* Avatar + Pulse ring */}
          <View style={s.avatarZone}>
            <Animated.View style={[s.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
            <Image
              source={{ uri: call.callerPhoto || 'https://via.placeholder.com/80' }}
              style={s.toastAvatar}
            />
          </View>

          {/* Info */}
          <View style={s.toastInfo}>
            <Text style={s.toastName} numberOfLines={1}>{call.callerName}</Text>
            <View style={s.toastTypeBadge}>
              <Ionicons
                name={call.isVideo ? 'videocam' : 'call'}
                size={11}
                color="rgba(255,255,255,0.8)"
              />
              <Text style={s.toastTypeText}>
                {call.isVideo ? 'Video llamada' : 'Llamada de voz'}
              </Text>
            </View>
          </View>

          {/* Acciones */}
          <View style={s.toastActions}>
            <TouchableOpacity
              style={[s.toastBtn, s.rejectBtn]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                dismiss('reject');
              }}
            >
              <Ionicons name="close" size={22} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toastBtn, s.acceptBtn]}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                dismiss('accept');
              }}
            >
              <Ionicons name={call.isVideo ? 'videocam' : 'call'} size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────
export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket } = useSocket();
  const [incomingCall, setIncomingCall] = useState<CallInfo | null>(null);
  const [activeCall, setActiveCall] = useState<CallInfo | null>(null);
  const [isOutgoing, setIsOutgoing] = useState(false);
  // Ref para navegación segura (evitar navigate antes de que el stack esté listo)
  const canNavigate = useRef(false);
  // ── Audio: ringtone con expo-audio (compatible con Expo Go SDK 55) ──────────
  const ringtonePlayer = useAudioPlayer(
    require('../assets/sounds/ringtone.m4a')
  );

  const playRingtone = useCallback(() => {
    try {
      ringtonePlayer.loop = true;
      ringtonePlayer.play();
    } catch (e) {
      console.warn('Error al reproducir ringtone:', e);
    }
  }, [ringtonePlayer]);

  const stopRingtone = useCallback(() => {
    try {
      ringtonePlayer.pause();
      ringtonePlayer.seekTo(0);
    } catch (e) {
      console.warn('Error al detener ringtone:', e);
    }
  }, [ringtonePlayer]);

  useEffect(() => {
    // Permitir navegación después del primer render
    const t = setTimeout(() => { canNavigate.current = true; }, 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (data: CallInfo) => {
      console.log('📞 [CALL] Llamada entrante de:', data.callerName, '| fromId:', data.fromId);
      setIncomingCall(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      playRingtone();
    };

    const handleAccepted = (data: { signalData: any; answererId: string }) => {
      console.log('✅ [CALL] Llamada aceptada por:', data.answererId);
      stopRingtone();
      setActiveCall(prev => prev ? { ...prev, signalData: data.signalData } : null);
      setIsOutgoing(false);
    };

    const handleRejected = () => {
      console.log('❌ [CALL] Llamada rechazada');
      stopRingtone();
      setIncomingCall(null);
      setActiveCall(null);
      setIsOutgoing(false);
      try {
        if (router.canGoBack()) router.back();
      } catch {}
    };

    const handleEnded = () => {
      console.log('📵 [CALL] Llamada terminada por el otro lado');
      stopRingtone();
      setIncomingCall(null);
      setActiveCall(null);
      setIsOutgoing(false);
      try {
        if (router.canGoBack()) router.back();
      } catch {}
    };

    const handleUnavailable = ({ reason }: { paraId: string; reason: string }) => {
      console.warn('⚠️ [CALL] Receptor no disponible:', reason);
      stopRingtone();
      setActiveCall(null);
      setIsOutgoing(false);
      try {
        if (router.canGoBack()) router.back();
      } catch {}
    };

    socket.on('call:incoming',    handleIncoming);
    socket.on('call:accepted',    handleAccepted);
    socket.on('call:rejected',    handleRejected);
    socket.on('call:ended',       handleEnded);
    socket.on('call:unavailable', handleUnavailable);

    return () => {
      socket.off('call:incoming',    handleIncoming);
      socket.off('call:accepted',    handleAccepted);
      socket.off('call:rejected',    handleRejected);
      socket.off('call:ended',       handleEnded);
      socket.off('call:unavailable', handleUnavailable);
    };
  }, [socket, playRingtone, stopRingtone]);

  // ── Iniciar llamada saliente ───────────────────────────────────────────────
  const initiateCall = useCallback((toId: string, name: string, photo: string | undefined, isVideo: boolean) => {
    if (!socket) {
      console.warn('⚠️ [CALL] Socket no conectado, no se puede llamar');
      return;
    }

    if (!socket.connected) {
      console.warn('⚠️ [CALL] Socket existe pero no está conectado, reintentando...');
      return;
    }

    console.log(`📞 [CALL] Iniciando llamada a ${name} (${toId}) | Video: ${isVideo}`);

    const callData: CallInfo = {
      fromId: toId,
      callerName: name,
      callerPhoto: photo,
      isVideo,
    };

    setActiveCall(callData);
    setIsOutgoing(true);
    playRingtone();

    // Emitir al servidor con nombre y foto para que el backend los reenvíe al receptor
    socket.emit('call:request', {
      paraId: toId,
      isVideo,
      signalData: { type: 'offer', sdp: null },
      callerName: name,
      callerPhoto: photo || null,
    });

    console.log('📡 [CALL] call:request emitido al servidor');

    // Navegar a la pantalla de llamada
    try {
      router.push({
        pathname: '/call',
        params: {
          userId: toId,
          name,
          photo: photo || '',
          isVideo: isVideo ? 'true' : 'false',
          type: 'outgoing',
        },
      });
    } catch (e) {
      console.warn('Error navegando a /call:', e);
    }
  }, [socket, playRingtone]);

  // ── Aceptar llamada entrante ───────────────────────────────────────────────
  const acceptCall = useCallback(() => {
    if (!socket || !incomingCall) return;

    // Detener timbre al aceptar
    stopRingtone();

    const call = { ...incomingCall };
    setActiveCall(call);
    setIncomingCall(null);
    setIsOutgoing(false);

    socket.emit('call:accept', {
      paraId: call.fromId,
      signalData: { type: 'answer', sdp: null },
    });

    try {
      router.push({
        pathname: '/call',
        params: {
          userId: call.fromId,
          name: call.callerName,
          photo: call.callerPhoto || '',
          isVideo: call.isVideo ? 'true' : 'false',
          type: 'active',
        },
      });
    } catch (e) {
      console.warn('Error navegando a /call al aceptar:', e);
    }
  }, [socket, incomingCall, stopRingtone]);

  // ── Rechazar llamada ──────────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    if (!socket || !incomingCall) return;
    // Detener timbre al rechazar
    stopRingtone();
    socket.emit('call:reject', { paraId: incomingCall.fromId });
    setIncomingCall(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [socket, incomingCall, stopRingtone]);

  // ── Terminar llamada ──────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    if (!socket) return;
    // Detener timbre al colgar
    stopRingtone();
    const targetId = activeCall?.fromId || incomingCall?.fromId;
    if (targetId) {
      socket.emit('call:end', { paraId: targetId });
    }
    setActiveCall(null);
    setIncomingCall(null);
    setIsOutgoing(false);
    try {
      if (router.canGoBack()) router.back();
    } catch {}
  }, [socket, activeCall, incomingCall, stopRingtone]);

  return (
    <CallContext.Provider value={{
      incomingCall,
      activeCall,
      isOutgoing,
      initiateCall,
      acceptCall,
      rejectCall,
      endCall,
    }}>
      {children}

      {/* Toast de llamada entrante — renderizado sobre todo */}
      {incomingCall && (
        <IncomingCallToast
          call={incomingCall}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}
    </CallContext.Provider>
  );
};

const s = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 99999,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  toastBlur: { overflow: 'hidden', borderRadius: 24 },
  toastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  avatarZone: { position: 'relative', width: 52, height: 52 },
  pulseRing: {
    position: 'absolute',
    top: -4, left: -4, right: -4, bottom: -4,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: 'rgba(139,92,246,0.5)',
  },
  toastAvatar: { width: 52, height: 52, borderRadius: 26 },
  toastInfo: { flex: 1 },
  toastName: { color: 'white', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  toastTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  toastTypeText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' },
  toastActions: { flexDirection: 'row', gap: 10 },
  toastBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  rejectBtn: { backgroundColor: '#FF3B30' },
  acceptBtn: { backgroundColor: '#34C759' },
});

export const useCall = () => useContext(CallContext);
