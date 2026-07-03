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

const PAGE_SIZE        = 30;
const PREFETCH_THRESH  = 3; // carga más cuando quedan menos de 3 perfiles

export function useDiscover() {
  const [profiles,           setProfiles]           = useState<UserProfile[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [swiping,            setSwiping]            = useState(false);
  const [superlikeAvailable, setSuperlikeAvailable] = useState(true);
  const [superlikeDaysLeft,  setSuperlikeDaysLeft]  = useState(0);
  const swipingRef     = useRef(false);
  const hasMoreRef     = useRef(true);
  const loadingMoreRef = useRef(false);
  // Perfiles ya deslizados en esta sesión. El backend puede tardar en registrar
  // el like/dislike, así que sin este guard un fetch inmediato los devolvería
  // y "volverían a aparecer" en la pila.
  const swipedIdsRef   = useRef<Set<string>>(new Set());

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
    hasMoreRef.current = true;
    setLoading(true);
    try {
      const data = await api.get<{ usuarios: UserProfile[] }>(
        `/users/discover?pagina=1&limite=${PAGE_SIZE}`
      );
      const lista = (Array.isArray(data.usuarios) ? data.usuarios : [])
        .filter(p => !swipedIdsRef.current.has(p.id));
      setProfiles(lista);
      if (lista.length < PAGE_SIZE) hasMoreRef.current = false;
    } catch (e) {
      console.error('Error fetching profiles:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga más perfiles y los agrega al final de la lista.
  // IMPORTANTE: siempre se pide la página 1. El backend ya excluye a los
  // usuarios con los que interactuaste, así que el conjunto "pendiente" se
  // encoge con cada swipe; paginar con skip sobre ese conjunto desplazado
  // saltaba perfiles (nunca aparecían) que luego "volvían a aparecer" en una
  // recarga. Los duplicados con la pila actual se filtran por id.
  const loadMoreProfiles = useCallback(async () => {
    if (!hasMoreRef.current || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      const data = await api.get<{ usuarios: UserProfile[] }>(
        `/users/discover?pagina=1&limite=${PAGE_SIZE}`
      );
      const recibidos = Array.isArray(data.usuarios) ? data.usuarios : [];
      if (recibidos.length < PAGE_SIZE) {
        // El servidor ya no tiene más perfiles pendientes que estos
        hasMoreRef.current = false;
      }
      const nuevos = recibidos.filter(p => !swipedIdsRef.current.has(p.id));
      if (nuevos.length > 0) {
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

    // Registrar el swipe ANTES de cualquier fetch para que el perfil no
    // reaparezca si el servidor aún no ha procesado el like/dislike.
    swipedIdsRef.current.add(userId);

    // Actualización optimista: quitamos el perfil de la UI antes de esperar al servidor
    setProfiles(prev => {
      const siguiente = prev.filter(p => p.id !== userId);
      // Precarga más perfiles cuando quedan pocos
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
      // y devolver el perfil a la pila (no hubo interacción real).
      if (direction === 'superlike' && e?.status === 429) {
        setSuperlikeAvailable(false);
        setSuperlikeDaysLeft(e?.diasRestantes ?? 1);
        swipedIdsRef.current.delete(userId);
        if (profileSnapshot) {
          setProfiles(prev => [profileSnapshot, ...prev.filter(p => p.id !== userId)]);
        }
        return null;
      }
      // Error de red u otro error inesperado → devolver el perfil a la lista
      swipedIdsRef.current.delete(userId);
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
