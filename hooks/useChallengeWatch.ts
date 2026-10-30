import { useEffect,useRef,useState } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
async function read(key:string):Promise<string[]> {
 let raw:string|null=null;
 if(Platform.OS==='web'){raw=typeof window==='undefined'?null:window.localStorage.getItem(key);}
 else {const file=FileSystem.documentDirectory+key+'.json';if((await FileSystem.getInfoAsync(file)).exists)raw=await FileSystem.readAsStringAsync(file);}
 const value=raw?JSON.parse(raw):[];return Array.isArray(value)?[...new Set(value.filter((id):id is string=>typeof id==='string'))]:[];
}
async function write(key:string,ids:string[]) {
 if(Platform.OS==='web'){window.localStorage.setItem(key,JSON.stringify(ids));return;}
 await FileSystem.writeAsStringAsync(FileSystem.documentDirectory+key+'.json',JSON.stringify(ids));
}
export function useChallengeWatch(userId?:string,challengeId?:string,max?:number) {
 const key=`sage.camp.watch.v1.${userId??'none'}.${challengeId??'none'}`.replace(/[^a-zA-Z0-9._-]/g,'_');
 const owner=useRef(key);owner.current=key;
 const [snapshot,setSnapshot]=useState({key:'',ids:[] as string[],ready:false,error:''});
 const current=useRef(snapshot);current.current=snapshot;
 const queue=useRef<Promise<void>>(Promise.resolve());
 useEffect(()=>{let active=true;if(!userId||!challengeId){setSnapshot({key,ids:[],ready:true,error:''});return;}
  read(key).then(ids=>{if(active)setSnapshot({key,ids,ready:true,error:''});}).catch(()=>{if(active)setSnapshot({key,ids:[],ready:true,error:'Your saved watch list could not load.'});});return()=>{active=false;};
 },[key,userId,challengeId]);
 function toggle(id:string){const previous=current.current;if(!userId||!challengeId||previous.key!==key||!previous.ready)return;
  const ids=previous.ids.includes(id)?previous.ids.filter(value=>value!==id):[...previous.ids,id].slice(max ? -max : 0),next={key,ids,ready:true,error:''};current.current=next;setSnapshot(next);
  queue.current=queue.current.catch(()=>{}).then(()=>write(key,ids)).catch(()=>{if(owner.current===key)setSnapshot(value=>({...value,error:'Watch changes could not be saved on this device.'}));});
 }
 return {ids:snapshot.key===key?snapshot.ids:[],ready:snapshot.key===key&&snapshot.ready,error:snapshot.key===key?snapshot.error:'',toggle};
}
