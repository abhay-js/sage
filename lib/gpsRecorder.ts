import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {GpsRecording,GpsPoint,RecordingSport,goodGpsPoint,MAX_RECORDING_POINTS} from './gpsRecording';
export const RECORDING_TASK='sage-active-workout-gps-v1';
const folder=FileSystem.documentDirectory+'sage-recordings/';
const pointer=folder+'active.json';
let pending:Promise<unknown>=Promise.resolve();
const cache=new Map<string,GpsRecording|null>(),listeners=new Set<()=>void>();
let foreground:Location.LocationSubscription|null=null;
function serial<T>(job:()=>Promise<T>):Promise<T>{const result=pending.then(job);pending=result.catch(()=>{});return result;}
function path(userId:string){if(!/^[0-9a-f-]{36}$/i.test(userId))throw new Error('Sign in to record a workout.');return folder+userId+'.json';}
async function read(userId:string){if(cache.has(userId))return cache.get(userId)!;const file=path(userId),info=await FileSystem.getInfoAsync(file);if(!info.exists){cache.set(userId,null);return null;}const record=JSON.parse(await FileSystem.readAsStringAsync(file)) as GpsRecording;if(record.userId!==userId||record.version!==1)throw new Error('Unable to recover this workout.');cache.set(userId,record);return record;}
async function write(record:GpsRecording){await FileSystem.makeDirectoryAsync(folder,{intermediates:true});await FileSystem.writeAsStringAsync(path(record.userId),JSON.stringify(record));cache.set(record.userId,record);listeners.forEach(fn=>fn());}
async function activeOwner(){const info=await FileSystem.getInfoAsync(pointer);return info.exists?JSON.parse(await FileSystem.readAsStringAsync(pointer)).userId as string:null;}
async function setOwner(userId:string|null){await FileSystem.makeDirectoryAsync(folder,{intermediates:true});await FileSystem.writeAsStringAsync(pointer,JSON.stringify({userId}));}
function gpsPoint(location:Location.LocationObject):GpsPoint{return {latitude:location.coords.latitude,longitude:location.coords.longitude,timestamp:location.timestamp,accuracy:location.coords.accuracy??-1,altitude:location.coords.altitude};}
async function stopTracking(){foreground?.remove();foreground=null;if(await Location.hasStartedLocationUpdatesAsync(RECORDING_TASK))await Location.stopLocationUpdatesAsync(RECORDING_TASK);}
function paused(record:GpsRecording,at=Date.now()):GpsRecording{const last=record.intervals[record.intervals.length-1];return {...record,status:'paused',intervals:record.intervals.map((v,i)=>i===record.intervals.length-1&&v.end===null?{...v,end:Math.max(v.start,at)}:v)};}
function append(locations:Location.LocationObject[],error?:string){return serial(async()=>{const owner=await activeOwner();if(!owner)return;const record=await read(owner);if(!record||record.status!=='recording')return;
 const points=locations.map(gpsPoint).filter(p=>goodGpsPoint(p)&&p.timestamp>=record.startedAt&&p.timestamp<=Date.now()+1000),last=record.points[record.points.length-1]?.timestamp??0;
 const fresh=points.filter(p=>p.timestamp>last).sort((a,b)=>a.timestamp-b.timestamp);
 if(record.points.length+fresh.length>MAX_RECORDING_POINTS){await write({...paused(record),gpsError:'Recording paused at its storage limit. Finish and save this workout.'});await stopTracking();await setOwner(null);return;}
 if(fresh.length||error)await write({...record,points:[...record.points,...fresh],gpsError:error??null});
 });}
if(!TaskManager.isTaskDefined(RECORDING_TASK))TaskManager.defineTask<{locations:Location.LocationObject[]}>(RECORDING_TASK,async({data,error})=>{await append(data?.locations??[],error?.message);});
export const subscribeRecording=(callback:()=>void)=>{listeners.add(callback);return()=>{listeners.delete(callback);};};
export const loadRecording=(userId:string)=>serial(()=>read(userId));
export async function reconcileRecordingOwner(userId?:string){return serial(async()=>{const owner=await activeOwner();if(!owner)return;const record=await read(owner);if(!record||record.status!=='recording'){await stopTracking();await setOwner(null);return;}
 if(owner!==userId){await write(paused(record));await stopTracking();await setOwner(null);return;}
 const alive=record.background?await Location.hasStartedLocationUpdatesAsync(RECORDING_TASK):!!foreground;
 if(!alive){const last=record.points[record.points.length-1]?.timestamp??record.startedAt;await write({...paused(record,last),gpsError:'Recording was interrupted. Resume to continue; missing GPS movement was not added.'});await setOwner(null);}
 });}
