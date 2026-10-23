import { subscribeHealthImport } from '../lib/healthSyncEvents';
import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Entry } from '../types';

export function useMyEntries(userId: string | undefined) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const owner=useRef(userId);owner.current=userId;
  const fetchEntries=useCallback(async()=> {
    if (!userId) { setEntries([]);setLoading(false); return; }
    const { data } = await supabase
      .from('entries')
      .select('*, race:races(*)')
      .eq('user_id', userId);
    if(owner.current!==userId)return;
    setEntries(data ?? []);
    setLoading(false);
  },[userId]);

  useEffect(() => { setEntries([]);fetchEntries(); }, [fetchEntries]);
  useEffect(()=>subscribeHealthImport(id=>{if(id===userId)void fetchEntries();}),[userId,fetchEntries]);

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
