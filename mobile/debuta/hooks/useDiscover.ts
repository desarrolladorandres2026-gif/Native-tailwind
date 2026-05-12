import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../components/services/api';
import { UserProfile } from '../components/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useDiscover() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [swiping,  setSwiping]  = useState(false);
  const swipingRef = useRef(false); // useRef evita recrear el callback en cada cambio

  const fetchProfiles = useCallback(async () => {
    const token = await AsyncStorage.getItem('access_token').catch(() => null);
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await api.get<{ usuarios: UserProfile[] }>('/users/discover');
      setProfiles(Array.isArray(data.usuarios) ? data.usuarios : []);
    } catch (e) {
      console.error('Error fetching profiles:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const swipe = useCallback(async (
    userId: string,
    direction: 'like' | 'dislike'
  ): Promise<{ esMatch: boolean; matchId?: string } | null> => {
    if (swipingRef.current) return null; // guardia contra doble-tap

    swipingRef.current = true;
    setSwiping(true);

    // Quitamos el perfil ANTES de la llamada API para que la UI se desbloquee
    // sin esperar a que el servidor responda
    setProfiles(prev => prev.filter(p => p.id !== userId));

    try {
      const endpoint = direction === 'like'
        ? `/matches/like/${userId}`
        : `/matches/dislike/${userId}`;

      const res = await api.post<{ esMatch: boolean; matchId?: string }>(endpoint, {});
      return { esMatch: res.esMatch ?? false, matchId: res.matchId };
    } catch (e: any) {
      // Error 400 = ya le dio like antes → ignorar silenciosamente
      if (e?.status === 400) return null;
      console.error('Error swiping:', e);
      return null;
    } finally {
      swipingRef.current = false;
      setSwiping(false);
    }
  }, []);

  return { profiles, loading, swiping, swipe, refetch: fetchProfiles };
}
