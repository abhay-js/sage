import { useCallback,useState } from 'react';
import { useFocusEffect } from 'expo-router';
/** Re-evaluate the route at start/end boundaries, without ticking the live wall every second. */
export function useChallengeClock(start?:string,end?:string) {
 const [now,setNow]=useState(Date.now());
 useFocusEffect(useCallback(()=>{let timer:ReturnType<typeof setTimeout>;const tick=()=>{const current=Date.now();setNow(current);const next=[Date.parse(start??''),Date.parse(end??'')+1].filter(value=>Number.isFinite(value)&&value>current).sort((a,b)=>a-b)[0];timer=setTimeout(tick,next?Math.min(60000,Math.max(20,next-current+20)):60000);};tick();return()=>clearTimeout(timer);},[start,end]));
 return now;
}
