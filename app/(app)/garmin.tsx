import {useState} from 'react';
import {Link,useRouter} from 'expo-router';
import {Text,TextInput,TouchableOpacity,View} from 'react-native';
import {Button,Header,Page,s} from '../../components/ui/SageUI';
import {form} from '../../components/ui/ProductUI';
import {sageColors as c} from '../../lib/theme';
import {useGarmin} from '../../hooks/useGarmin';
export default function GarminScreen(){
 const router=useRouter(),{state,busy,error,refresh,connect,verify,sync,disconnect}=useGarmin();
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[code,setCode]=useState(''),[consent,setConsent]=useState(false),[confirmDisconnect,setConfirmDisconnect]=useState(false);
 async function login(){const secret=password;setPassword('');await connect(email.trim(),secret);}
 async function mfa(){const value=code;setCode('');await verify(value.trim());}
 return <Page><TouchableOpacity onPress={()=>router.back()} accessibilityRole="button" style={{paddingVertical:12}}><Text style={{color:c.green}}>← Profile</Text></TouchableOpacity><Header title="Garmin Connect" eyebrow="Experimental connection"/>
  <View style={[s.card,s.body,{marginBottom:20}]}><Text style={s.section}>Connect your own Garmin account</Text><Text style={[s.muted,{marginTop:10}]}>This test uses an unofficial Garmin library, not Garmin’s approved partner connection. It may stop working if Garmin changes its services.</Text><Text style={[s.muted,{marginTop:10}]}>Your login is sent securely through Sage’s server to Garmin. Sage stores encrypted access tokens, not your password. Imported workouts—including available heart rate and GPS—are submitted for Sage admin review.</Text><Link href="/privacy" style={{color:c.orange,marginTop:14,textDecorationLine:'underline'}}>Read the privacy policy</Link></View>
  {state?.status==='connected'?<>
   <Text style={[s.section,{color:c.green,marginBottom:12}]}>Garmin connected</Text><Text style={[s.muted,{marginBottom:18}]}>Sync checks your 20 most recent activities and imports up to 3 new workouts at a time. Tap again to import more. Background automatic sync is not enabled in this test.</Text>
   {state.last_synced_at&&<Text style={[s.muted,{marginBottom:16}]}>Last synced: {new Date(state.last_synced_at).toLocaleString()}</Text>}
   <Button title={busy?'Syncing…':'Sync recent workouts'} disabled={busy} onPress={()=>void sync()}/>
   <TouchableOpacity onPress={()=>router.push('/(app)/submit-activity')} style={{paddingVertical:18}}><Text style={{color:c.green}}>View your submitted workouts →</Text></TouchableOpacity>
  </>:state?.status==='pending_mfa'?<>
   <Text style={s.section}>Check your Garmin verification message</Text><Text style={[s.muted,{marginVertical:12}]}>Enter the code Garmin sent you. Verification sessions expire after 10 minutes.</Text><TextInput accessibilityLabel="Garmin verification code" style={form.field} value={code} onChangeText={setCode} editable={!busy} keyboardType="number-pad" autoComplete="one-time-code"/>
   <Button title={busy?'Verifying…':'Verify code'} disabled={busy||!code.trim()} onPress={()=>void mfa()}/>
  </>:<>
   {state?.status==='reconnect_required'&&<Text style={[s.muted,{marginBottom:14}]}>Your Garmin session expired. Connect again to continue.</Text>}
   <Text style={s.section}>Garmin email</Text><TextInput accessibilityLabel="Garmin email" value={email} onChangeText={setEmail} style={form.field} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!busy}/>
   <Text style={s.section}>Garmin password</Text><TextInput accessibilityLabel="Garmin password" value={password} onChangeText={setPassword} style={form.field} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy}/>
   <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{checked:consent,disabled:busy}} disabled={busy} onPress={()=>setConsent(!consent)} style={[s.row,{gap:10,marginVertical:18}]}><Text style={{color:c.green,fontSize:23}}>{consent?'☑':'☐'}</Text><Text style={[s.muted,{flex:1}]}>I authorize Sage to access my Garmin workouts and store encrypted connection tokens. I understand admins can review imported workout evidence.</Text></TouchableOpacity>
   <Button title={busy?'Connecting…':'Connect Garmin'} disabled={busy||!state||!consent||!email.trim()||!password} onPress={()=>void login()}/>
  </>}
  {!!state?.message&&<Text accessibilityLiveRegion="polite" style={[s.muted,{marginTop:18}]}>{state.message}</Text>}
  {state?.warnings?.map((warning,index)=><Text key={index} style={[s.muted,{marginTop:10}]}>{warning}</Text>)}
  {!!error&&<View style={{marginTop:18}}><Text accessibilityRole="alert" style={{color:c.orange,marginBottom:14}}>{error}</Text><Button title="Refresh connection" disabled={busy} onPress={()=>void refresh()}/></View>}
  {state&&state.status!=='disconnected'&&<View style={{marginTop:26}}>{confirmDisconnect?<><Text style={[s.muted,{marginBottom:12}]}>Disconnect Garmin and delete Sage’s saved connection tokens? Workouts already imported will remain.</Text><Button title="Disconnect Garmin" disabled={busy} onPress={()=>{void disconnect().then(()=>setConfirmDisconnect(false));}}/><TouchableOpacity disabled={busy} onPress={()=>setConfirmDisconnect(false)} style={{paddingVertical:14}}><Text style={{color:c.green}}>Keep connected</Text></TouchableOpacity></>:<TouchableOpacity accessibilityRole="button" disabled={busy} onPress={()=>setConfirmDisconnect(true)}><Text style={{color:c.orange}}>Disconnect Garmin</Text></TouchableOpacity>}</View>}
 </Page>;
}
