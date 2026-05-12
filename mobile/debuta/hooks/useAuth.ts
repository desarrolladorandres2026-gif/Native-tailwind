import { useState, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import { authService, RegisterData, LoginData, AuthUser } from '../components/services/authService';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID  = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID  ?? '';
const FACEBOOK_APP_ID   = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID   ?? '';

// Detecta si estamos corriendo en Expo Go o build nativa
const isExpoGo = Constants.appOwnership === 'expo';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: false,
    error: null,
  });

  // ── Google OAuth config ────────────────────────────────────────────────────
  // En Expo Go: usa proxy auth.expo.io  →  registra esa URL en Google Console
  // En build nativa: usa scheme propio  →  registra el package de Android
  const googleRedirectUri = AuthSession.makeRedirectUri({
    scheme: 'debuta',
    path: 'auth'
  });

  console.log('🔑 Google Redirect URI:', googleRedirectUri);
  console.log('📱 Expo Go mode:', isExpoGo);

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    clientId:    GOOGLE_CLIENT_ID,   // Web Client ID de Google Console
    redirectUri: googleRedirectUri,
    scopes:      ['openid', 'profile', 'email'],
  });

  // ── Facebook OAuth config ──────────────────────────────────────────────────
  const [fbRequest, fbResponse, promptFacebookAsync] = Facebook.useAuthRequest({
    clientId:    FACEBOOK_APP_ID,
    redirectUri: AuthSession.makeRedirectUri(
      { scheme: 'debuta' }
    ),
  });

  const setLoading = (loading: boolean) =>
    setState(prev => ({ ...prev, loading, error: null }));

  const setError = (error: string) =>
    setState(prev => ({ ...prev, loading: false, error }));

  // ─── Login correo/contraseña ───────────────────────────────────────────────
  const login = useCallback(async (
    data: LoginData,
    onSuccess?: (user: AuthUser) => void
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const user = await authService.login(data);
      setState({ user, loading: false, error: null });
      onSuccess?.(user);
      return true;
    } catch (e: any) {
      setError(e?.message || 'Usuario o contraseña incorrectos');
      return false;
    }
  }, []);

  // ─── Registro correo/contraseña ────────────────────────────────────────────
  const register = useCallback(async (
    data: RegisterData,
    onSuccess?: (user: AuthUser) => void
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const user = await authService.register(data);
      setState({ user, loading: false, error: null });
      onSuccess?.(user);
      return true;
    } catch (e: any) {
      setError(e?.message || 'Error al crear la cuenta');
      return false;
    }
  }, []);

  // ─── Login con Google ──────────────────────────────────────────────────────
  const loginWithGoogle = useCallback(async (
    onSuccess?: (user: AuthUser) => void
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const result = await promptGoogleAsync();

      if (result?.type !== 'success') {
        setError('Inicio de sesión con Google cancelado');
        return false;
      }

      const idToken = result.authentication?.idToken;
      if (!idToken) {
        setError('No se pudo obtener el token de Google');
        return false;
      }

      const user = await authService.loginWithGoogle(idToken);
      setState({ user, loading: false, error: null });
      onSuccess?.(user);
      return true;
    } catch (e: any) {
      setError(e?.message || 'Error al iniciar sesión con Google');
      return false;
    }
  }, [promptGoogleAsync]);

  // ─── Login con Facebook ────────────────────────────────────────────────────
  const loginWithFacebook = useCallback(async (
    onSuccess?: (user: AuthUser) => void
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const result = await promptFacebookAsync();

      if (result?.type !== 'success') {
        setError('Inicio de sesión con Facebook cancelado');
        return false;
      }

      const accessToken = result.authentication?.accessToken;
      const userID      = (result.params as any)?.userID ?? '';

      if (!accessToken) {
        setError('No se pudo obtener el token de Facebook');
        return false;
      }

      const user = await authService.loginWithFacebook(accessToken, userID);
      setState({ user, loading: false, error: null });

      // Sincronizar amigos de FB en background (no bloquea el flujo)
      if (accessToken && user.auth_provider === 'facebook') {
        _syncFBFriends(accessToken, userID);
      }

      onSuccess?.(user);
      return true;
    } catch (e: any) {
      setError(e?.message || 'Error al iniciar sesión con Facebook');
      return false;
    }
  }, [promptFacebookAsync]);

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async (onSuccess?: () => void) => {
    setLoading(true);
    await authService.logout();
    setState({ user: null, loading: false, error: null });
    onSuccess?.();
  }, []);

  const clearError = useCallback(() =>
    setState(prev => ({ ...prev, error: null })), []);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    login,
    register,
    loginWithGoogle,
    loginWithFacebook,
    logout,
    clearError,
    // Exponer si los botones están listos (necesario para deshabilitar antes de cargar)
    googleReady:   !!googleRequest,
    facebookReady: !!fbRequest,
  };
}

// ── Helper privado: sincronizar amigos FB en background ───────────────────────
async function _syncFBFriends(accessToken: string, userID: string) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/${userID}/friends?access_token=${accessToken}&fields=id`
    );
    const data = await res.json();
    const ids = (data.data || []).map((f: { id: string }) => f.id);
    if (ids.length > 0) {
      await authService.syncFacebookFriends(ids);
    }
  } catch (e) {
    console.warn('_syncFBFriends error:', e);
  }
}
