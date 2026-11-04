import { useState, useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useActivities } from '../../hooks/useActivities';
import { useAthleteProfile, useRpc, useProductChallenges, rpcWrite, refreshProductData } from '../../hooks/useProduct';
import type { ScoreAudit } from '../../types/product';
import { SPORT_OPTIONS } from '../../lib/productConfig';
import { activityLogColors as c } from '../../lib/activityLogPalette';
import { LOG_FILTERS, LogSport, logSport, logSource, logStats, logWhen, logActiveTime, monthlyLog, weeklyLog, liveLogChallenges } from '../../lib/activityLog';
import { DawnAvatar } from '../../components/ui/DawnArt';
import { AvatarEditor } from '../../components/ui/AvatarEditor';
import { AthleteAvatar } from '../../lib/avatar';
import { SageIcon, SageIconName } from '../../components/ui/SageIcon';
import Svg,{Circle,Path} from 'react-native-svg';

type ProfileTab='Activity log'|'Badges'|'Settings';
export default function ActivityScreen() {
  const {user,refreshProfile,signOut}=useAuth(),router=useRouter(),params=useLocalSearchParams<{raceId?:string}>();
  const narrow=useWindowDimensions().width<350;
  const {activities,loading,error,refetch}=useActivities(user?.id),athlete=useAthleteProfile(),catalog=useProductChallenges();
  const receipts=useRpc<ScoreAudit[]>('sage_workout_scores',{p_activity_id:null},!!user?.id);
  const [refreshing,setRefreshing]=useState(false);
  const [tab,setTab]=useState<ProfileTab>('Activity log'),[sport,setSport]=useState<LogSport>('all');
  const raceId=params.raceId??'all';
  const [avatarEditor,setAvatarEditor]=useState(false),[avatarSaved,setAvatarSaved]=useState(false),[signingOut,setSigningOut]=useState(false),[actionError,setActionError]=useState('');
  useEffect(()=>{setSport('all');setTab('Activity log');setAvatarEditor(false);setAvatarSaved(false);setActionError('');},[user?.id]);
  useFocusEffect(useCallback(()=>{void refetch();},[refetch]));
  const profile=athlete.data?.profile,name=profile?.full_name||user?.name||'Your athlete';
  const sports=SPORT_OPTIONS.filter(option=>profile?.sports.includes(option.id)).map(option=>option.label);
  const subtitle=[profile?.city,sports.join(', ')].filter(Boolean).join(' · ')||'Your athlete, every adventure';
  const summary=useMemo(()=>monthlyLog(activities),[activities]);
  const liveMembership=useMemo(()=>liveLogChallenges(receipts.data??[],catalog.data??[]),[receipts.data,catalog.data]);
  const membershipReady=!receipts.loading&&!catalog.loading&&!receipts.error&&!catalog.error;
  const scoped=useMemo(()=>raceId==='all'?activities:activities.filter(activity=>(receipts.data??[]).some(receipt=>receipt.activity_id===activity.id&&receipt.race_id===raceId)),[activities,receipts.data,raceId]);
  const groups=useMemo(()=>weeklyLog(scoped,sport),[scoped,sport]);
  const listLoading=loading||(raceId!=='all'&&receipts.loading);
  const challengeName=(catalog.data??[]).find(ch=>ch.id===raceId)?.name||(receipts.data??[]).find(receipt=>receipt.race_id===raceId)?.race_name||'Selected challenge';
  const joined=(catalog.data??[]).filter(ch=>ch.joined);
  const maxBar=Math.max(1,...summary.bars.map(bar=>bar.minutes));
  const filters=activities.some(activity=>logSport(activity.sport_type)==='other')?[...LOG_FILTERS,{id:'other' as const,label:'Other'}]:LOG_FILTERS;
  async function refresh(){if(refreshing)return;setRefreshing(true);athlete.refresh();receipts.refresh();catalog.refresh();try{await refetch();}finally{setRefreshing(false);}}
  function editAvatar(){setAvatarSaved(false);setAvatarEditor(true);}
  async function saveAvatar(name:string,avatar:AthleteAvatar){await rpcWrite('sage_save_avatar',{p_name:name,p_avatar:avatar});refreshProductData();setAvatarSaved(true);void refreshProfile().catch(()=>{});}
  async function logout(){setSigningOut(true);setActionError('');try{await signOut();}catch(failure){setActionError(failure instanceof Error?failure.message:'Unable to sign out. Try again.');}finally{setSigningOut(false);}}
  const link=(title:string,icon:SageIconName,onPress:()=>void,caption?:string)=><TouchableOpacity key={title} accessibilityRole="button" onPress={onPress} style={styles.settingsRow}><View style={styles.settingIcon}><SageIcon name={icon} color={c.green}/></View><View style={{flex:1,gap:3}}><Text style={styles.settingTitle}>{title}</Text>{caption&&<Text style={styles.caption}>{caption}</Text>}</View><SageIcon name="chevron" size={17} color={c.muted}/></TouchableOpacity>;
  return <SafeAreaView edges={['top']} style={styles.page}><ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.green}/>} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
    <View style={styles.header}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Customize avatar" onPress={editAvatar} style={styles.avatar}><DawnAvatar pose="bust" size={52} avatar={profile?.avatar} gender={profile?.gender==='Woman'?'f':'m'} sport={profile?.avatar?.movement==='Ride'?'ride':profile?.avatar?.movement==='Swim'?'swim':'run'}/></TouchableOpacity>
      <View style={{flex:1,gap:2}}><Text accessibilityRole="header" style={styles.name}>{name}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Edit profile avatar" onPress={editAvatar} style={styles.edit}><Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><Path d="M4 20h4L19 9l-4-4L4 16z"/></Svg></TouchableOpacity>
    </View>
    <View accessibilityRole="tablist" accessibilityLabel="Profile sections" style={styles.tabs}>{(['Activity log','Badges','Settings'] as ProfileTab[]).map(value=><TouchableOpacity key={value} accessibilityRole="tab" accessibilityState={{selected:tab===value}} aria-selected={tab===value} onPress={()=>setTab(value)} style={[styles.tab,tab===value&&styles.tabSelected]}><Text style={[styles.tabLabel,{color:tab===value?c.text:c.muted,fontWeight:tab===value?'800':'700'}]}>{value}</Text></TouchableOpacity>)}</View>
    {avatarSaved&&<Text accessibilityLiveRegion="polite" style={styles.feedback}>Your athlete is saved.</Text>}
    {tab==='Activity log'&&<>
      <View style={styles.summary}>
        <View style={styles.between}><Text accessibilityRole="header" style={styles.section}>{summary.month}</Text><Text style={[styles.caption,{textAlign:'right',flexShrink:1}]}>{summary.source}</Text></View>
        <View style={styles.metrics}>{[[(loading||error)&&!activities.length?'—':String(summary.count),'Workouts'],[(loading||error)&&!activities.length?'—':`${summary.distance.toLocaleString('en-IN',{maximumFractionDigits:1})} km`,'Distance'],[(loading||error)&&!activities.length?'—':logActiveTime(summary.seconds),'Active time']].map(([value,label])=><View key={label} style={styles.metric}><Text style={[styles.metricValue,{fontSize:narrow?17:20}]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>)}</View>
        <View accessibilityRole="image" accessibilityLabel={`Active minutes over the last 14 days. ${summary.bars.map(bar=>`${bar.key}: ${Math.round(bar.minutes)} minutes`).join('; ')}`} style={styles.bars}>{summary.bars.map((bar,index)=><View key={bar.key} style={{flex:1,borderRadius:3,height:bar.minutes?Math.max(4,bar.minutes/maxBar*40):3,backgroundColor:index>=7?c.bar:c.barPast,opacity:bar.minutes?1:.4}}/>)}</View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel="Filter by sport" contentContainerStyle={styles.filters}>{filters.map(filter=><TouchableOpacity key={filter.id} accessibilityRole="button" accessibilityState={{selected:filter.id===sport}} aria-pressed={filter.id===sport} hitSlop={4} onPress={()=>setSport(filter.id)} style={[styles.chip,filter.id===sport&&styles.chipSelected]}><Text style={[styles.chipLabel,{color:filter.id===sport?c.surface:c.text}]}>{filter.label}</Text></TouchableOpacity>)}</ScrollView>
      {raceId!=='all'&&<View style={styles.scope}><View style={{flex:1,gap:4}}><Text style={styles.settingTitle}>{challengeName}</Text><Text style={styles.caption}>Workouts linked to this challenge</Text></View><TouchableOpacity accessibilityRole="button" onPress={()=>router.setParams({raceId:'all'})} style={styles.smallButton}><Text style={styles.link}>Show all</Text></TouchableOpacity></View>}
      {!!error&&<View style={styles.notice}><Text accessibilityRole="alert" style={styles.warning}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={refresh} style={styles.smallButton}><Text style={styles.link}>Retry workouts</Text></TouchableOpacity></View>}
      {(receipts.error||catalog.error)&&<TouchableOpacity accessibilityRole="button" onPress={()=>{receipts.refresh();catalog.refresh();}} style={styles.notice}><Text style={styles.caption}>Challenge links couldn’t load. Tap to retry.</Text></TouchableOpacity>}
      {!groups.length?<View style={styles.empty}>{listLoading?<ActivityIndicator color={c.green}/>:<SageIcon name="activity" size={28} color={c.green}/>}<Text style={styles.emptyTitle}>{listLoading?'Loading your workouts…':error?'Workouts unavailable':activities.length?'No matching workouts':'Your training starts here'}</Text><Text style={[styles.caption,{textAlign:'center'}]}>{listLoading?'Loading your training log and workout links…':error?'Use Retry workouts to load your training log.':activities.length?'Try another sport or show all workouts.':'Record your next session or connect a workout source to start your log.'}</Text>{!listLoading&&!error&&!activities.length&&<View style={styles.emptyActions}>{link('Record a workout','route',()=>router.push('/(app)/record-activity'))}{link('Connect or import','heart',()=>router.push('/(app)/health-connect'))}</View>}</View>:groups.map(group=><View key={group.key} style={styles.group}>
        <View style={[styles.between,{paddingHorizontal:4,flexDirection:narrow?'column':'row',alignItems:narrow?'flex-start':'baseline',gap:narrow?3:8}]}><Text accessibilityRole="header" style={styles.groupTitle}>{group.title}</Text><Text style={styles.groupSummary}>{group.items.length} {group.items.length===1?'workout':'workouts'} · {group.distance.toLocaleString('en-IN',{maximumFractionDigits:1})} km</Text></View>
        <View style={styles.workouts}>{group.items.map((activity,index)=>{const kind=logSport(activity.sport_type),colors=c.sports[kind],count=activity.review_status==='rejected'?0:(liveMembership.get(activity.id)?.length??0);const tag=membershipReady?count?`In ${count} ${count===1?'challenge':'challenges'}`:'No live challenge':receipts.error||catalog.error?'Challenges unavailable':'Checking challenges…';return <TouchableOpacity key={activity.id} accessibilityRole="button" accessibilityLabel={`${activity.activity_name}, ${logWhen(activity)}, ${logStats(activity)}, ${logSource(activity)}, ${tag}. Open workout details.`} onPress={()=>router.push({pathname:'/(app)/activity-detail',params:{id:activity.id}})} style={[styles.workout,index<group.items.length-1&&styles.divider]}>
          <View style={[styles.sportIcon,{backgroundColor:colors.bg}]}><LogSportIcon sport={kind} color={colors.ink}/></View>
          <View style={{flex:1,minWidth:0,gap:2}}><View style={[styles.between,{gap:8,alignItems:'baseline'}]}><Text style={styles.workoutTitle}>{activity.activity_name}</Text><Text style={styles.when}>{logWhen(activity)}</Text></View><Text style={styles.stats}>{logStats(activity)}</Text><View style={styles.meta}><Text style={styles.source}>{logSource(activity)}</Text><View style={[styles.tag,{backgroundColor:membershipReady&&count?c.tag:c.divider}]}><Text style={[styles.tagLabel,{color:membershipReady&&count?c.green:c.muted}]}>{tag}</Text></View></View></View>
        </TouchableOpacity>;})}</View>
      </View>)}
      <Text style={styles.footer}>{raceId==='all'?'This is your full training log.':'Showing workouts linked to the selected challenge.'} Points live inside each challenge’s Points tab.</Text>
      <View style={styles.utility}><TouchableOpacity accessibilityRole="button" onPress={()=>router.push('/(app)/record-activity')} style={styles.smallButton}><Text style={styles.link}>Record a workout ↗</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh workouts" onPress={refresh} style={styles.smallButton}><Text style={styles.link}>Refresh</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" onPress={()=>router.push('/(app)/submit-activity')} style={styles.smallButton}><Text style={styles.link}>Add workout ↗</Text></TouchableOpacity></View>
    </>}
    {tab==='Badges'&&<View style={{gap:12}}><Text accessibilityRole="header" style={styles.section}>Your trail treasures</Text><Text style={styles.caption}>Earned through your Sage activity.</Text>{[
      {failed:!!catalog.error,title:'First climb',icon:'mountain' as const,earned:joined.length>0,description:'Join your first Sage challenge.',action:()=>router.push('/(app)/challenges')},
      {failed:!!error,title:'Activity recorded',icon:'activity' as const,earned:activities.length>0,description:'Record or import your first workout.',action:()=>router.push('/(app)/record-activity')},
      {failed:!!catalog.error,title:'World explorer',icon:'flag' as const,earned:joined.length>=2,description:'Join two different challenges.',action:()=>router.push('/(app)/challenges')},
    ].map(badge=><TouchableOpacity accessibilityRole="button" accessibilityLabel={`${badge.title}, ${badge.failed?'Status unavailable':badge.earned?'Unlocked':'Locked'}. ${badge.description}`} key={badge.title} onPress={badge.action} style={styles.badgeCard}><View style={[styles.badgeIcon,{backgroundColor:badge.earned?c.tag:c.divider}]}><SageIcon name={badge.icon} color={badge.earned?c.green:c.muted} size={26}/></View><View style={{flex:1,gap:4}}><Text style={styles.settingTitle}>{badge.title}</Text><Text style={styles.caption}>{badge.description}</Text><Text style={[styles.caption,{color:badge.earned?c.green:c.muted,fontWeight:'800'}]}>{loading||catalog.loading?'Checking…':badge.failed?'Status unavailable · Pull to refresh':badge.earned?'Unlocked':'Your next adventure'}</Text></View><SageIcon name="chevron" color={c.muted} size={17}/></TouchableOpacity>)}</View>}
    {tab==='Settings'&&<><Text accessibilityRole="header" style={styles.section}>Your Sage account</Text><View style={styles.settings}>
      {link('Customize avatar','user',editAvatar)}
      {link('Edit athlete story','list',()=>router.push('/(app)/profile-edit'))}
      {link('Your training history','activity',()=>router.push('/(app)/profile-details'))}
      {link('Workout connections','heart',()=>router.push('/(app)/health-connect'),'Apple Health, Health Connect, Garmin and FIT imports')}
      {link('Add a workout','up',()=>router.push('/(app)/submit-activity'))}
      {link('Privacy & permissions','shield',()=>router.push('/privacy'))}
    </View><Text style={styles.caption}>{user?.email}</Text><TouchableOpacity accessibilityRole="button" disabled={signingOut} onPress={()=>void logout()} style={styles.smallButton}><Text style={styles.warning}>{signingOut?'Signing out…':'Sign out'}</Text></TouchableOpacity>{!!actionError&&<Text accessibilityRole="alert" style={styles.warning}>{actionError}</Text>}</>}
    {athlete.error&&<TouchableOpacity accessibilityRole="button" onPress={athlete.refresh} style={styles.smallButton}><Text style={styles.caption}>Profile details couldn’t load. Tap to retry.</Text></TouchableOpacity>}
  </ScrollView>
  {avatarEditor&&<AvatarEditor name={name} avatar={profile?.avatar} onClose={()=>setAvatarEditor(false)} onSave={saveAvatar}/>}
  </SafeAreaView>;
}
function LogSportIcon({sport,color}:{sport:Exclude<LogSport,'all'>;color:string}) {
  if(sport==='run'||sport==='walk')return <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><Circle cx={sport==='run'?14:13} cy={4.5} r={2}/><Path d={sport==='run'?'M8 21l3-6 3 2 1 4M6 12l3-4 4 1 2 3 3 1':'M10 21l2-6 3 3v3M8 13l2-5 3 1 1 4 3 1'}/></Svg>;
  return <SageIcon name={sport==='ride'?'bike':sport==='swim'?'swim':sport==='lift'?'strength':'activity'} size={20} color={color}/>;
}
const styles=StyleSheet.create({
  page:{flex:1,backgroundColor:c.bg},body:{width:'100%',maxWidth:520,alignSelf:'center',paddingHorizontal:16,paddingTop:12,paddingBottom:16,gap:14},
  header:{flexDirection:'row',alignItems:'center',gap:12},avatar:{width:56,height:56,borderRadius:28,overflow:'hidden',backgroundColor:c.avatar,alignItems:'center'},name:{fontSize:22,fontWeight:'800',letterSpacing:-.45,color:c.text},subtitle:{fontSize:13,lineHeight:18,fontWeight:'600',color:c.muted},edit:{width:40,height:40,borderRadius:20,backgroundColor:c.surface,alignItems:'center',justifyContent:'center',shadowColor:c.text,shadowOpacity:.08,shadowRadius:2,shadowOffset:{width:0,height:1},elevation:1},
  tabs:{flexDirection:'row',gap:4,padding:4,borderRadius:16,backgroundColor:c.tabs},tab:{flex:1,minHeight:38,borderRadius:12,alignItems:'center',justifyContent:'center',padding:6},tabSelected:{backgroundColor:c.surface,shadowColor:c.text,shadowOpacity:.12,shadowRadius:3,shadowOffset:{width:0,height:1},elevation:1},tabLabel:{fontSize:13},
  summary:{backgroundColor:c.surface,borderRadius:22,padding:16,gap:12,shadowColor:c.text,shadowOpacity:.06,shadowRadius:12,shadowOffset:{width:0,height:4},elevation:2},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},section:{fontSize:15,fontWeight:'800',color:c.text},caption:{fontSize:12,fontWeight:'500',lineHeight:18,color:c.muted},metrics:{flexDirection:'row',gap:8},metric:{flex:1,gap:2},metricValue:{fontSize:20,fontWeight:'800',color:c.text,letterSpacing:-.4,fontVariant:['tabular-nums']},metricLabel:{fontSize:11,fontWeight:'600',color:c.muted},bars:{flexDirection:'row',gap:3,alignItems:'flex-end',height:40},
  filters:{gap:8,paddingVertical:2},chip:{height:36,paddingHorizontal:14,borderRadius:18,borderWidth:1.5,borderColor:c.border,backgroundColor:c.surface,justifyContent:'center'},chipSelected:{backgroundColor:c.text,borderColor:c.text},chipLabel:{fontSize:13,fontWeight:'700'},group:{gap:8},groupTitle:{fontSize:14,fontWeight:'800',color:c.text,flexShrink:1},groupSummary:{fontSize:12,fontWeight:'600',color:c.muted,textAlign:'right',flexShrink:1},workouts:{backgroundColor:c.surface,borderRadius:20,paddingHorizontal:12,paddingVertical:2,shadowColor:c.text,shadowOpacity:.06,shadowRadius:2,shadowOffset:{width:0,height:1},elevation:1},workout:{flexDirection:'row',alignItems:'flex-start',gap:12,paddingVertical:12},divider:{borderBottomWidth:1,borderColor:c.divider},sportIcon:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center'},workoutTitle:{fontSize:15,fontWeight:'800',color:c.text,flex:1,lineHeight:20},when:{fontSize:12,fontWeight:'600',color:c.muted,flexShrink:0},stats:{fontSize:13,fontWeight:'600',color:c.secondary,lineHeight:19,fontVariant:['tabular-nums']},meta:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:6,marginTop:2},source:{fontSize:11,fontWeight:'600',color:c.muted},tag:{minHeight:20,paddingHorizontal:7,paddingVertical:2,borderRadius:10,justifyContent:'center'},tagLabel:{fontSize:10,fontWeight:'800'},footer:{fontSize:12,fontWeight:'500',color:c.muted,textAlign:'center',lineHeight:18},
  utility:{flexDirection:'row',justifyContent:'space-between',flexWrap:'wrap',gap:6},smallButton:{minHeight:44,justifyContent:'center',paddingVertical:8},link:{color:c.green,fontSize:12,fontWeight:'700'},empty:{backgroundColor:c.surface,borderRadius:20,padding:22,alignItems:'center',gap:12},emptyTitle:{color:c.text,fontSize:16,fontWeight:'800'},emptyActions:{width:'100%'},notice:{backgroundColor:c.surface,padding:14,borderRadius:16},warning:{color:c.orange,fontSize:13,lineHeight:19,fontWeight:'700'},scope:{backgroundColor:c.tag,borderRadius:16,paddingHorizontal:14,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:12},feedback:{color:c.green,fontSize:12,fontWeight:'700'},
  settings:{backgroundColor:c.surface,borderRadius:20,paddingHorizontal:14},settingsRow:{flexDirection:'row',gap:12,alignItems:'center',paddingVertical:14,minHeight:62,borderBottomWidth:1,borderColor:c.divider},settingIcon:{width:32,alignItems:'center'},settingTitle:{color:c.text,fontSize:14,fontWeight:'700'},badgeCard:{backgroundColor:c.surface,borderRadius:20,padding:16,flexDirection:'row',alignItems:'center',gap:14},badgeIcon:{width:54,height:54,borderRadius:18,alignItems:'center',justifyContent:'center'},
});
