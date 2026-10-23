export interface MetricSample { seconds:number; value:number; breakBefore?:boolean }
export interface WorkoutLocation { latitude:number; longitude:number; timestamp:string; altitude?:number; speed?:number;segment?:number }
export interface WorkoutSplit { distance:number; seconds:number; partial:boolean }
export function timeBounds(start:string,duration:number) {
  const startMs=Date.parse(start);
  return Number.isFinite(startMs)&&Number.isFinite(duration)&&duration>0?{startMs,endMs:startMs+duration*1000}:null;
}
export function heartRateSeries(raw:unknown,startMs:number,endMs:number):MetricSample[] {
  if(!Array.isArray(raw))return [];
  const byTime=new Map<number,number[]>();
  for(const sample of raw){const time=Date.parse(sample?.startDate),value=sample?.value;
    if(!Number.isFinite(time)||time<startMs||time>endMs||typeof value!=='number'||!Number.isFinite(value)||value<=0)continue;
    const bucket=byTime.get(time)??[];bucket.push(value);byTime.set(time,bucket);
  }
  return [...byTime].sort(([a],[b])=>a-b).map(([t,values])=>({seconds:(t-startMs)/1000,value:values.reduce((n,v)=>n+v,0)/values.length}));
}
export function workoutLocations(result:unknown,startMs:number,endMs:number):WorkoutLocation[] {
  const raw=(result as {data?:{locations?:unknown}})?.data?.locations;
  if(!Array.isArray(raw))return [];
  const byTime=new Map<number,WorkoutLocation>();
  for(const p of raw){const t=Date.parse(p?.timestamp);
    if(!Number.isFinite(t)||t<startMs||t>endMs||!Number.isFinite(p?.latitude)||!Number.isFinite(p?.longitude)||Math.abs(p.latitude)>90||Math.abs(p.longitude)>180)continue;
    byTime.set(t,p);
  }
  return [...byTime].sort(([a],[b])=>a-b).map(([,p])=>p);
}
export function distanceBetween(a:WorkoutLocation,b:WorkoutLocation):number {
  const rad=(v:number)=>v*Math.PI/180,dLat=rad(b.latitude-a.latitude),dLon=rad(b.longitude-a.longitude);
  const h=Math.sin(dLat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dLon/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
export function routeSeries(points:WorkoutLocation[],startMs:number) {
  const speed:MetricSample[]=[],elevation:MetricSample[]=[];
  points.forEach((p,i)=>{const seconds=(Date.parse(p.timestamp)-startMs)/1000;
    if(Number.isFinite(p.altitude))elevation.push({seconds,value:p.altitude!});
    let value=p.speed;
    if(!Number.isFinite(value)||value!<0){const previous=points[i-1],gap=previous?(Date.parse(p.timestamp)-Date.parse(previous.timestamp))/1000:0;value=previous&&gap>0&&gap<=30&&p.segment===previous.segment?distanceBetween(previous,p)/gap:undefined;}
    if(value!=null&&Number.isFinite(value)&&value>=0&&value<=50)speed.push({seconds,value:value*3.6});
  });
  const pace:MetricSample[]=[];let stopped=false;for(const s of speed){if(s.value<=0){stopped=true;continue;}pace.push({seconds:s.seconds,value:60/s.value,breakBefore:stopped});stopped=false;}
  return {speed,elevation,pace};
}
// Full splits are emitted only for contiguous timestamped route sections.
// A route gap ends the current partial split rather than inventing missing movement.
export function routeSplits(points:WorkoutLocation[],splitMeters:number):WorkoutSplit[] {
  if(!Number.isFinite(splitMeters)||splitMeters<=0)return [];
  const result:WorkoutSplit[]=[];let distance=0,seconds=0;
  const flush=()=>{if(distance>10)result.push({distance,seconds,partial:true});distance=0;seconds=0;};
  for(let i=1;i<points.length;i++){
    const time=(Date.parse(points[i].timestamp)-Date.parse(points[i-1].timestamp))/1000;
    if(time<=0||time>30||points[i].segment!==points[i-1].segment){flush();continue;}
    let meters=distanceBetween(points[i-1],points[i]),remainingTime=time;
    if(meters/time>50){flush();continue;}
    while(distance+meters>=splitMeters){const needed=splitMeters-distance,fraction=needed/meters,partTime=remainingTime*fraction;
      result.push({distance:splitMeters,seconds:seconds+partTime,partial:false});meters-=needed;remainingTime-=partTime;distance=0;seconds=0;
    }
    distance+=meters;seconds+=remainingTime;
  }
  flush();return result;
}
export function formatPace(minutes:number):string {
  if(!Number.isFinite(minutes)||minutes<=0)return '—';
  const seconds=Math.round(minutes*60);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
}
