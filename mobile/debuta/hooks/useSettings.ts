import { useState, useEffect, useCallback } from 'react';
import { api } from '../components/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Settings {
  max_distance:    number;
  min_age:         number;
  max_age:         number;
  show_me:         'M' | 'F' | 'ALL';
  verified_only:   boolean;
  has_bio_only:    boolean;
  min_photos:      number;
  notif_matches:   boolean;
  notif_messages:  boolean;
  notif_recomend:  boolean;
  show_distance:   boolean;
  show_age:        boolean;
  profile_visible: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  max_distance:    50,
  min_age:         18,
  max_age:         40,
  show_me:         'ALL',
  verified_only:   false,
  has_bio_only:    false,
  min_photos:      0,
  notif_matches:   true,
  notif_messages:  true,
  notif_recomend:  false,
  show_distance:   true,
  show_age:        true,
  profile_visible: true,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const fetchSettings = useCallback(async () => {
    const token = await AsyncStorage.getItem('access_token').catch(() => null);
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await api.get<{ settings: Settings }>('/settings');
      setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    } catch (e) {
      console.error('fetchSettings:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const save = useCallback(async (partial: Partial<Settings>): Promise<boolean> => {
    setSaving(true);
    try {
      const data = await api.put<{ settings: Settings }>('/settings', partial);
      setSettings(prev => ({ ...prev, ...data.settings }));
      return true;
    } catch (e) {
      console.error('saveSettings:', e);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const changePassword = useCallback(
    async (password_actual: string, password_nueva: string): Promise<string | null> => {
      try {
        await api.put('/settings/password', { password_actual, password_nueva });
        return null; // null = sin error
      } catch (e: any) {
        return e?.message || 'Error al cambiar contraseña';
      }
    },
    []
  );

  return { settings, loading, saving, save, changePassword, refetch: fetchSettings };
}