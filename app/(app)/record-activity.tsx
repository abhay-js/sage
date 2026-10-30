import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Page, Header, BackAction, Button, Empty, Sheet, s } from '../../components/ui/AdventureUI';
import { RecordingSession } from '../../components/ui/RecordingSession';
import { RecorderPreviewMap } from '../../components/ui/RecorderPreviewMap';
import { adventureColors as c } from '../../lib/theme';
import { RecordingSport } from '../../lib/gpsRecording';
import { useGpsRecorder } from '../../hooks/useGpsRecorder';
import { useProductChallenges } from '../../hooks/useProduct';
import { challengeTiming, preferredChallenge, scoringSummary, sportLabel } from '../../lib/challengeExperience';

export default function RecordActivity() {
  const router = useRouter(), params = useLocalSearchParams<{raceId?:string}>();
  const catalog = useProductChallenges(), recorder = useGpsRecorder();
  const [sport, setSport] = useState<RecordingSport|'Swim'|'WeightTraining'>('Run'), [selectedId, setSelectedId] = useState<string>(), [picker, setPicker] = useState(false), [saved, setSaved] = useState(''), [guidance, setGuidance] = useState(false);
  useEffect(() => { if (!recorder.record) setSelectedId(params.raceId); }, [params.raceId]);
  const joined = (catalog.data ?? []).filter(ch => ch.joined && challengeTiming(ch).state === 'Live');
  const challenge = joined.find(ch => ch.id === selectedId) ?? preferredChallenge(joined);
  const supported = sport === 'Run' || sport === 'Walk' || sport === 'Ride';
  const record = recorder.record, finished = record?.status === 'finished';
  async function save(note: string) { const result = await recorder.save(note); if (result) setSaved(result.created ? 'Your activity is submitted for review.' : `This activity was already submitted · ${result.status}`); }
  return <Page><Header title={finished?'Your effort has a home.':record?`${record.sport} your own way.`:'Make your next move.'} eyebrow={finished?'Activity complete · Review':record?'Your adventure in progress':'Your next adventure starts here.'} action={<BackAction onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)/home')} />} />
    {!!saved && <View style={[s.card,{padding:20,gap:12,marginBottom:20,backgroundColor:c.pale}]}><Text accessibilityLiveRegion="polite" style={s.section}>{saved}</Text><Text style={s.muted}>Points appear after approval. Follow the review or browse your activity history.</Text><Button title="View submissions" onPress={()=>router.push('/(app)/submit-activity')}/><Button secondary title="Your activity history" icon="activity" onPress={()=>router.push('/(app)/log')}/></View>}
    {recorder.loading ? <Empty loading text="Recovering your recording"/> : record ? <RecordingSession key={record.id} record={record} now={recorder.now} busy={recorder.busy} error={recorder.error} challenge={challenge} onPause={()=>void recorder.pause()} onResume={()=>void recorder.resume()} onFinish={()=>void recorder.finish()} onSave={note=>void save(note)} onDiscard={()=>void recorder.discard()}/> : <>
      <Text style={[s.muted,{marginTop:-10,marginBottom:18}]}>Choose your activity, then hit record.</Text>
      <RecorderPreviewMap indoor={sport==='WeightTraining'}/>
      <View style={{flexDirection:'row',gap:8,marginBottom:14}}>
        {([{id:'Run',icon:'↗',label:'Run'},{id:'Ride',icon:'◎',label:'Ride'},{id:'Swim',icon:'≈',label:'Swim'},{id:'WeightTraining',icon:'ϟ',label:'Strength'}] as const).map(item=>{
          const selected=sport===item.id||(item.id==='Run'&&sport==='Walk');
          return <TouchableOpacity key={item.id} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{selected}} aria-pressed={selected} onPress={()=>setSport(item.id)} style={{flex:1,minHeight:76,paddingVertical:12,alignItems:'center',justifyContent:'center',gap:5,borderRadius:15,borderWidth:1,borderColor:selected?c.green:c.border,backgroundColor:selected?c.pale:c.surface}}><Text style={{fontSize:25,color:c.green}}>{item.icon}</Text><Text style={{fontSize:11,fontWeight:'700',color:c.text}}>{item.label}</Text></TouchableOpacity>;
        })}
      </View>
      {(sport==='Run'||sport==='Walk')&&<TouchableOpacity accessibilityRole="button" accessibilityLabel={sport==='Walk'?'Switch to run':'Record a walk instead'} onPress={()=>setSport(sport==='Walk'?'Run':'Walk')} style={{alignSelf:'flex-start',minHeight:34,justifyContent:'center',marginTop:-6,marginBottom:8}}><Text style={{fontSize:11,color:c.green}}>{sport==='Walk'?'Walking selected · Switch to run ↗':'Taking it slower? Record a walk ↗'}</Text></TouchableOpacity>}
      <Text style={[s.section,{fontSize:12,marginBottom:8}]}>Preview your challenge points</Text>
      {catalog.loading&&!catalog.data?<Empty loading text="Loading your challenges"/>:catalog.error?<View style={[s.card,{padding:16}]}><Text accessibilityRole="alert" style={[s.muted,{color:c.orange}]}>{catalog.error}</Text><TouchableOpacity accessibilityRole="button" onPress={()=>catalog.refresh()} style={{paddingVertical:10}}><Text style={{color:c.green}}>Try again</Text></TouchableOpacity></View>:challenge?<>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Choose challenge for points preview" onPress={()=>setPicker(true)} style={[s.card,s.between,{padding:15,marginBottom:10,borderRadius:12}]}><Text style={[s.section,{fontSize:13,flex:1}]}>{challenge.name}</Text><Text style={{color:c.green}}>⌄</Text></TouchableOpacity>
        <View style={[s.card,{padding:16,marginBottom:16}]}><Text style={[s.section,{fontSize:13}]}>{scoringSummary(challenge.config)}</Text><Text style={[s.muted,{fontSize:10,marginTop:5}]}>{challenge.sport_types.includes(sport)?'Approved workouts count toward all eligible joined challenges.':'This sport is not eligible for points in this challenge.'}</Text></View>
      </>:<View style={[s.card,{padding:16,marginBottom:16}]}><Text style={[s.section,{fontSize:13}]}>Your workout still matters.</Text><Text style={[s.muted,{fontSize:11,marginTop:4}]}>Join a live challenge to turn your effort into points.</Text><TouchableOpacity accessibilityRole="button" onPress={()=>router.push('/(app)/challenges')} style={{paddingTop:10,paddingBottom:4}}><Text style={{fontSize:12,fontWeight:'700',color:c.orange}}>Find your next adventure ↗</Text></TouchableOpacity></View>}
      <Button title={recorder.busy?'Starting GPS…':`● Start ${sportLabel(sport).toLowerCase()}`} disabled={recorder.busy} onPress={()=>{
        if(Platform.OS==='web'||!supported){setGuidance(true);return;}
        setSaved('');void recorder.start(sport as RecordingSport);
      }}/>
      <Text style={[s.muted,{fontSize:10,marginTop:12}]}>{Platform.OS==='web'?'Record GPS workouts with the Sage mobile app. On web, import a FIT workout or share a Strava activity.':supported?'Start outdoors. Precise location captures your route, distance and pace. Background location keeps recording with the screen locked.':'Bring this session from your watch or phone health service, or import the original FIT file.'}</Text>
      {!!recorder.error&&<View style={{marginTop:16}}><Text accessibilityRole="alert" style={{color:c.orange,fontSize:12}}>{recorder.error}</Text>{Platform.OS!=='web'&&<TouchableOpacity accessibilityRole="button" onPress={()=>void Linking.openSettings()} style={{paddingVertical:14}}><Text style={{color:c.green}}>Open phone settings</Text></TouchableOpacity>}</View>}
    </>}
    {guidance&&<Sheet title={Platform.OS==='web'?'Record with the Sage mobile app':sport==='Swim'?'Bring your swim with you.':'Keep your strength in the story.'} onClose={()=>setGuidance(false)}><Text style={[s.muted,{marginBottom:18}]}>{Platform.OS==='web'?'Start, pause and finish outdoor runs, walks and rides in the installed Sage app on iPhone or Android. You can add an existing workout here.':'Phone GPS records outdoor runs, walks and rides. Add this workout from your health service or its original FIT file.'}</Text><Button title="Add an existing workout" onPress={()=>{setGuidance(false);router.push('/(app)/submit-activity');}}/><View style={{marginTop:10}}><Button secondary title="Connect your workouts" icon="heart" onPress={()=>{setGuidance(false);router.push('/(app)/health-connect');}}/></View></Sheet>}
    {picker&&<Sheet title="Preview challenge points" onClose={()=>setPicker(false)}>{joined.map(ch=><TouchableOpacity accessibilityRole="button" key={ch.id} onPress={()=>{setSelectedId(ch.id);setPicker(false);}} style={{paddingVertical:18,borderBottomWidth:1,borderBottomColor:c.border}}><Text style={s.section}>{ch.name}{ch.id===challenge?.id?' ✓':''}</Text><Text style={s.muted}>{scoringSummary(ch.config)}</Text></TouchableOpacity>)}</Sheet>}
  </Page>;
}
