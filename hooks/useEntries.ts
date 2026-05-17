import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Entry } from '../types';

export function useMyEntries(userId: string | undefined) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchEntries() {
    if (!userId) { setLoading(false); return; }
    const { data } = await supabase
      .from('entries')
      .select('*, race:races(*)')
      .eq('user_id', userId);
    setEntries(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchEntries(); }, [userId]);

  return { entries, loading, refetch: fetchEntries };
}

export function useLeaderboard(raceId: string | undefined) {
  const [entries, setEntries] = useState<(Entry & { user: any })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!raceId) { setLoading(false); return; }
    supabase
      .from('entries')
      .select('*, user:users(id, name, status)')
      .eq('race_id', raceId)
      .order('sage_score', { ascending: false })
      .then(({ data }) => {
        setEntries(data ?? []);
        setLoading(false);
      });
  }, [raceId]);

  return { entries, loading };
}
