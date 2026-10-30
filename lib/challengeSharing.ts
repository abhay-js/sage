import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import type { ProductChallenge } from '../types/product';
import { challengeCalendar } from './challengeLifecycle';
export function shareChallenge(challenge:ProductChallenge,message?:string) {
 return Share.share({message:message??`${challenge.name} · Join the climb on Sage\nhttps://trainsage.fit/ranks?raceId=${encodeURIComponent(challenge.id)}`});
}
export async function addChallengeCalendar(challenge:ProductChallenge) {
 if(Platform.OS==='android')return shareChallenge(challenge,`${challenge.name} starts ${new Date(challenge.challenge_start).toLocaleString()}.\nhttps://trainsage.fit/ranks?raceId=${encodeURIComponent(challenge.id)}`);
 const content=challengeCalendar(challenge);
 if(Platform.OS==='web'){
  const url=URL.createObjectURL(new Blob([content],{type:'text/calendar;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='Sage-challenge-start.ics';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
 }
 const uri=FileSystem.cacheDirectory+'Sage-challenge-start.ics';await FileSystem.writeAsStringAsync(uri,content);await Share.share({url:uri});
}
