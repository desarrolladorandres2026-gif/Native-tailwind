// NotificationContext.tsx
// Escucha eventos del socket global y muestra toasts de notificación premium
import React, {
  createContext, useContext, useRef, useState, useEffect, useCallback, ReactNode,
} from 'react';
import {
  Animated, TouchableOpacity, View, Text, Image, StyleSheet,
  Dimensions, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSocket } from './SocketContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { boxShadow } from '../components/utils/shadow';

const { width: W } = Dimensions.get('window');

// ── Tipos ──────────────────────────────────────────────────────────────────────
type NotifType = 'match' | 'like' | 'message';

interface NotifPayload {
  id: string;
  type: NotifType;
  title: string;
  subtitle: string;
  photo?: string | null;
  matchId?: string;
  fromId?: string;
}

interface NotifContextType {
  showNotification: (payload: Omit<NotifPayload, 'id'>) => void;
}

const NotifContext = createContext<NotifContextType>({ showNotification: () => {} });

export const useNotification = () => useContext(NotifContext);

// ── Toast component ────────────────────────────────────────────────────────────
function NotifToast({ payload, onDismiss }: { payload: NotifPayload; onDismiss: () => void }) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const router     = useRouter();
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss after 4.5s
    dismissTimer.current = setTimeout(dismiss, 4500);
    return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); };
  }, []);

  const dismiss = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 300, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, []);

  const handlePress = () => {
    dismiss();
    if (payload.type === 'match' && payload.fromId) {
      router.push('/(tabs)/matches' as any);
    } else if (payload.type === 'message' && payload.fromId) {
      router.push('/(tabs)/matches' as any);
    }
  };

  const gradientColors: [string, string] =
    payload.type === 'match'   ? ['#FF2D55', '#FF6B35'] :
    payload.type === 'like'    ? ['#AF52DE', '#FF2D55'] :
                                 ['#007AFF', '#34C759'];

  const iconName: keyof typeof Ionicons.glyphMap =
    payload.type === 'match'   ? 'heart' :
    payload.type === 'like'    ? 'heart-outline' :
                                 'chatbubble-ellipses';

  return (
    <Animated.View
      style={[
        s.toastWrapper,
        { transform: [{ translateY }], opacity },
      ]}
    >
      <TouchableOpacity activeOpacity={0.92} onPress={handlePress} style={s.toastInner}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.toastGradient}
        >
          {/* Avatar / Icon */}
          <View style={s.avatarWrap}>
            {payload.photo ? (
              <Image source={{ uri: payload.photo }} style={s.avatar} />
            ) : (
              <View style={s.avatarFallback}>
                <Ionicons name={iconName} size={22} color="#fff" />
              </View>
            )}
            {/* Burbuja del tipo */}
            <View style={s.iconBubble}>
              <Ionicons name={iconName} size={11} color="#fff" />
            </View>
          </View>

          {/* Textos */}
          <View style={s.textWrap}>
            <Text style={s.toastTitle} numberOfLines={1}>{payload.title}</Text>
            <Text style={s.toastSub} numberOfLines={1}>{payload.subtitle}</Text>
          </View>

          {/* Close */}
          <TouchableOpacity onPress={dismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Provider ───────────────────────────────────────────────────────────────────
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [queue, setQueue]   = useState<NotifPayload[]>([]);
  const { socket, connected } = useSocket();
  const myIdRef = useRef<string | null>(null);

  // Cargar propio userId
  useEffect(() => {
    AsyncStorage.getItem('user_id').then(id => { myIdRef.current = id; });
  }, []);

  const showNotification = useCallback((payload: Omit<NotifPayload, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setQueue(prev => [...prev.slice(-1), { ...payload, id }]); // max 2 a la vez
  }, []);

  // ── Escuchar eventos del socket ───────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onMatch = (data: any) => {
      showNotification({
        type: 'match',
        title: '🎉 ¡Es un Match!',
        subtitle: `Tú y ${data.fromName} se gustaron mutuamente`,
        photo: data.fromPhoto,
        matchId: data.matchId,
        fromId: data.fromId,
      });
    };

    const onLike = (data: any) => {
      showNotification({
        type: 'like',
        title: '💜 ¡Te dieron Like!',
        subtitle: `${data.fromName} está interesado/a en ti`,
        photo: data.fromPhoto,
        fromId: data.fromId,
      });
    };

    const onMessage = (msg: any) => {
      const myId = myIdRef.current;
      // Solo mostrar si el mensaje lo recibo YO (no soy el remitente)
      if (myId && String(msg.sender_id) === String(myId)) return;
      showNotification({
        type: 'message',
        title: '💬 Nuevo mensaje',
        subtitle: msg.senderName || 'Alguien te escribió',
        photo: msg.senderPhoto || null,
        fromId: msg.sender_id,
      });
    };

    socket.on('match:nuevo',    onMatch);
    socket.on('like:recibido',  onLike);
    socket.on('mensaje:nuevo',  onMessage);

    return () => {
      socket.off('match:nuevo',    onMatch);
      socket.off('like:recibido',  onLike);
      socket.off('mensaje:nuevo',  onMessage);
    };
  }, [socket, showNotification]);

  const dismiss = useCallback((id: string) => {
    setQueue(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotifContext.Provider value={{ showNotification }}>
      {children}
      {/* Toasts apilados en la parte superior */}
      {queue.map(n => (
        <NotifToast key={n.id} payload={n} onDismiss={() => dismiss(n.id)} />
      ))}
    </NotifContext.Provider>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────
const TOP_OFFSET = Platform.OS === 'ios' ? 54 : 30;

const s = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    top: TOP_OFFSET,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
    boxShadow: boxShadow('#000', 8, 16, 0.35),
  },
  toastInner: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  toastGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubble: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  textWrap: {
    flex: 1,
  },
  toastTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  toastSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
  },
});
