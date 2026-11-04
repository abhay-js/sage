import {memo,useEffect,useState} from 'react';
import {AppState,View} from 'react-native';
import type {AthleteAvatar} from '../../lib/avatar';
import {SvgXml} from 'react-native-svg';
import {useDawnMotion} from './DawnArt';
import {homeRigFrame} from '../../lib/homeRigAnimation';
export type AthleteMood='fired'|'proud'|'fresh'|'restless'|'sleepy'|'tired'|'recovering'|'celebrating';
export const moodNames:Record<AthleteMood,string>={fired:'Fired up',proud:'Proud',fresh:'Fresh',restless:'Restless',sleepy:'Sleepy',tired:'Tired',recovering:'Recovering',celebrating:'Celebrating'};
export const AthleteMoodAvatar=memo(function AthleteMoodAvatar({avatar,mood,size=120,playing=true}:{avatar?:AthleteAvatar|null;mood:AthleteMood;size?:number;playing?:boolean}){
 const motion=useDawnMotion(),[time,setTime]=useState(0);
 useEffect(()=>{
  setTime(0);if(!motion||!playing)return;
  const start=Date.now();let timer:ReturnType<typeof setInterval>|undefined;
  const stop=()=>{if(timer)clearInterval(timer);timer=undefined;};
  const run=()=>{stop();timer=setInterval(()=>setTime((Date.now()-start)/1000),50);};
  if(AppState.currentState!=='background')run();
  const sub=AppState.addEventListener('change',state=>state==='active'?run():stop());
  return()=>{stop();sub.remove();};
 },[motion,playing,mood]);
 return <View accessibilityLabel={`Avatar mood: ${moodNames[mood]}`} style={{width:size*340/460,height:size}}><SvgXml xml={homeRigFrame(mood,time,size,avatar)} width={size*340/460} height={size}/></View>;
});
