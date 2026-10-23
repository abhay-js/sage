import {useState} from 'react';
import {Text,TextInput,View,TouchableOpacity,Share} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import {Page,Header,Button,Section,Empty,s} from '../../components/ui/SageUI';
import {sageColors as c} from '../../lib/theme';
import {useSubmissions,submitFit,submitStrava,submissionTitle} from '../../hooks/useSubmissions';
export default function SubmitActivity(){
 const params=useLocalSearchParams<{stravaUrl?:string}>(),router=useRouter(),queue=useSubmissions();
 const [mode,setMode]=useState<'fit'|'strava_link'>(params.stravaUrl?'strava_link':'fit'),[file,setFile]=useState<DocumentPicker.DocumentPickerAsset|null>(null),[url,setUrl]=useState(params.stravaUrl??''),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function pick(){try{const result=await DocumentPicker.getDocumentAsync({type:'*/*',copyToCacheDirectory:true,multiple:false});if(!result.canceled){setFile(result.assets[0]);setMessage('');}}catch(e){setMessage((e as Error).message);}}
 async function send(){setBusy(true);setMessage('');try{const result=mode==='fit'?await submitFit(file!,note):await submitStrava(url,note);setMessage(result.created?'Submitted for admin review. It will count after approval.':`Already submitted · ${result.status}`);setFile(null);setNote('');queue.refresh();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 const input={color:c.text,borderWidth:1,borderColor:c.border,borderRadius:12,padding:14,marginVertical:8,backgroundColor:c.surface};
 return <Page><Header title="Add activity" eyebrow="Upload & review" action={<TouchableOpacity onPress={()=>router.back()}><Text style={{color:c.orange}}>Back</Text></TouchableOpacity>}/>
 <Button title="Record directly in Sage" onPress={()=>router.push('/(app)/record-activity')}/><View style={{height:18}}/><Text style={s.muted}>Upload a workout exported from Zwift, MyWhoosh or your device, or submit a Strava activity link.</Text>
 <View style={[s.row,{gap:12,marginVertical:20}]}>{(['fit','strava_link'] as const).map(value=><TouchableOpacity key={value} disabled={busy} onPress={()=>setMode(value)} style={{padding:14,borderRadius:12,backgroundColor:mode===value?c.green:c.surface}}><Text style={{color:mode===value?c.onAccent:c.text,fontWeight:'800'}}>{value==='fit'?'FIT file':'Strava link'}</Text></TouchableOpacity>)}</View>
 {mode==='fit'?<><Button title={file?file.name:'Choose .FIT file'} onPress={pick} disabled={busy}/><Text style={[s.muted,{marginTop:10}]}>Up to 10 MB. Recorded distance, heart rate and GPS are included when present in the file.</Text></>:<><TextInput accessibilityLabel="Strava activity link" style={input} placeholder="https://www.strava.com/activities/…" placeholderTextColor={c.muted} autoCapitalize="none" value={url} onChangeText={setUrl} editable={!busy}/><Text style={s.muted}>In Strava, tap Share → Copy link, then paste it here. Admin confirms the activity details before approval.</Text><TouchableOpacity onPress={()=>void Share.share({message:`sage://submit-activity?stravaUrl=${encodeURIComponent(url)}`}).catch(e=>setMessage(e.message))} disabled={!url}><Text style={{color:c.orange,marginVertical:12}}>Share a link that opens this submission screen</Text></TouchableOpacity></>}
 <TextInput accessibilityLabel="Note for admin" style={input} placeholder="Note for admin (optional)" placeholderTextColor={c.muted} value={note} onChangeText={setNote} maxLength={1000} multiline editable={!busy}/>
 <Button title={busy?'Submitting…':'Submit for review'} disabled={busy||(mode==='fit'?!file:!url.trim())} onPress={send}/>{!!message&&<Text accessibilityRole="alert" style={[s.muted,{marginTop:14}]}>{message}</Text>}
 <Section title="Your submissions" action="Refresh" onPress={queue.refresh}/>{queue.error&&<Text style={s.muted}>{queue.error}</Text>}
 {queue.data?.submissions.map(item=><View key={item.id} style={[s.card,{padding:16,marginBottom:12}]}><Text style={s.section}>{submissionTitle(item)}</Text><Text style={[s.muted,{marginTop:6}]}>{item.status.toUpperCase()} · {new Date(item.created_at).toLocaleDateString()}</Text>{item.note&&<Text style={s.muted}>{item.note}</Text>}{item.reason&&<Text style={{color:c.orange,marginTop:8}}>{item.reason}</Text>}{item.metrics.distance_meters!=null&&<Text style={s.muted}>{(item.metrics.distance_meters/1000).toFixed(2)} km · {Math.round(item.metrics.moving_time_secs/60)} min</Text>}</View>)}
 {!queue.data?.submissions.length&&<Empty loading={queue.loading} text="Your submitted workouts will appear here."/>}{queue.data&&queue.data.total>50&&<Text style={s.muted}>Showing your latest 50 submissions.</Text>}
 </Page>;
}
