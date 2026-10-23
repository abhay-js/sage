import { useEffect, useState } from 'react';
import {supabase} from '../lib/supabase';
import { Platform } from 'react-native';
import { healthWorkoutId, routePoints, RoutePoint } from '../lib/workoutRoute';

export function useWorkoutRoute(activityId: string,workoutId?:string) {
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const id = healthWorkoutId(activityId);
    setPoints([]); setError(null); setLoading(true);
    if((activityId.startsWith('fit_')||activityId.startsWith('gps_'))&&workoutId){void Promise.resolve(supabase.rpc('sage_workout_streams',{p_activity_id:workoutId})).then(({data,error})=>{if(cancelled)return;setPoints(data?.locations??[]);setError(error?.message??null);setLoading(false);}).catch(e=>{if(!cancelled){setError(e.message);setLoading(false);}});return()=>{cancelled=true;};}
    if (Platform.OS !== 'ios' || !id) { setLoading(false); return; }
    const timer = setTimeout(() => { if (!cancelled) { setLoading(false); setError('Route lookup timed out. Check Health permissions and reopen the workout.'); } },15000);
    async function read() {
      try {
        const module = require('react-native-health');
        const health = module.default ?? module;
        if (typeof health.getWorkoutRouteSamples !== 'function') throw new Error('GPS routes require the updated native Sage app.');
        await new Promise<void>((resolve,reject) => health.initHealthKit({permissions:{read:[health.Constants.Permissions.Workout,health.Constants.Permissions.WorkoutRoute],write:[]}},(e: any) => e ? reject(new Error(String(e))) : resolve()));
        const result = await new Promise((resolve,reject) => health.getWorkoutRouteSamples({id},(e: any, data: any) => e ? reject(new Error('No readable GPS route. Check Workout Routes permission in Health; indoor workouts usually have no route.')) : resolve(data)));
        if (!cancelled) { setPoints(routePoints(result)); setError(null); }
      } catch(e) { if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to read the GPS route.'); }
      finally { clearTimeout(timer); if (!cancelled) setLoading(false); }
    }
    void read();
    return () => { cancelled = true; clearTimeout(timer); };
  },[activityId,workoutId]);
  return {points,loading,error};
}
