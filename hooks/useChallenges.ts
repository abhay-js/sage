import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Challenge } from '../types';

export function useChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('challenges')
      .select('*')
      .eq('status', 'active')
      .order('participant_count', { ascending: false });
    setChallenges(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, []);
  return { challenges, loading, refetch: fetch };
}

export function useUserChallenges(userId: string | undefined) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const { data } = await supabase
      .from('challenge_participants')
      .select('challenge:challenges(*)')
      .eq('user_id', userId);
    const chals = (data ?? [])
      .map((r: any) => r.challenge)
      .filter((c: Challenge | null) => c && c.status === 'active') as Challenge[];
    setChallenges(chals);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [userId]);
  return { challenges, loading, refetch: fetch };
}
