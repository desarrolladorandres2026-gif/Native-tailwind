import { useState, useEffect, useCallback } from 'react';
import { api } from '../components/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage'; // usado en fetchProfile → setItem

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface CloudinaryPhoto {
  url: string;
  public_id: string;
}

export interface UserProfile {
  id: string;
  username: string;
  correo: string;
  first_name: string;
  last_name: string;
  bio: string;
  birth_date: string;
  createdAt?: string;
  gender: string;
  latitude: number | null;
  longitude: number | null;
  location_label: string;
  ciudad: string;
  pais: string;
  profile_picture: CloudinaryPhoto | null;
  cover_photo: CloudinaryPhoto | null;
  photos: CloudinaryPhoto[];
  is_verified: boolean;
  interests: { name: string; icon: string }[];

  // Información personal extendida (estilo Facebook)
  job_title?: string;
  company?: string;
  education?: string;
  relationship_status?: string;
  website?: string;
  buscando?: string;
  religion?: string;
  zodiac?: string;
  smoke?: string;
  drink?: string;
  languages?: string[];
  height?: number | null;
  exercise?: string;
  settings?: {
    max_distance?: number;
    min_age?: number;
    max_age?: number;
    show_me?: string;
    verified_only?: boolean;
    has_bio_only?: boolean;
    min_photos?: number;
    notif_matches?: boolean;
    notif_messages?: boolean;
    notif_recomend?: boolean;
    show_distance?: boolean;
    show_age?: boolean;
    profile_visible?: boolean;
    privacy?: {
      show_job?: boolean;
      show_education?: boolean;
      show_relationship?: boolean;
      show_buscando?: boolean;
      show_personal_info?: boolean;
    };
  };
}

export interface ProfileStats {
  matches: number;
  likesGiven: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ matches: 0, likesGiven: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Cargar perfil ────────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    // Guardia: no hacer fetch si no hay token (evita 401 al arrancar)
    const token = await AsyncStorage.getItem('access_token').catch(() => null);
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ usuario: UserProfile }>('/me');
      const perfil = data.usuario;
      setProfile(perfil);
      if (perfil?.id) await AsyncStorage.setItem('user_id', perfil.id);
    } catch (e: any) {
      const msg = e?.message || 'Error al cargar el perfil';
      setError(msg);
      console.error('useProfile.fetchProfile:', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Cargar stats ─────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    const token = await AsyncStorage.getItem('access_token').catch(() => null);
    if (!token) return;
    try {
      const data = await api.get<ProfileStats>('/users/me/stats');
      setStats(data);
    } catch {
      // silencioso — stats no críticas
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, [fetchProfile, fetchStats]);

  // ── Actualizar texto / ubicación / campos extendidos ─────────────────────────
  const updateProfile = useCallback(async (fields: Partial<UserProfile>): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const data = await api.put<{ message: string; usuario: UserProfile }>(
        '/users/profile', fields
      );
      setProfile(data.usuario);
      return true;
    } catch (e: any) {
      const msg = e?.message || 'Error al actualizar el perfil';
      setError(msg);
      console.error('useProfile.updateProfile:', msg);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Subir foto de perfil (avatar) ─────────────────────────────────────────────
  const uploadAvatar = useCallback(async (imageUri: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const data = await api.uploadFile<{ usuario: UserProfile; profile_picture: CloudinaryPhoto }>(
        '/users/profile/avatar',
        { uri: imageUri, name: 'avatar.jpg', type: 'image/jpeg' },
        'photo'
      );
      setProfile(data.usuario);
      return true;
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Error al subir la foto';
      setError(msg);
      console.error('useProfile.uploadAvatar:', msg);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Subir foto de portada (cover photo) ──────────────────────────────────────
  const uploadCoverPhoto = useCallback(async (imageUri: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const data = await api.uploadFile<{ usuario: UserProfile; cover_photo: CloudinaryPhoto }>(
        '/users/profile/cover',
        { uri: imageUri, name: 'cover.jpg', type: 'image/jpeg' },
        'photo'
      );
      setProfile(data.usuario);
      return true;
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Error al subir la portada';
      setError(msg);
      console.error('useProfile.uploadCoverPhoto:', msg);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Eliminar foto de perfil (avatar) ─────────────────────────────────────────
  const removeAvatar = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const data = await api.delete<{ usuario: UserProfile }>('/users/profile/avatar');
      setProfile(data.usuario);
      return true;
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Error al eliminar avatar';
      setError(msg);
      console.error('useProfile.removeAvatar:', msg);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Eliminar foto de portada (cover photo) ──────────────────────────────────
  const removeCoverPhoto = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const data = await api.delete<{ usuario: UserProfile }>('/users/profile/cover');
      setProfile(data.usuario);
      return true;
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Error al eliminar portada';
      setError(msg);
      console.error('useProfile.removeCoverPhoto:', msg);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Agregar fotos a la galería ───────────────────────────────────────────────
  const addPhotos = useCallback(async (imageUris: string[]): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const data = await api.uploadFiles<{ usuario: UserProfile }>(
        '/users/profile/photos',
        imageUris.map((uri, i) => ({ uri, name: `photo_${i}.jpg`, type: 'image/jpeg' })),
        'photos'
      );
      setProfile(data.usuario);
      return true;
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Error al subir fotos';
      setError(msg);
      console.error('useProfile.addPhotos:', msg);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Eliminar foto de galería ─────────────────────────────────────────────────
  const removePhoto = useCallback(async (publicId: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const encoded = btoa(publicId)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      const data = await api.delete<{ photos: CloudinaryPhoto[] }>(
        `/users/profile/photos/${encoded}`
      );
      setProfile(prev =>
        prev ? { ...prev, photos: data.photos } : prev
      );
      return true;
    } catch (e: any) {
      const msg = e?.message || 'Error al eliminar la foto';
      setError(msg);
      console.error('useProfile.removePhoto:', msg);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Completitud del perfil ───────────────────────────────────────────────────
  const completion = (() => {
    if (!profile) return { percentage: 0, missing: [] };
    let score = 0;
    const missing = [];

    // Foto de perfil (20%)
    if (profile.profile_picture?.url) score += 20;
    else missing.push('Foto de perfil');

    // Bio (20%)
    if (profile.bio && profile.bio.trim().length > 10) score += 20;
    else missing.push('Biografía');

    // Intereses (20% si tiene al menos 3)
    if ((profile.interests?.length || 0) >= 3) score += 20;
    else missing.push('3 Intereses');

    // Galería (20% si tiene al menos 1 foto)
    if ((profile.photos?.length || 0) >= 1) score += 20;
    else missing.push('Fotos en galería');

    // Foto de portada (10%)
    if (profile.cover_photo?.url) score += 10;
    else missing.push('Foto de portada');

    // Info personal (10% si tiene trabajo o educación)
    if (profile.job_title || profile.company || profile.education) score += 10;
    else missing.push('Trabajo o estudios');

    return { percentage: score, missing };
  })();

  return {
    profile,
    stats,
    loading,
    saving,
    error,
    completion,
    fetchProfile,
    fetchStats,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    uploadCoverPhoto,
    removeCoverPhoto,
    addPhotos,
    removePhoto,
  };
}
