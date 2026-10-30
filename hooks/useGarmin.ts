import {useCallback,useEffect,useState} from 'react';
import {Platform} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {supabase} from '../lib/supabase';
export interface GarminState {status:'disconnected'|'pending_mfa'|'connected'|'reconnect_required';last_synced_at?:string|null;error?:string|null;message?:string;imported?:number;duplicates?:number;warnings?:string[]}
const endpoint=process.env.EXPO_PUBLIC_GARMIN_API_URL??'https://sage-secure-mvp-source.vercel.app/api/garmin';
export function useGarmin(){
 const {user}=useAuth();
 const [state,setState]=useState<GarminState|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=useCallback(async(action:string,body:Record<string,unknown>={})=>{
  if(Platform.OS==='web'&&typeof window!=='undefined'&&['localhost','127.0.0.1'].includes(window.location.hostname)&&!process.env.EXPO_PUBLIC_GARMIN_API_URL)throw new Error('Direct Garmin connection needs the hosted Sage API. Use phone health imports or a FIT upload in this local preview.');
  const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Sign in to Sage first.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),action==='status'?15000:290000);
  try{const response=await fetch(endpoint,{method:action==='status'?'GET':'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},...(action==='status'?{}:{body:JSON.stringify({action,...body})}),signal:controller.signal});
   const result=await response.json();if(!response.ok)throw new Error(result.error??'Garmin is unavailable. Try again later.');return result as GarminState;
  }catch(e){if(e instanceof Error&&e.name==='AbortError')throw new Error('Garmin took too long. Wait a minute, refresh the connection and try again.');if(e instanceof TypeError||e instanceof SyntaxError)throw new Error('The Garmin connection service is unavailable. Retry later, or import through your phone’s health service or a FIT file.');throw e;}finally{clearTimeout(timer);}
 },[]);
 const refresh=useCallback(async()=>{if(!user)return;setError('');try{setState(await request('status'));}catch(e){setError((e as Error).message);}},[user?.id,request]);
 useEffect(()=>{let cancelled=false;setState(null);setError('');if(user)void request('status').then(value=>{if(!cancelled)setState(value);}).catch(e=>{if(!cancelled)setError(e.message);});return()=>{cancelled=true;};},[user?.id,request]);
 const act=async(action:string,body:Record<string,unknown>={})=>{if(busy)return null;setBusy(true);setError('');try{const result=await request(action,body);setState(result);return result;}catch(e){setError((e as Error).message);return null;}finally{setBusy(false);}};
 return{state,busy,error,refresh,connect:(email:string,password:string)=>act('connect',{email,password,consent:true}),verify:(code:string)=>act('mfa',{code}),sync:()=>act('sync'),disconnect:()=>act('disconnect')};
}
