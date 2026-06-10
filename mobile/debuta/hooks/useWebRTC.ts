// hooks/useWebRTC.ts
// Maneja la conexión WebRTC real: audio/video peer-to-peer
// NOTA: react-native-webrtc NO funciona en Expo Go.
// Para WebRTC real, usa: npx expo run:android  o  npx expo run:ios

import { useRef, useCallback, useState, useEffect } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import Constants from 'expo-constants';
import type { Socket } from 'socket.io-client';
import { api } from '../components/services/api';

// Detectar si estamos corriendo en Expo Go
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

// Tipos locales para no depender de react-native-webrtc en Expo Go
export type WebRTCStream = any;

// ── Configuración base del PeerConnection (sin iceServers — vienen del backend) ─
const RTC_CONFIG_BASE = {
  iceCandidatePoolSize: 10,
  bundlePolicy:  'max-bundle'  as RTCBundlePolicy,
  rtcpMuxPolicy: 'require'     as RTCRtcpMuxPolicy,
};

// Servidores ICE de respaldo (si el backend no responde)
const ICE_SERVERS_FALLBACK = [
  { urls: 'stun:stun.l.google.com:19302'  },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  {
    urls:       'turn:openrelay.metered.ca:80',
    username:   'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls:       'turn:openrelay.metered.ca:443',
    username:   'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls:       'turns:openrelay.metered.ca:443',
    username:   'openrelayproject',
    credential: 'openrelayproject',
  },
];

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

      const audioGranted  = results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
      const cameraGranted = !isVideo || results[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;

      if (!audioGranted || !cameraGranted) {
        const denied: string[] = [];
        if (!audioGranted)  denied.push('micrófono');
        if (!cameraGranted) denied.push('cámara');

        const audioNeverAsk  = results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
        const cameraNeverAsk = isVideo && results[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

        if (audioNeverAsk || cameraNeverAsk) {
          Alert.alert(
            'Permisos necesarios',
            `Debuta necesita acceso a ${denied.join(' y ')} para realizar llamadas. ` +
            'Por favor, ve a Configuración de la app y habilita los permisos manualmente.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Abrir Configuración', onPress: () => Linking.openSettings() },
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
  return true;
}

// ── Implementación stub para Expo Go (sin audio real) ───────────────────────
function useWebRTCExpoGo(_socket: Socket | null) {
  const [localStream,  setLocalStream]  = useState<WebRTCStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<WebRTCStream | null>(null);
  const [isConnected,  setIsConnected]  = useState(false);

  useEffect(() => {
    console.warn(
      '⚠️ [ExpoGo] Las llamadas de audio/vídeo no están disponibles en Expo Go.\n' +
      '   Usa "npx expo run:android" o "npx expo run:ios" para probar WebRTC real.'
    );
  }, []);

  const createOffer = useCallback(async (_toId: string, _isVideo: boolean) => {
    Alert.alert(
      'Expo Go – Sin audio',
      'Las llamadas en tiempo real no están disponibles en Expo Go. ' +
      'Compila la app con "npx expo run:android" para habilitar WebRTC.',
      [{ text: 'OK' }]
    );
    return { type: 'offer', sdp: `expo-go-stub:${Date.now()}` };
  }, []);

  const createAnswer = useCallback(async (_toId: string, _offerSdp: any, _isVideo: boolean) => {
    setLocalStream({ active: false, type: 'stub' });
    return { type: 'answer', sdp: `expo-go-stub-answer:${Date.now()}` };
  }, []);

  const setRemoteAnswer  = useCallback(async (_answerSdp: any) => { setIsConnected(false); }, []);
  const addIceCandidate  = useCallback(async (_candidate: any) => {}, []);
  const toggleMute       = useCallback((_muted: boolean) => {}, []);
  const toggleCamera     = useCallback((_off: boolean) => {}, []);

  const cleanup = useCallback(() => {
    setLocalStream(null);
    setRemoteStream(null);
    setIsConnected(false);
  }, []);

  return { localStream, remoteStream, isConnected, createOffer, createAnswer, setRemoteAnswer, addIceCandidate, toggleMute, toggleCamera, cleanup };
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
  const localStreamRef     = useRef<any>(null);
  // ICE servers obtenidos del backend — se actualizan antes de cada llamada
  const iceServersRef      = useRef<any[]>(ICE_SERVERS_FALLBACK);

  useEffect(() => { socketRef.current = socket; }, [socket]);

  const [localStream,  setLocalStream]  = useState<WebRTCStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<WebRTCStream | null>(null);
  const [isConnected,  setIsConnected]  = useState(false);

  useEffect(() => {
    if (__DEV__) console.log('🚀 [WebRTC] Hook nativo iniciado. Socket:', socket?.id ?? 'null');
    return () => { if (__DEV__) console.log('🧹 [WebRTC] Hook desmontado'); };
  }, []);

  // ── Obtener ICE servers frescos del backend ──────────────────────────────
  const fetchIceServers = async (): Promise<any[]> => {
    try {
      const data = await api.get<{ iceServers: any[] }>('/ice-servers');
      if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
        console.log(`✅ [WebRTC] ICE servers del backend: ${data.iceServers.length} servidor(es)`);
        return data.iceServers;
      }
    } catch (e: any) {
      console.warn('⚠️ [WebRTC] Error al obtener ICE servers, usando fallback:', e?.message);
    }
    console.log(`⚠️ [WebRTC] Usando ${ICE_SERVERS_FALLBACK.length} ICE servers de respaldo`);
    return ICE_SERVERS_FALLBACK;
  };

  // ── Acceso al micrófono y cámara ────────────────────────────────────────
  const getLocalStream = async (isVideo: boolean): Promise<any> => {
    try {
      console.log('🎤 [WebRTC] Solicitando getUserMedia... isVideo:', isVideo);
      const stream = await mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
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
      localStreamRef.current = stream;
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
      } catch (e) {
        console.warn('⚠️ [WebRTC] Error aplicando ICE del buffer:', e);
      }
    }
  };

  // ── Crear PeerConnection con ICE servers actuales ─────────────────────────
  const createPC = (toId: string): any => {
    if (pcRef.current) {
      console.log('🔧 [WebRTC] Cerrando PeerConnection anterior...');
      pcRef.current.close();
      pcRef.current = null;
    }
    iceCandidateBuffer.current = [];
    remoteDescSet.current      = false;
    toIdRef.current            = toId;

    const pc = new RTCPeerConnection({
      ...RTC_CONFIG_BASE,
      iceServers: iceServersRef.current,
    });

    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        console.log('🧊 [WebRTC] ICE candidate local:', event.candidate.type, event.candidate.protocol);
        socketRef.current?.emit('call:signal', {
          paraId:     toId,
          signalData: { type: 'ice', candidate: event.candidate.toJSON() },
        });
      } else {
        console.log('🧊 [WebRTC] ICE gathering completo');
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log('🔗 [WebRTC] ICE connection state:', state);
      if (state === 'connected' || state === 'completed') {
        setIsConnected(true);
        console.log('✅ [WebRTC] Conexión establecida. El audio/video debería fluir.');
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

    pc.onicegatheringstatechange = () => {
      console.log('🧊 [WebRTC] ICE gathering state:', pc.iceGatheringState);
    };

    pc.onsignalingstatechange = () => {
      console.log('📡 [WebRTC] Signaling state:', pc.signalingState);
    };

    pc.ontrack = (event: any) => {
      console.log('📡 [WebRTC] ontrack recibido:', {
        kind: event.track.kind, enabled: event.track.enabled,
        readyState: event.track.readyState, streams: event.streams?.length ?? 0,
      });
      event.track.enabled = true;
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        setRemoteStream((prev: any) => {
          const stream = prev ?? new MediaStream(undefined);
          stream.addTrack(event.track);
          return stream;
        });
      }
    };

    pcRef.current = pc;
    console.log('🔧 [WebRTC] PeerConnection creada para:', toId, `| ICE servers: ${iceServersRef.current.length}`);
    return pc;
  };

  // ── LLAMANTE: crear oferta SDP ───────────────────────────────────────────
  const createOffer = useCallback(async (toId: string, isVideo: boolean) => {
    try {
      console.log('📤 [WebRTC] === INICIO createOffer ===');

      // 1. Obtener ICE servers frescos del backend
      iceServersRef.current = await fetchIceServers();

      // 2. Iniciar InCallManager
      try {
        InCallManager?.start({ media: isVideo ? 'video' : 'audio' });
        InCallManager?.setForceSpeakerphoneOn(isVideo);
      } catch (e) {
        console.warn('⚠️ [WebRTC] InCallManager.start falló:', e);
      }

      const stream = await getLocalStream(isVideo);
      const pc     = createPC(toId);

      stream.getTracks().forEach((track: any) => {
        console.log(`➕ [WebRTC] addTrack (caller): ${track.kind}`);
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      });
      await pc.setLocalDescription(offer);

      console.log('📤 [WebRTC] Oferta creada. sdpLength:', offer.sdp?.length);
      return offer;
    } catch (e: any) {
      console.error('❌ [WebRTC] Error en createOffer:', e?.message ?? e);
      throw e;
    }
  }, []);

  // ── RECEPTOR: crear respuesta SDP ───────────────────────────────────────
  const createAnswer = useCallback(async (toId: string, offerSdp: any, isVideo: boolean) => {
    try {
      console.log('📥 [WebRTC] === INICIO createAnswer ===');

      if (!offerSdp?.sdp || offerSdp?.type !== 'offer') {
        throw new Error(`signalData inválido: type=${offerSdp?.type}, hasSdp=${!!offerSdp?.sdp}`);
      }

      // 1. Obtener ICE servers frescos del backend
      iceServersRef.current = await fetchIceServers();

      // 2. Iniciar InCallManager
      try {
        InCallManager?.start({ media: isVideo ? 'video' : 'audio' });
        InCallManager?.setForceSpeakerphoneOn(isVideo);
      } catch (e) {
        console.warn('⚠️ [WebRTC] InCallManager.start falló:', e);
      }

      const stream = await getLocalStream(isVideo);
      const pc     = createPC(toId);

      stream.getTracks().forEach((track: any) => {
        console.log(`➕ [WebRTC] addTrack (callee): ${track.kind}`);
        pc.addTrack(track, stream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
      remoteDescSet.current = true;
      console.log('📥 [WebRTC] RemoteDescription (offer) establecida. Signaling:', pc.signalingState);

      await flushIceCandidates(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log('📥 [WebRTC] Respuesta creada. sdpLength:', answer.sdp?.length);
      return answer;
    } catch (e: any) {
      console.error('❌ [WebRTC] Error en createAnswer:', e?.message ?? e);
      throw e;
    }
  }, []);

  // ── LLAMANTE: establecer la respuesta del receptor ──────────────────────
  const setRemoteAnswer = useCallback(async (answerSdp: any) => {
    const pc = pcRef.current;
    if (!pc) { console.warn('⚠️ [WebRTC] setRemoteAnswer: no hay PeerConnection'); return; }
    try {
      if (pc.remoteDescription?.type) {
        console.warn('⚠️ [WebRTC] RemoteDescription ya establecida, ignorando duplicado');
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(answerSdp));
      remoteDescSet.current = true;
      console.log('✅ [WebRTC] Answer establecido. Signaling:', pc.signalingState);
      await flushIceCandidates(pc);
    } catch (e: any) {
      console.error('❌ [WebRTC] Error en setRemoteAnswer:', e?.message ?? e);
    }
  }, []);

  // ── Agregar candidato ICE recibido ──────────────────────────────────────
  const addIceCandidate = useCallback(async (candidate: any) => {
    const pc = pcRef.current;
    if (!pc) { console.log('📦 [WebRTC] No hay PC, descartando ICE'); return; }
    try {
      if (!remoteDescSet.current || !pc.remoteDescription?.type) {
        console.log('📦 [WebRTC] Bufferizando ICE candidate (sin remoteDesc aún)');
        iceCandidateBuffer.current.push(candidate);
        return;
      }
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('🧊 [WebRTC] ICE candidate aplicado');
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
    try { InCallManager?.stop(); } catch {}

    localStreamRef.current?.getTracks().forEach((track: any) => {
      track.stop();
      console.log(`🧹 [WebRTC] Track detenido: ${track.kind}`);
    });

    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }

    remoteDescSet.current      = false;
    iceCandidateBuffer.current = [];
    setLocalStream(null);
    localStreamRef.current = null;
    setRemoteStream(null);
    setIsConnected(false);
    console.log('🧹 [WebRTC] Limpieza completa');
  }, []);

  return { localStream, remoteStream, isConnected, createOffer, createAnswer, setRemoteAnswer, addIceCandidate, toggleMute, toggleCamera, cleanup };
}

// ── Export principal ──────────────────────────────────────────────────────────
export function useWebRTC(socket: Socket | null) {
  if (IS_EXPO_GO) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useWebRTCExpoGo(socket);
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useWebRTCNative(socket);
}
