import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useWorkoutReviews, ReviewStatus, ReviewWorkout } from '../../hooks/useWorkoutReviews';
import { Page, Header, Section, Button, Empty, s } from '../../components/ui/SageUI';
import { SageIcon } from '../../components/ui/SageIcon';
import { sageColors as c } from '../../lib/theme';
export default function WorkoutReviewsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { athleteId, activityId, activityName } = useLocalSearchParams<{athleteId?:string;activityId?:string;activityName?:string}>();
  const [status,setStatus] = useState<ReviewStatus | 'all'>('all');
  const [search,setSearch] = useState(activityName ?? '');
  const [query,setQuery] = useState(activityName ?? '');
  const [selected,setSelected] = useState<ReviewWorkout | null>(null);
  const [reason,setReason] = useState('');
  const [saving,setSaving] = useState(false);
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()),350); return () => clearTimeout(t); },[search]);
  const {workouts,total,loading,error,refetch,review,offset,nextPage,previousPage,hasMore} = useWorkoutReviews(user?.role === 'admin',status,query,athleteId);
  useFocusEffect(useCallback(() => {refetch();},[refetch]));
  useEffect(() => { if (activityId && workouts.length) { const match=workouts.find(w => w.id===activityId); if (match) { setSelected(match); setReason(match.review_reason ?? ''); router.setParams({activityId:undefined}); } } },[activityId,workouts,router]);
  const badgeColor = (state: ReviewStatus) => state === 'rejected' ? c.orange : state === 'approved' ? c.green : c.muted;
  function open(workout: ReviewWorkout) { setSelected(workout); setReason(workout.review_reason ?? ''); }
  async function decide(next: 'approved' | 'rejected') {
    if (!selected || saving) return;
    if (next === 'rejected' && reason.trim().length < 3) { Alert.alert('Add a reason','Tell the athlete why this workout is rejected (at least 3 characters).'); return; }
    setSaving(true);
    try { await review(selected,next,next === 'rejected' ? reason : undefined); setSelected(null); Alert.alert('Review saved',next === 'approved' ? 'Workout approved. Eligible race scores have been recalculated.' : 'Workout rejected and excluded from race scoring. The athlete can see your reason.'); }
    catch(e) { Alert.alert('Review not saved',e instanceof Error ? e.message : 'Please try again.'); refetch(); }
    finally { setSaving(false); }
  }
  if (user?.role !== 'admin') return <Page><Empty text="Administrator access required."/></Page>;
  return <Page><Button title="Review recordings, uploads & shared posts" onPress={()=>router.push('/(admin)/submissions')}/><View style={{height:20}}/><Header title="Workout review" eyebrow="Athlete activity" action={<TouchableOpacity accessibilityLabel="Refresh workouts" onPress={refetch}><SageIcon name="activity"/></TouchableOpacity>}/>
    <TextInput accessibilityLabel="Search athlete or workout" placeholder="Search athlete, email or workout" placeholderTextColor={c.muted} value={search} onChangeText={setSearch} style={[s.card,{padding:15,color:c.text,marginBottom:16}]}/>
    <View style={[s.row,{gap:7,marginBottom:16,flexWrap:'wrap'}]}>{(['pending','approved','rejected','all'] as const).map(filter => <TouchableOpacity key={filter} onPress={() => setStatus(filter)} style={{backgroundColor:status === filter ? c.green : c.pale,borderRadius:20,paddingVertical:9,paddingHorizontal:13}}><Text style={{color:status === filter ? c.onAccent : c.green,fontWeight:'800',fontSize:12}}>{filter.charAt(0).toUpperCase()+filter.slice(1)}</Text></TouchableOpacity>)}</View>
    <Text style={[s.muted,{marginBottom:16}]}>{total} matching workouts{total ? ` · ${offset+1}–${offset+workouts.length}` : ''}{athleteId ? ' · selected athlete' : ''}</Text>
    {error ? <View style={[s.card,{padding:20}]}><Text style={{color:c.orange,fontWeight:'800'}}>Unable to load workout reviews</Text><Text style={[s.muted,{marginVertical:12}]}>{error}</Text><Button title="Try again" onPress={refetch}/></View> : !workouts.length ? <Empty loading={loading} text="No workouts match this filter."/> : workouts.map(workout => <TouchableOpacity key={workout.id} onPress={() => open(workout)} style={[s.card,{padding:18,marginBottom:12}]}><View style={s.between}><Text style={[s.section,{flex:1}]}>{workout.athlete_name}</Text><Text style={{color:badgeColor(workout.review_status),fontSize:11,fontWeight:'800'}}>{workout.review_status.toUpperCase()}</Text></View><Text style={[s.muted,{marginTop:5}]}>{workout.activity_name}</Text><Text style={[s.muted,{fontSize:11,marginTop:8}]}>{new Date(workout.activity_date).toLocaleDateString('en-IN')} · {workout.sport_type} · {Math.round(workout.moving_time_secs/60)} min{workout.distance_meters == null ? '' : ` · ${(workout.distance_meters/1000).toFixed(2)} km`}</Text><Text style={{color:c.orange,fontWeight:'800',marginTop:12}}>Review workout →</Text></TouchableOpacity>)}
    {athleteId && <TouchableOpacity onPress={() => router.setParams({athleteId:undefined})} style={{padding:16}}><Text style={{color:c.orange,fontWeight:'800'}}>Show all athletes</Text></TouchableOpacity>}
    <View style={[s.row,{gap:12,marginTop:12}]}>{offset > 0 && <View style={{flex:1}}><Button title="Previous" disabled={loading} onPress={previousPage}/></View>}{hasMore && <View style={{flex:1}}><Button title="Next" disabled={loading} onPress={nextPage}/></View>}</View>
    <Modal visible={!!selected} animationType="slide" onRequestClose={() => {if (!saving) setSelected(null);}}><Page><Header title="Review workout" eyebrow={selected?.athlete_name} action={<TouchableOpacity disabled={saving} onPress={() => setSelected(null)}><Text style={{color:c.orange,fontWeight:'800'}}>Close</Text></TouchableOpacity>}/>{selected && <><Text style={s.title}>{selected.activity_name}</Text><Text style={[s.muted,{marginTop:8,marginBottom:18}]}>{selected.athlete_email} · {new Date(selected.activity_date).toLocaleDateString('en-IN')}</Text><View style={[s.card,{padding:18}]}>{[
      ['Status',selected.review_status],['Sport',selected.sport_type],['Duration',`${Math.round(selected.moving_time_secs/60)} min`],['Distance',selected.distance_meters == null ? '—' : `${(selected.distance_meters/1000).toFixed(2)} km`],['Calories',selected.calories == null ? '—' : `${Math.round(selected.calories)} kcal`],['Average heart rate',selected.avg_heartrate == null ? '—' : `${Math.round(selected.avg_heartrate)} bpm`],['Maximum heart rate',selected.max_heartrate == null ? '—' : `${Math.round(selected.max_heartrate)} bpm`],['Elevation',selected.elevation_gain == null ? '—' : `${Math.round(selected.elevation_gain)} m`]
    ].map(([label,value]) => <View key={label} style={[s.between,{paddingVertical:10,gap:12,borderBottomWidth:1,borderColor:c.border}]}><Text style={s.muted}>{label}</Text><Text style={s.section}>{value}</Text></View>)}</View>
    {selected.review_reason && <Text style={[s.muted,{marginTop:12}]}>Last reason: {selected.review_reason}</Text>}
    <Section title="Review decision"/><Text style={s.muted}>Rejecting a workout removes it from race scoring. Approval keeps it eligible and resolves any automatic flag.</Text>
    <TextInput accessibilityLabel="Rejection reason" placeholder="Reason for rejection (required to reject)" placeholderTextColor={c.muted} multiline maxLength={1000} value={reason} onChangeText={setReason} editable={!saving} style={[s.card,{padding:16,color:c.text,minHeight:105,textAlignVertical:'top',marginTop:16,marginBottom:18}]}/>
    <Button title={saving ? 'Saving…' : 'Approve workout'} icon="check" disabled={saving} onPress={() => decide('approved')}/><TouchableOpacity disabled={saving} onPress={() => decide('rejected')} style={{padding:18,borderWidth:1,borderColor:c.orange,borderRadius:15,alignItems:'center',marginTop:12,opacity:saving ? 0.5 : 1}}><Text style={{color:c.orange,fontWeight:'800'}}>Reject workout</Text></TouchableOpacity>
    {!!selected.review_history.length && <><Section title="Review history"/>{selected.review_history.map((item,index) => <View key={index} style={[s.card,{padding:16,marginBottom:10}]}><Text style={{color:badgeColor(item.status),fontWeight:'800'}}>{item.status.toUpperCase()}</Text><Text style={s.muted}>{new Date(item.reviewed_at).toLocaleString('en-IN')}</Text>{item.reason && <Text style={s.muted}>{item.reason}</Text>}</View>)}</>}
    </>}</Page></Modal>
  </Page>;
}
