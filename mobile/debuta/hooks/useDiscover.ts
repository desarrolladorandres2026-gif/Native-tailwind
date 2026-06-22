import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../components/services/api';
import { UserProfile } from '../components/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from '../components/services/tokenStorage';

const SUPERLIKE_KEY       = 'superlike_last_used';
const SUPERLIKE_COOLDOWN  = 7 * 24 * 60 * 60 * 1000; // 7 días en ms

function calcSuperlikeState(lastUsed: string | null): { available: boolean; daysLeft: number } {
  if (!lastUsed) return { available: true, daysLeft: 0 };
  const elapsed = Date.now() - new Date(lastUsed).getTime();
  if (elapsed >= SUPERLIKE_COOLDOWN) return { available: true, daysLeft: 0 };
  return { available: false, daysLeft: Math.ceil((SUPERLIKE_COOLDOWN - elapsed) / (24 * 60 * 60 * 1000)) };
}

const PAGE_SIZE        = 10;
const PREFETCH_THRESH  = 3; // carga más cuando quedan menos de 3 perfiles

export function useDiscover() {
  const [profiles,           setProfiles]           = useState<UserProfile[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [swiping,            setSwiping]            = useState(false);
  const [superlikeAvailable, setSuperlikeAvailable] = useState(true);
  const [superlikeDaysLeft,  setSuperlikeDaysLeft]  = useState(0);
  const swipingRef     = useRef(false);
  const pageRef        = useRef(1);
  const hasMoreRef     = useRef(true);
  const loadingMoreRef = useRef(false);

  // Carga el estado del superlike desde AsyncStorage al montar
  useEffect(() => {
    AsyncStorage.getItem(SUPERLIKE_KEY).then(val => {
      const { available, daysLeft } = calcSuperlikeState(val);
      setSuperlikeAvailable(available);
      setSuperlikeDaysLeft(daysLeft);
    }).catch(() => {});
  }, []);

  const fetchProfiles = useCallback(async () => {
    const token = await getToken();
    if (!token) { setLoading(false); return; }
    // Reset de paginación en cada carga inicial
    pageRef.current    = 1;
    hasMoreRef.current = true;
    setLoading(true);
    try {
      const data = await api.get<{ usuarios: UserProfile[] }>(
        `/users/discover?pagina=1&limite=${PAGE_SIZE}`
      );
      const lista = Array.isArray(data.usuarios) ? data.usuarios : [];
      setProfiles(lista);
      if (lista.length < PAGE_SIZE) hasMoreRef.current = false;
    } catch (e) {
      console.error('Error fetching profiles:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga la siguiente página y la agrega al final de la lista
  const loadMoreProfiles = useCallback(async () => {
    if (!hasMoreRef.current || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    const nextPage = pageRef.current + 1;
    try {
      const data = await api.get<{ usuarios: UserProfile[] }>(
        `/users/discover?pagina=${nextPage}&limite=${PAGE_SIZE}`
      );
      const nuevos = Array.isArray(data.usuarios) ? data.usuarios : [];
      if (nuevos.length === 0 || nuevos.length < PAGE_SIZE) {
        hasMoreRef.current = false;
      }
      if (nuevos.length > 0) {
        pageRef.current = nextPage;
        setProfiles(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          return [...prev, ...nuevos.filter(p => !existingIds.has(p.id))];
        });
      }
    } catch (e) {
      console.error('Error cargando más perfiles:', e);
    } finally {
      loadingMoreRef.current = false;
    }
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const swipe = useCallback(async (
    userId: string,
    direction: 'like' | 'dislike' | 'superlike',
    profileSnapshot?: UserProfile,
  ): Promise<{ esMatch: boolean; matchId?: string; diasRestantes?: number } | null> => {
    if (swipingRef.current) return null;

    swipingRef.current = true;
    setSwiping(true);

    // Actualización optimista: quitamos el perfil de la UI antes de esperar al servidor
    setProfiles(prev => {
      const siguiente = prev.filter(p => p.id !== userId);
      // Precarga la siguiente página cuando quedan pocos perfiles
      if (siguiente.length < PREFETCH_THRESH) loadMoreProfiles();
      return siguiente;
    });

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
      // Error esperado (ya interactuaste o similar) → no revertir
      if (e?.status === 400) return null;
      // El servidor rechazó el superlike por cooldown → sincronizar estado local
      if (direction === 'superlike' && e?.status === 429) {
        setSuperlikeAvailable(false);
        setSuperlikeDaysLeft(e?.diasRestantes ?? 1);
        return null;
      }
      // Error de red u otro error inesperado → devolver el perfil a la lista
      if (profileSnapshot) {
        setProfiles(prev => [profileSnapshot, ...prev.filter(p => p.id !== userId)]);
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
    superlikeAvailable, superlikeDaysLeft, loadMore: loadMoreProfiles,
  };
}
