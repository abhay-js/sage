import { useState } from 'react';
import { View,Text,TouchableOpacity,Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ProductChallenge,LevelDefinition } from '../../types/product';
import { challengeState,levelName } from '../../lib/productConfig';
import { rpcWrite } from '../../hooks/useProduct';
import { Button,Section,s } from './SageUI';
import { Choices,confirmAction,form,MetricGrid } from './ProductUI';
import { sageColors as c } from '../../lib/theme';
import { ChallengePoints,ChallengeBonuses } from './ChallengePoints';
export function Eligibility({challenge,level,levels}:{challenge:ProductChallenge;level:number|null;levels:LevelDefinition[]}) {return <View style={[s.card,{padding:18,marginVertical:16}]}><Text style={s.label}>CHALLENGE LEVEL</Text><Text style={[s.section,{marginTop:6}]}>{challenge.eligible_levels.map(l=>levelName(l,levels)).join(' + ')}</Text><Text style={[s.label,{marginTop:15}]}>YOUR LEVEL</Text><Text style={[s.section,{marginTop:6}]}>{levelName(level,levels)}</Text><Text style={{color:challenge.eligibility==='ELIGIBLE'?c.green:c.orange,fontSize:12,fontWeight:'700',marginTop:12}}>{challenge.eligibility==='ELIGIBLE'?"✓ You're eligible":challenge.eligibility==='PENDING_LEVEL_REVIEW'?'Eligibility will be confirmed after level review.':'Your level is not eligible for this Clash.'}</Text></View>;}
export function ChallengeSections({challenge,onRefresh}:{challenge:ProductChallenge;onRefresh:()=>void}) {
  const router=useRouter(),[tab,setTab]=useState('Overview'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const cfg=challenge.config;
  async function join(){setBusy(true);try{await rpcWrite('sage_join_challenge',{p_race_id:challenge.id});await rpcWrite('sage_process_workouts',{});onRefresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <><Choices label="Challenge" options={['Overview','Points','Bonuses','Rewards','Rules','Athletes'].map(id=>({id,label:id}))} selected={[tab]} onSelect={setTab}/>
    {tab==='Overview'&&<><Text style={s.muted}>{cfg.description||'Train consistently and climb with the Sage village.'}</Text><MetricGrid items={[["Duration",`${Math.ceil((Date.parse(challenge.challenge_end)-Date.parse(challenge.challenge_start))/86400000)} days`],['Athletes',challenge.participant_count],['Your rank',challenge.rank?`#${challenge.rank}`:'—'],['Your points',challenge.sage_score]]}/><Text style={[s.muted,{marginBottom:18}]}>{challenge.sport_types.join(' · ')} · {challengeState(challenge)}</Text>{challenge.joined?<Button title="View Mountain" onPress={()=>router.push({pathname:'/(app)/ranks',params:{raceId:challenge.id}})}/>:<Button disabled={busy||challenge.eligibility!=='ELIGIBLE'||challengeState(challenge)==='Completed'||challenge.status!=='open'} title={busy?'Joining…':'Join Challenge'} onPress={()=>confirmAction(`Join ${challenge.name}?`,`${challenge.sport_types.join(' · ')}\n${new Date(challenge.challenge_start).toLocaleDateString('en-IN')} – ${new Date(challenge.challenge_end).toLocaleDateString('en-IN')}`,()=>void join())}/>}</>}
    {(tab==='Overview'||tab==='Points')&&<ChallengePoints key={tab} config={cfg} expanded={tab==='Points'}/>}
    {(tab==='Overview'||tab==='Bonuses')&&<ChallengeBonuses config={cfg}/>}
    {tab==='Rules'&&<><Text style={form.note}>Workout verification required.{cfg.maxWorkoutsPerDay?` First ${cfg.maxWorkoutsPerDay} qualifying approved workouts count each day.`:''}</Text>{cfg.rules.map(rule=><View key={rule.id} style={[s.card,{padding:20,marginBottom:10}]}><Text style={s.section}>{rule.title}</Text><Text style={s.muted}>{rule.description}</Text></View>)}<Text style={s.muted}>Your level at joining is preserved. Later level changes do not automatically remove you from this challenge.</Text></>}
    {tab==='Rewards'&&<><MetricGrid items={[["Your rank",challenge.rank?`#${challenge.rank}`:'—'],['Your points',challenge.sage_score]]}/>{cfg.rewards.length?[...cfg.rewards].sort((a,b)=>a.rank-b.rank).map(reward=><View key={reward.id} style={[s.card,{padding:20,marginBottom:12}]}>{reward.imageUrl&&<Image source={{uri:reward.imageUrl}} accessibilityLabel={reward.title} style={{width:'100%',height:reward.rank===1?190:120,resizeMode:'contain'}}/>}<Text style={[s.eyebrow,{color:c.orange}]}>#{reward.rank} PLACE</Text><Text style={s.section}>{reward.title}</Text><Text style={s.muted}>{reward.description}</Text>{reward.sponsor&&<Text style={s.muted}>By {reward.sponsor}</Text>}{reward.terms&&<Text style={[s.muted,{fontSize:11}]}>{reward.terms}</Text>}</View>):<Text style={s.muted}>Rewards will appear here when announced.</Text>}</>}
    {tab==='Athletes'&&<><Text style={[s.muted,{marginBottom:15}]}>{challenge.participant_count} athletes are climbing.</Text><Button title="View leaderboard" onPress={()=>router.push({pathname:'/(app)/ranks',params:{raceId:challenge.id,view:'list'}})}/></>}
    {!!error&&<Text accessibilityRole="alert" style={form.note}>{error}</Text>}
  </>;
}
