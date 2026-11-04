import {useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {useAuth} from '../../context/AuthContext';
import {useProductChallenges,useAthleteProfile,useAroundMe,useBoardPage} from '../../hooks/useProduct';
import {useChallengeClock} from '../../hooks/useChallengeClock';
import {useChallengeWatch} from '../../hooks/useChallengeWatch';
import {Page,Button,Empty} from '../../components/ui/AdventureUI';
import {ChallengeSections} from '../../components/ui/ChallengeContent';
import {ChallengeBaseCamp,ChallengeFinale,LifecycleAction} from '../../components/ui/ChallengeLifecycle';
import {challengeState} from '../../lib/productConfig';
import {Sheet} from '../../components/ui/AdventureUI';
import {DawnAvatar} from '../../components/ui/DawnArt';
import {homeFinalColors as c,homeFinalFonts as f} from '../../lib/homeFinalTheme';
import type {BoardAthlete} from '../../types/product';

export default function ChallengeDetail(){
 const {id,tab}=useLocalSearchParams<{id:string;tab?:string}>(),router=useRouter(),{user}=useAuth();
 const catalog=useProductChallenges(),profile=useAthleteProfile(),challenge=catalog.data?.find(item=>item.id===id);
 const [page,setPage]=useState(0),[search,setSearch]=useState(''),[query,setQuery]=useState(''),[athlete,setAthlete]=useState<BoardAthlete>();
 const now=useChallengeClock(challenge?.challenge_start,challenge?.challenge_end);
 const around=useAroundMe(id),board=useBoardPage(id,page,query),watch=useChallengeWatch(user?.id,id);
 useEffect(()=>{setPage(0);setSearch('');setQuery('');setAthlete(undefined);},[id]);
 useEffect(()=>{const timer=setTimeout(()=>{setQuery(search.trim());setPage(0);},250);return()=>clearTimeout(timer);},[search]);
 const retry=()=>{catalog.refresh();around.refresh();board.refresh();};
 if(!challenge)return <Page>{catalog.loading?<Empty loading text="Loading your adventure…"/>:catalog.error?<><Text>{catalog.error}</Text><Button title="Try again" onPress={catalog.refresh}/></>:<Empty text="This challenge is unavailable."/>}<Button secondary title="Explore challenges" onPress={()=>router.replace('/(app)/challenges')}/></Page>;
 const openWall=(list=false,preview=false)=>router.push({pathname:'/(app)/ranks',params:{raceId:id,view:list?'list':'mountain',preview:preview?'1':'0'}});
 const rows=[...new Map([...(around.data?.summit??[]),...(board.data?.athletes??[]),...(around.data?.current?[around.data.current]:[])].map(a=>[a.user_id,a])).values()];
 const common={challenge,around:around.data,athletes:rows,total:around.data?.total??challenge.participant_count,userId:user?.id,avatar:profile.data?.profile?.avatar,loading:around.loading,error:around.error,onRetry:retry,onPickChallenge:()=>router.push('/(app)/challenges'),onAthlete:setAthlete,onDetails:(section?:string)=>router.push({pathname:'/(app)/challenge-rules',params:{id}})};
 return <View style={{flex:1}}>{challengeState(challenge,now)==='Completed'?<ChallengeFinale {...common} onRankings={()=>openWall(true)} onNext={()=>router.push('/(app)/challenges')} onProfile={()=>router.push('/(app)/log')}/>:<ChallengeBaseCamp {...common} initialTab={tab} roster={board.data?.athletes??[]} rosterLoading={board.loading} rosterError={board.error} search={search} onSearch={setSearch} page={page} pages={Math.max(1,Math.ceil((board.data?.total??0)/50))} onPage={setPage} watch={watch} onPreview={()=>openWall(false,true)} joinAction={<ChallengeSections challenge={challenge} onRefresh={retry} joinOnly renderJoin={(title,disabled,onPress)=><LifecycleAction title={title} disabled={disabled} onPress={onPress}/>}/>}/>}
 {athlete&&<Sheet title={athlete.user_id===user?.id?'Your athlete':'Meet your trail neighbour'} onClose={()=>setAthlete(undefined)}><View style={{alignItems:'center',gap:12,padding:14}}><DawnAvatar avatar={athlete.user_id===user?.id?profile.data?.profile?.avatar:athlete.user.avatar} size={90} pose="wave"/><Text style={{fontFamily:f.bold,fontSize:22,color:c.ink}}>{athlete.user.name}</Text><Text style={{fontFamily:f.body,color:c.muted}}>{athlete.level?`Level ${athlete.level}`:'Level under review'}</Text>{challengeState(challenge,now)!=='Upcoming'&&<Text style={{fontFamily:f.bold,color:c.ink}}>#{athlete.rank} · {athlete.sage_score} pts · {athlete.sessions} approved workouts</Text>}</View>{athlete.user_id!==user?.id?<LifecycleAction title={watch.ids.includes(athlete.user_id)?'Watching · tap to stop':'Keep an eye on this athlete'} disabled={!watch.ready} onPress={()=>watch.toggle(athlete.user_id)}/>:<LifecycleAction title="My profile" onPress={()=>{setAthlete(undefined);router.push('/(app)/log');}}/>}</Sheet>}
 </View>;
}
