import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { api } from '../components/services/api';
import { UserProfile } from '../components/types';

export interface LikeItem {
  matchId: string;
  usuario: UserProfile;
  liked_at: string;
}

export function useLikes() {
  const [likes,   setLikes]   = useState<LikeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLikes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ likes: LikeItem[]; total: number }>('/likes');
      setLikes(Array.isArray(data.likes) ? data.likes : []);
    } catch (e) {
      console.error('useLikes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar al montar
  useEffect(() => { fetchLikes(); }, [fetchLikes]);

  // Re-cargar cada vez que el tab de Likes recibe el foco
  useFocusEffect(
    useCallback(() => {
      fetchLikes();
    }, [fetchLikes])
  );

  return { likes, loading, refetch: fetchLikes };
}