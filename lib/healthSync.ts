import { Platform } from 'react-native';
import { supabase } from './supabase';
import { HealthRow,androidSports,baseRow,heartSummary,healthReadSince,intervalTotal,iosWorkout,isGarmin } from './healthWorkouts';
export function healthPlatformName():string{return Platform.OS==='ios'?'Apple Health':Platform.OS==='android'?'Health Connect':'Health imports';}
function healthCall<T>(run:(cb:(error:any,data:T)=>void)=>void):Promise<T>{
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Health lookup timed out. Try again.')),30000);try{run((error,data)=>{clearTimeout(timer);error?reject(new Error(String(error))):resolve(data);});}catch(e){clearTimeout(timer);reject(e);}});
}
export async function readAndroidPages(HC:any,type:string,options:any):Promise<any[]>{
  const records:any[]=[];let token:string|undefined;const seen=new Set<string>();
  do{const page=await HC.readRecords(type,{...options,pageSize:500,pageToken:token});records.push(...(page.records??[]));token=page.pageToken||undefined;
    if(token){if(seen.has(token)||seen.size>=100)throw new Error('Health Connect returned too much data. Try a shorter import window.');seen.add(token);}
  }while(token);return records;
}
async function syncIOS(userId:string,since:Date,_requestPermissions:boolean):Promise<HealthRow[]>{
  const mod=require('react-native-health'),HK=mod.default??mod;
  if(typeof HK.initHealthKit!=='function')throw new Error('Install the native Sage app to connect Apple Health.');
  // Creates the native Health store. Previously requested iOS permissions do not prompt again.
  await healthCall(cb=>HK.initHealthKit({permissions:{read:['Workout','HeartRate','DistanceWalkingRunning','DistanceCycling','ActiveEnergyBurned'].map(p=>HK.Constants.Permissions[p]),write:[]}},(error:any)=>cb(error,null)));
  const workouts=await healthCall<any[]>(cb=>HK.getSamples({startDate:since.toISOString(),endDate:new Date().toISOString(),type:'Workout'},cb));
  const rows:HealthRow[]=[];
  for(const w of workouts??[]){const row=iosWorkout(userId,w);if(!row)continue;
    // Garmin exports no detailed workout HR; do not substitute its all-day readings.
    if(!isGarmin(`${w.sourceName??''} ${w.sourceId??''}`)){
      const samples=await healthCall<any[]>(cb=>HK.getHeartRateSamples({unit:'bpm',startDate:w.start,endDate:w.end,ascending:true},cb)).catch(()=>[]);
      Object.assign(row,heartSummary(samples,w.start,w.end,w.sourceId));
    }rows.push(row);
  }return rows;
}
async function syncAndroid(userId:string,since:Date,requestPermissions:boolean):Promise<HealthRow[]>{
  const HC=require('react-native-health-connect');
  if(!await HC.initialize())throw new Error('Health Connect is unavailable. Install or update it, then try again.');
  const types=['ExerciseSession','Distance','HeartRate','ActiveCaloriesBurned','ElevationGained'];
  const granted=requestPermissions?await HC.requestPermission(types.map(recordType=>({accessType:'read',recordType}))):await HC.getGrantedPermissions();
  const allowed=new Set(granted.filter((p:any)=>p.accessType==='read').map((p:any)=>p.recordType));
  if(!allowed.has('ExerciseSession'))throw new Error('Allow Sage to read Exercise sessions in Health Connect.');
  const sessions=await readAndroidPages(HC,'ExerciseSession',{timeRangeFilter:{operator:'between',startTime:since.toISOString(),endTime:new Date().toISOString()}});
  const rows:HealthRow[]=[];
  for(const w of sessions){const origin=w.metadata?.dataOrigin;
    if(!origin||/strava/i.test(origin)||w.metadata?.recordingMethod===3)continue;
    const row=baseRow(userId,'android',w.metadata?.id,w.startTime,w.endTime,androidSports[w.exerciseType]??'Workout',`${/garmin/i.test(origin)?'Garmin':'Health Connect'} · ${w.title||androidSports[w.exerciseType]||'Workout'}`);
    if(!row)continue;row.indoor=[9,54,57].includes(w.exerciseType)?true:null;
    const options={timeRangeFilter:{operator:'between',startTime:w.startTime,endTime:w.endTime},dataOriginFilter:[origin]};
    const optional=async(type:string)=>allowed.has(type)?readAndroidPages(HC,type,options):[];
    const [dist,heart,calories,elevation]=await Promise.all(['Distance','HeartRate','ActiveCaloriesBurned','ElevationGained'].map(optional));
    row.distance_meters=intervalTotal(dist,w.startTime,w.endTime,r=>r.distance?.inMeters);
    row.calories=intervalTotal(calories,w.startTime,w.endTime,r=>r.energy?.inKilocalories);
    row.elevation_gain=intervalTotal(elevation,w.startTime,w.endTime,r=>r.elevation?.inMeters);
    Object.assign(row,heartSummary(heart.flatMap(r=>r.samples??[]),w.startTime,w.endTime));
    row.avg_speed=row.distance_meters==null?null:row.distance_meters/row.moving_time_secs;rows.push(row);
  }return rows;
}
const pending=new Map<string,Promise<number>>();
export function syncHealthPlatform(userId:string,lastActivityDate:Date|null,options:{requestPermissions?:boolean;shouldContinue?:()=>boolean}={}):Promise<number>{
  if(Platform.OS==='web')return Promise.reject(new Error('Health imports require the native Sage app. Use FIT upload on the website.'));
  const key=`${Platform.OS}:${userId}`,running=pending.get(key);if(running)return running;
  const work=(async()=>{
    const platform=Platform.OS==='ios'?'ios':'android',since=healthReadSince(lastActivityDate,platform);
    const rows=await(platform==='ios'?syncIOS:syncAndroid)(userId,since,options.requestPermissions??true);
    if(options.shouldContinue&&!options.shouldContinue())throw new Error('Health import stopped.');
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError||user?.id!==userId)throw new Error('Your Sage account changed. Sign in again before importing.');
    let inserted=0;const unique=[...new Map(rows.map(r=>[r.strava_activity_id,r])).values()];
    for(let start=0;start<unique.length;start+=100){if(options.shouldContinue&&!options.shouldContinue())throw new Error('Health import stopped.');const batch=unique.slice(start,start+100);
      const {data:existing,error:readError}=await supabase.from('activity_logs').select('strava_activity_id').eq('user_id',userId).in('strava_activity_id',batch.map(r=>r.strava_activity_id));
      if(readError)throw new Error(readError.message);
      const {error}=await supabase.from('activity_logs').upsert(batch,{onConflict:'strava_activity_id',ignoreDuplicates:false});
      if(error)throw new Error(error.message);const known=new Set((existing??[]).map(r=>r.strava_activity_id));inserted+=batch.filter(r=>!known.has(r.strava_activity_id)).length;
    }return inserted;
  })();pending.set(key,work);void work.finally(()=>pending.delete(key)).catch(()=>{});return work;
}
