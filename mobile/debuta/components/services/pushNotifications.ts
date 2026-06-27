/**
 * pushNotifications.ts
 * Registro y gestión de notificaciones push con Expo.
 *
 * - Pide permisos de notificaciones.
 * - Crea los canales de Android ('messages' y 'calls').
 * - Obtiene el Expo push token y lo sincroniza con el backend.
 *
 * Las notificaciones llegan aunque la app esté cerrada porque Expo entrega
 * a través de FCM en Android. Requiere google-services.json en el build y
 * credenciales de FCM configuradas en EAS (ver NOTIFICACIONES_PUSH.md).
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const LAST_SYNCED_TOKEN_KEY = 'push_token_synced';

// ── Cómo se muestran las notificaciones con la app en primer plano ──────────────
// Dejamos que se muestren también en foreground (banner + sonido). El toast
// in-app de NotificationContext sigue funcionando cuando hay socket conectado.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Devuelve el projectId de EAS necesario para obtener el Expo push token. */
function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    (Constants as any)?.easConfig?.projectId
  );
}

/**
 * Crea los canales de notificación de Android.
 * - 'messages': importancia alta, sonido por defecto.
 * - 'calls':    importancia máxima, vibración fuerte, para llamadas entrantes.
 */
export async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Mensajes',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FD297B',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('calls', {
    name: 'Llamadas',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 250, 400, 250, 400],
    lightColor: '#FD297B',
    sound: 'default',
    bypassDnd: true,
    enableVibrate: true,
  });
}

/**
 * Pide permisos y obtiene el Expo push token de este dispositivo.
 * Devuelve null si no se conceden permisos o no es un dispositivo físico válido.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Las notificaciones push reales no funcionan en web.
  if (Platform.OS === 'web') return null;

  await setupAndroidChannels();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('⚠️ [Push] Permisos de notificación no concedidos');
    return null;
  }

  try {
    const projectId = getProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenResponse.data;
  } catch (err) {
    console.error('❌ [Push] Error obteniendo Expo push token:', err);
    return null;
  }
}

/**
 * Registra el token en el backend. Se llama tras login y al abrir la app con
 * sesión activa. Evita reenviar el mismo token si no cambió.
 */
export async function syncPushToken(): Promise<void> {
  try {
    const token = await registerForPushNotifications();
    if (!token) return;

    const last = await AsyncStorage.getItem(LAST_SYNCED_TOKEN_KEY);
    if (last === token) return; // ya sincronizado

    await api.post('/notifications/token', { token });
    await AsyncStorage.setItem(LAST_SYNCED_TOKEN_KEY, token);
    console.log('✅ [Push] Token sincronizado con el backend');
  } catch (err) {
    console.warn('⚠️ [Push] No se pudo sincronizar el token:', err);
  }
}

/**
 * Elimina el token del backend (logout) y borra la marca local.
 */
export async function removePushToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    const token = await AsyncStorage.getItem(LAST_SYNCED_TOKEN_KEY);
    if (token) {
      await api.delete('/notifications/token', { data: { token } });
    }
  } catch (err) {
    console.warn('⚠️ [Push] No se pudo eliminar el token:', err);
  } finally {
    await AsyncStorage.removeItem(LAST_SYNCED_TOKEN_KEY).catch(() => {});
  }
}
