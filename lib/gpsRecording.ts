/** Shared recorder/ingestion math. No platform APIs or trusted client totals. */
export type RecordingSport='Run'|'Walk'|'Ride';
export interface GpsPoint {latitude:number;longitude:number;timestamp:number;accuracy:number;altitude?:number|null}
export interface RecordingInterval {start:number;end:number|null}
export interface GpsRecording {version:1;id:string;userId:string;sport:RecordingSport;startedAt:number;finishedAt:number|null;status:'recording'|'paused'|'finished';intervals:RecordingInterval[];points:GpsPoint[];background:boolean;gpsError?:string|null}
export interface RecordedLocation {latitude:number;longitude:number;timestamp:string;altitude?:number;speed?:number;segment:number}
export const MAX_RECORDING_POINTS=30000;
export function gpsDistance(a:GpsPoint,b:GpsPoint){const rad=(v:number)=>v*Math.PI/180,h=Math.sin(rad(b.latitude-a.latitude)/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(rad(b.longitude-a.longitude)/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));}
export function goodGpsPoint(p:GpsPoint){return p&&Number.isFinite(p.timestamp)&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180&&Number.isFinite(p.accuracy)&&p.accuracy>=0&&p.accuracy<=50;}
export function recordingSummary(record:GpsRecording,now=Date.now()) {
 if(record?.version!==1||!['Run','Walk','Ride'].includes(record.sport)||!Number.isFinite(record.startedAt)||!Array.isArray(record.intervals)||!Array.isArray(record.points)||record.points.length>MAX_RECORDING_POINTS||record.intervals.length>2000)throw new Error('Invalid GPS recording.');
 const end=record.finishedAt??now;
 if(!Number.isFinite(end)||end<record.startedAt||end-record.startedAt>604800000)throw new Error('Invalid workout duration.');
 let activeMs=0,previousEnd=record.startedAt;
 const intervals=record.intervals.map((v,index)=>{const stop=v.end??end;if(!Number.isFinite(v.start)||!Number.isFinite(stop)||v.start<previousEnd||stop<v.start||stop>end||v.start<record.startedAt||(v.end===null&&index!==record.intervals.length-1))throw new Error('Invalid recording pause times.');previousEnd=stop;activeMs+=stop-v.start;return {start:v.start,end:stop};});
 let meters=0,climb=0,anchor:GpsPoint|null=null,lastInterval=-1,lastSeen=-1,segment=-1,rejected=0,gaps=0,pendingSpeedBreak=true,pendingElevationBreak=true;
 const locations:RecordedLocation[]=[],speed:{seconds:number;value:number;breakBefore?:boolean}[]=[],elevation:{seconds:number;value:number;breakBefore?:boolean}[]=[];
 const maxSpeed=record.sport==='Ride'?35:record.sport==='Run'?12:5;
 const points=record.points.filter(p=>goodGpsPoint(p)&&p.timestamp>=record.startedAt&&p.timestamp<=end).sort((a,b)=>a.timestamp-b.timestamp);
 rejected=record.points.length-points.length;
 let intervalIndex=0;
 for(const p of points){if(p.timestamp<=lastSeen)continue;const previousTimestamp=lastSeen;lastSeen=p.timestamp;while(intervalIndex<intervals.length&&p.timestamp>intervals[intervalIndex].end)intervalIndex++;const interval=intervals[intervalIndex];if(!interval||p.timestamp<interval.start||p.timestamp>=interval.end)continue;
  const seconds=(p.timestamp-record.startedAt)/1000,alt=typeof p.altitude==='number'&&Number.isFinite(p.altitude)?p.altitude:undefined;
  if(lastInterval!==intervalIndex||!anchor||previousTimestamp>=0&&p.timestamp-previousTimestamp>30000){if(anchor&&lastInterval===intervalIndex)gaps++;segment++;pendingSpeedBreak=true;pendingElevationBreak=true;anchor=p;lastInterval=intervalIndex;locations.push({latitude:p.latitude,longitude:p.longitude,timestamp:new Date(p.timestamp).toISOString(),altitude:alt,segment});continue;}
  const delta=(p.timestamp-anchor.timestamp)/1000,distance=gpsDistance(anchor,p);
  if(delta<=0)continue;
  if(distance/delta>maxSpeed){rejected++;continue;}
  if(distance<Math.max(2,(p.accuracy+anchor.accuracy)*0.15)){speed.push({seconds,value:0,breakBefore:pendingSpeedBreak});continue;}
  meters+=distance;const paceSpeed=distance/delta;
  if(alt!==undefined&&typeof anchor.altitude==='number'&&Number.isFinite(anchor.altitude)&&alt-anchor.altitude>=3)climb+=alt-anchor.altitude;
  locations.push({latitude:p.latitude,longitude:p.longitude,timestamp:new Date(p.timestamp).toISOString(),altitude:alt,speed:paceSpeed,segment});
  speed.push({seconds,value:paceSpeed*3.6,breakBefore:pendingSpeedBreak});pendingSpeedBreak=false;
  if(alt!==undefined){elevation.push({seconds,value:alt,breakBefore:pendingElevationBreak});pendingElevationBreak=false;}anchor=p;
 }
 return {distanceMeters:meters,activeSeconds:Math.floor(activeMs/1000),elapsedSeconds:Math.ceil((end-record.startedAt)/1000),locations,speed,elevation,rejectedPoints:rejected,gaps,elevationGain:climb};
}
export function recordedWorkout(record:GpsRecording,now=Date.now()){
 if(record.status!=='finished'||record.finishedAt===null||record.finishedAt>now+900000||record.startedAt<=0||typeof record.id!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(record.id))throw new Error('Finish the workout before submitting it.');
 const result=recordingSummary(record,now);
 if(result.activeSeconds<10||result.locations.length<2||result.distanceMeters<10)throw new Error('Record at least 10 seconds and 10 metres of valid GPS movement before submitting.');
 const bound=<T>(values:T[])=>values.length<=6000?values:values.filter((_,i)=>i%Math.ceil(values.length/6000)===0);
 return {metrics:{activity_name:`Sage ${record.sport.toLowerCase()}`,sport_type:record.sport,activity_started_at:new Date(record.startedAt).toISOString(),moving_time_secs:result.activeSeconds,elapsed_time_secs:result.elapsedSeconds,distance_meters:Math.round(result.distanceMeters*100)/100,avg_speed:result.distanceMeters/result.activeSeconds,elevation_gain:result.elevation.length>1?result.elevationGain:null,indoor:false,gps_quality:{rejected_points:result.rejectedPoints,gaps:result.gaps,recorded_points:record.points.length}},streams:{heartRate:[],locations:bound(result.locations),speed:bound(result.speed),elevation:bound(result.elevation)}};
}

export function recordingBytes(record:GpsRecording):Uint8Array {
 const encoded=encodeURIComponent(JSON.stringify(record)),bytes:number[]=[];
 for(let i=0;i<encoded.length;i++){if(encoded[i]==='%'){bytes.push(parseInt(encoded.slice(i+1,i+3),16));i+=2;}else bytes.push(encoded.charCodeAt(i));}
 return Uint8Array.from(bytes);
}