async function permissions(){if(!await Location.hasServicesEnabledAsync())throw new Error('Turn on Location Services to record your route.');const fg=await Location.requestForegroundPermissionsAsync();if(!fg.granted)throw new Error('Allow Sage to use your precise location to record a workout.');
 if(!await TaskManager.isAvailableAsync())throw new Error('GPS recording requires the installed Sage app.');
 const bg=await Location.getBackgroundPermissionsAsync();if(bg.granted)return true;
 const requested=await Location.requestBackgroundPermissionsAsync();return requested.granted;
}
async function tracking(record:GpsRecording){const options={accuracy:Location.Accuracy.BestForNavigation,distanceInterval:3,timeInterval:3000};
 if(record.background)await Location.startLocationUpdatesAsync(RECORDING_TASK,{...options,activityType:Location.ActivityType.Fitness,pausesUpdatesAutomatically:false,showsBackgroundLocationIndicator:true,deferredUpdatesInterval:3000,deferredUpdatesDistance:0,foregroundService:{notificationTitle:'Sage workout recording',notificationBody:'Recording your route. Return to Sage to pause or finish.',killServiceOnDestroy:true}});
 else foreground=await Location.watchPositionAsync(options,position=>{void append([position]).catch(()=>{});},message=>{void append([],message).catch(()=>{});});
}
export async function startRecording(userId:string,sport:RecordingSport){const background=await permissions();return serial(async()=>{const existing=await read(userId);if(existing)throw new Error('Save or discard your previous workout before starting another.');const owner=await activeOwner();if(owner&&owner!==userId)throw new Error('Another account has an active recording. Reopen Sage first.');
 const now=Date.now(),record:GpsRecording={version:1,id:`run_${now}_${Math.random().toString(36).slice(2,12)}`,userId,sport,startedAt:now,finishedAt:null,status:'recording',intervals:[{start:now,end:null}],points:[],background};
 await write(record);await setOwner(userId);try{await tracking(record);}catch(e){await write({...paused(record),gpsError:(e as Error).message});await setOwner(null);throw e;}return record;});}
export const pauseRecording=(userId:string)=>serial(async()=>{const record=await read(userId);if(!record||record.status!=='recording')return;await write(paused(record));await stopTracking();await setOwner(null);});
export async function resumeRecording(userId:string){const background=await permissions();return serial(async()=>{const record=await read(userId);if(!record||record.status!=='paused')throw new Error('This workout cannot be resumed.');const now=Date.now(),next:GpsRecording={...record,status:'recording',background,gpsError:null,intervals:[...record.intervals,{start:now,end:null}]};await write(next);await setOwner(userId);try{await tracking(next);}catch(e){await write({...paused(next),gpsError:(e as Error).message});await setOwner(null);throw e;}});}
export const finishRecording=(userId:string)=>serial(async()=>{const record=await read(userId);if(!record||record.status==='finished')return;const now=Date.now();await write({...paused(record,now),status:'finished',finishedAt:now});await stopTracking();await setOwner(null);});
export const discardRecording=(userId:string)=>serial(async()=>{const owner=await activeOwner();if(owner===userId){await stopTracking();await setOwner(null);}await FileSystem.deleteAsync(path(userId),{idempotent:true});cache.set(userId,null);listeners.forEach(fn=>fn());});
export function recordingAppState(userId:string|undefined,state:string){if(state==='active')return reconcileRecordingOwner(userId);return serial(async()=>{const owner=await activeOwner();if(!owner)return;const record=await read(owner);if(record?.status==='recording'&&!record.background){await write(paused(record));await stopTracking();await setOwner(null);}});}
