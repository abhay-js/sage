import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useActivities } from '../../hooks/useActivities';
import { useAthleteProfile, useProductChallenges, useRpc } from '../../hooks/useProduct';
import { useHomeBoards } from '../../hooks/useHomeBoards';
import { useHealthSync } from '../../context/HealthSyncContext';
import { healthPlatformName } from '../../lib/healthSync';
import { homeChallenges, homeReceipts } from '../../lib/homeDashboard';
import { challengeState } from '../../lib/productConfig';
import { GameHome } from '../../components/ui/GameHome';
import { ActivityLogDetails } from '../../components/ui/ActivityLogDetails';
import type { ScoreAudit } from '../../types/product';
export default function HomeScreen(){
 const {user}=useAuth(),router=useRouter(),catalog=useProductChallenges(),athlete=useAthleteProfile(),workouts=useActivities(user?.id),health=useHealthSync();
 const receipts=useRpc<ScoreAudit[]>('sage_workout_scores',{p_activity_id:null},!!user?.id);
 const [now,setNow]=useState(Date.now()),[refreshing,setRefreshing]=useState(false),[selectedId,setSelectedId]=useState<string>();
 const live=homeChallenges(catalog.data??[],now).filter(ch=>challengeState(ch,now)==='Live');
 const boards=useHomeBoards(live.map(ch=>ch.id));
 useFocusEffect(useCallback(()=>{setNow(Date.now());void workouts.refetch();const timer=setInterval(()=>setNow(Date.now()),60000);return()=>{clearInterval(timer);setSelectedId(undefined);};},[workouts.refetch]));
 async function refresh(){if(refreshing)return;setRefreshing(true);catalog.refresh();athlete.refresh();receipts.refresh();try{await Promise.allSettled([workouts.refetch(),boards.refresh()]);}finally{setRefreshing(false);setNow(Date.now());}}
 async function sync(){if(!health.enabled){router.push('/(app)/health-connect');return;}await health.sync();await refresh();}
 const selected=workouts.activities.find(a=>a.id===selectedId);
 const links=selected?homeReceipts(selected,receipts.data??[],catalog.data??[]).filter(r=>r.status==='COUNTED'||r.status==='PENDING').map(r=>(catalog.data??[]).find(ch=>ch.id===r.race_id)).filter((ch):ch is NonNullable<typeof ch>=>!!ch):[];
 return <><GameHome userId={user?.id} level={athlete.data?.level} challenges={catalog.data??[]} activities={workouts.activities} receipts={receipts.data??[]} boards={boards.data} boardErrors={boards.errors} profile={athlete.data?.profile} now={now} loading={catalog.loading} activitiesLoading={workouts.loading} receiptsLoading={receipts.loading} refreshing={refreshing} error={catalog.error} activityError={workouts.error} receiptError={receipts.error} onRefresh={()=>void refresh()} onProfile={()=>router.push('/(app)/log')} onChallenges={()=>router.push('/(app)/challenges')} onChallenge={(id,tab)=>tab==='Mountain'?router.push({pathname:'/(app)/ranks',params:{raceId:id,view:'mountain'}}):router.push({pathname:'/(app)/challenge-detail',params:{id,tab:tab??'Overview'}})} onWorkout={activity=>setSelectedId(activity.id)} onLog={()=>router.push('/(app)/log')} onRecord={()=>router.push('/(app)/record-activity')} onConnections={()=>router.push('/(app)/health-connect')} onSync={()=>void sync()} syncBusy={health.busy} syncEnabled={health.enabled} syncError={health.error} healthLabel={healthPlatformName()}/><ActivityLogDetails activity={selected} onClose={()=>setSelectedId(undefined)} challenges={links}/></>;
}
