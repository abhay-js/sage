import {useCallback,useEffect,useState} from 'react';

import {useAuth} from '../context/AuthContext';
import {GpsRecording,RecordingSport} from '../lib/gpsRecording';
import {loadRecording,subscribeRecording,reconcileRecordingOwner,startRecording,pauseRecording,resumeRecording,finishRecording,discardRecording} from '../lib/gpsRecorder';
import {submitRecording} from './useSubmissions';
export function useRecordingDraft(){
 const {user}=useAuth(),id=user?.id;
 const [state,setState]=useState<{owner?:string;record:GpsRecording|null}>({record:null});
 useEffect(()=>{let active=true;const read=async()=>{try{const record=id?await loadRecording(id):null;if(active)setState({owner:id,record});}catch{if(active)setState({owner:id,record:null});}};void read();const unsubscribe=subscribeRecording(()=>void read());return()=>{active=false;unsubscribe();};},[id]);
 return state.owner===id?state.record:null;
}
export function useGpsRecorder(){
 const {user}=useAuth(),id=user?.id;
 const [record,setRecord]=useState<GpsRecording|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[now,setNow]=useState(Date.now());
 const refresh=useCallback(async()=>{if(!id){setRecord(null);setLoading(false);return;}try{setRecord(await loadRecording(id));}catch(e){setError((e as Error).message);}finally{setLoading(false);}},[id]);
 useEffect(()=>{let mounted=true;const read=()=>{if(mounted)void refresh();};read();const unsubscribe=subscribeRecording(read),timer=setInterval(()=>setNow(Date.now()),1000);return()=>{mounted=false;unsubscribe();clearInterval(timer);};},[refresh,id]);
 async function act(job:()=>Promise<unknown>){if(busy||!id)return;setBusy(true);setError('');try{await job();await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return {record,loading,busy,error,now,setError,start:(sport:RecordingSport)=>act(()=>startRecording(id!,sport)),pause:()=>act(()=>pauseRecording(id!)),resume:()=>act(()=>resumeRecording(id!)),finish:()=>act(()=>finishRecording(id!)),discard:()=>act(()=>discardRecording(id!)),save:async(note:string)=>{if(!record||busy)return null;setBusy(true);setError('');try{const result=await submitRecording(record,note);await discardRecording(id!);await refresh();return result;}catch(e){setError((e as Error).message);return null;}finally{setBusy(false);}}};
}
