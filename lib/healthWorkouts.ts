// Normalize source measurements without inventing missing distance or heart rate.
export type HealthRow = {
  user_id:string;strava_activity_id:string;sport_type:string;activity_name:string;
  activity_date:string;activity_started_at:string;indoor:boolean|null;
  moving_time_secs:number;elapsed_time_secs:number;distance_meters:number|null;
  avg_heartrate:number|null;max_heartrate:number|null;calories:number|null;
  elevation_gain:number|null;avg_speed:number|null;
};
export const iosSports:Record<number,string>={13:'Ride',20:'WeightTraining',24:'Hike',35:'Rowing',37:'Run',46:'Swim',50:'WeightTraining',52:'Walk',57:'Yoga',63:'CrossFit'};
export const androidSports:Record<number,string>={8:'Ride',9:'Ride',36:'CrossFit',37:'Hike',53:'Rowing',54:'Rowing',56:'Run',57:'Run',70:'WeightTraining',73:'Swim',74:'Swim',79:'Walk',81:'WeightTraining',83:'Yoga'};
export function positive(value:unknown):number|null{return typeof value==='number'&&Number.isFinite(value)&&value>0?value:null;}
export function isGarmin(source:string){return /garmin/i.test(source);}
export function baseRow(userId:string,platform:'ios'|'android',id:string,start:string,end:string,sport:string,name:string,duration?:number):HealthRow|null {
  const elapsed=(Date.parse(end)-Date.parse(start))/1000;
  if(!id||!Number.isFinite(elapsed)||elapsed<=0||elapsed>7*86400||Date.parse(end)>Date.now()+60000)return null;
  return {user_id:userId,strava_activity_id:`health_${platform}_${userId}_${id}`,sport_type:sport,activity_name:name.slice(0,200),activity_date:start,activity_started_at:start,indoor:null,moving_time_secs:Math.max(1,Math.round(Math.min(positive(duration)??elapsed,elapsed))),elapsed_time_secs:Math.round(elapsed),distance_meters:null,avg_heartrate:null,max_heartrate:null,calories:null,elevation_gain:null,avg_speed:null};
}
export function iosWorkout(userId:string,w:any):HealthRow|null {
  const source=`${w.sourceId??''} ${w.sourceName??''}`;
  if(w.tracked===false||/strava/i.test(source)||w.metadata?.HKWasUserEntered===true||w.metadata?.HKWasUserEntered===1)return null;
  const row=baseRow(userId,'ios',w.id??w.start,w.start,w.end,iosSports[w.activityId]??'Workout',`${w.sourceName??'Apple Health'} · ${iosSports[w.activityId]??'Workout'}`,w.duration);
  if(!row)return null;
  row.distance_meters=positive(w.distance)==null?null:w.distance*1609.344;
  row.calories=positive(w.calories);row.elevation_gain=positive(w.elevationAscended);
  const indoor=w.metadata?.HKIndoorWorkout;
  row.indoor=indoor===true||indoor===1?true:indoor===false||indoor===0?false:null;
  row.avg_speed=row.distance_meters==null?null:row.distance_meters/row.moving_time_secs;
  return row;
}
export function heartSummary(samples:any[],start:string,end:string,sourceId?:string){
  const values=samples.filter(s=>Date.parse(s.startDate??s.time)>=Date.parse(start)&&Date.parse(s.startDate??s.time)<=Date.parse(end)&&(!sourceId||s.sourceId===sourceId)).map(s=>positive(s.value??s.beatsPerMinute)).filter((v):v is number=>v!=null&&v<=300);
  return {avg_heartrate:values.length?Math.round(values.reduce((n,v)=>n+v,0)/values.length):null,max_heartrate:values.length?Math.round(values.reduce((n,v)=>Math.max(n,v),0)):null};
}
// Daily totals and records crossing the session boundary cannot be attributed to this workout.
export function intervalTotal(records:any[],start:string,end:string,get:(r:any)=>unknown):number|null {
  const values=records.filter(r=>Date.parse(r.startTime)>=Date.parse(start)&&Date.parse(r.endTime)<=Date.parse(end)).map(r=>positive(get(r))).filter((v):v is number=>v!=null);
  return values.length?values.reduce((a,b)=>a+b,0):null;
}
export function healthReadSince(last:Date|null,platform:'ios'|'android',now=Date.now()){
  const earliest=now-(platform==='ios'?90:30)*86400000;
  return new Date(Math.max(earliest,last&&Number.isFinite(last.getTime())?last.getTime()-7*86400000:earliest));
}
