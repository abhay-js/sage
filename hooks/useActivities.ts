import { subscribeHealthImport } from '../lib/healthSyncEvents';
import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ActivityLog } from '../types';
export function useActivities(userId?: string) {
  const owner=useRef(userId);owner.current=userId;
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refetch = useCallback(async () => {
    if (!userId) { setActivities([]); setLoading(false); return; }
    const { data, error: failure } = await supabase.from('activity_logs').select('*').eq('user_id', userId).order('activity_date', { ascending: false });
    if(owner.current!==userId)return;
    setError(failure?.message ?? null);
    // Reviews are optional until the moderation migration has been deployed.
    const { data: reviews } = data?.length ? await supabase.from('workout_reviews').select('activity_id,status,reason') : { data: [] };
    const byId = new Map((reviews ?? []).map(r => [r.activity_id,r]));
    if(owner.current!==userId)return;
    setActivities((data ?? []).map(a => ({...a,review_status:byId.get(a.id)?.status ?? 'pending',review_reason:byId.get(a.id)?.reason ?? null})));
    setLoading(false);
  }, [userId]);
  useEffect(() => { setActivities([]);refetch(); }, [refetch]);
  useEffect(()=>subscribeHealthImport(id=>{if(id===userId)void refetch();}),[userId,refetch]);
  return { activities, loading, error, refetch };
}
