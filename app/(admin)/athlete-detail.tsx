import { useEffect,useState } from 'react';
import { View,Text,Alert } from 'react-native';
import { useLocalSearchParams,useRouter } from 'expo-router';
import { Page,Header,Section,Button,Empty,s } from '../../components/ui/SageUI';
import { Field,Choices,MetricGrid,Skeleton,ProfilePhoto,confirmAction } from '../../components/ui/ProductUI';
import { useAthleteAnalysis,useAthleteProfile,rpcWrite } from '../../hooks/useProduct';
import { sageColors as c } from '../../lib/theme';
export default function AthleteDetail(){
  const {id}=useLocalSearchParams<{id:string}>(),router=useRouter();
  const {data,loading,error,refresh}=useAthleteAnalysis(id),{data:definitions}=useAthleteProfile();
  const [level,setLevel]=useState<number|null>(null),[note,setNote]=useState(''),[saving,setSaving]=useState(false);
  useEffect(()=>{if(data)setLevel(data.level);},[data]);
  async function assign(){setSaving(true);try{await rpcWrite('sage_assign_level',{p_user_id:id,p_level:level,p_note:note});refresh();setNote('');}catch(e){Alert.alert('Unable to assign',(e as Error).message);}finally{setSaving(false);}}
  if(!data)return <Page><Header title="Athlete review"/>{loading?<Skeleton/>:<><Empty text={error??'Athlete not found'}/><Button title="Retry" onPress={refresh}/></>}</Page>;
  const p=data.profile,summary=data.summary,maxHours=Math.max(1,...data.weekly.map(w=>w.hours));
  return <Page><Header title={p?.full_name??'Athlete review'} eyebrow="Admin · latest 90 workouts"/><ProfilePhoto uri={p?.profile_image_url} name={p?.full_name??'Athlete'}/><Text style={[s.muted,{marginVertical:14}]}>{[p?.city,p?.country,p?.primary_sport].filter(Boolean).join(' · ')}{p?.goal_name?`\nGoal: ${p.goal_name} ${p.goal_target??''}`:''}</Text>
    <MetricGrid items={[["Workouts",summary.count],["Training hours",Number(summary.hours).toFixed(1)],["Workouts/week",summary.workoutsPerWeek],["Hours/week",summary.hoursPerWeek],["Active weeks",`${summary.activeWeeks} / ${summary.weeks}`],["Average duration",`${summary.averageMinutes} min`]]}/>
    <Text style={s.muted}>{summary.start&&summary.end?`${new Date(summary.start).toLocaleDateString()} – ${new Date(summary.end).toLocaleDateString()}`:'No workout history available.'}</Text>
    <Section title="Sport breakdown"/>{data.sports.map(sport=><View key={sport.sport} style={[s.card,{padding:18,marginBottom:10}]}><Text style={s.section}>{sport.sport}</Text><Text style={s.muted}>{sport.count} workouts · {Number(sport.hours).toFixed(1)} hours · {(sport.distance/1000).toFixed(1)} km</Text><Text style={s.muted}>Longest: {(sport.longest/1000).toFixed(1)} km · {Math.round(sport.elevation)} m elevation · {sport.indoor} indoor / {sport.outdoor} outdoor / {sport.unknown} unspecified</Text><Text style={s.muted}>{(sport.distance/1000/summary.weeks).toFixed(1)} km/week · {Number(sport.hours*60/sport.count).toFixed(0)} min/session · {(sport.count/summary.weeks).toFixed(1)} sessions/week</Text><Text style={s.muted}>Longest session: {Number(sport.longestMinutes).toFixed(0)} min{sport.sport==='Run'&&sport.paceMinutesPerKm?` · Paired average pace: ${Number(sport.paceMinutesPerKm).toFixed(2)} min/km`:""}</Text></View>)}
    <Section title="Workout distribution"/><View style={[s.row,{flexWrap:"wrap",gap:10}]}>{data.sports.map(sport=><Text key={sport.sport} style={s.muted}>{sport.sport}: {Math.round(sport.count/Math.max(1,summary.count)*100)}%</Text>)}</View>
    <Section title="Weekly training hours"/>{data.weekly.map(w=><View key={w.week} style={{marginBottom:12}}><Text style={s.muted}>{new Date(w.week).toLocaleDateString()} · {Number(w.hours).toFixed(1)} h</Text><View style={{height:8,backgroundColor:c.pale,borderRadius:4,marginTop:6}}><View style={{width:`${w.hours/maxHours*100}%`,height:8,backgroundColor:c.green,borderRadius:4}}/></View></View>)}
    <Section title="Suggested level"/><View style={[s.card,{padding:18}]}><Text style={s.section}>{definitions?.levels.find(l=>l.id===data.suggestion.level)?.name??'Insufficient history'}</Text>{data.suggestion.reasons.map(reason=><Text key={reason} style={[s.muted,{marginTop:8}]}>{reason}</Text>)}</View>
    <Section title="Admin assignment"/><Text style={s.section}>Current: {definitions?.levels.find(l=>l.id===data.level)?.name??"Under Review"}</Text><Text style={[s.muted,{marginBottom:16}]}>The suggestion is provisional. Your assignment determines eligibility for future joins. Existing entries keep their original level.</Text>
    <Choices label="Assign level" options={[...(definitions?.levels??[]).map(l=>({id:l.id,label:l.name})),{id:0,label:'Under Review'}]} selected={[level??0]} onSelect={id=>setLevel(id||null)}/><Field label="Reason / review note" value={note} onChange={setNote} multiline/>
    <Button title={saving?'Saving…':'Confirm level assignment'} disabled={saving} onPress={()=>confirmAction('Assign athlete level',`Set ${definitions?.levels.find(l=>l.id===level)?.name??'Under Review'}?`,()=>void assign())}/>
    <Section title="Assignment history"/>{data.history.length?data.history.map((h,i)=><View key={i} style={[s.card,{padding:16,marginBottom:10}]}><Text style={s.section}>{h.previous_level??'Unassigned'} → {h.new_level??'Under Review'}</Text><Text style={s.muted}>{h.reason??'No review note'} · {new Date(h.updated_at).toLocaleString()}</Text><Text style={[s.muted,{fontSize:10}]}>Admin: {h.updated_by}</Text></View>):<Empty text="No level changes recorded yet."/>}
    <Button title="Review athlete workouts" onPress={()=>router.push({pathname:'/(admin)/workouts',params:{athleteId:id}})}/>
  </Page>;
}
