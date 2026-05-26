import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AppState, AppStateStatus } from 'react-native';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  /** Llama a esto después del login para forzar la conexión inmediata */
  reconnect: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  reconnect: async () => {},
});

function getSocketUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host =
    Constants.expoConfig?.hostUri?.split(':')[0] ||
    (Constants.manifest as any)?.debuggerHost?.split(':')[0];
  return host ? `http://${host}:3000` : 'http://localhost:3000';
}

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const mountedRef = useRef(true);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const initSocket = useCallback(async () => {
    const token = await AsyncStorage.getItem('access_token');
    const name = await AsyncStorage.getItem('user_name');
    const photo = await AsyncStorage.getItem('user_photo');

    if (!token) {
      console.warn('⚠️ [Socket] No hay token todavía');
      return;
    }

    // Si ya hay un socket conectado, no crear otro
    if (socketRef.current?.connected) {
      console.log('🌐 [Socket] Ya conectado, reutilizando');
      return;
    }

    // Limpiar socket previo
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    console.log('🌐 [Socket] Conectando a:', getSocketUrl());

    const newSocket = io(getSocketUrl(), {
      auth: { token, name, photo },
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      console.log('✅ [Socket] Conectado! ID:', newSocket.id);
      if (mountedRef.current) {
        setConnected(true);
        // Detener poller cuando ya está conectado
        if (pollerRef.current) {
          clearInterval(pollerRef.current);
          pollerRef.current = null;
        }
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 [Socket] Desconectado. Razón:', reason);
      if (mountedRef.current) setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ [Socket] Error de conexión:', err.message);
    });

    socketRef.current = newSocket;
    if (mountedRef.current) setSocket(newSocket);
  }, []);

  // Función pública para reconectar (llamar desde login/logout)
  const reconnect = useCallback(async () => {
    console.log('🔄 [Socket] Reconexión manual solicitada...');
    // Desconectar socket anterior
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      if (mountedRef.current) setConnected(false);
    }
    await initSocket();
  }, [initSocket]);

  useEffect(() => {
    mountedRef.current = true;
    initSocket();

    // Reconectar cuando la app vuelve al primer plano
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active' && !socketRef.current?.connected) {
        console.log('🌐 [Socket] App en primer plano, reconectando...');
        initSocket();
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppState);

    // Poller: intenta cada 3s si no hay socket (caso: token aún no guardado al arrancar)
    pollerRef.current = setInterval(async () => {
      if (socketRef.current) {
        if (socketRef.current.connected) {
          if (pollerRef.current) {
            clearInterval(pollerRef.current);
            pollerRef.current = null;
          }
        }
        return;
      }
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        console.log('🌐 [Socket] Poller: token disponible, iniciando socket...');
        initSocket();
      }
    }, 3000);

    return () => {
      mountedRef.current = false;
      if (pollerRef.current) clearInterval(pollerRef.current);
      appStateSub.remove();
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
    };
  }, [initSocket]);

  return (
    <SocketContext.Provider value={{ socket, connected, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
