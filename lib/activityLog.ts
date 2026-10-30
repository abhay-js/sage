import type { ActivityLog } from '../types';
import type { ProductChallenge, ScoreAudit } from '../types/product';
import { challengeState } from './productConfig';
export type LogSport = 'all'|'run'|'ride'|'swim'|'lift'|'walk'|'other';
export const LOG_FILTERS: {id:LogSport;label:string}[] = [
  {id:'all',label:'All'},{id:'run',label:'Run'},{id:'ride',label:'Ride'},
  {id:'swim',label:'Swim'},{id:'lift',label:'Strength'},{id:'walk',label:'Walk'},
];
export function logSport(sport:string): Exclude<LogSport,'all'> {
  if (['Run','TrailRun','VirtualRun','Treadmill','Running'].includes(sport)) return 'run';
  if (['Ride','VirtualRide','EBikeRide','MountainBikeRide','GravelRide','Cycling'].includes(sport)) return 'ride';
  if (['Swim','Swimming','OpenWaterSwim','PoolSwim'].includes(sport)) return 'swim';
  if (['WeightTraining','Strength','StrengthTraining','CrossFit','HYROX','HIIT'].includes(sport)) return 'lift';
  if (['Walk','Walking','Hike','Hiking'].includes(sport)) return 'walk';
  return 'other';
}
export function logDay(date:Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
// activity_date is the imported workout's calendar date, not its UTC creation date.
export function logDate(value:string): Date|null {
  const match=/^(\d{4})-(\d{2})-(\d{2})/.exec(value??'');
  if(!match)return null;
  const [year,month,day]=match.slice(1).map(Number),date=new Date(year,month-1,day,12);
  return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?date:null;
}
const positive=(value:number|null|undefined)=>typeof value==='number'&&Number.isFinite(value)&&value>0?value:0;
export function logSource(activity: Pick<ActivityLog,'strava_activity_id'>) {
  const id=activity.strava_activity_id??'';
  if(id.startsWith('health_ios_'))return 'Apple Health';
  if(id.startsWith('health_android_'))return 'Health Connect';
  if(id.startsWith('gps_'))return 'Sage GPS';
  if(id.startsWith('admin_'))return 'Added by admin';
  if(id.startsWith('fit_'))return 'FIT upload';
  if(id.startsWith('shared_strava_'))return 'Strava link';
  if(/^\d+$/.test(id))return 'Strava';
  return 'Imported workout';
}
export function logDuration(seconds:number) {
  const total=Math.floor(positive(seconds)),h=Math.floor(total/3600),m=Math.floor(total/60)%60,s=total%60;
  return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;
}
export function logActiveTime(seconds:number) {
  const total=Math.floor(positive(seconds)/60),h=Math.floor(total/60),m=total%60;
  return h?`${h} h${m?` ${m} m`:''}`:total?`${total} min`:seconds>0?'< 1 min':'0 min';
}
export function logStats(activity:ActivityLog) {
  const kind=logSport(activity.sport_type),distance=positive(activity.distance_meters),time=positive(activity.moving_time_secs);
  if(kind==='lift')return [time>=60?`${Math.floor(time/60)} min`:logActiveTime(time),activity.calories!=null?`${Math.round(positive(activity.calories))} kcal`:null].filter(Boolean).join(' · ');
  const parts=[distance>0?`${(distance/1000).toFixed(1)} km`:null,logDuration(time)];
  if(distance>0&&time>0) {
    if(kind==='run'||kind==='swim')parts.push(`${logDuration(Math.round(time/(distance/(kind==='swim'?100:1000))))} /${kind==='swim'?'100 m':'km'}`);
    if(kind==='ride')parts.push(`${(distance/time*3.6).toFixed(1)} km/h`);
  }
  return parts.filter(Boolean).join(' · ');
}
export function logWhen(activity:ActivityLog,now=new Date()) {
  const date=logDate(activity.activity_date);if(!date)return 'Date unavailable';
  const day=date.toLocaleDateString('en-IN',{weekday:'short'});
  const started=activity.activity_started_at?new Date(activity.activity_started_at):null;
  const time=started&&Number.isFinite(started.getTime())?started.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'}):null;
  return time?`${day}, ${time}`:date.toLocaleDateString('en-IN',{day:'numeric',month:'short',...(date.getFullYear()!==now.getFullYear()?{year:'numeric'}:{})});
}
export function monthlyLog(activities:ActivityLog[],now=new Date()) {
  const month=logDay(now).slice(0,7),items=activities.filter(a=>logDate(a.activity_date)&&a.activity_date.slice(0,7)===month);
  const sources=[...new Set(items.map(logSource))];
  const source=sources.length===1?`${['Apple Health','Health Connect','Strava'].includes(sources[0])?'Synced from':'From'} ${sources[0]}`:sources.length?'All workout sources':'Your training this month';
  const bars=Array.from({length:14},(_,index)=>{const date=new Date(now.getFullYear(),now.getMonth(),now.getDate()-13+index,12),key=logDay(date);return {key,minutes:activities.filter(a=>a.activity_date.slice(0,10)===key).reduce((sum,a)=>sum+positive(a.moving_time_secs)/60,0)};});
  return {month:now.toLocaleDateString('en-IN',{month:'long'}),count:items.length,distance:items.reduce((sum,a)=>sum+positive(a.distance_meters),0)/1000,seconds:items.reduce((sum,a)=>sum+positive(a.moving_time_secs),0),source,bars};
}
export interface LogGroup {key:string;title:string;distance:number;items:ActivityLog[]}
export function weeklyLog(activities:ActivityLog[],filter:LogSport,now=new Date()): LogGroup[] {
  const monday=(date:Date)=>{const d=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12);d.setDate(d.getDate()-(d.getDay()+6)%7);return d;};
  const thisWeek=logDay(monday(now)),groups=new Map<string,LogGroup>();
  const sorted=activities.filter(a=>filter==='all'||logSport(a.sport_type)===filter).slice().sort((a,b)=>b.activity_date.localeCompare(a.activity_date)||((Date.parse(b.activity_started_at??'')||0)-(Date.parse(a.activity_started_at??'')||0)));
  for(const activity of sorted){const date=logDate(activity.activity_date),start=date?monday(date):null,key=start?logDay(start):'unknown';let group=groups.get(key);
    if(!group){let title='Date unavailable';if(start){const end=new Date(start);end.setDate(end.getDate()+6);const crossYear=start.getFullYear()!==end.getFullYear(),includeYear=crossYear||end.getFullYear()!==now.getFullYear();const opts: Intl.DateTimeFormatOptions={day:'numeric',month:'short',...(includeYear?{year:'numeric'}:{})};const range=start.getMonth()===end.getMonth()&&start.getFullYear()===end.getFullYear()?`${start.getDate()}–${end.toLocaleDateString('en-IN',opts)}`:`${start.toLocaleDateString('en-IN',opts)} – ${end.toLocaleDateString('en-IN',opts)}`;title=`${key===thisWeek?'This week · ':''}${range}`;}group={key,title,distance:0,items:[]};groups.set(key,group);}
    group.items.push(activity);group.distance+=positive(activity.distance_meters)/1000;
  }
  return [...groups.values()].sort((a,b)=>a.key==='unknown'?1:b.key==='unknown'?-1:b.key.localeCompare(a.key));
}
export function liveLogChallenges(receipts:ScoreAudit[],challenges:ProductChallenge[],now=Date.now()) {
  const live=new Map(challenges.filter(ch=>ch.joined&&challengeState(ch,now)==='Live').map(ch=>[ch.id,ch]));
  const byActivity=new Map<string,Map<string,ProductChallenge>>();
  for(const receipt of receipts){if(!['COUNTED','PENDING'].includes(receipt.status)||!live.has(receipt.race_id))continue;const linked=byActivity.get(receipt.activity_id)??new Map();linked.set(receipt.race_id,live.get(receipt.race_id)!);byActivity.set(receipt.activity_id,linked);}
  return new Map([...byActivity].map(([id,linked])=>[id,[...linked.values()]]));
}
