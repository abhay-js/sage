import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { subscribeHealthImport } from '../lib/healthSyncEvents';
import type { AroundMe } from '../types/product';
import type { HomeBoards } from '../lib/homeDashboard';
const empty:HomeBoards={};
/** Read the existing owner-scoped standings RPC for each live card. No score writes. */
export function useHomeBoards(challengeIds:string[]) {
  const {user}=useAuth(),idsKey=JSON.stringify([...new Set(challengeIds)].sort()),key=JSON.stringify([user?.id,idsKey]);
  const owner=useRef(key);owner.current=key;
  const generation=useRef(0),focused=useRef(false);
  const [snapshot,setSnapshot]=useState<{key:string;data:HomeBoards;errors:Record<string,string>;loading:boolean}>({key:'',data:empty,errors:{},loading:false});
  const refresh=useCallback(async()=>{
    const ticket=++generation.current,ids=JSON.parse(idsKey) as string[];
    if(!user?.id||!ids.length){setSnapshot({key,data:empty,errors:{},loading:false});return;}
    setSnapshot(previous=>previous.key===key?{...previous,loading:true}:{key,data:empty,errors:{},loading:true});
    const data:HomeBoards={},errors:Record<string,string>={};
    for(let offset=0;offset<ids.length;offset+=4){
      if(owner.current!==key||generation.current!==ticket)return;
      const batch=ids.slice(offset,offset+4),results=await Promise.allSettled(batch.map(async id=>{
        const result=await supabase.rpc('sage_around_me',{p_race_id:id});
        if(result.error)throw new Error(result.error.message);
        if(!result.data)throw new Error('Standings unavailable');
        return result.data as AroundMe;
      }));
      results.forEach((result,index)=>{if(result.status==='fulfilled')data[batch[index]]=result.value;else errors[batch[index]]=result.reason instanceof Error?result.reason.message:'Standings unavailable';});
    }
    if(owner.current===key&&generation.current===ticket)setSnapshot({key,data,errors,loading:false});
  },[user?.id,idsKey,key]);
  useFocusEffect(useCallback(()=>{focused.current=true;void refresh();return()=>{focused.current=false;generation.current++;};},[refresh]));
  useEffect(()=>subscribeHealthImport(id=>{if(id===user?.id&&focused.current)void refresh();}),[user?.id,refresh]);
  const current=snapshot.key===key;
  return {data:current?snapshot.data:empty,errors:current?snapshot.errors:{},loading:!!user?.id&&challengeIds.length>0&&(!current||snapshot.loading),refresh};
}
