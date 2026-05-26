// hooks/useWebRTC.ts
// Maneja la conexión WebRTC real: audio/video peer-to-peer
// NOTA: react-native-webrtc NO funciona en Expo Go.
// Para WebRTC real, usa: npx expo run:android  o  npx expo run:ios

import { useRef, useCallback, useState, useEffect } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import Constants from 'expo-constants';
import type { Socket } from 'socket.io-client';

// Detectar si estamos corriendo en Expo Go
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

// Tipos locales para no depender de react-native-webrtc en Expo Go
export type WebRTCStream = any;

// ── Servidores STUN/TURN ─────────────────────────────────────────────────────
// openrelay.metered.ca es gratuito pero no confiable para producción.
// Regístrate en https://metered.ca para obtener credenciales propias.
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turns:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle' as RTCBundlePolicy,
  rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
};

// ── Solicitar permisos de cámara y micrófono ─────────────────────────────────
export async function requestMediaPermissions(isVideo: boolean): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Lazy import to avoid web bundler trying to resolve PermissionsAndroid
    const { PermissionsAndroid } = require('react-native');
    try {
      const permissions: string[] = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
      if (isVideo) {
        permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
      }

      const results = await PermissionsAndroid.requestMultiple(
        permissions as any
      );

      const audioGranted = results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
      const cameraGranted = !isVideo || results[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;

      if (!audioGranted || !cameraGranted) {
        const denied: string[] = [];
        if (!audioGranted) denied.push('micrófono');
        if (!cameraGranted) denied.push('cámara');

        // Verificar si el usuario marcó "No volver a preguntar"
        const audioNeverAsk = results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
        const cameraNeverAsk = isVideo && results[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

        if (audioNeverAsk || cameraNeverAsk) {
          Alert.alert(
            'Permisos necesarios',
            `Debuta necesita acceso a ${denied.join(' y ')} para realizar llamadas. ` +
            'Por favor, ve a Configuración de la app y habilita los permisos manualmente.',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Abrir Configuración',
                onPress: () => Linking.openSettings(),
              },
            ]
          );
        } else {
          Alert.alert(
            'Permisos denegados',
            `Necesitas permitir el acceso a ${denied.join(' y ')} para realizar llamadas.`,
            [{ text: 'OK' }]
          );
        }
        return false;
      }

      console.log('✅ [Permisos] Todos los permisos concedidos');
      return true;
    } catch (e: any) {
      console.error('❌ [Permisos] Error solicitando permisos:', e?.message ?? e);
      return false;
    }
  }

  // iOS: los permisos se solicitan automáticamente al usar getUserMedia
  // gracias a las claves NSCameraUsageDescription y NSMicrophoneUsageDescription en app.json
  return true;
}

// ── Stubs para Expo Go ──────────────────────────────────────────────────────
function useWebRTCStub() {
  useEffect(() => {
    if (__DEV__) {
      console.warn(
        '⚠️ [WebRTC] Expo Go detectado — WebRTC NO está disponible.\n' +
        '   Para habilitar llamadas reales ejecuta:\n' +
        '   npx expo run:android'
      );
    }
  }, []);

  const expoGoError = () => {
    throw new Error(
      'EXPO_GO_NO_WEBRTC: Las llamadas no están disponibles en Expo Go. ' +
      'Ejecuta "npx expo run:android" para usar llamadas reales.'
    );
  };

  return {
    localStream:     null as WebRTCStream | null,
    remoteStream:    null as WebRTCStream | null,
    isConnected:     false,
    createOffer:     async (_toId: string, _isVideo: boolean) => { expoGoError(); return null as any; },
    createAnswer:    async (_toId: string, _offerSdp: any, _isVideo: boolean) => { expoGoError(); return null as any; },
    setRemoteAnswer: async (_answerSdp: any) => {},
    addIceCandidate: async (_candidate: any) => {},
    toggleMute:      (_muted: boolean) => {},
    toggleCamera:    (_off: boolean) => {},
    cleanup:         () => {},
  };
}

