import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../components/services/api';
import { Message } from '../components/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSocket } from '../context/SocketContext';

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
  usuarios?: string[];
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
  const [matchId,  setMatchId]  = useState<string | null>(null);

  // ── Estado de sugerencia de cita ─────────────────────────────────────────
  const [dateSuggestion, setDateSuggestion] = useState<DateSuggestion | null>(null);
  const [dateLoading, setDateLoading] = useState(false);

  // ── Reutilizar socket global de SocketContext ────────────────────────────
  const { socket, connected } = useSocket();

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
      const data = await api.get<{ matchId: string; mensajes: Message[]; recomendacion: DateSuggestion | null }>(
        `/chat/${matchedUserId}`
      );
      const msgs = Array.isArray(data.mensajes) ? data.mensajes : [];
      msgIds.current = new Set(msgs.map(m => m.id));
      setMessages(msgs);
      if (data.matchId) setMatchId(String(data.matchId));
      // Restaurar sugerencia de cita activa si existe (persiste entre sesiones)
      if (data.recomendacion) setDateSuggestion(data.recomendacion);
    } catch (e) {
      console.error('Error fetching messages:', e);
    } finally {
      setLoading(false);
    }
  }, [matchedUserId]);

  // ── Escuchar eventos del socket global ─────────────────────────────────────
  useEffect(() => {
    // Carga inicial siempre por HTTP
    fetchMessages();

    if (!socket) return;

    // Si el socket está conectado, detener polling
    if (connected && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    // Si no está conectado, activar polling de respaldo
    if (!connected && !pollRef.current) {
      pollRef.current = setInterval(fetchMessages, 5000);
    }

    const onMessage = (msg: Message) => {
      // Solo agregar si pertenece a esta conversación
      const involucrado =
        msg.sender_id === matchedUserId || msg.receiver_id === matchedUserId;
      if (involucrado) addMessages([msg]);
    };

    const onDateSuggestion = (data: DateSuggestion) => {
      if (__DEV__) console.log('💕 Sugerencia de cita recibida:', data.restaurante?.nombre);
      setDateSuggestion(data);
    };

    const onNewSuggestion = (data: DateSuggestion) => {
      if (__DEV__) console.log('🔄 Nueva sugerencia:', data.restaurante?.nombre);
      setDateSuggestion(data);
      setDateLoading(false);
    };

    const onStatusUpdated = (data: any) => {
      setDateSuggestion(prev => {
        if (!prev || prev.matchId !== data.matchId) return prev;
        return { ...prev, recomendacion: data.recomendacion };
      });
    };

    socket.on('mensaje:nuevo',          onMessage);
    socket.on('cita:sugerencia',        onDateSuggestion);
    socket.on('cita:nueva-sugerencia',  onNewSuggestion);
    socket.on('cita:estado-actualizado', onStatusUpdated);

    return () => {
      socket.off('mensaje:nuevo',          onMessage);
      socket.off('cita:sugerencia',        onDateSuggestion);
      socket.off('cita:nueva-sugerencia',  onNewSuggestion);
      socket.off('cita:estado-actualizado', onStatusUpdated);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [socket, connected, matchedUserId, fetchMessages, addMessages]);

  // ── Enviar mensaje ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    setSending(true);
    try {
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
  }, [socket, matchedUserId, addMessages]);

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
      await api.post(`/matches/${matchId}/suggest-new-place`, {});
      // El socket emitirá 'cita:nueva-sugerencia' a ambos, lo cual actualiza dateSuggestion
    } catch (e: any) {
      console.error('Error requesting new place:', e);
      setDateLoading(false);
    }
  }, []);

  return {
    messages, loading, sending, sendMessage, myId, matchId,
    dateSuggestion, dateLoading, acceptDate, rejectDate, requestNewPlace,
  };
}
