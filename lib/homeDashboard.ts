import type { ActivityLog } from '../types';
import type { AroundMe, BoardAthlete, ProductChallenge, ScoreAudit } from '../types/product';
import { challengeState } from './productConfig';
import { challengeTiming } from './challengeExperience';
import { logDay, logDate } from './activityLog';
export type HomeScene='mountain'|'run'|'duel'|'upcoming';
export type HomeBoards=Record<string,AroundMe>;
export function homeChallenges(challenges:ProductChallenge[],now=Date.now()) {
  return challenges.filter(ch=>ch.joined&&['Live','Upcoming'].includes(challengeState(ch,now))).slice().sort((a,b)=>{
    const aLive=challengeState(a,now)==='Live',bLive=challengeState(b,now)==='Live';
    return Number(bLive)-Number(aLive)||Date.parse(aLive?a.challenge_end:a.challenge_start)-Date.parse(bLive?b.challenge_end:b.challenge_start)||a.id.localeCompare(b.id);
  });
}
export function homeScene(challenge:ProductChallenge,now=Date.now()): HomeScene {
  if(challengeState(challenge,now)==='Upcoming')return 'upcoming';
  if(/duel/i.test(challenge.config.challengeType))return 'duel';
  if(challenge.sport_types.length&&challenge.sport_types.every(s=>['Run','TrailRun','VirtualRun'].includes(s)))return 'run';
  return 'mountain';
}
export function homeToday(activities:ActivityLog[],now=new Date()) {
  const today=logDay(now);
  return activities.filter(a=>{const started=a.activity_started_at?new Date(a.activity_started_at):null;return started&&Number.isFinite(started.getTime())?logDay(started)===today:!!logDate(a.activity_date)&&a.activity_date.slice(0,10)===today;}).slice().sort((a,b)=>(Date.parse(b.activity_started_at??'')||0)-(Date.parse(a.activity_started_at??'')||0)||a.id.localeCompare(b.id));
}
export function homeReceipts(activity:ActivityLog,receipts:ScoreAudit[],challenges:ProductChallenge[]) {
  const joined=new Set(challenges.filter(ch=>ch.joined&&ch.status!=='draft').map(ch=>ch.id));
  const unique=new Map<string,ScoreAudit>();
  for(const receipt of receipts)if(receipt.activity_id===activity.id&&joined.has(receipt.race_id))unique.set(receipt.race_id,receipt);
  return [...unique.values()].map(receipt=>activity.review_status==='rejected'?{...receipt,status:'REJECTED' as const,total_points:0}:receipt);
}
export function homeCountedChallenges(activities:ActivityLog[],receipts:ScoreAudit[],challenges:ProductChallenge[]) {
  return new Set(activities.flatMap(a=>homeReceipts(a,receipts,challenges).filter(r=>r.status==='COUNTED').map(r=>r.race_id))).size;
}
export function homeRival(challenge:ProductChallenge,board?:AroundMe): {athlete:BoardAthlete;gap:number}|null {
  if(!board?.current)return null;
  const own=board.current;
  const above=board.above.filter(a=>a.user_id!==own.user_id&&a.rank<=own.rank&&a.sage_score>=own.sage_score).slice().sort((a,b)=>b.rank-a.rank||a.sage_score-b.sage_score)[0];
  return above?{athlete:above,gap:Math.floor(above.sage_score-own.sage_score)+1}:null;
}
export function homeCard(challenge:ProductChallenge,board?:AroundMe,now=Date.now()) {
  const timing=challengeTiming(challenge,now),upcoming=timing.state==='Upcoming';
  const rank=board?.current?.rank??challenge.rank,points=board?.current?.sage_score??challenge.sage_score,total=board?.total??challenge.participant_count;
  const daysLeft=Math.max(0,Math.ceil((Date.parse(challenge.challenge_end)-now)/86400000)),daysUntil=Math.max(0,Math.ceil((Date.parse(challenge.challenge_start)-now)/86400000));
  const duration=Date.parse(challenge.challenge_end)-Date.parse(challenge.challenge_start),progress=duration>0?Math.min(1,Math.max(0,(now-Date.parse(challenge.challenge_start))/duration)):0;
  const rival=homeRival(challenge,board),scene=homeScene(challenge,now);
  return {scene,rank,points,total,progress:upcoming?0:progress,upcoming,
    tag:upcoming?`Starts ${new Date(challenge.challenge_start).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}`:`Day ${timing.day} of ${timing.days} · ${daysLeft}d left`,
    big:upcoming?`${daysUntil} ${daysUntil===1?'day':'days'}`:rank?`#${rank}`:'Unranked',
    sub:upcoming?`to the start · ${total} in`:`of ${total} · ${points.toLocaleString('en-IN')} pts`,
    note:upcoming?(challenge.config.rewards.length?`Rewards: ${challenge.config.rewards.slice(0,2).map(r=>r.title).join(', ')}`:'Get to know the challenge'):rival?`${rival.gap} pts to pass ${rival.athlete.user.name}`:rank===1?'You’re leading the climb':rank?'Keep building your climb':'Your first climb starts here',
    cta:upcoming?'Base camp':scene==='run'?'Board':scene==='duel'?'View duel':'Climb',
  };
}
export interface HomeNext {id:string;challengeId:string;title:string;where:string;reward:string;scene:HomeScene;tab:'Mountain'|'Points'|'Overview'}
export function homeNext(challenges:ProductChallenge[],boards:HomeBoards,now=Date.now()):HomeNext[] {
  const rows:HomeNext[]=[],missions:HomeNext[]=[];
  for(const challenge of homeChallenges(challenges,now)) {
    const card=homeCard(challenge,boards[challenge.id],now),rival=homeRival(challenge,boards[challenge.id]);
    const base={challengeId:challenge.id,where:challenge.name,scene:card.scene};
    if(card.upcoming)rows.push({...base,id:`start-${challenge.id}`,title:card.tag,reward:'Base camp',tab:'Overview'});
    else if(rival)rows.push({...base,id:`rival-${challenge.id}`,title:`Earn ${rival.gap} pts to pass ${rival.athlete.user.name}`,reward:`#${rival.athlete.rank}`,tab:'Mountain'});
    else rows.push({...base,id:`board-${challenge.id}`,title:card.rank===1?'Keep your lead':'Plan your next scoring workout',reward:card.rank===1?'Climb':'View rules',tab:card.rank===1?'Mountain':'Points'});
    if(!card.upcoming)for(const bonus of challenge.config.bonuses)if(Number.isFinite(bonus.points)&&bonus.points>0)missions.push({...base,id:`bonus-${challenge.id}-${bonus.id}`,title:bonus.title,where:`${challenge.name} · bonus requirements`,reward:`+${bonus.points} pts possible`,tab:'Points'});
  }
  return [...rows,...missions].slice(0,4);
}
