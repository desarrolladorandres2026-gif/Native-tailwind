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

export function useChat(matchedUserId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [myId,     setMyId]     = useState<string | null>(null);

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

  return { messages, loading, sending, sendMessage, myId };
}
