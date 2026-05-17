import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Race } from '../types';

export function useRaces(statusFilter?: string) {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = supabase.from('races').select('*').order('race_date');
    if (statusFilter) q = q.eq('status', statusFilter);
    q.then(({ data }) => {
      setRaces(data ?? []);
      setLoading(false);
    });
  }, [statusFilter]);

  return { races, loading };
}
