import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '../components/services/api';
import { Message } from '../components/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// ── Misma lógica de URL que api.ts ─────────────────────────────────────────────
function getSocketUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host =
    Constants.expoConfig?.hostUri?.split(':')[0] ||
    (Constants.manifest as any)?.debuggerHost?.split(':')[0];
  return host ? `http://${host}:3000` : 'http://localhost:3000';
}

// ── Tipos de sugerencia de cita ──────────────────────────────────────────────
export interface DateSuggestionRestaurant {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  ambiente: string;
  direccion: string;
  foto_portada: { url: string; public_id: string } | null;
  fotos: Array<{ url: string; public_id: string }>;
  precio_promedio: string;
  horario: string;
  menu: Array<{ nombre: string; descripcion: string; precio: string; foto?: { url: string } | null }>;
}

export interface DateSuggestion {
  matchId: string;
  restaurante: DateSuggestionRestaurant;
  sugerencia: {
    fecha: string;
    mensaje?: string;
  };
  recomendacion: {
    restauranteId: string;
    asociadoId: string;
    estado: 'pendiente' | 'aceptada' | 'rechazada';
    user1Acepta: boolean;
    user2Acepta: boolean;
    fechaSugerida: string;
  };
}

export function useChat(matchedUserId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [myId,     setMyId]     = useState<string | null>(null);

  // ── Estado de sugerencia de cita ─────────────────────────────────────────
  const [dateSuggestion, setDateSuggestion] = useState<DateSuggestion | null>(null);
  const [dateLoading, setDateLoading] = useState(false);

  const socketRef  = useRef<Socket | null>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgIds     = useRef<Set<string>>(new Set()); // dedup guard

  // ── Cargar user_id propio ──────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('user_id').then(id => setMyId(id));
  }, []);

  // ── Helpers para agregar mensajes sin duplicados ───────────────────────────
  const addMessages = useCallback((newMsgs: Message[]) => {
    setMessages(prev => {
      const next = [...prev];
      for (const m of newMsgs) {
        if (!msgIds.current.has(m.id)) {
          msgIds.current.add(m.id);
          next.push(m);
        }
      }
      return next;
    });
  }, []);

  // ── Carga inicial de mensajes via HTTP ─────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    try {
      const data = await api.get<{ matchId: string; mensajes: Message[] }>(
        `/chat/${matchedUserId}`
      );
      const msgs = Array.isArray(data.mensajes) ? data.mensajes : [];
      // Reset completo al cargar inicial
      msgIds.current = new Set(msgs.map(m => m.id));
      setMessages(msgs);
    } catch (e) {
      console.error('Error fetching messages:', e);
    } finally {
      setLoading(false);
    }
  }, [matchedUserId]);

  // ── Conectar Socket.io ─────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const connectSocket = async () => {
      const token = await AsyncStorage.getItem('access_token');
      if (!token || !mounted) return;

      const socket = io(getSocketUrl(), {
        auth:      { token },
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay:    2000,
      });

      socket.on('connect', () => {
        console.log('🔌 Socket conectado al chat');
        // Parar polling HTTP una vez conectado por socket
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      });

      socket.on('mensaje:nuevo', (msg: Message) => {
        // Solo agregar si pertenece a esta conversación
        const involucrado =
          msg.sender_id === matchedUserId || msg.receiver_id === matchedUserId;
        if (involucrado) addMessages([msg]);
      });

      // ── Listener de sugerencia de cita ─────────────────────────────────
      socket.on('cita:sugerencia', (data: DateSuggestion) => {
        console.log('💕 Sugerencia de cita recibida:', data.restaurante?.nombre);
        setDateSuggestion(data);
      });

      // ── Listener de nueva sugerencia (otro lugar) ──────────────────────
      socket.on('cita:nueva-sugerencia', (data: DateSuggestion) => {
        console.log('🔄 Nueva sugerencia:', data.restaurante?.nombre);
        setDateSuggestion(data);
        setDateLoading(false);
      });

      // ── Listener de estado actualizado ─────────────────────────────────
      socket.on('cita:estado-actualizado', (data: any) => {
        setDateSuggestion(prev => {
          if (!prev || prev.matchId !== data.matchId) return prev;
          return { ...prev, recomendacion: data.recomendacion };
        });
      });

      socket.on('connect_error', (err) => {
        console.warn('Socket error, usando polling HTTP:', err.message);
        // Si el socket falla, activar polling de respaldo
        if (!pollRef.current) {
          pollRef.current = setInterval(fetchMessages, 5000);
        }
      });

      socket.on('disconnect', () => {
        console.log('🔌 Socket desconectado');
        // Reactivar polling mientras no hay socket
        if (mounted && !pollRef.current) {
          pollRef.current = setInterval(fetchMessages, 5000);
        }
      });

      socketRef.current = socket;
    };

    fetchMessages();           // carga inicial
    connectSocket();           // luego socket

    return () => {
      mounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [matchedUserId, fetchMessages, addMessages]);

  // ── Enviar mensaje ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const socket = socketRef.current;
      if (socket?.connected) {
        // Vía Socket.io — el servidor emite 'mensaje:nuevo' a ambos
        socket.emit('mensaje:enviar', { paraId: matchedUserId, content: content.trim() });
      } else {
        // Fallback HTTP
        const data = await api.post<{ mensaje: Message }>(
          `/chat/${matchedUserId}`,
          { content: content.trim() }
        );
        addMessages([data.mensaje]);
      }
    } catch (e) {
      console.error('Error sending message:', e);
    } finally {
      setSending(false);
    }
  }, [matchedUserId, addMessages]);

  // ── Aceptar cita ───────────────────────────────────────────────────────────
  const acceptDate = useCallback(async (matchId: string) => {
    setDateLoading(true);
    try {
      const res = await api.post<{ recomendacion: any }>(`/matches/${matchId}/accept-date`, {});
      setDateSuggestion(prev => {
        if (!prev) return prev;
        return { ...prev, recomendacion: res.recomendacion };
      });
    } catch (e: any) {
      console.error('Error accepting date:', e);
    } finally {
      setDateLoading(false);
    }
  }, []);

  // ── Rechazar cita ──────────────────────────────────────────────────────────
  const rejectDate = useCallback(async (matchId: string) => {
    setDateLoading(true);
    try {
      await api.post(`/matches/${matchId}/reject-date`, {});
      setDateSuggestion(null);
    } catch (e: any) {
      console.error('Error rejecting date:', e);
    } finally {
      setDateLoading(false);
    }
  }, []);

  // ── Sugerir otro lugar ─────────────────────────────────────────────────────
  const requestNewPlace = useCallback(async (matchId: string) => {
    setDateLoading(true);
    try {
      const res = await api.post<{ restaurante: any; recomendacion: any }>(`/matches/${matchId}/suggest-new-place`, {});
      // El socket emitirá 'cita:nueva-sugerencia' a ambos, lo cual actualiza dateSuggestion
    } catch (e: any) {
      console.error('Error requesting new place:', e);
      setDateLoading(false);
    }
  }, []);

  return {
    messages, loading, sending, sendMessage, myId,
    dateSuggestion, dateLoading, acceptDate, rejectDate, requestNewPlace,
  };
}
