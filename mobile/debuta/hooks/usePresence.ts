/**
 * usePresence(userId)
 *
 * Se conecta al socket y:
 *  - Consulta si userId está en línea al montar
 *  - Escucha 'usuario:online'  → marca online
 *  - Escucha 'usuario:offline' → marca offline y guarda lastSeen
 *
 * Devuelve { online: boolean, lastSeen: Date | null }
 */
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

function getSocketUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host =
    Constants.expoConfig?.hostUri?.split(':')[0] ||
    (Constants.manifest as any)?.debuggerHost?.split(':')[0];
  return host ? `http://${host}:3000` : 'http://localhost:3000';
}

export function usePresence(userId: string) {
  const [online,   setOnline]   = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    const connect = async () => {
      const token = await AsyncStorage.getItem('access_token');
      if (!token || !mounted) return;

      const socket = io(getSocketUrl(), {
        auth:      { token },
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay:    2000,
      });

      socket.on('connect', () => {
        // Pedir el estado actual del usuario al conectar
        socket.emit('presencia:estado', { userId });
      });

      // Respuesta a la consulta puntual
      socket.on('presencia:respuesta', (data: {
        userId: string; online: boolean; lastSeen: string | null;
      }) => {
        if (!mounted || data.userId !== userId) return;
        setOnline(data.online);
        setLastSeen(data.lastSeen ? new Date(data.lastSeen) : null);
      });

      // Alguien se conectó
      socket.on('usuario:online', ({ userId: uid }: { userId: string }) => {
        if (!mounted || uid !== userId) return;
        setOnline(true);
        setLastSeen(null);
      });

      // Alguien se desconectó
      socket.on('usuario:offline', ({
        userId: uid, lastSeen: ls,
      }: { userId: string; lastSeen: string }) => {
        if (!mounted || uid !== userId) return;
        setOnline(false);
        setLastSeen(new Date(ls));
      });

      socket.on('connect_error', () => {
        // Sin conexión → asumir offline
        if (mounted) setOnline(false);
      });

      socketRef.current = socket;
    };

    connect();

    return () => {
      mounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  return { online, lastSeen };
}
