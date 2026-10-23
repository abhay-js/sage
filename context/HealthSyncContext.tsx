import {createContext,useContext,useEffect,useRef,useState,ReactNode,useCallback} from 'react';
import {AppState,Platform} from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import {useAuth} from './AuthContext';
import {syncHealthPlatform} from '../lib/healthSync';
import {rpcWrite} from '../hooks/useProduct';
import {notifyHealthImport} from '../lib/healthSyncEvents';
export const healthSupported=Platform.OS!=='web'&&Constants.appOwnership!=='expo';
interface Preference {enabled:boolean;lastSynced:string|null}
const initial:Preference={enabled:false,lastSynced:null};
interface State extends Preference {ready:boolean;busy:boolean;error:string|null;imported:number|null;connect:()=>Promise<void>;sync:()=>Promise<void>;disconnect:()=>Promise<void>}
const Context=createContext<State|null>(null);
export function HealthSyncProvider({children}:{children:ReactNode}){
  const {user}=useAuth();const id=user?.role==='athlete'&&user.status!=='suspended'?user.id:null;
  const [prefs,setPrefs]=useState(initial),[loaded,setReady]=useState(false),[loadedFor,setLoadedFor]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[imported,setImported]=useState<number|null>(null);
  const ready=loaded&&loadedFor===id;
  const owner=useRef(id);owner.current=id;const current=useRef(prefs);current.current=prefs;const flight=useRef<string|null>(null),attempt=useRef(0),generation=useRef(0);
  const key=(uid:string)=>`sage.health.v1.${Platform.OS}.${uid}`;
  useEffect(()=>{let cancelled=false;generation.current++;setPrefs(initial);setReady(false);setLoadedFor(null);setError(null);setImported(null);setBusy(false);attempt.current=0;
    if(!id||!healthSupported){setLoadedFor(id);setReady(true);return;}
    SecureStore.getItemAsync(key(id)).then(raw=>{if(cancelled)return;const saved=raw?JSON.parse(raw):initial;setPrefs({enabled:saved.enabled===true,lastSynced:typeof saved.lastSynced==='string'?saved.lastSynced:null});setLoadedFor(id);setReady(true);}).catch(()=>{if(!cancelled){setError('Could not load your health connection settings.');setLoadedFor(id);setReady(true);}});
    return()=>{cancelled=true;};
  },[id]);
  const run=useCallback(async(connect=false)=>{
    if(!id||!ready||!healthSupported||flight.current===id)return;
    if(!connect&&!current.current.enabled)return;
    const revision=generation.current;flight.current=id;attempt.current=Date.now();setBusy(true);setError(null);
    let uploaded=false;
    try{
      const count=await syncHealthPlatform(id,current.current.lastSynced?new Date(current.current.lastSynced):null,{requestPermissions:connect,shouldContinue:()=>owner.current===id&&generation.current===revision});
      if(owner.current!==id||generation.current!==revision)return;
      uploaded=true;
      await rpcWrite('sage_process_workouts',{});
      if(owner.current!==id||generation.current!==revision)return;
      const next={enabled:true,lastSynced:new Date().toISOString()};await SecureStore.setItemAsync(key(id),JSON.stringify(next));
      if(owner.current===id&&generation.current===revision){setPrefs(next);setImported(count);}
    }catch(e){if(owner.current===id&&generation.current===revision)setError((e as Error).message??'Could not sync workouts.');}
    finally{if(uploaded&&owner.current===id&&generation.current===revision)notifyHealthImport(id);if(flight.current===id)flight.current=null;if(owner.current===id&&generation.current===revision)setBusy(false);}
  },[id,ready]);
  useEffect(()=>{
    if(!id||!ready||!prefs.enabled||!healthSupported)return;
    const automatic=()=>{if(AppState.currentState==='active'&&Date.now()-attempt.current>=180000)void run();};automatic();
    const interval=setInterval(automatic,300000);
    const subscription=AppState.addEventListener('change',state=>{if(state==='active')automatic();});
    return()=>{clearInterval(interval);subscription.remove();};
  },[id,ready,prefs.enabled,run]);
  async function disconnect(){if(!id)return;generation.current++;current.current={...current.current,enabled:false};setPrefs(current.current);setBusy(false);setError(null);await SecureStore.setItemAsync(key(id),JSON.stringify({...current.current,enabled:false}));}
  return <Context.Provider value={{...(ready?prefs:initial),ready,busy,error,imported,connect:()=>run(true),sync:()=>run(),disconnect}}>{children}</Context.Provider>;
}
export function useHealthSync(){const state=useContext(Context);if(!state)throw new Error('HealthSyncProvider is required');return state;}
