import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Race } from '../types';
export type LevelAthlete = {id:string;name:string;email:string|null;status:string;sport_type:string|null;level:number|null;workouts:number;distance_meters:number;last_activity:string|null};
export type LevelRace = Race & {eligible_levels:number[]};
export function useAdminLevels() {
  const {user} = useAuth();
  const [data,setData] = useState<{athletes:LevelAthlete[];races:LevelRace[];entries:{user_id:string;race_id:string;level_at_join:number|null;sage_score:number;participant_status:string}[]}>({athletes:[],races:[],entries:[]});
  const [loading,setLoading] = useState(true), [error,setError] = useState<string|null>(null), [version,setVersion] = useState(0);
  const refresh = useCallback(() => setVersion(v=>v+1),[]);
  useFocusEffect(useCallback(() => { refresh(); },[refresh]));
  useEffect(() => {
    let active=true;
    if(user?.role!=='admin') {setLoading(false);return;}
    setLoading(true);
    supabase.rpc('admin_level_overview').then(({data,error})=>{if(!active)return;setError(error?.message??null);if(data)setData(data);setLoading(false);});
    return ()=>{active=false;};
  },[user?.id,user?.role,version]);
  async function saveLevel(userId:string,level:number|null) {
    const {error}=await supabase.rpc('admin_set_athlete_level',{p_user_id:userId,p_level:level});
    if(error)throw new Error(error.message); refresh();
  }
  async function saveEligibility(raceId:string,levels:number[]) {
    const {error}=await supabase.rpc('admin_set_race_eligibility',{p_race_id:raceId,p_levels:levels});
    if(error)throw new Error(error.message); refresh();
  }
  return {...data,loading,error,refresh,saveLevel,saveEligibility};
}
