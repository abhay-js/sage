import {useCallback, useState} from 'react';
import {Text, View, StyleSheet, TouchableOpacity} from 'react-native';
import {useFocusEffect, useRouter} from 'expo-router';
import {useAuth} from '../../context/AuthContext';
import {Page, Button} from '../../components/ui/SageUI';
import {supabase} from '../../lib/supabase';
import {sageColors as c} from '../../lib/theme';

type Flag = {id:string; user_id:string; athlete_name:string; activity_name:string; sport_type:string; activity_date:string; flag_reasons:string[]};
export default function AdminFlags(){
 const router=useRouter(); const {user}=useAuth();
 const [flags,setFlags]=useState<Flag[]>([]); const [total,setTotal]=useState(0); const [offset,setOffset]=useState(0); const [error,setError]=useState<string|null>(null); const [loading,setLoading]=useState(false); const [refresh,setRefresh]=useState(0);
 useFocusEffect(useCallback(()=>{if(user?.role!=='admin')return;let active=true;setLoading(true);setError(null);supabase.rpc('admin_automatic_workout_flags',{p_offset:offset,p_limit:50}).then(({data,error})=>{if(!active)return;setFlags(data?.workouts??[]);setTotal(data?.total??0);setError(error?.message??null);setLoading(false);});return()=>{active=false;};},[user?.role,offset,refresh]));
 return <Page><Text accessibilityRole="header" style={s.title}>Flags and reviews</Text><Text style={s.copy}>Workouts count while flagged. Review the reasons and remove a workout if it should not count.</Text>
 <View style={s.card}><Text style={s.heading}>Automatic flags · {total}</Text><Text style={s.copy}>Checks look for unusual speed or duration, future dates, possible duplicates and large changes from an athlete’s history. A flag is a prompt to review, not proof of a problem.</Text></View>
 {loading&&<Text style={s.copy}>Loading flags…</Text>}{error&&<View style={s.card}><Text style={s.copy}>Could not load flags: {error}</Text><Button title="Try again" onPress={()=>setRefresh(v=>v+1)}/></View>}
 {!loading&&!error&&!flags.length&&<View style={s.card}><Text style={s.copy}>No open automatic flags.</Text></View>}
 {flags.map(flag=><TouchableOpacity key={flag.id} style={s.card} onPress={()=>router.push({pathname:'/(admin)/workouts',params:{athleteId:flag.user_id,activityId:flag.id,activityName:flag.activity_name}})}><Text style={s.heading}>{flag.athlete_name} · {flag.activity_name}</Text><Text style={s.copy}>{flag.sport_type} · {new Date(flag.activity_date).toLocaleDateString('en-IN')}</Text>{flag.flag_reasons.map(reason=><Text key={reason} style={s.reason}>• {reason}</Text>)}<Text style={s.link}>Review workout →</Text></TouchableOpacity>)}
 <View style={{flexDirection:'row',gap:12,marginTop:16}}>{offset>0&&<View style={{flex:1}}><Button title="Previous" onPress={()=>setOffset(v=>Math.max(0,v-50))}/></View>}{offset+flags.length<total&&<View style={{flex:1}}><Button title="Next" onPress={()=>setOffset(v=>v+50)}/></View>}</View>
 <View style={s.card}><Text style={s.heading}>Other reviews</Text><Text style={s.copy}>Athlete-submitted flags, flagger rewards and change-type decisions are not available yet.</Text><View style={{marginTop:16}}><Button title="All workout reviews" onPress={()=>router.push('/(admin)/workouts')}/></View></View></Page>;
}
const s=StyleSheet.create({title:{color:c.text,fontSize:24,fontWeight:'800'},heading:{color:c.text,fontSize:15,fontWeight:'800'},copy:{color:c.muted,fontSize:12,lineHeight:19,marginTop:8},reason:{color:c.orange,fontSize:12,lineHeight:20,marginTop:5},link:{color:c.orange,fontWeight:'800',marginTop:14},card:{backgroundColor:c.surface,borderColor:c.border,borderWidth:1,borderRadius:12,padding:20,marginTop:20}});
