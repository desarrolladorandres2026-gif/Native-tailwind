/**
 * tokenStorage.ts
 * Almacenamiento centralizado y seguro del token de acceso.
 *
 * En Android/iOS usa expo-secure-store (Keystore/Keychain, cifrado).
 * En web cae a AsyncStorage (localStorage) porque SecureStore no está disponible.
 * Migra automáticamente el token desde AsyncStorage si proviene de una versión
 * anterior, para no desloguear a los usuarios tras actualizar.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'access_token';
const isWeb = Platform.OS === 'web';

/** Guarda el token de acceso de forma cifrada (nativo) o en AsyncStorage (web). */
export async function setToken(token: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  // Elimina cualquier copia antigua en texto plano.
  await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
}

/**
 * Devuelve el token de acceso, o null si no hay sesión.
 * Si encuentra un token heredado en AsyncStorage lo migra a SecureStore.
 */
export async function getToken(): Promise<string | null> {
  if (isWeb) {
    return AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  }
  try {
    const secure = await SecureStore.getItemAsync(TOKEN_KEY);
    if (secure) return secure;
  } catch {
    // SecureStore puede fallar en arranques en frío; intentamos la ruta heredada.
  }
  const legacy = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  if (legacy) {
    await SecureStore.setItemAsync(TOKEN_KEY, legacy).catch(() => {});
    await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
    return legacy;
  }
  return null;
}

/** Elimina el token de acceso (logout / borrado de cuenta). */
export async function removeToken(): Promise<void> {
  if (!isWeb) {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  }
  await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
}
