// CallContext.tsx — Gestión global de llamadas con WebRTC real
import React, {
  createContext, useContext, useEffect, useState,
  useCallback, useRef, useMemo,
} from 'react';
import { useSocket } from './SocketContext';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Alert, Linking,
} from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { useWebRTC, requestMediaPermissions } from '../hooks/useWebRTC';
import type { WebRTCStream as MediaStream } from '../hooks/useWebRTC';
import IncomingCallScreen from '../components/pages/IncomingCallScreen';

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
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  initiateCall: (toId: string, name: string, photo: string | undefined, isVideo: boolean) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: (muted: boolean) => void;
  toggleCamera: (off: boolean) => void;
}

const CallContext = createContext<CallContextType>({
  incomingCall: null,
  activeCall: null,
  isOutgoing: false,
  localStream: null,
  remoteStream: null,
  initiateCall: () => {},
  acceptCall: () => {},
  rejectCall: () => {},
  endCall: () => {},
  toggleMute: () => {},
  toggleCamera: () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────
export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket } = useSocket();
  const [incomingCall, setIncomingCall] = useState<CallInfo | null>(null);
  const [activeCall, setActiveCall]     = useState<CallInfo | null>(null);
  const [isOutgoing, setIsOutgoing]     = useState(false);

  // Guards para evitar operaciones duplicadas
  const acceptingRef   = useRef(false);
  const initiatingRef  = useRef(false);
  const canNavigate    = useRef(false);

  // Ref para acceder al activeCall actual dentro de callbacks del socket
  const activeCallRef = useRef<CallInfo | null>(null);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);

  const isOutgoingRef = useRef(false);
  useEffect(() => { isOutgoingRef.current = isOutgoing; }, [isOutgoing]);

  // ── WebRTC ────────────────────────────────────────────────────────────
  const {
    localStream,
    remoteStream,
    createOffer,
    createAnswer,
    setRemoteAnswer,
    addIceCandidate,
    toggleMute: rtcToggleMute,
    toggleCamera: rtcToggleCamera,
    cleanup: rtcCleanup,
  } = useWebRTC(socket);

  // ── Audio: ringtone ───────────────────────────────────────────────────
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
    const t = setTimeout(() => { canNavigate.current = true; }, 800);
    return () => clearTimeout(t);
  }, []);

  // ── Reset de guards al limpiar ────────────────────────────────────────
  const fullCleanup = useCallback(() => {
    acceptingRef.current  = false;
    initiatingRef.current = false;
    rtcCleanup();
  }, [rtcCleanup]);

  // ── Escuchar eventos del socket ───────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Llamada entrante: el receptor recibe la oferta SDP real
    const handleIncoming = async (data: any) => {
      console.log('📞 [CALL] Llamada entrante de:', data.callerName, '| fromId:', data.fromId);
      console.log('📞 [CALL] signalData recibido:', JSON.stringify({
        type:      data.signalData?.type,
        hasSdp:    !!data.signalData?.sdp,
        sdpLength: data.signalData?.sdp?.length ?? 0,
      }));

      // Validar que llega la oferta SDP
      if (!data.signalData?.sdp || data.signalData?.type !== 'offer') {
        console.error('❌ [CALL] handleIncoming: signalData inválido o sin SDP', data.signalData);
        return;
      }

      const callInfo: CallInfo = {
        fromId:      data.fromId,
        callerName:  data.callerName,
        callerPhoto: data.callerPhoto,
        isVideo:     data.isVideo,
        signalData:  data.signalData,
      };
      setIncomingCall(callInfo);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      playRingtone();
    };

    // El llamante recibe la respuesta SDP del receptor
    const handleAccepted = async (data: { signalData: any; answererId: string }) => {
      console.log('✅ [CALL] Llamada aceptada por', data.answererId);
      console.log('✅ [CALL] answer signalData:', JSON.stringify({
        type:      data.signalData?.type,
        hasSdp:    !!data.signalData?.sdp,
        sdpLength: data.signalData?.sdp?.length ?? 0,
      }));
      stopRingtone();

      // Establecer la respuesta SDP del receptor en nuestro PeerConnection
      if (data.signalData?.type === 'answer' && data.signalData?.sdp) {
        await setRemoteAnswer(data.signalData);
        console.log('🔊 [CALL] RemoteAnswer establecido. El audio debería fluir ahora.');
      } else {
        console.error('❌ [CALL] handleAccepted: signalData inválido o faltante', data.signalData);
        Alert.alert('Error de conexión', 'No se pudo establecer el canal de audio. Intenta de nuevo.');
        return;
      }

      setActiveCall(prev =>
        prev
          ? { ...prev, fromId: data.answererId, signalData: data.signalData }
          : null
      );
      setIsOutgoing(false);

      // Reemplazar la pantalla "llamando..." con la pantalla activa
      try {
        router.replace({
          pathname: '/call',
          params: {
            userId:  data.answererId,
            name:    activeCallRef.current?.callerName ?? '',
            photo:   activeCallRef.current?.callerPhoto ?? '',
            isVideo: activeCallRef.current?.isVideo ? 'true' : 'false',
            type:    'active',
          },
        });
      } catch (e) {
        console.warn('[CALL] Error navegando a /call en handleAccepted:', e);
      }
    };

    const handleRejected = () => {
      console.log('❌ [CALL] Llamada rechazada');
      stopRingtone();
      fullCleanup();
      setIncomingCall(null);
      setActiveCall(null);
      setIsOutgoing(false);
      try { if (router.canGoBack()) router.back(); } catch {}
    };

    const handleEnded = () => {
      console.log('📵 [CALL] Llamada terminada por el otro lado');
      stopRingtone();
      fullCleanup();
      setIncomingCall(null);
      setActiveCall(null);
      setIsOutgoing(false);
      try { if (router.canGoBack()) router.back(); } catch {}
    };

    const handleUnavailable = ({ reason }: { paraId: string; reason: string }) => {
      console.warn('⚠️ [CALL] Receptor no disponible:', reason);
      stopRingtone();
      fullCleanup();
      setActiveCall(null);
      setIsOutgoing(false);
      try { if (router.canGoBack()) router.back(); } catch {}
      setTimeout(() => {
        Alert.alert(
          'No disponible',
          'El usuario no está conectado en este momento. Intenta más tarde.',
          [{ text: 'OK' }]
        );
      }, 300);
    };

    const handleWaiting = ({ paraId, reason }: { paraId: string; reason: string }) => {
      console.log(`⏳ [CALL] Receptor offline/esperando: ${paraId} (razón: ${reason})`);
      // La llamada sigue en curso esperando que se conecte
    };

    // Señales WebRTC: ICE candidates y renegociación
    const handleSignal = async ({ signalData }: { fromId: string; signalData: any }) => {
      if (!signalData) return;

      if (signalData.type === 'ice' && signalData.candidate) {
        console.log('🧊 [CALL] ICE candidate recibido del otro lado');
        await addIceCandidate(signalData.candidate);
      } else if (signalData.type === 'answer' && signalData.sdp) {
        // Por si llega por call:signal en vez de call:accepted
        console.log('📥 [CALL] Answer recibido por call:signal (fallback)');
        await setRemoteAnswer(signalData);
      }
    };

    socket.on('call:incoming',    handleIncoming);
    socket.on('call:accepted',    handleAccepted);
    socket.on('call:rejected',    handleRejected);
    socket.on('call:ended',       handleEnded);
    socket.on('call:unavailable', handleUnavailable);
    socket.on('call:signal',      handleSignal);
    socket.on('call:waiting',     handleWaiting);

    return () => {
      socket.off('call:incoming',    handleIncoming);
      socket.off('call:accepted',    handleAccepted);
      socket.off('call:rejected',    handleRejected);
      socket.off('call:ended',       handleEnded);
      socket.off('call:unavailable', handleUnavailable);
      socket.off('call:signal',      handleSignal);
      socket.off('call:waiting',     handleWaiting);
    };
  }, [socket, playRingtone, stopRingtone, setRemoteAnswer, addIceCandidate, fullCleanup]);

  // ── Iniciar llamada saliente ───────────────────────────────────────────
  const initiateCall = useCallback(async (
    toId: string, name: string, photo: string | undefined, isVideo: boolean
  ) => {

    // Guard: evitar doble llamada
    if (initiatingRef.current) {
      console.warn('⚠️ [CALL] initiateCall ya en progreso, ignorando');
      return;
    }
    if (!socket?.connected) {
      console.warn('⚠️ [CALL] Socket no conectado');
      Alert.alert('Sin conexión', 'Verifica tu conexión a internet e intenta de nuevo.');
      return;
    }

    // Solicitar permisos de micrófono/cámara antes de intentar la llamada
    const permissionsOk = await requestMediaPermissions(isVideo);
    if (!permissionsOk) {
      console.warn('⚠️ [CALL] Permisos denegados, cancelando llamada');
      return;
    }

    initiatingRef.current = true;
    console.log(`📞 [CALL] Iniciando llamada a ${name} (${toId}) | Video: ${isVideo}`);

    const callData: CallInfo = { fromId: toId, callerName: name, callerPhoto: photo, isVideo };
    setActiveCall(callData);
    activeCallRef.current = callData;
    setIsOutgoing(true);
    playRingtone();

    try {
      // Crear oferta SDP real con audio/video
      const offer = await createOffer(toId, isVideo);

      if (!offer?.sdp) {
        throw new Error('La oferta SDP generada es inválida');
      }

      socket.emit('call:request', {
        paraId:      toId,
        isVideo,
        signalData:  offer,          // SDP REAL
        callerName:  name,
        callerPhoto: photo || null,
      });

      console.log('📡 [CALL] call:request emitido con SDP real. type:', offer.type);
      initiatingRef.current = false;

      // Timeout de 30s si no hay respuesta
      setTimeout(() => {
        if (isOutgoingRef.current && activeCallRef.current?.fromId === toId) {
          endCall();
          Alert.alert('Sin respuesta', 'El usuario no respondió la llamada.');
        }
      }, 30000);

      // Navegar a pantalla de "llamando..."
      router.push({
        pathname: '/call',
        params: {
          userId:  toId,
          name,
          photo:   photo || '',
          isVideo: isVideo ? 'true' : 'false',
          type:    'outgoing',
        },
      });
    } catch (e: any) {
      const msg = e?.message ?? '';
      console.error('❌ [CALL] Error creando oferta WebRTC:', msg);
      stopRingtone();
      fullCleanup();
      setActiveCall(null);
      setIsOutgoing(false);
      initiatingRef.current = false;

      // No mostrar alert si ya se manejó por permisos denegados
      if (!msg.includes('Permisos de micrófono')) {
        Alert.alert(
          'Error de llamada',
          'No se pudo iniciar la llamada. Verifica que tienes los permisos de micrófono habilitados.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Abrir Configuración',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      }
    }
  }, [socket, playRingtone, stopRingtone, createOffer, fullCleanup, endCall]);

  // ── Aceptar llamada entrante ───────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!socket || !incomingCall) return;


    // Guard: evitar doble aceptación (desde toast + desde CallScreen)
    if (acceptingRef.current) {
      console.warn('⚠️ [CALL] acceptCall ya en progreso, ignorando duplicado');
      return;
    }
    acceptingRef.current = true;

    // Validar que existe la oferta SDP del llamante
    if (!incomingCall.signalData?.sdp || incomingCall.signalData?.type !== 'offer') {
      console.error('❌ [CALL] acceptCall: signalData inválido', incomingCall.signalData);
      Alert.alert('Error de conexión', 'Datos de la llamada incompletos. Intenta de nuevo.');
      acceptingRef.current = false;
      return;
    }

    // Solicitar permisos de micrófono/cámara antes de aceptar
    const permissionsOk = await requestMediaPermissions(incomingCall.isVideo);
    if (!permissionsOk) {
      console.warn('⚠️ [CALL] Permisos denegados, rechazando llamada');
      socket.emit('call:reject', { paraId: incomingCall.fromId });
      setIncomingCall(null);
      stopRingtone();
      acceptingRef.current = false;
      return;
    }

    stopRingtone();
    const call = { ...incomingCall };
    setActiveCall(call);
    setIncomingCall(null);
    setIsOutgoing(false);

    try {
      // Crear respuesta SDP real a partir de la oferta recibida
      console.log('📥 [CALL] Creando answer para la oferta de:', call.fromId);
      const answer = await createAnswer(call.fromId, call.signalData, call.isVideo);

      if (!answer?.sdp) {
        throw new Error('El answer SDP generado es inválido');
      }

      socket.emit('call:accept', {
        paraId:     call.fromId,
        signalData: answer,          // SDP REAL
      });

      console.log('📥 [CALL] call:accept emitido con answer SDP. type:', answer.type);
    } catch (e: any) {
      const msg = e?.message ?? '';
      console.error('❌ [CALL] Error creando respuesta WebRTC:', msg);
      fullCleanup();
      setActiveCall(null);
      acceptingRef.current = false;

      if (!msg.includes('Permisos de micrófono')) {
        Alert.alert(
          'Error de llamada',
          'No se pudo acceder al micrófono/cámara. Verifica los permisos en Configuración.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Abrir Configuración',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      }
      return;
    }

    try {
      router.push({
        pathname: '/call',
        params: {
          userId:  call.fromId,
          name:    call.callerName,
          photo:   call.callerPhoto || '',
          isVideo: call.isVideo ? 'true' : 'false',
          type:    'active',
        },
      });
    } catch (e) {
      console.warn('[CALL] Error navegando a /call al aceptar:', e);
    }
  }, [socket, incomingCall, stopRingtone, createAnswer, fullCleanup]);

  // ── Rechazar llamada ──────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    if (!socket || !incomingCall) return;
    stopRingtone();
    fullCleanup();
    socket.emit('call:reject', { paraId: incomingCall.fromId });
    setIncomingCall(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [socket, incomingCall, stopRingtone, fullCleanup]);

  // ── Terminar llamada ──────────────────────────────────────────────────
  const endCall = useCallback(() => {
    if (!socket) return;
    const targetId = activeCall?.fromId || incomingCall?.fromId;
    if (!targetId) return;
    stopRingtone();
    socket.emit('call:end', { paraId: targetId });
    fullCleanup();
    setActiveCall(null);
    setIncomingCall(null);
    setIsOutgoing(false);
    try { if (router.canGoBack()) router.back(); } catch {}
  }, [socket, activeCall, incomingCall, stopRingtone, fullCleanup]);

  const value = useMemo(() => ({
    incomingCall,
    activeCall,
    isOutgoing,
    localStream,
    remoteStream,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute:   rtcToggleMute,
    toggleCamera: rtcToggleCamera,
  }), [
    incomingCall, activeCall, isOutgoing,
    localStream, remoteStream,
    initiateCall, acceptCall, rejectCall, endCall,
    rtcToggleMute, rtcToggleCamera,
  ]);

  return (
    <CallContext.Provider value={value}>
      {children}
      {incomingCall && (
        <IncomingCallScreen
          call={incomingCall}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);
