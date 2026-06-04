/**
 * usePresence(userId)
 *
 * Reutiliza el socket global de SocketContext y:
 *  - Consulta si userId está en línea al montar
 *  - Escucha 'usuario:online'  → marca online
 *  - Escucha 'usuario:offline' → marca offline y guarda lastSeen
 *
 * Devuelve { online: boolean, lastSeen: Date | null }
 */
import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export function usePresence(userId: string) {
  const [online,   setOnline]   = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!userId || !socket) return;

    // Pedir el estado actual del usuario cuando el socket está conectado
    if (connected) {
      socket.emit('presencia:estado', { userId });
    }

    // Respuesta a la consulta puntual
    const onPresenciaRespuesta = (data: {
      userId: string; online: boolean; lastSeen: string | null;
    }) => {
      if (data.userId !== userId) return;
      setOnline(data.online);
      setLastSeen(data.lastSeen ? new Date(data.lastSeen) : null);
    };

    // Alguien se conectó
    const onUserOnline = ({ userId: uid }: { userId: string }) => {
      if (uid !== userId) return;
      setOnline(true);
      setLastSeen(null);
    };

    // Alguien se desconectó
    const onUserOffline = ({
      userId: uid, lastSeen: ls,
    }: { userId: string; lastSeen: string }) => {
      if (uid !== userId) return;
      setOnline(false);
      setLastSeen(new Date(ls));
    };

    socket.on('presencia:respuesta', onPresenciaRespuesta);
    socket.on('usuario:online',      onUserOnline);
    socket.on('usuario:offline',     onUserOffline);

    return () => {
      socket.off('presencia:respuesta', onPresenciaRespuesta);
      socket.off('usuario:online',      onUserOnline);
      socket.off('usuario:offline',     onUserOffline);
    };
  }, [userId, socket, connected]);

  return { online, lastSeen };
}

