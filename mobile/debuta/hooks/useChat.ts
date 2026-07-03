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
  const [mensajeRechazado, setMensajeRechazado] = useState(false);

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
      // Restaurar sugerencia de cita activa si existe (persiste entre sesiones).
      // Solo reemplazar el estado si cambió algo relevante: con el polling de
      // respaldo (cada 5s) un objeto nuevo idéntico re-dispara efectos en la UI
      // (p. ej. auto-scroll) y rompe el desplazamiento del chat.
      if (data.recomendacion) {
        const next = data.recomendacion;
        setDateSuggestion(prev => {
          if (
            prev &&
            prev.matchId === next.matchId &&
            prev.recomendacion?.restauranteId === next.recomendacion?.restauranteId &&
            prev.recomendacion?.estado === next.recomendacion?.estado &&
            prev.recomendacion?.user1Acepta === next.recomendacion?.user1Acepta &&
            prev.recomendacion?.user2Acepta === next.recomendacion?.user2Acepta &&
            prev.recomendacion?.fechaSugerida === next.recomendacion?.fechaSugerida
          ) {
            return prev; // sin cambios — conservar identidad para no re-renderizar
          }
          return next;
        });
      }
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
      const involucrado =
        msg.sender_id === matchedUserId || msg.receiver_id === matchedUserId;
      if (involucrado) addMessages([msg]);
    };

    const onMensajeRechazado = () => {
      setMensajeRechazado(true);
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
        return {
          ...prev,
          recomendacion: data.recomendacion,
          // Si el otro usuario editó la fecha, reflejarla en la tarjeta
          sugerencia: {
            ...prev.sugerencia,
            fecha: data.recomendacion?.fechaSugerida ?? prev.sugerencia?.fecha,
          },
        };
      });
    };

    socket.on('mensaje:nuevo',           onMessage);
    socket.on('mensaje:rechazado',       onMensajeRechazado);
    socket.on('cita:sugerencia',         onDateSuggestion);
    socket.on('cita:nueva-sugerencia',   onNewSuggestion);
    socket.on('cita:estado-actualizado', onStatusUpdated);

    return () => {
      socket.off('mensaje:nuevo',           onMessage);
      socket.off('mensaje:rechazado',       onMensajeRechazado);
      socket.off('cita:sugerencia',         onDateSuggestion);
      socket.off('cita:nueva-sugerencia',   onNewSuggestion);
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
        socket.emit('mensaje:enviar', { paraId: matchedUserId, content: content.trim() });
      } else {
        const data = await api.post<{ mensaje: Message }>(
          `/chat/${matchedUserId}`,
          { content: content.trim() }
        );
        addMessages([data.mensaje]);
      }
    } catch (e: any) {
      const msg: string = e?.response?.data?.message ?? '';
      if (msg.toLowerCase().includes('inapropiado')) {
        setMensajeRechazado(true);
      } else {
        console.error('Error sending message:', e);
      }
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

  // ── Editar fecha/hora de la cita ───────────────────────────────────────────
  const editDate = useCallback(async (matchId: string, fechaSugerida: string): Promise<boolean> => {
    setDateLoading(true);
    try {
      const res = await api.post<{ recomendacion: any }>(`/matches/${matchId}/edit-date`, { fechaSugerida });
      setDateSuggestion(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          recomendacion: res.recomendacion,
          sugerencia: { ...prev.sugerencia, fecha: res.recomendacion?.fechaSugerida ?? fechaSugerida },
        };
      });
      return true;
    } catch (e: any) {
      console.error('Error editing date:', e);
      return false;
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

  const clearMensajeRechazado = useCallback(() => setMensajeRechazado(false), []);

  // ── Eliminar conversación (borra todos los mensajes) ───────────────────────
  const deleteConversation = useCallback(async () => {
    await api.delete(`/chat/${matchedUserId}`);
    msgIds.current = new Set();
    setMessages([]);
    setDateSuggestion(null);
  }, [matchedUserId]);

  return {
    messages, loading, sending, sendMessage, myId, matchId,
    dateSuggestion, dateLoading, acceptDate, rejectDate, requestNewPlace, editDate,
    mensajeRechazado, clearMensajeRechazado, deleteConversation,
  };
}
