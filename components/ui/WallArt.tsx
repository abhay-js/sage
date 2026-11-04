import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { AthleteAvatar } from '../../lib/avatar';
import { wallPalette as p } from '../../lib/wallPalette';
import { wallPaths, wallTrophyTemplate } from '../../lib/wallArtwork';
import {avatarBuilderSvg} from '../../lib/avatarBuilderSvg';
import {avatarAppearance} from '../../lib/avatarBuilder';
import {useDawnMotion} from './DawnArt';
import {wallFinalSky} from '../../lib/wallFinalArtwork';
import { WallTime, fillWallTemplate } from '../../lib/wallScene';

export const WallSky = memo(function WallSky({ time, width, height }: { time: WallTime; width: number; height: number }) {
  const xml = useMemo(() => fillWallTemplate(wallFinalSky, { th: p[time], forestD: wallPaths.forest, forest2D: wallPaths.forest2 }), [time]);
  return <SvgXml xml={xml} width={width} height={height} preserveAspectRatio="xMidYMid slice" />;
});
const rockImages={morning:require('../../assets/wall-final/day.png'),afternoon:require('../../assets/wall-final/day.png'),evening:require('../../assets/wall-final/evening.png'),night:require('../../assets/wall-final/night.png')};
export const WallRock = memo(function WallRock({time,width,height}:{time:WallTime;width:number;height:number}){
 return <Image source={rockImages[time]} style={{width,height}} resizeMode="stretch"/>;
});
export function WallTrophy({ size = 44 }: { size?: number }) {
  return <SvgXml xml={fillWallTemplate(wallTrophyTemplate, {})} width={size} height={size * 48 / 44} />;
}
export const WallAvatar=memo(function WallAvatar({avatar,pose='climb',size=52,delay=0,animated=true}:{avatar?:Partial<AthleteAvatar>|null;pose?:'climb'|'stand'|'wave'|'bust';size?:number;delay?:number;animated?:boolean}){
 const moving=useDawnMotion(),bob=useRef(new Animated.Value(0)).current;
 useEffect(()=>{if(!moving||!animated||pose==='bust')return;const a=Animated.loop(Animated.sequence([Animated.delay(delay*1000),Animated.timing(bob,{toValue:-2,duration:1000,useNativeDriver:true}),Animated.timing(bob,{toValue:0,duration:1000,useNativeDriver:true})]));a.start();return()=>a.stop();},[animated,moving,pose,delay]);
 const xml=useMemo(()=>avatarBuilderSvg(avatarAppearance(avatar),{crop:pose==='bust'?'head':'full',pose:pose==='climb'?'step':pose==='wave'?'wave':'stand',size}),[avatar,pose,size]);
 return <Animated.View pointerEvents="none" style={{width:size,height:size*1.2,transform:[{translateY:bob}]}}><SvgXml xml={xml} width={pose==='bust'?size:size*.78} height={pose==='bust'?size*1.2:size*1.56} style={pose==='bust'?undefined:{position:'absolute',left:size*.11,bottom:-size*.0624}}/></Animated.View>;
});
export const WallRunner=memo(function WallRunner({avatar,size=34,delay=0,playing=true}:{avatar?:Partial<AthleteAvatar>|null;size?:number;delay?:number;playing?:boolean}){
 const moving=useDawnMotion(),[frame,setFrame]=useState(0);
 useEffect(()=>{if(!moving||!playing)return;const timer=setInterval(()=>setFrame(Math.floor((Date.now()/1000+delay)/.32)%2),80);return()=>clearInterval(timer);},[moving,playing,delay]);
 const xml=useMemo(()=>avatarBuilderSvg(avatarAppearance(avatar),{pose:'step',size}),[avatar,size]);
 return <View style={{transform:[{translateY:frame===0?0:-2},{rotate:frame===0?'0deg':'-3deg'}]}}><SvgXml xml={xml} width={size} height={size*2}/></View>;
});
