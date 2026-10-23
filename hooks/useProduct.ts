import { subscribeHealthImport } from '../lib/healthSyncEvents';
import { useCallback,useEffect,useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AthleteProfile,LevelDefinition,ProductChallenge,TrainingAnalysis,AroundMe,BoardAthlete,ScoreAudit } from '../types/product';
const cache=new Map<string,unknown>();
export function useRpc<T>(name:string,args:Record<string,unknown>={},enabled=true) {
  const {user}=useAuth();
  const key=JSON.stringify(args),cacheKey=(user?.id??'anonymous')+name+key,[data,setData]=useState<T|null>(()=>cache.get(cacheKey) as T??null),[dataKey,setDataKey]=useState(cacheKey),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[version,setVersion]=useState(0);
  const refresh=useCallback(()=>setVersion(v=>v+1),[]);
  useEffect(()=>subscribeHealthImport(id=>{if(id===user?.id)refresh();}),[user?.id,refresh]);
  useFocusEffect(useCallback(()=>{refresh();},[refresh]));
  useEffect(()=>{let active=true;if(!enabled){setLoading(false);return;}setDataKey(cacheKey);setData(cache.get(cacheKey) as T??null);setLoading(true);Promise.resolve(supabase.rpc(name,JSON.parse(key))).then(({data,error})=>{if(!active)return;if(data!=null){cache.set(cacheKey,data);setData(data);}setError(error?.message??null);setLoading(false);}).catch(e=>{if(active){setError(e instanceof Error?e.message:'Unable to load data');setLoading(false);}});return()=>{active=false;};},[name,key,cacheKey,enabled,version]);
  return {data:dataKey===cacheKey?data:null,loading,error,refresh};
}
export const useAthleteProfile=()=>useRpc<{profile:AthleteProfile|null;level:number|null;levels:LevelDefinition[]}>('sage_profile');
export const useProductChallenges=(admin=false)=>useRpc<ProductChallenge[]>('sage_challenges',{p_admin:admin});
export const useAthleteAnalysis=(id?:string)=>useRpc<TrainingAnalysis>('sage_athlete_analysis',{p_user_id:id},!!id);
export const useAroundMe=(id?:string)=>useRpc<AroundMe>('sage_around_me',{p_race_id:id},!!id);
export const useBoardPage=(id:string|undefined,page:number,search:string)=>useRpc<{athletes:BoardAthlete[];total:number}>('sage_leaderboard',{p_race_id:id,p_offset:page*50,p_search:search,p_limit:50},!!id);
export const useScoreAudits=(workoutId?:string)=>useRpc<ScoreAudit[]>('sage_workout_scores',{p_activity_id:workoutId},!!workoutId);
export async function rpcWrite<T>(name:string,args:Record<string,unknown>):Promise<T> {const {data,error}=await supabase.rpc(name,args);if(error)throw new Error(error.message);return data;}
