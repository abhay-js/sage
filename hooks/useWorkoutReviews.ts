import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ActivityLog } from '../types';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type ReviewWorkout = ActivityLog & {
  athlete_name: string; athlete_email: string | null;
  review_status: ReviewStatus; review_reason: string | null; review_revision: number;
  reviewed_at: string | null;
  review_history: { status: ReviewStatus; reason: string | null; reviewed_at: string; reviewed_by: string }[];
};
export function useWorkoutReviews(enabled: boolean, status: ReviewStatus | 'all', search: string, userId?: string) {
  const [workouts,setWorkouts] = useState<ReviewWorkout[]>([]);
  const [total,setTotal] = useState(0);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState<string | null>(null);
  const [offset,setOffset] = useState(0);
  const [version,setVersion] = useState(0);
  useEffect(() => { setOffset(0); },[status,search,userId]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true); setError(null);
    supabase.rpc('admin_workouts',{p_status:status,p_search:search,p_user_id:userId ?? null,p_limit:50,p_offset:offset})
      .then(({data,error}) => { if (!active) return; setWorkouts(data?.workouts ?? []); setTotal(data?.total ?? 0); setError(error?.message ?? null); setLoading(false); });
    return () => { active = false; };
  },[enabled,status,search,userId,offset,version]);
  const refetch = useCallback(() => setVersion(v => v+1),[]);
  async function review(workout: ReviewWorkout, next: 'approved' | 'rejected', reason?: string) {
    const {error} = await supabase.rpc('review_workout',{p_activity_id:workout.id,p_status:next,p_reason:reason?.trim() || null,p_expected_revision:workout.review_revision});
    if (error) throw new Error(error.message);
    refetch();
  }
  return {workouts,total,loading,error,refetch,review,offset,nextPage:() => setOffset(o => o+50),previousPage:() => setOffset(o => Math.max(0,o-50)),hasMore:offset+workouts.length < total};
}
