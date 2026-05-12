import { useState, useEffect, useCallback } from 'react';
import { api } from '../components/services/api';
import { Match } from '../components/types';

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      // Backend: GET /api/matches → devuelve { matches: [...] }
      const data = await api.get<{ matches: Match[] }>('/matches');
      setMatches(Array.isArray(data.matches) ? data.matches : []);
    } catch (e) {
      console.error('Error fetching matches:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  return { matches, loading, refetch: fetchMatches };
}