// ── Hook real (solo para builds nativos) ─────────────────────────────────────
function useWebRTCNative(socket: Socket | null) {
  const {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    MediaStream,
    mediaDevices,
  } = require('react-native-webrtc');

  // ── InCallManager para routing de audio en Android/iOS ───────────────────
  let InCallManager: any = null;
  try {
    InCallManager = require('react-native-incall-manager').default;
  } catch {
    console.warn('⚠️ [WebRTC] react-native-incall-manager no disponible');
  }

  const pcRef              = useRef<any>(null);
  const toIdRef            = useRef<string>('');
  const iceCandidateBuffer = useRef<any[]>([]);
  const remoteDescSet      = useRef(false);
  const socketRef          = useRef<Socket | null>(null);

  // Mantener socketRef actualizado sin re-crear callbacks
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  const [localStream,  setLocalStream]  = useState<WebRTCStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<WebRTCStream | null>(null);
  const [isConnected,  setIsConnected]  = useState(false);

  useEffect(() => {
    if (__DEV__) {
      console.log('🚀 [WebRTC] Hook nativo iniciado. Socket:', socket?.id ?? 'null');
    }
    return () => {
      if (__DEV__) console.log('🧹 [WebRTC] Hook desmontado');
    };
  }, []);

  // ── Obtener acceso al micrófono y cámara ────────────────────────────────
  const getLocalStream = async (isVideo: boolean): Promise<any> => {
    try {
      // Primero solicitar permisos explícitamente en Android
      const permissionsGranted = await requestMediaPermissions(isVideo);
      if (!permissionsGranted) {
        throw new Error('Permisos de micrófono/cámara denegados por el usuario');
      }

      console.log('🎤 [WebRTC] Solicitando getUserMedia... isVideo:', isVideo);
      const stream = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl:  true,
        },
        video: isVideo
          ? { facingMode: 'user', width: 640, height: 480, frameRate: 30 }
          : false,
      });

      const tracks = stream.getTracks();
      console.log(`🎤 [WebRTC] Stream local obtenido. Tracks (${tracks.length}):`);
      tracks.forEach((t: any) => {
        console.log(`   - ${t.kind}: enabled=${t.enabled}, readyState=${t.readyState}`);
      });

      setLocalStream(stream);
      return stream;
    } catch (e: any) {
      console.error('❌ [WebRTC] Error en getUserMedia:', e?.message ?? e);
      throw e;
    }
  };

  // ── Aplicar ICE candidates pendientes del buffer ─────────────────────────
  const flushIceCandidates = async (pc: any) => {
    const pending = iceCandidateBuffer.current.splice(0);
    if (pending.length > 0) {
      console.log(`🧊 [WebRTC] Aplicando ${pending.length} ICE candidate(s) del buffer...`);
    }
    for (const c of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
        console.log('🧊 [WebRTC] ICE candidate del buffer aplicado');
      } catch (e) {
        console.warn('⚠️ [WebRTC] Error aplicando ICE del buffer:', e);
      }
    }
  };

  // ── Crear PeerConnection con todos los callbacks ─────────────────────────
  const createPC = (toId: string): any => {
    if (pcRef.current) {
      console.log('🔧 [WebRTC] Cerrando PeerConnection anterior...');
      pcRef.current.close();
      pcRef.current = null;
    }
    iceCandidateBuffer.current = [];
    remoteDescSet.current      = false;
    toIdRef.current            = toId;

    const pc = new RTCPeerConnection(RTC_CONFIG);

    // ── ICE candidate local generado → enviar al otro lado ───────────────
    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        console.log('🧊 [WebRTC] ICE candidate local generado:', event.candidate.type, event.candidate.protocol);
        socketRef.current?.emit('call:signal', {
          paraId:     toId,
          signalData: { type: 'ice', candidate: event.candidate.toJSON() },
        });
      } else {
        console.log('🧊 [WebRTC] ICE gathering completo (null candidate)');
      }
    };

    // ── Estado de la conexión ICE ─────────────────────────────────────────
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log('🔗 [WebRTC] ICE connection state:', state);

      if (state === 'connected' || state === 'completed') {
        setIsConnected(true);
        console.log('✅ [WebRTC] ¡Conexión ICE establecida! El audio/video debería fluir.');
      } else if (state === 'disconnected') {
        console.warn('⚠️ [WebRTC] ICE desconectado temporalmente...');
        setIsConnected(false);
      } else if (state === 'failed') {
        console.error('❌ [WebRTC] ICE FALLÓ. Intentando restart ICE...');
        setIsConnected(false);
        try { pc.restartIce(); } catch {}
      } else if (state === 'closed') {
        setIsConnected(false);
      }
    };

    // ── Estado de gathering ICE ───────────────────────────────────────────
    pc.onicegatheringstatechange = () => {
      console.log('🧊 [WebRTC] ICE gathering state:', pc.iceGatheringState);
    };

    // ── Estado de señalización ────────────────────────────────────────────
    pc.onsignalingstatechange = () => {
      console.log('📡 [WebRTC] Signaling state:', pc.signalingState);
    };

    // ── Track remoto recibido → AQUÍ se obtiene el audio/video del otro ──
    pc.ontrack = (event: any) => {
      console.log('📡 [WebRTC] ontrack recibido:', {
        kind:         event.track.kind,
        enabled:      event.track.enabled,
        readyState:   event.track.readyState,
        streamsCount: event.streams?.length ?? 0,
      });

      // Asegurarse de que el track esté habilitado
      event.track.enabled = true;

      if (event.streams && event.streams[0]) {
        console.log('✅ [WebRTC] Usando stream remoto del evento. ID:', event.streams[0].id);
        setRemoteStream(event.streams[0]);
      } else {
        // Construir el stream manualmente si no viene en el evento
        console.log('⚠️ [WebRTC] Sin streams en el evento, construyendo manualmente...');
        setRemoteStream((prev: any) => {
          const stream = prev ?? new MediaStream(undefined);
          stream.addTrack(event.track);
          return stream;
        });
      }
    };

    pcRef.current = pc;
    console.log('🔧 [WebRTC] PeerConnection creada para:', toId);
    return pc;
  };

  // ── LLAMANTE: crear oferta SDP ───────────────────────────────────────────
  const createOffer = useCallback(async (toId: string, isVideo: boolean) => {
    try {
      console.log('📤 [WebRTC] === INICIO createOffer ===');

      // Iniciar InCallManager
      try {
        InCallManager?.start({ media: isVideo ? 'video' : 'audio' });
        InCallManager?.setForceSpeakerphoneOn(isVideo);
        console.log('🔊 [WebRTC] InCallManager iniciado');
      } catch (e) {
        console.warn('⚠️ [WebRTC] InCallManager.start falló:', e);
      }

      const stream = await getLocalStream(isVideo);
      const pc     = createPC(toId);

      stream.getTracks().forEach((track: any) => {
        console.log(`➕ [WebRTC] addTrack al PC (caller): ${track.kind}`);
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      });
      await pc.setLocalDescription(offer);

      console.log('📤 [WebRTC] Oferta creada:', {
        type:      offer.type,
        sdpLength: offer.sdp?.length,
      });
      return offer;
    } catch (e: any) {
      console.error('❌ [WebRTC] Error en createOffer:', e?.message ?? e);
      throw e;
    }
  }, []);

  // ── RECEPTOR: crear respuesta SDP a partir de la oferta ─────────────────
  const createAnswer = useCallback(async (toId: string, offerSdp: any, isVideo: boolean) => {
    try {
      console.log('📥 [WebRTC] === INICIO createAnswer ===');
      console.log('📥 [WebRTC] offerSdp recibido:', {
        type:      offerSdp?.type,
        hasSdp:    !!offerSdp?.sdp,
        sdpLength: offerSdp?.sdp?.length,
      });

      // Validar que la oferta SDP es válida
      if (!offerSdp?.sdp || offerSdp?.type !== 'offer') {
        throw new Error(`signalData inválido: type=${offerSdp?.type}, hasSdp=${!!offerSdp?.sdp}`);
      }

      // Iniciar InCallManager
      try {
        InCallManager?.start({ media: isVideo ? 'video' : 'audio' });
        InCallManager?.setForceSpeakerphoneOn(isVideo);
        console.log('🔊 [WebRTC] InCallManager iniciado');
      } catch (e) {
        console.warn('⚠️ [WebRTC] InCallManager.start falló:', e);
      }

      const stream = await getLocalStream(isVideo);
      const pc     = createPC(toId);

      stream.getTracks().forEach((track: any) => {
        console.log(`➕ [WebRTC] addTrack al PC (callee): ${track.kind}`);
        pc.addTrack(track, stream);
      });

      // Establecer la descripción remota (oferta del llamante)
      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
      remoteDescSet.current = true;
      console.log('📥 [WebRTC] RemoteDescription (offer) establecida. Signaling:', pc.signalingState);

      // Aplicar ICE candidates que llegaron antes de la oferta
      await flushIceCandidates(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log('📥 [WebRTC] Respuesta creada:', {
        type:      answer.type,
        sdpLength: answer.sdp?.length,
      });
      return answer;
    } catch (e: any) {
      console.error('❌ [WebRTC] Error en createAnswer:', e?.message ?? e);
      throw e;
    }
  }, []);

  // ── LLAMANTE: establecer la respuesta del receptor ──────────────────────
  const setRemoteAnswer = useCallback(async (answerSdp: any) => {
    const pc = pcRef.current;
    if (!pc) {
      console.warn('⚠️ [WebRTC] setRemoteAnswer: no hay PeerConnection');
      return;
    }
    try {
      console.log('✅ [WebRTC] setRemoteAnswer recibido:', {
        type:      answerSdp?.type,
        hasSdp:    !!answerSdp?.sdp,
        sdpLength: answerSdp?.sdp?.length,
      });

      // Solo aplicar si aún no tiene remote description
      if (pc.remoteDescription?.type) {
        console.warn('⚠️ [WebRTC] RemoteDescription ya establecida, ignorando duplicado');
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(answerSdp));
      remoteDescSet.current = true;
      console.log('✅ [WebRTC] Answer establecido. Signaling state:', pc.signalingState);

      // Aplicar ICE candidates pendientes
      await flushIceCandidates(pc);
    } catch (e: any) {
      console.error('❌ [WebRTC] Error en setRemoteAnswer:', e?.message ?? e);
    }
  }, []);

  // ── Agregar candidato ICE recibido del otro lado ─────────────────────────
  const addIceCandidate = useCallback(async (candidate: any) => {
    const pc = pcRef.current;
    if (!pc) {
      console.log('📦 [WebRTC] addIceCandidate: no hay PC aún, descartando');
      return;
    }
    try {
      if (!remoteDescSet.current || !pc.remoteDescription?.type) {
        console.log('📦 [WebRTC] Bufferizando ICE candidate (sin remoteDescription aún)');
        iceCandidateBuffer.current.push(candidate);
        return;
      }
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('🧊 [WebRTC] ICE candidate aplicado directamente');
    } catch (e: any) {
      console.error('❌ [WebRTC] Error en addIceCandidate:', e?.message ?? e);
    }
  }, []);

  // ── Controles de media ───────────────────────────────────────────────────
  const toggleMute = useCallback((muted: boolean) => {
    localStream?.getAudioTracks().forEach((track: any) => {
      track.enabled = !muted;
      console.log('🎤 [WebRTC] Micrófono:', muted ? 'SILENCIADO' : 'ACTIVO');
    });
  }, [localStream]);

  const toggleCamera = useCallback((cameraOff: boolean) => {
    localStream?.getVideoTracks().forEach((track: any) => {
      track.enabled = !cameraOff;
      console.log('📷 [WebRTC] Cámara:', cameraOff ? 'APAGADA' : 'ENCENDIDA');
    });
  }, [localStream]);

  // ── Limpiar todo al colgar ───────────────────────────────────────────────
  const cleanup = useCallback(() => {
    console.log('🧹 [WebRTC] Limpiando PeerConnection y streams...');

    try {
      InCallManager?.stop();
      console.log('🔊 [WebRTC] InCallManager detenido');
    } catch {}

    localStream?.getTracks().forEach((track: any) => {
      track.stop();
      console.log(`🧹 [WebRTC] Track detenido: ${track.kind}`);
    });

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    remoteDescSet.current      = false;
    iceCandidateBuffer.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setIsConnected(false);
    console.log('🧹 [WebRTC] Limpieza completa');
  }, [localStream]);

  return {
    localStream,
    remoteStream,
    isConnected,
    createOffer,
    createAnswer,
    setRemoteAnswer,
    addIceCandidate,
    toggleMute,
    toggleCamera,
    cleanup,
  };
}

// ── Export principal ──────────────────────────────────────────────────────────
export function useWebRTC(socket: Socket | null) {
  if (IS_EXPO_GO) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useWebRTCStub();
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useWebRTCNative(socket);
}
