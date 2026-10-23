import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useActivities } from '../../hooks/useActivities';
import { Page, Header, Button, Section, Empty, s } from '../../components/ui/SageUI';
import { WorkoutRouteMap } from '../../components/ui/WorkoutRouteMap';
import { SageIcon } from '../../components/ui/SageIcon';
import { sageColors as c } from '../../lib/theme';
import { useScoreAudits } from '../../hooks/useProduct';
import { WorkoutAnalytics } from '../../components/ui/WorkoutAnalytics';
export default function ActivityScreen() {
  const { user } = useAuth();
  const { activities, loading, error, refetch } = useActivities(user?.id);
  const [selectedId, setSelectedId] = useState<string>();
  const router = useRouter();
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));
  const selected = activities.find(a => a.id === selectedId);
  const audits=useScoreAudits(selectedId);
  return <Page><Button title="Record a run, walk or ride" onPress={()=>router.push('/(app)/record-activity')}/><View style={{height:12}}/><Button title="Add activity · FIT or Strava link" onPress={()=>router.push('/(app)/submit-activity')}/><View style={{height:20}}/><Header title="Your activity" eyebrow="Workouts & movement" action={<TouchableOpacity accessibilityLabel="Refresh workouts" onPress={refetch}><SageIcon name="activity"/></TouchableOpacity>} />
    <View style={[s.row,{padding:16,backgroundColor:c.pale,borderRadius:16,gap:12}]}><SageIcon name="check"/><View><Text style={s.section}>{activities.length} synced workout{activities.length === 1 ? '' : 's'}</Text><Text style={[s.muted,{fontSize:11}]}>{user?.strava_athlete_id ? 'Strava connected' : activities.some(a => a.strava_activity_id.startsWith('health_ios_')) ? 'Apple Health workouts imported' : 'Manage your workout connections'}</Text></View></View>
    <Section title="Recent workouts" />{error && <Text style={{color:c.orange,marginBottom:12}}>{error}</Text>}{!activities.length ? <Empty loading={loading} text="Your workouts will appear here after an activity sync."/> : activities.map(a => <TouchableOpacity key={a.id} accessibilityRole="button" onPress={() => setSelectedId(a.id)} style={[s.card,s.row,{padding:15,marginBottom:10,gap:12,borderColor:selected?.id === a.id ? c.green : c.border,backgroundColor:selected?.id === a.id ? c.pale : c.surface}]}><View style={{padding:11,backgroundColor:c.surface,borderRadius:12}}><SageIcon name={a.sport_type === 'Ride' ? 'route' : 'activity'}/></View><View style={{flex:1}}><Text style={s.section}>{a.activity_name}</Text><Text style={[s.muted,{fontSize:11}]}>{new Date(a.activity_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} · {a.sport_type}</Text></View><SageIcon name={selected?.id === a.id ? 'check' : 'chevron'} size={17}/></TouchableOpacity>)}
    <Modal visible={!!selected} onRequestClose={() => setSelectedId(undefined)} animationType="slide">
      <Page><Header title="Workout details" eyebrow={selected?.sport_type} action={<TouchableOpacity accessibilityRole="button" accessibilityLabel="Close workout details" onPress={() => setSelectedId(undefined)} style={{padding:10}}><Text style={{color:c.orange,fontWeight:'800'}}>Close</Text></TouchableOpacity>}/>
      {selected && <><Text style={[s.title,{fontSize:23}]}>{selected.activity_name}</Text><Text style={[s.muted,{marginTop:8,marginBottom:20}]}>{new Date(selected.activity_date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}{selected.activity_started_at ? ` · ${new Date(selected.activity_started_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}` : ''}</Text>
      <WorkoutRouteMap key={selected.id} activityId={selected.strava_activity_id} workoutId={selected.id}/>
      <WorkoutAnalytics key={`metrics-${selected.id}`} activity={selected}/>
      <View style={[s.card,{padding:20}]}>{[
        ['Review status',selected.review_status ?? 'pending'],
        ['Sport',selected.sport_type],
        ['Distance',selected.distance_meters == null ? '—' : `${(selected.distance_meters/1000).toFixed(2)} km`],
        ['Duration',`${Math.floor(selected.moving_time_secs/60)} min ${selected.moving_time_secs%60} sec`],
        ['Calories',selected.calories == null ? '—' : `${Math.round(selected.calories)} kcal`],
        ['Elevation',selected.elevation_gain == null ? '—' : `${Math.round(selected.elevation_gain)} m`],
        ['Average heart rate',selected.avg_heartrate == null ? '—' : `${Math.round(selected.avg_heartrate)} bpm`],
        ['Maximum heart rate',selected.max_heartrate == null ? '—' : `${Math.round(selected.max_heartrate)} bpm`],
        ['Source',selected.strava_activity_id.startsWith('health_ios_') ? 'Apple Health' : selected.strava_activity_id.startsWith('health_android_') ? 'Health Connect' : selected.strava_activity_id.startsWith('gps_') ? 'Recorded in Sage' : selected.strava_activity_id.startsWith('fit_') ? 'FIT upload' : selected.strava_activity_id.startsWith('shared_strava_') ? 'Shared Strava link' : 'Strava'],
      ].map(([label,value]) => <View key={label} style={[s.between,{paddingVertical:13,borderBottomWidth:1,borderColor:c.border,gap:16}]}><Text style={s.muted}>{label}</Text><Text style={[s.section,{textAlign:'right',flexShrink:1}]}>{value}</Text></View>)}</View>
      {selected.review_status === 'rejected' && <View style={[s.card,{padding:16,marginTop:14}]}><Text style={{color:c.orange,fontWeight:'800'}}>Rejected · excluded from race scoring</Text><Text style={s.muted}>{selected.review_reason}</Text></View>}
      <Text style={[s.muted,{fontSize:11,marginTop:12}]}>— means this metric was not imported with the workout.</Text>
      <Section title="Challenge score breakdown"/>{audits.error?<Text style={s.muted}>{audits.error}</Text>:audits.loading?<Empty loading text="Loading score breakdown…"/>:!audits.data?.length?<Empty text="This workout is outside your joined challenges or eligible sports."/>:audits.data.map(a=><View key={a.race_id} style={[s.card,{padding:18,marginBottom:12}]}><Text style={s.section}>{a.race_name}</Text><Text style={{color:a.status==='COUNTED'?c.green:c.orange,marginVertical:8,fontWeight:'700'}}>{a.status.replace(/_/g,' ')} · {a.total_points} points</Text><Text style={s.muted}>Base: {a.base_points} · Bonus: {a.bonus_points}</Text>{a.bonuses.map(b=><Text key={b.id} style={s.muted}>{b.label}: +{b.points}</Text>)}<Text style={[s.muted,{fontSize:11,marginTop:8}]}>{a.status==='PENDING'?'Awaiting admin approval.':a.status==='REJECTED'?'Rejected workouts do not count.':a.status==='DAILY_CAP'?'The challenge’s daily workout limit was reached.':a.status==='BELOW_THRESHOLD'?'The minimum scoring threshold was not reached.':'Approved and included in this challenge.'}</Text></View>)}
      <View style={{marginTop:24}}><Button title="Back to activities" onPress={() => setSelectedId(undefined)}/></View></>}
      </Page>
    </Modal>
    <Section title="Workout connections" /><View style={[s.card,{padding:18,marginBottom:16}]}><View style={[s.row,{gap:10,marginBottom:10}]}><SageIcon name="heart"/><Text style={s.section}>Health imports</Text></View><Text style={s.muted}>Connect Apple Health on iPhone or Health Connect on Android. Garmin setup and indoor FIT uploads are available in Manage connections.</Text></View><Button title="Manage connections" icon="shield" onPress={() => router.push('/(app)/health-connect')}/>
  </Page>;
}
