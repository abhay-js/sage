import { useAuth } from '../context/AuthContext';
import { useEffect,useState } from 'react';
import {supabase} from '../lib/supabase';
import { Platform } from 'react-native';
import { ActivityLog } from '../types';
import { healthWorkoutId } from '../lib/workoutRoute';
import { MetricSample,WorkoutLocation,timeBounds,heartRateSeries,workoutLocations } from '../lib/activityMetrics';
export function useWorkoutMetrics(activity:ActivityLog) {
  const {user}=useAuth();
  const [speed,setSpeed]=useState<MetricSample[]>([]),[elevation,setElevation]=useState<MetricSample[]>([]),[heartRate,setHeartRate]=useState<MetricSample[]>([]),[locations,setLocations]=useState<WorkoutLocation[]>([]),[loading,setLoading]=useState(true),[heartError,setHeartError]=useState<string|null>(null),[routeError,setRouteError]=useState<string|null>(null),[version,setVersion]=useState(0);
  useEffect(()=>{
    let cancelled=false;
    setSpeed([]);setElevation([]);setHeartRate([]);setLocations([]);setHeartError(null);setRouteError(null);setLoading(true);
    if((activity.strava_activity_id?.startsWith('fit_')||activity.strava_activity_id?.startsWith('gps_'))){void Promise.resolve(supabase.rpc('sage_workout_streams',{p_activity_id:activity.id})).then(({data,error})=>{if(cancelled)return;if(error){setHeartError(error.message);setRouteError(error.message);}else{setHeartRate(data?.heartRate??[]);setLocations(data?.locations??[]);setSpeed(data?.speed??[]);setElevation(data?.elevation??[]);}setLoading(false);}).catch(e=>{if(!cancelled){setHeartError(e.message);setLoading(false);}});return()=>{cancelled=true;};}
    if(activity.strava_activity_id?.startsWith('health_ios_')&&activity.user_id!==user?.id){setLoading(false);setHeartError('Detailed Apple Health samples are available only on the athlete’s original iPhone. A FIT upload can provide samples for admin review.');setRouteError('This phone does not hold that athlete’s Apple Health route.');return;}
    if(activity.strava_activity_id?.startsWith('health_ios_')&&/garmin/i.test(activity.activity_name??'')){setLoading(false);setHeartError('Garmin does not send detailed workout heart rate to Apple Health. Upload the original FIT file for those samples.');setRouteError('Garmin does not send GPS routes to Apple Health. Upload the original FIT file for its recorded route.');return;}
    const id=healthWorkoutId(activity.strava_activity_id),bounds=timeBounds(activity.activity_started_at??activity.activity_date,activity.elapsed_time_secs||activity.moving_time_secs);
    if(Platform.OS!=='ios'||!id){setLoading(false);setHeartError(Platform.OS==='ios'?'Detailed samples are currently available for Apple Health workouts.':'Open this workout on the iPhone that holds its Apple Health data.');setRouteError('Timed route samples are needed for pace, speed and elevation charts.');return;}
    if(!bounds||(!activity.activity_started_at&&!/T\d{2}:\d{2}/.test(activity.activity_date))){setLoading(false);setHeartError('This workout has no valid start time or duration.');return;}
    function call<T>(invoke:(cb:(error:unknown,data:T)=>void)=>void,label:string):Promise<T>{return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`${label} lookup timed out. Try again.`)),15000);try{invoke((error,data)=>{clearTimeout(timer);error?reject(new Error(`${label} could not be read. Check Sage’s permissions in Health.`)):resolve(data);});}catch(e){clearTimeout(timer);reject(e);}});}
    async function read(){try{
      const module=require('react-native-health'),health=module.default??module;
      if(typeof health.initHealthKit!=='function')throw new Error('Install the native Sage app to read Health samples.');
      await call(cb=>health.initHealthKit({permissions:{read:[health.Constants.Permissions.Workout,health.Constants.Permissions.HeartRate,health.Constants.Permissions.WorkoutRoute],write:[]}},(e:unknown)=>cb(e,null)),'Health permission');
      await Promise.all([
        call<unknown>(cb=>health.getHeartRateSamples({unit:'bpm',startDate:new Date(bounds!.startMs).toISOString(),endDate:new Date(bounds!.endMs).toISOString(),ascending:true},cb),'Heart rate').then(raw=>{if(!cancelled)setHeartRate(heartRateSeries(raw,bounds!.startMs,bounds!.endMs));}).catch(e=>{if(!cancelled)setHeartError((e as Error).message);}),
        call<unknown>(cb=>health.getWorkoutRouteSamples({id},cb),'Route').then(raw=>{if(!cancelled)setLocations(workoutLocations(raw,bounds!.startMs,bounds!.endMs));}).catch(e=>{if(!cancelled)setRouteError((e as Error).message);}),
      ]);
    }catch(e){if(!cancelled){setHeartError((e as Error).message);setRouteError((e as Error).message);}}finally{if(!cancelled)setLoading(false);}}
    void read();return()=>{cancelled=true;};
  },[activity.id,activity.strava_activity_id,activity.activity_started_at,activity.activity_date,activity.elapsed_time_secs,activity.moving_time_secs,activity.user_id,user?.id,version]);
  return {speed,elevation,heartRate,locations,loading,heartError,routeError,retry:()=>setVersion(v=>v+1)};
}
