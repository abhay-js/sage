import { useMemo,useState } from 'react';
import { Pressable,Text,View } from 'react-native';
import Svg,{Path,Line,Circle,Text as SvgText} from 'react-native-svg';
import { ActivityLog } from '../../types';
import { useWorkoutMetrics } from '../../hooks/useWorkoutMetrics';
import { MetricSample,formatPace,routeSeries,routeSplits } from '../../lib/activityMetrics';
import { adventureColors as c } from '../../lib/theme';
import { s,Section,Button } from './AdventureUI';
import { MetricGrid,Skeleton } from './ProductUI';

function elapsed(seconds:number){const total=Math.round(seconds);return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`;}
export function MetricChart({title,samples,duration,unit,color,pace=false,empty}:{title:string;samples:MetricSample[];duration:number;unit:string;color:string;pace?:boolean;empty:string}){
  const [selected,setSelected]=useState<MetricSample|null>(null),[width,setWidth]=useState(320);
  const values=samples.map(p=>p.value),min=values.reduce((a,v)=>Math.min(a,v),Infinity),max=values.reduce((a,v)=>Math.max(a,v),-Infinity);
  const padding=Number.isFinite(max)?Math.max(1,(max-min)*0.15):1,low=unit==='m'?min-padding:Math.max(0,min-padding),high=max+padding,span=Math.max(1,high-low),end=samples.reduce((end,s)=>Math.max(end,s.seconds),Math.max(1,duration));
  const x=(seconds:number)=>48+seconds/end*258,y=(value:number)=>24+(pace?(value-low)/span:1-(value-low)/span)*124;
  // Keep gaps visible and preserve each bucket's extreme values in a bounded SVG path.
  const path=useMemo(()=>{
    const segments:MetricSample[][]=[];samples.forEach((p,i)=>{if(!i||p.breakBefore||p.seconds-samples[i-1].seconds>120)segments.push([]);segments[segments.length-1].push(p);});
    return segments.map(segment=>{const stride=Math.max(1,Math.ceil(segment.length/400)),points:MetricSample[]=[];
      for(let i=0;i<segment.length;i+=stride){const bucket=segment.slice(i,i+stride);const extremes=[bucket[0],bucket.reduce((a,b)=>a.value<b.value?a:b),bucket.reduce((a,b)=>a.value>b.value?a:b),bucket[bucket.length-1]];points.push(...[...new Set(extremes)].sort((a,b)=>a.seconds-b.seconds));}
      return points.map((p,i)=>`${i?'L':'M'}${x(p.seconds).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
    }).join(' ');
  },[samples,duration,pace]);
  const label=(value:number)=>pace?formatPace(value):String(Math.round(value));
  function select(locationX:number){const seconds=Math.max(0,Math.min(1,(locationX/width*320-48)/258))*end;setSelected(samples.reduce((nearest,p)=>Math.abs(p.seconds-seconds)<Math.abs(nearest.seconds-seconds)?p:nearest,samples[0]));}
  return <View style={[s.card,{padding:16,marginBottom:14}]}><Text style={s.section}>{title}</Text>{samples.length<2?<Text style={[s.muted,{marginTop:12}]}>{empty}</Text>:<>
    <Text style={[s.muted,{fontSize:12,marginTop:8}]}>{selected?`${elapsed(selected.seconds)} · ${label(selected.value)} ${unit}`:`${label(min)} – ${label(max)} ${unit} · tap chart to inspect`}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${title} chart. Tap to inspect a sample.`} onLayout={e=>setWidth(e.nativeEvent.layout.width)} onPress={e=>select(e.nativeEvent.locationX)}>
      <Svg width="100%" height={190} viewBox="0 0 320 190">
        {[0,0.5,1].map(f=><Line key={f} x1={48} x2={306} y1={24+f*124} y2={24+f*124} stroke={c.border} strokeDasharray="3 4"/>)}
        {[0,0.5,1].map(f=><SvgText key={f} x={40} y={28+f*124} textAnchor="end" fontSize={10} fill={c.muted}>{label(pace?low+f*span:high-f*span)}</SvgText>)}
        <Path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        {selected&&<><Line x1={x(selected.seconds)} x2={x(selected.seconds)} y1={24} y2={148} stroke={c.muted} strokeDasharray="3 3"/><Circle cx={x(selected.seconds)} cy={y(selected.value)} r={4} fill={color} stroke={c.surface} strokeWidth={2}/></>}
        {[0,0.5,1].map(f=><SvgText key={f} x={48+f*258} y={171} fontSize={10} textAnchor={f===0?'start':f===1?'end':'middle'} fill={c.muted}>{elapsed(end*f)}</SvgText>)}
        <SvgText x={177} y={187} fontSize={10} textAnchor="middle" fill={c.muted}>Elapsed time</SvgText>
      </Svg>
    </Pressable>
  </>}</View>;
}

function paceFromSpeed(speed:MetricSample[]){const result:MetricSample[]=[];let stopped=false;for(const point of speed){if(point.value<=0){stopped=true;continue;}result.push({...point,value:60/point.value,breakBefore:point.breakBefore||stopped});stopped=false;}return result;}

export function WorkoutAnalytics({activity}:{activity:ActivityLog}){
  const metrics=useWorkoutMetrics(activity),start=Date.parse(activity.activity_started_at??activity.activity_date),duration=activity.elapsed_time_secs||activity.moving_time_secs;
  const series=useMemo(()=>{const route=routeSeries(metrics.locations,start);return {speed:metrics.speed.length?metrics.speed:route.speed,elevation:metrics.elevation.length?metrics.elevation:route.elevation,pace:metrics.speed.length?paceFromSpeed(metrics.speed):route.pace};},[metrics.locations,metrics.speed,metrics.elevation,start]);
  const riding=activity.sport_type==='Ride',swimming=activity.sport_type==='Swim',paceSport=['Run','Walk','Hike','Swim'].includes(activity.sport_type),distance=activity.distance_meters;
  const splits=useMemo(()=>routeSplits(metrics.locations,riding?5000:swimming?100:1000),[metrics.locations,riding,swimming]);
  const avgHeart=activity.avg_heartrate??(metrics.heartRate.length?metrics.heartRate.reduce((n,s)=>n+s.value,0)/metrics.heartRate.length:null),maxHeart=activity.max_heartrate??(metrics.heartRate.length?metrics.heartRate.reduce((n,s)=>Math.max(n,s.value),0):null);
  const pace=distance&&activity.moving_time_secs>0?activity.moving_time_secs/60/(distance/(swimming?100:1000)):null;
  const averageSpeed=activity.avg_speed!=null?activity.avg_speed*3.6:distance&&activity.moving_time_secs>0?distance/activity.moving_time_secs*3.6:null;
  const items:[string,string|number][]=[['Distance',distance!=null?`${(distance/1000).toFixed(2)} km`:'—'],['Workout duration',elapsed(activity.moving_time_secs)],['Average HR',avgHeart?`${Math.round(avgHeart)} bpm`:'—'],['Maximum HR',maxHeart?`${Math.round(maxHeart)} bpm`:'—']];
  if(paceSport)items.push(['Average pace',pace?`${formatPace(pace)} /${swimming?'100m':'km'}`:'—']);
  if(riding)items.push(['Average speed',averageSpeed!=null?`${averageSpeed.toFixed(1)} km/h`:'—']);
  return <><Section title="Workout overview"/><MetricGrid items={items}/><Text style={[s.muted,{fontSize:11,marginBottom:18}]}>Average pace/speed uses the recorded distance and workout duration. Charts use elapsed time.</Text>
    <Section title="Performance charts"/>{metrics.loading?<Skeleton/>:<>
      <MetricChart title="Heart rate" samples={metrics.heartRate} duration={duration} unit="bpm" color={c.orange} empty={metrics.heartError??'No heart-rate samples are readable for this workout. A recorded average alone cannot produce a graph.'}/>
      {(riding||paceSport)&&<MetricChart title={riding?'Speed':'Pace'} samples={riding?series.speed:swimming?series.pace.map(p=>({...p,value:p.value/10})):series.pace} duration={duration} unit={riding?'km/h':swimming?'min/100m':'min/km'} color={c.green} pace={!riding} empty={metrics.routeError??'No timed GPS speed data is available. Indoor workouts may have distance totals without a pace graph.'}/>}
      {!swimming&&!!series.elevation.length&&<MetricChart title="Elevation" samples={series.elevation} duration={duration} unit="m" color={c.green} empty="No elevation samples recorded."/>}
      <Text style={[s.muted,{fontSize:11,marginBottom:14}]}>Heart rate: Health samples within this workout’s time window. Pace/speed and elevation: recorded GPS route. Stationary pace segments and missing intervals are omitted. These charts stay on this iPhone.</Text>
      {(metrics.heartError||metrics.routeError)&&<Button title="Retry sample lookup" onPress={metrics.retry}/>}</>}
    {splits.length>0&&<><Section title={riding?'5 km splits':swimming?'100 m splits':'Kilometer splits'}/><Text style={[s.muted,{fontSize:11,marginBottom:12}]}>Derived from available GPS points, using elapsed time. Route gaps produce partial splits.</Text><View style={s.card}>{splits.map((split,i)=><View key={i} style={[s.between,{padding:14,borderBottomWidth:1,borderColor:c.border}]}><Text style={s.muted}>{i+1}{split.partial?' · partial':''} · {(split.distance/1000).toFixed(2)} km</Text><Text style={s.section}>{riding?`${(split.distance/split.seconds*3.6).toFixed(1)} km/h`:`${formatPace(split.seconds/60/(split.distance/(swimming?100:1000)))} /${swimming?'100m':'km'}`}</Text></View>)}</View></>}
  </>;
}
