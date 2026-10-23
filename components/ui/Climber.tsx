import { useEffect, useRef } from 'react';
import { Animated, View, Text } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { sageColors as c } from '../../lib/theme';
import art from '../../lib/mountainPalette';

export function Climber({ name, current = false }: { name?: string; current?: boolean }) {
  return <Svg width={54} height={76} viewBox="0 0 54 76">
    <Path d="M19 29 5 16M37 29 49 43" stroke={art.art15} strokeWidth={7} strokeLinecap="round" />
    <Path d="M23 47 13 68M34 47 46 65" stroke={c.green} strokeWidth={8} strokeLinecap="round" />
    <Rect x={15} y={22} width={29} height={28} rx={8} fill={current ? c.orange : c.green} stroke={c.text} strokeWidth={1.5}/>
    <Circle cx={28} cy={12} r={11} fill={current ? c.orange : art.art15} stroke={c.surface} strokeWidth={2}/>
    <Path d="M8 70h9M42 68h9" stroke={c.text} strokeWidth={5} strokeLinecap="round"/>
  </Svg>;
}

export function ClimberMarker({ name, current, rank, score, gap, top, left }: { name?: string; current: boolean; rank: number; score: number; gap: number; top: number; left: number }) {
  const y = useRef(new Animated.Value(top)).current;
  useEffect(() => { Animated.timing(y,{toValue:top,duration:950,useNativeDriver:false}).start(); },[top,y]);
  return <Animated.View style={{position:'absolute',top:y,left:`${left}%`,flexDirection:'row',alignItems:'center',zIndex:current ? 12 : 8}}>
    <View><Climber name={name} current={current}/><Text style={{position:'absolute',top:7,left:22,color:c.onAccent,fontSize:9,fontWeight:'800'}}>{name?.slice(0,1).toUpperCase() || '?'}</Text></View>
    <View style={{marginLeft:-4,backgroundColor:current ? c.orange : c.surface,padding:10,borderRadius:11,maxWidth:145}}><Text numberOfLines={1} style={{color:current ? c.onAccent : c.text,fontWeight:'800',fontSize:11}}>{current ? 'YOU' : name?.split(' ')[0] || 'Athlete'} · {score} pts</Text><Text style={{color:current ? c.onAccent : c.muted,fontSize:10,marginTop:3}}>#{rank} · {current ? 'Your position' : `${gap > 0 ? '+' : ''}${gap} pts`}</Text></View>
  </Animated.View>;
}
