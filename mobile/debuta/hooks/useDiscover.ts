import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../components/services/api';
import { UserProfile } from '../components/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPERLIKE_KEY       = 'superlike_last_used';
const SUPERLIKE_COOLDOWN  = 7 * 24 * 60 * 60 * 1000; // 7 días en ms

function calcSuperlikeState(lastUsed: string | null): { available: boolean; daysLeft: number } {
  if (!lastUsed) return { available: true, daysLeft: 0 };
  const elapsed = Date.now() - new Date(lastUsed).getTime();
  if (elapsed >= SUPERLIKE_COOLDOWN) return { available: true, daysLeft: 0 };
  return { available: false, daysLeft: Math.ceil((SUPERLIKE_COOLDOWN - elapsed) / (24 * 60 * 60 * 1000)) };
}

export function useDiscover() {
  const [profiles,           setProfiles]           = useState<UserProfile[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [swiping,            setSwiping]            = useState(false);
  const [superlikeAvailable, setSuperlikeAvailable] = useState(true);
  const [superlikeDaysLeft,  setSuperlikeDaysLeft]  = useState(0);
  const swipingRef = useRef(false);

  // Carga el estado del superlike desde AsyncStorage al montar
  useEffect(() => {
    AsyncStorage.getItem(SUPERLIKE_KEY).then(val => {
      const { available, daysLeft } = calcSuperlikeState(val);
      setSuperlikeAvailable(available);
      setSuperlikeDaysLeft(daysLeft);
    }).catch(() => {});
  }, []);

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
    direction: 'like' | 'dislike' | 'superlike'
  ): Promise<{ esMatch: boolean; matchId?: string; diasRestantes?: number } | null> => {
    if (swipingRef.current) return null;

    swipingRef.current = true;
    setSwiping(true);

    setProfiles(prev => prev.filter(p => p.id !== userId));

    try {
      const endpoint =
        direction === 'superlike' ? `/matches/superlike/${userId}` :
        direction === 'like'      ? `/matches/like/${userId}`      :
                                    `/matches/dislike/${userId}`;

      const res = await api.post<{ esMatch: boolean; matchId?: string; diasRestantes?: number }>(endpoint, {});

      if (direction === 'superlike') {
        const now = new Date().toISOString();
        await AsyncStorage.setItem(SUPERLIKE_KEY, now);
        setSuperlikeAvailable(false);
        setSuperlikeDaysLeft(7);
      }

      return { esMatch: res.esMatch ?? false, matchId: res.matchId };
    } catch (e: any) {
      if (e?.status === 400) return null;
      // El servidor rechazó el superlike por cooldown → sincronizar estado local
      if (direction === 'superlike' && e?.status === 429) {
        setSuperlikeAvailable(false);
        setSuperlikeDaysLeft(e?.diasRestantes ?? 1);
        return null;
      }
      console.error('Error swiping:', e);
      return null;
    } finally {
      swipingRef.current = false;
      setSwiping(false);
    }
  }, []);

  const prependProfile = useCallback((profile: UserProfile) => {
    setProfiles(prev => [profile, ...prev.filter(p => p.id !== profile.id)]);
  }, []);

  return {
    profiles, loading, swiping, swipe, refetch: fetchProfiles, prependProfile,
    superlikeAvailable, superlikeDaysLeft,
  };
}
