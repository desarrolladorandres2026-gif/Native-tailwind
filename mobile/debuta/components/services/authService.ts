/**
 * authService.ts
 * Compatible con useAuth.ts (register/login retornan AuthUser directamente).
 * Soporta login con correo/contraseña, Google y Facebook.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

// ── Tipos exportados ──────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  correo: string;
  telefono: string;
  gender: string;
  birth_date: string;
  profile_picture: { url: string; public_id: string } | null;
  is_verified: boolean;
  rol: string;
  auth_provider?: 'local' | 'google' | 'facebook';
  needs_profile_completion?: boolean;
}

export interface LoginResponse {
  token?: string;
  access_token?: string;
  usuario: AuthUser;
}

export interface RegisterResponse {
  message: string;
  usuario: AuthUser;
}

export interface LoginData {
  correo: string;
  password: string;
}

export interface RegisterData {
  nombre: string;
  apellido?: string;
  correo: string;
  telefono: string;
  password: string;
  genero: string;
  fechaNacimiento: string;
  intereses?: string[];
  buscando?: string;
  facePhoto?: string;
  ciudad?: string;
  bio?: string;
}

// ── Helpers internos ──────────────────────────────────────────────────────────
const storeToken = async (response: LoginResponse): Promise<void> => {
  const token = response.token || response.access_token;
  if (!token || typeof token !== 'string') {
    console.error('Login response sin token:', JSON.stringify(response));
    throw new Error('El servidor no devolvió un token válido');
  }
  await AsyncStorage.setItem('access_token', token);
  if (response.usuario?.id) {
    await AsyncStorage.setItem('user_id', response.usuario.id);
    await AsyncStorage.setItem('user_name', response.usuario.first_name || response.usuario.username);
    if (response.usuario.profile_picture?.url) {
      await AsyncStorage.setItem('user_photo', response.usuario.profile_picture.url);
    }
  }
};

// ── authService ───────────────────────────────────────────────────────────────
export const authService = {

  /**
   * Registra el usuario con correo y contraseña.
   */
  async register(data: RegisterData): Promise<AuthUser> {
    await api.post<RegisterResponse>('/users/register', {
      nombre:          data.nombre,
      apellido:        data.apellido ?? '',
      correo:          data.correo,
      telefono:        data.telefono,
      password:        data.password,
      genero:          data.genero,
      fechaNacimiento: data.fechaNacimiento,
      intereses:       data.intereses ?? [],
      buscando:        data.buscando ?? '',
      facePhoto:       data.facePhoto,
      ciudad:          data.ciudad ?? '',
      bio:             data.bio ?? '',
    });

    const loginResponse = await api.post<LoginResponse>('/login', {
      correo:   data.correo,
      password: data.password,
    });

    await storeToken(loginResponse);
    return loginResponse.usuario;
  },

  /**
   * Login con correo + contraseña.
   */
  async login(data: LoginData): Promise<AuthUser> {
    const response = await api.post<LoginResponse>('/login', data);
    console.log('Login response:', JSON.stringify(response));
    await storeToken(response);
    return response.usuario;
  },

  /**
   * Login con Google — recibe idToken del flujo OAuth de Expo
   */
  async loginWithGoogle(idToken: string): Promise<AuthUser> {
    const response = await api.post<LoginResponse>('/auth/google', { idToken });
    await storeToken(response);
    return response.usuario;
  },

  /**
   * Login con Facebook — recibe accessToken y userID del flujo OAuth de Expo
   */
  async loginWithFacebook(accessToken: string, userID: string): Promise<AuthUser> {
    const response = await api.post<LoginResponse>('/auth/facebook', { accessToken, userID });
    await storeToken(response);
    return response.usuario;
  },

  /**
   * Sincroniza la lista de amigos de Facebook con el backend
   */
  async syncFacebookFriends(friendIds: string[]): Promise<void> {
    try {
      await api.post('/auth/social/friends', { friendIds });
    } catch (e) {
      console.warn('No se pudieron sincronizar amigos de Facebook:', e);
    }
  },

  async logout(): Promise<void> {
    await AsyncStorage.multiRemove(['access_token', 'user_id', 'usuario']);
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem('access_token');
    return !!token;
  },

  async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem('access_token');
  },

  async deleteAccount(): Promise<void> {
    await api.delete('/users/me');
    await AsyncStorage.multiRemove(['access_token', 'user_id', 'usuario']);
  },
};