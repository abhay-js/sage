import { syncHealthPlatform } from './healthSync';
import { rpcWrite } from '../hooks/useProduct';
import { ProductChallenge,SyncResult,AroundMe } from '../types/product';
let lastResult:SyncResult|null=null;
export function getWorkoutSyncResult(){return lastResult;}
export async function syncSageWorkouts(userId:string):Promise<SyncResult> {
  const before=await rpcWrite<ProductChallenge[]>('sage_challenges',{p_admin:false});
  const imported=await syncHealthPlatform(userId,null);
  await rpcWrite('sage_process_workouts',{});
  const after=await rpcWrite<ProductChallenge[]>('sage_challenges',{p_admin:false});
  const gaps=await Promise.all(after.filter(c=>c.joined).map(async c=>({id:c.id,around:await rpcWrite<AroundMe>('sage_around_me',{p_race_id:c.id})})));
  lastResult={imported,challenges:after.filter(c=>c.joined).map(c=>{const previous=before.find(p=>p.id===c.id);return{id:c.id,name:c.name,beforePoints:previous?.sage_score??0,afterPoints:c.sage_score,beforeRank:previous?.rank??null,afterRank:c.rank,passed:previous?.rank&&c.rank?Math.max(0,previous.rank-c.rank):0,nextGap:gaps.find(g=>g.id===c.id)?.around.nextGap??null};})};
  return lastResult;
}
