import { useEffect,useMemo,useRef } from 'react';
import { Animated,Easing,Image,Text,TouchableOpacity,View } from 'react-native';
import Svg,{Path,Defs,LinearGradient,Rect,Stop,SvgXml} from 'react-native-svg';
import type { AthleteAvatar } from '../../lib/avatar';
import type { BoardAthlete } from '../../types/product';
import { lifecycleArtwork } from '../../lib/challengeLifecycleArtwork';
import { lifecycleColors as c } from '../../lib/challengeLifecyclePalette';
import { dawnSvg } from '../../lib/dawnSvg';
import {AthleteMoodAvatar} from './AthleteMood';
import {homeFinalColors as hc} from '../../lib/homeFinalTheme';
import { DawnAvatar,DawnMotion,useDawnMotion } from './DawnArt';
export type CampTime=keyof typeof c.themes;
export function LifecycleVector({name,width,height,time='morning'}:{name:string;width:number;height:number;time?:CampTime}) {
 const xml=useMemo(()=>dawnSvg(lifecycleArtwork[name],{art:c.art,th:c.themes[time]}),[name,time]);return <SvgXml xml={xml} width={width} height={height}/>;
}
function Confetti({index,width,height}:{index:number;width:number;height:number}) {
 const enabled=useDawnMotion(),v=useRef(new Animated.Value(0)).current;
 useEffect(()=>{if(!enabled)return;const loop=Animated.loop(Animated.sequence([Animated.delay(index*97),Animated.timing(v,{toValue:1,duration:3400+index%4*500,easing:Easing.linear,useNativeDriver:true}),Animated.timing(v,{toValue:0,duration:0,useNativeDriver:true})]));loop.start();return()=>loop.stop();},[enabled,height]);
 return <Animated.View pointerEvents="none" style={{position:'absolute',left:index*41%Math.max(1,width-10),top:enabled?0:25+index*29%height,width:index%2?7:5,height:index%2?11:5,borderRadius:2,backgroundColor:[c.gold,c.orange,c.mint,c.surface,c.bar][index%5],opacity:.8,transform:[{translateY:v.interpolate({inputRange:[0,1],outputRange:[-15,height+20]})},{translateX:v.interpolate({inputRange:[0,1],outputRange:[0,index%5*12-24]})},{rotate:v.interpolate({inputRange:[0,1],outputRange:['0deg',`${index*67+180}deg`]})}]}}/>;
}
const campImages={morning:require('../../assets/base-camp/morning.jpg'),afternoon:require('../../assets/base-camp/afternoon.jpg'),evening:require('../../assets/base-camp/evening.jpg'),night:require('../../assets/base-camp/night.jpg')};
const campSpots=[[296,490,92],[42,486,90],[98,494,84],[352,488,86],[86,436,60],[312,434,58]];
const crowdSpots=[[24,458,78],[88,404,70],[322,404,70],[366,452,78]];
function CampFlame(){const motion=useDawnMotion(),v=useRef(new Animated.Value(0)).current;useEffect(()=>{if(!motion)return;const loop=Animated.loop(Animated.sequence([Animated.timing(v,{toValue:1,duration:280,useNativeDriver:true}),Animated.timing(v,{toValue:0,duration:270,useNativeDriver:true})]));loop.start();return()=>loop.stop();},[motion]);return <Animated.View style={{position:'absolute',left:140,top:464,width:24,height:32,transform:[{scaleY:v.interpolate({inputRange:[0,1],outputRange:[.9,1.1]})}]}}><Svg width={24} height={32} viewBox="-12 -32 24 32"><Path d="M0 -32C6 -22 11 -18 10 -10C8 -3 -8 -3 -10 -10C-11 -18 -5 -22 0 -32Z" fill={hc.orange}/><Path d="M0 -24C4 -18 6 -14 6 -9C4 -5 -4 -5 -6 -9C-6 -14 -3 -18 0 -24Z" fill={hc.gold}/></Svg></Animated.View>;}
export function ChallengeLifecycleArt({phase,width,time='morning',athletes,podium=[],userId,avatar,joined=false,watched=[],onAthlete,onProfile}:{phase:'basecamp'|'finale';width:number;time?:CampTime;athletes:BoardAthlete[];podium?:BoardAthlete[];userId?:string;avatar?:AthleteAvatar|null;joined?:boolean;watched?:string[];onAthlete:(athlete:BoardAthlete)=>void;onProfile?:()=>void}) {
 const scale=width/390,height=(phase==='basecamp'?560:540),others=athletes.filter(a=>phase==='basecamp'?a.user_id!==userId:!podium.some(p=>p.user_id===a.user_id));
 return <View style={{width,height:height*scale,overflow:'hidden'}}><View style={{width:390,height,transform:[{scale}],transformOrigin:'top left'}}><Image source={phase==='basecamp'?campImages[time]:require('../../assets/base-camp/finale.jpg')} style={{position:'absolute',width:390,height}}/>
 {others.slice(0,phase==='basecamp'?6:4).map((athlete,index)=>{const [x,y,size]=(phase==='basecamp'?campSpots:crowdSpots)[index];return <TouchableOpacity key={athlete.id} accessibilityRole="button" accessibilityLabel={`Open ${athlete.user.name}`} onPress={()=>onAthlete(athlete)} style={{position:'absolute',left:x-size*340/920,top:y-size*.965}}><AthleteMoodAvatar avatar={athlete.user_id===userId?avatar:athlete.user.avatar} mood={phase==='finale'?'proud':index===0?'fresh':'restless'} size={size}/>{watched.includes(athlete.user_id)&&<Text style={{position:'absolute',top:0,left:0,fontSize:9,color:hc.white,backgroundColor:hc.ink,borderRadius:8,padding:4}}>{athlete.user.name.split(' ')[0]} ◉</Text>}</TouchableOpacity>;})}
 {phase==='basecamp'&&<><CampFlame/>{joined&&<TouchableOpacity accessibilityRole="button" accessibilityLabel="My athlete profile" onPress={onProfile} style={{position:'absolute',left:168,top:372}}><AthleteMoodAvatar avatar={avatar} mood="restless" size={128}/><Text style={{position:'absolute',left:0,top:62,fontSize:10,fontWeight:'800',color:hc.ink,backgroundColor:hc.white,borderWidth:1.5,borderColor:hc.ink,borderRadius:10,paddingHorizontal:8,paddingVertical:3}}>YOU</Text></TouchableOpacity>}</>}
 {phase==='finale'&&<>{[...podium].sort((a,b)=>b.rank-a.rank).map(athlete=>{const [x,y,size]=athlete.rank===1?[139.5,125,150]:athlete.rank===2?[96.7,170,120]:[206.9,184,114];return <TouchableOpacity key={athlete.id} accessibilityRole="button" accessibilityLabel={`${athlete.user.name}, rank ${athlete.rank}`} onPress={()=>onAthlete(athlete)} style={{position:'absolute',left:x,top:y}}><AthleteMoodAvatar avatar={athlete.user_id===userId?avatar:athlete.user.avatar} mood="proud" size={size}/></TouchableOpacity>;})}{podium.some(a=>a.rank===1)&&<View pointerEvents="none" style={{position:'absolute',left:194,top:132}}><LifecycleVector name="trophy" width={34} height={38}/></View>}<View pointerEvents="none" style={{position:'absolute',left:0,top:0,width:390,height:460,overflow:'hidden'}}>{Array.from({length:18},(_,index)=><Confetti key={index} index={index} width={390} height={460}/>)}</View></>}
 </View></View>;
}
