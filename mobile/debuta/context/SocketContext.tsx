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
      console.log('🌐 [Socket] Ya conectado, reutilizando. ID:', socketRef.current.id);
      return;
    }

    // Limpiar socket previo desconectado
    if (socketRef.current) {
      console.log('🧹 [Socket] Limpiando socket previo...');
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const url = getSocketUrl();
    console.log('🌐 [Socket] Iniciando conexión a:', url);
    console.log('🔧 [Socket] Transporte: polling → websocket (upgrade automático)');

    // Se usa polling como transporte inicial para garantizar compatibilidad con
    // cualquier proxy/firewall. Socket.IO hace upgrade automático a WebSocket
    // una vez que la sesión HTTP está establecida.
    const newSocket = io(url, {
      auth: { token, name, photo },
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      forceNew: false,
    });

    newSocket.on('connect', () => {
      const transport = newSocket.io.engine?.transport?.name ?? 'desconocido';
      console.log(`✅ [Socket] Conectado! ID: ${newSocket.id} | Transporte: ${transport}`);
      if (mountedRef.current) {
        setConnected(true);
        if (pollerRef.current) {
          clearInterval(pollerRef.current);
          pollerRef.current = null;
        }
      }
    });

    // Registra cuando Socket.IO hace upgrade de polling → websocket
    newSocket.io.engine?.on('upgrade', (transport: any) => {
      console.log('⬆️ [Socket] Upgrade de transporte a:', transport?.name ?? transport);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 [Socket] Desconectado. Razón:', reason);
      if (mountedRef.current) setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      // Loguear descripción completa para diagnóstico
      console.error('❌ [Socket] Error de conexión:', err.message);
      console.error('❌ [Socket] Causa:', (err as any).cause ?? 'sin causa adicional');
      console.error('❌ [Socket] Descripción:', (err as any).description ?? 'sin descripción');
      console.error('❌ [Socket] Contexto:', (err as any).context ?? 'sin contexto');
    });

    newSocket.on('reconnect', (attemptNumber: number) => {
      console.log(`🔄 [Socket] Reconectado en intento #${attemptNumber}`);
    });

    newSocket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`🔄 [Socket] Intento de reconexión #${attemptNumber}...`);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ [Socket] Se agotaron los intentos de reconexión.');
    });

    socketRef.current = newSocket;
    if (mountedRef.current) setSocket(newSocket);
  }, []);

  // Función pública para reconectar (llamar desde login/logout)
  const reconnect = useCallback(async () => {
    console.log('🔄 [Socket] Reconexión manual solicitada...');
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
