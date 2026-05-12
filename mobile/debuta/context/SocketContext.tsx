import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
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

  useEffect(() => {
    let mounted = true;

    const initSocket = async () => {
      const token = await AsyncStorage.getItem('access_token');
      const name = await AsyncStorage.getItem('user_name');
      const photo = await AsyncStorage.getItem('user_photo');

      if (!token) return;

      const newSocket = io(getSocketUrl(), {
        auth: { token, name, photo },
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      newSocket.on('connect', () => {
        console.log('🌐 Global Socket Connected:', newSocket.id);
        if (mounted) setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('🌐 Global Socket Disconnected');
        if (mounted) setConnected(false);
      });

      socketRef.current = newSocket;
      if (mounted) setSocket(newSocket);
    };

    initSocket();

    return () => {
      mounted = false;
      socketRef.current?.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
