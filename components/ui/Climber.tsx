import { useEffect, useRef } from 'react';
import { Animated, View, Text } from 'react-native';
import { adventureColors as c } from '../../lib/theme';
import { AthleteIllustration } from './AdventureArt';
import { AthleteAvatar } from '../../lib/avatar';

export function Climber({ name, current = false, seated = false, avatar }: { name?: string; current?: boolean; seated?: boolean; avatar?: AthleteAvatar | null }) {
  return <AthleteIllustration current={current} seated={seated} avatar={avatar} size={current ? 74 : 62}/>;
}

export function ClimberMarker({ name, current, rank, score, gap, top, left, avatar }: { avatar?: AthleteAvatar | null; name?: string; current: boolean; rank: number; score: number; gap: number; top: number; left: number }) {
  const y = useRef(new Animated.Value(top)).current;
  useEffect(() => { Animated.timing(y,{toValue:top,duration:950,useNativeDriver:false}).start(); },[top,y]);
  return <Animated.View style={{position:'absolute',top:y,left:`${left}%`,flexDirection:'column',alignItems:'center',zIndex:current ? 12 : 8}}>
    {current&&<View style={{backgroundColor:c.orange,paddingHorizontal:8,paddingVertical:3,borderRadius:6,marginBottom:3}}><Text style={{color:c.onAccent,fontSize:8,fontWeight:'800',letterSpacing:1}}>YOU ARE HERE</Text></View>}<Climber name={name} current={current} avatar={avatar}/>
    <View style={{marginTop:2,backgroundColor:current ? c.text : c.surface,paddingVertical:7,paddingHorizontal:10,borderRadius:18,maxWidth:180}}><Text numberOfLines={1} style={{color:current ? c.onAccent : c.text,fontWeight:'800',fontSize:11}}>{current ? 'YOU' : name?.split(' ')[0] || 'Athlete'} · {score} pts</Text><Text style={{color:current ? c.onAccent : c.muted,fontSize:10,marginTop:3}}>#{rank} · {current ? 'Your position' : `${gap > 0 ? '+' : ''}${gap} pts`}</Text></View>
  </Animated.View>;
}
