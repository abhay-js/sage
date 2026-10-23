export function parseFit(bytes:Uint8Array,sdk:any) {
 const decoder=new sdk.Decoder(sdk.Stream.fromByteArray(bytes));
 if(!decoder.isFIT()||!decoder.checkIntegrity())throw new Error('Invalid or damaged FIT file. Export it again.');
 const {messages,errors}=decoder.read();if(errors.length)throw new Error('Unable to decode this FIT file.');
 const sessions=messages.sessionMesgs??[];if(sessions.length!==1)throw new Error('Upload a FIT file containing one workout.');
 const s=sessions[0],records=messages.recordMesgs??[],number=(v:any)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
 const start=new Date(s.startTime).getTime(),duration=Math.round(s.totalTimerTime),elapsed=Math.round(s.totalElapsedTime??duration);
 if(!Number.isFinite(start)||!Number.isFinite(duration)||duration<1||elapsed<duration||elapsed>604800)throw new Error('The file has no valid workout time.');
 const sports:Record<string,string>={running:'Run',cycling:'Ride',swimming:'Swim',walking:'Walk',hiking:'Hike',rowing:'Rowing',training:'Workout',fitnessEquipment:'Workout'};
 const sport=s.subSport==='strengthTraining'?'WeightTraining':sports[s.sport];if(!sport)throw new Error('This FIT sport is not supported yet.');
 const heartRate:any[]=[],locations:any[]=[],speed:any[]=[],elevation:any[]=[];
 for(const r of records){const time=new Date(r.timestamp).getTime(),seconds=(time-start)/1000;if(!Number.isFinite(seconds)||seconds<0||seconds>elapsed)continue;
  if(number(r.heartRate)>0)heartRate.push({seconds,value:r.heartRate});
  const v=number(r.enhancedSpeed??r.speed),rawAlt=r.enhancedAltitude??r.altitude,alt=typeof rawAlt==='number'&&Number.isFinite(rawAlt)?rawAlt:null;
  if(v!==null&&v<=50)speed.push({seconds,value:v*3.6});if(alt!==null)elevation.push({seconds,value:alt});
  const lat=r.positionLat*180/2147483648,long=r.positionLong*180/2147483648;
  if(Number.isFinite(lat)&&Number.isFinite(long)&&Math.abs(lat)<=90&&Math.abs(long)<=180)locations.push({latitude:lat,longitude:long,timestamp:new Date(time).toISOString(),altitude:alt,speed:v});
 }
 const bounded=(values:any[])=>values.length<=6000?values:values.filter((_:any,i:number)=>i%Math.ceil(values.length/6000)===0);
 return {metrics:{activity_name:`${sport} workout`,sport_type:sport,activity_started_at:new Date(start).toISOString(),moving_time_secs:duration,elapsed_time_secs:elapsed,distance_meters:number(s.totalDistance)??records.reduce((last:any,r:any)=>number(r.distance)===null?last:Math.max(last??0,r.distance),null),calories:number(s.totalCalories),elevation_gain:number(s.totalAscent),avg_heartrate:number(s.avgHeartRate),max_heartrate:number(s.maxHeartRate),avg_speed:number(s.enhancedAvgSpeed??s.avgSpeed),avg_power:number(s.avgPower),indoor:/indoor|virtual|treadmill/i.test(s.subSport??'')?true:locations.length?false:null},streams:{heartRate:bounded(heartRate),locations:bounded(locations),speed:bounded(speed),elevation:bounded(elevation)}};
}
