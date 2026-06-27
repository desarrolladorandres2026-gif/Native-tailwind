/**
 * PushNotificationProvider.tsx
 * - Sincroniza el Expo push token con el backend cuando hay sesión activa.
 * - Maneja el "tap" sobre una notificación para navegar a la pantalla correcta:
 *     · type 'message' → abre el chat con el remitente.
 *     · type 'call'    → solo abre la app; el socket reconecta y el backend
 *                        entrega la llamada pendiente (IncomingCallScreen).
 */

import React, { useEffect, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { getToken } from '../components/services/tokenStorage';
import { syncPushToken, setupAndroidChannels } from '../components/services/pushNotifications';

// Maneja la acción según los datos de la notificación tocada.
function handleNotificationData(data: any) {
  if (!data || typeof data !== 'object') return;

  if (data.type === 'message' && data.fromId) {
    // Pequeño delay para asegurar que el router esté montado en cold start.
    setTimeout(() => {
      try {
        router.push({
          pathname: '/chat/[userId]',
          params: {
            userId: String(data.fromId),
            name: data.senderName ? String(data.senderName) : '',
            photo: data.senderPhoto ? String(data.senderPhoto) : '',
          },
        });
      } catch (e) {
        console.warn('[Push] No se pudo navegar al chat:', e);
      }
    }, 500);
  }

  // Para 'call' no hace falta navegar: al abrirse la app, el socket reconecta
  // y el servidor reenvía la llamada pendiente, que dispara IncomingCallScreen.
}

export const PushNotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const syncedRef = useRef(false);

  // ── Sincronizar token cuando hay sesión ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const trySync = async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      syncedRef.current = true;
      await syncPushToken();
    };

    // Asegurar canales de Android desde el arranque.
    setupAndroidChannels().catch(() => {});

    // Intento inicial (puede que el token aún no exista en cold start).
    trySync();

    // Reintentar cuando la app vuelve a primer plano (p. ej. tras login).
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active' && !syncedRef.current) trySync();
    };
    const sub = AppState.addEventListener('change', onAppState);

    // Poller breve para el caso en que el token se guarda justo tras arrancar.
    const poller = setInterval(async () => {
      if (syncedRef.current) {
        clearInterval(poller);
        return;
      }
      const token = await getToken();
      if (token) {
        clearInterval(poller);
        trySync();
      }
    }, 3000);

    return () => {
      cancelled = true;
      sub.remove();
      clearInterval(poller);
    };
  }, []);

  // ── Escuchar taps sobre notificaciones ───────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Caso 1: la app fue abierta desde una notificación estando cerrada.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleNotificationData(response.notification.request.content.data);
      }
    });

    // Caso 2: la app ya estaba abierta (foreground/background).
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleNotificationData(response.notification.request.content.data);
      }
    );

    return () => {
      responseSub.remove();
    };
  }, []);

  return <>{children}</>;
};
