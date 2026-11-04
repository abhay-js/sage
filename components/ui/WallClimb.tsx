import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import {useFonts} from 'expo-font';
import {StatusBar} from 'expo-status-bar';
import {homeFinalFonts as f,homeFinalFontAssets} from '../../lib/homeFinalTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AroundMe, BoardAthlete, ProductChallenge } from '../../types/product';
import { AthleteAvatar } from '../../lib/avatar';
import { challengeTiming, relativePoints } from '../../lib/challengeExperience';
import { WALL_BASE, WALL_HEIGHT, WALL_WIDTH, WallTime, localWallTime, wallEdge, wallPlacements, wallCrowds, wallWarpY } from '../../lib/wallScene';
import { wallPalette as p } from '../../lib/wallPalette';
import { Button, Sheet, s } from './AdventureUI';
import { WallAvatar, WallRunner, WallRock, WallSky, WallTrophy } from './WallArt';
import {DawnAvatar, useDawnMotion} from './DawnArt';

function Climber({ athlete, mine, watched=false, x, y, scale, onPress, onDrag }: { athlete: BoardAthlete; mine: boolean; watched?:boolean; x: number; y: number; scale: number; onPress: () => void; onDrag: (y: number | null, done?: boolean) => void }) {
  const handlers = useRef({ onDrag, y, scale }); handlers.current = { onDrag, y, scale };
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => mine && Math.abs(gesture.dy) > 8,
    onPanResponderGrant: () => handlers.current.onDrag(handlers.current.y),
    onPanResponderMove: (_, gesture) => handlers.current.onDrag(Math.max(330, Math.min(handlers.current.y, handlers.current.y + gesture.dy / handlers.current.scale))),
    onPanResponderRelease: (_, gesture) => handlers.current.onDrag(Math.max(330, Math.min(handlers.current.y, handlers.current.y + gesture.dy / handlers.current.scale)), true),
    onPanResponderTerminate: () => handlers.current.onDrag(null),
  }), [mine]);
  return <View {...(mine ? pan.panHandlers : {})} style={{ position: 'absolute', left: (x - 46) * scale, top: (y - 40) * scale, zIndex: mine ? 5 : 2 }}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${mine ? 'You, ' : ''}${athlete.user.name}, rank ${athlete.rank}, ${athlete.sage_score} points${watched?', watching':''}${mine ? '. Drag upward to plan your climb.' : ''}`} onPress={onPress} style={{ padding: 6 }}>
      <WallAvatar avatar={athlete.user.avatar} size={(mine ? 58 : 49) * scale} delay={(athlete.rank % 5) * .2} />
    </TouchableOpacity>
    {watched&&!mine&&<View pointerEvents="none" style={{position:'absolute',top:-10,left:2,paddingHorizontal:7,paddingVertical:3,borderRadius:10,backgroundColor:p.ink}}><Text style={{color:p.gold,fontSize:9,fontFamily:f.bold}}>Watching ◉</Text></View>}
    {mine && <View pointerEvents="none" style={[styles.you, { left: 55 * scale, top: 4 * scale }]}><Text style={styles.youText}>You</Text></View>}
  </View>;
}

function FinishRunner({athlete,scale,onPress,watched}:{athlete:BoardAthlete;scale:number;onPress:()=>void;watched:boolean}) {
  const position=[[290,346],[262,362],[218,397]][athlete.rank-1];
  if(!position)return null;
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${athlete.user.name}, rank ${athlete.rank}, ${athlete.sage_score} points`} onPress={onPress} style={{position:'absolute',left:(position[0]-24)*scale,top:(position[1]-84)*scale,width:48*scale,height:84*scale,alignItems:'center',justifyContent:'flex-end'}}><View style={{position:'absolute',left:7*scale,bottom:1.28*scale}}><WallRunner avatar={athlete.user.avatar} size={34*scale} delay={(athlete.rank-1)*.4}/></View><View style={[styles.medal,{backgroundColor:[p.gold,p.silver,p.bronze][athlete.rank-1],top:0}]}><Text style={styles.medalText}>{athlete.rank}</Text></View>{watched&&<View pointerEvents="none" style={{position:'absolute',top:-18,left:0,paddingHorizontal:6,paddingVertical:3,borderRadius:10,backgroundColor:p.ink}}><Text style={{fontSize:9,fontFamily:f.bold,color:p.gold}}>Watching ◉</Text></View>}</TouchableOpacity>;
}
function FinishLine({scale,ends,partner}:{scale:number;ends:string;partner?:string}) {
  return <View pointerEvents="none" accessibilityRole="image" accessibilityLabel={`Finish line. Ends ${ends}${partner?`. Partner: ${partner}`:''}`} style={{position:'absolute',left:0,top:0,width:390*scale,height:430*scale}}>
    <View style={{position:'absolute',left:304*scale,top:220*scale,width:4*scale,height:106*scale,backgroundColor:p.white,borderRadius:2}}/>
    <View style={{position:'absolute',left:308*scale,top:250*scale,width:10*scale,height:74*scale,borderWidth:1,borderColor:p.ink,backgroundColor:p.white,overflow:'hidden'}}><Svg width="100%" height="100%" viewBox="0 0 10 74" preserveAspectRatio="none">{Array.from({length:11},(_,i)=><ReactFragment key={i} row={i}/>)}</Svg></View>
    <View style={{position:'absolute',left:308*scale,top:222*scale,paddingHorizontal:9*scale,height:22*scale,justifyContent:'center',backgroundColor:p.white,borderWidth:2,borderColor:p.ink,borderTopRightRadius:7,borderBottomRightRadius:7}}><Text style={{fontSize:11*scale,fontFamily:f.bold,letterSpacing:1,color:p.ink}}>FINISH</Text></View>
    <View style={{position:'absolute',left:170*scale,top:222*scale,backgroundColor:p.white,borderWidth:1.5,borderColor:p.ink,borderRadius:9,paddingHorizontal:7*scale,paddingVertical:2*scale}}><Text numberOfLines={1} style={{fontSize:11*scale,fontFamily:f.medium,color:p.ink}}>Ends {ends}</Text></View>
    {!!partner&&<View style={{position:'absolute',left:312*scale,top:336*scale,width:76*scale,height:88*scale}}><View style={{position:'absolute',left:12*scale,top:40*scale,width:4*scale,height:48*scale,backgroundColor:p.art.c12}}/><View style={{position:'absolute',right:12*scale,top:40*scale,width:4*scale,height:46*scale,backgroundColor:p.art.c12}}/><View style={{height:46*scale,backgroundColor:p.white,borderWidth:2,borderColor:p.ink,borderRadius:7,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:8*scale,fontFamily:f.bold,color:p.muted}}>PARTNER</Text><Text numberOfLines={1} adjustsFontSizeToFit style={{fontSize:17*scale,fontFamily:f.bold,letterSpacing:1,color:p.ink}}>{partner}</Text></View></View>}
  </View>;
}
function ReactFragment({row}:{row:number}) {return <><Rect x={row%2?5:0} y={row*7} width={5} height={7} fill={p.ink}/></>;}

interface Props {
  challenge: ProductChallenge; around?: AroundMe | null; rows: BoardAthlete[]; nearby: BoardAthlete[]; total: number;
  watchedIds?:string[]; userId?: string; avatar?: AthleteAvatar | null; camera: 'me' | 'summit' | 'range'; passed?: number; previousRank?: string;
  onCamera: (camera: 'me' | 'summit' | 'range') => void; onPickChallenge: () => void; onRankings: () => void;
  onAthlete: (athlete: BoardAthlete) => void; onProfile: () => void; onDetails: (tab?: string) => void; onRecord: () => void;
  onHigher: () => void; onLower: () => void; demo?: boolean; crowd?: BoardAthlete[]; onCrowd?: (rank: number) => void;
}
export function WallClimb({ watchedIds=[], challenge, around, rows, nearby, total, userId, avatar, camera, passed = 0, previousRank, onCamera, onPickChallenge, onRankings, onAthlete, onProfile, onDetails, onRecord, onHigher, onLower, demo = false, crowd, onCrowd }: Props) {
  const identity=(athlete:BoardAthlete)=>athlete.user_id===userId&&avatar?{...athlete,user:{...athlete.user,avatar}}:athlete;
  rows=rows.map(identity);nearby=nearby.map(identity);
  if(around)around={...around,current:around.current?identity(around.current):around.current};
  const insets = useSafeAreaInsets();
  useFonts(homeFinalFontAssets);
  const [size, setSize] = useState({ width: 390, height: 700 }), [scene, setScene] = useState<'auto' | WallTime>('auto'), [localTime, setLocalTime] = useState(localWallTime);
  const [scrollY, setScrollY] = useState(0), [dragY, setDragY] = useState<number | null>(null), [plan, setPlan] = useState<number | null>(null);
  const map = useRef<ScrollView>(null), scrollMotion = useRef(new Animated.Value(0)).current;
  useEffect(() => { const timer = setInterval(() => setLocalTime(localWallTime()), 60000); return () => clearInterval(timer); }, []);
  const partner=challenge.config.partners?.find(item=>item.role==='Presenting')?.name??'DRFT';
  const endLabel=`${new Date(challenge.challenge_end).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} · ${new Date(challenge.challenge_end).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'})}`;
  const time = scene === 'auto' ? localTime : scene, theme = p[time], dark = !theme.light, foreground = dark ? p.white : p.ink;
  const scale = size.width / WALL_WIDTH, me = around?.current, summit = around?.summit ?? [], timing = challengeTiming(challenge);
  const trail = rows.filter(athlete => athlete.rank > 3);
  const ceiling = Math.max(1, summit.find(athlete => athlete.rank === 3)?.sage_score ?? summit[0]?.sage_score ?? 0, ...trail.map(athlete => athlete.sage_score));
  const placements = wallPlacements(trail, ceiling), mine = placements.find(row => row.athlete.user_id === userId);
  const myY = me && me.rank <= 3 ? [346, 362, 397][me.rank - 1] : mine?.y;
  const groups = wallCrowds(crowd ?? [], new Set(rows.map(athlete => athlete.id)), ceiling).map(group=>{const y=wallWarpY(group.y,placements,ceiling);return {...group,y,x:wallEdge(y)+(placements.some(row=>Math.abs(row.y-y)<65)?70:0)};});
  const rowKey = placements.map(row => `${row.athlete.id}:${row.athlete.sage_score}`).join(',');
  function scrollTo(y: number, animated = true) { map.current?.scrollTo({ y: Math.max(0, y * scale - size.height * .56), animated }); }
  useEffect(() => {
    const target = camera === 'summit' ? 0 : camera === 'me' && myY !== undefined ? myY : placements[0]?.y ?? 0;
    const timer = setTimeout(() => scrollTo(target, false), 80); return () => clearTimeout(timer);
  }, [challenge.id, camera, rowKey, size.height, size.width]);
  const offscreen = myY !== undefined && (myY * scale < scrollY + 160 || myY * scale > scrollY + size.height - 150);
  const highest = Math.max(0, ...(crowd ?? rows).map(athlete => athlete.sage_score));
  function targetGain(y: number) { const target = y < 470 ? highest + 1 : (me?.sage_score ?? 0) + Math.max(0, (myY ?? y) - y) * ceiling / (WALL_BASE - 640); return Math.max(1, Math.ceil(target - (me?.sage_score ?? 0))); }
  function drag(y: number | null, done = false) { setDragY(done ? null : y); if (done && y !== null) setPlan(targetGain(y)); }
  const skyOffset = scrollMotion.interpolate({ inputRange: [0, WALL_HEIGHT * scale], outputRange: [0, -156 * scale], extrapolate: 'clamp' });
  const cycleScene = () => { const modes: typeof scene[] = ['auto', 'morning', 'afternoon', 'evening', 'night']; setScene(modes[(modes.indexOf(scene) + 1) % modes.length]); };
  return <View style={{ flex: 1, overflow: 'hidden', backgroundColor: theme.s0 }} onLayout={event => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
    <StatusBar style={dark?'light':'dark'}/><Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, transform: [{ translateY: skyOffset }] }}><WallSky time={time} width={size.width} height={Math.max(1000 * scale, size.height + 156 * scale)} /></Animated.View>
    <ScrollView ref={map} scrollEnabled={dragY === null} showsVerticalScrollIndicator={false} scrollEventThrottle={32} onScroll={event => { const y = event.nativeEvent.contentOffset.y; setScrollY(y); scrollMotion.setValue(y); }} contentContainerStyle={{ height: WALL_HEIGHT * scale }}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}><WallRock time={time} width={size.width} height={WALL_HEIGHT * scale} /></View>
      <View pointerEvents="none" style={{ position: 'absolute', left: 288 * scale, top: 168 * scale }}><WallTrophy size={44 * scale} /></View>
      <FinishLine scale={scale} ends={endLabel} partner={partner}/>
      {summit.filter(athlete=>athlete.rank>=1&&athlete.rank<=3).map(athlete=><FinishRunner key={athlete.id} athlete={athlete} scale={scale} watched={watchedIds.includes(athlete.user_id)} onPress={()=>onAthlete(athlete)}/>)}
      {groups.map(group => <TouchableOpacity key={group.band} accessibilityRole="button" accessibilityLabel={`${group.members.length} demo athletes, ranks ${group.firstRank} to ${group.lastRank}`} onPress={()=>onCrowd?.(group.firstRank)} style={{position:'absolute',left:(group.x-65)*scale,top:(group.y-35)*scale,width:108*scale,height:76*scale,zIndex:1}}>
        {group.members.slice(0,3).map((athlete,index)=><View key={athlete.id} pointerEvents="none" style={{position:'absolute',left:(index*17)*scale,top:(index%2?15:0)*scale}}><WallAvatar avatar={athlete.user.avatar} size={35*scale} animated={false}/></View>)}
        <View style={[styles.you,{left:65*scale,top:0}]}><Text style={styles.youText}>+{group.members.length}</Text></View>
      </TouchableOpacity>)}
      {placements.map(({ athlete, x, y }) => <Climber key={athlete.id} athlete={athlete} mine={athlete.user_id === userId} watched={watchedIds.includes(athlete.user_id)} x={x} y={y} scale={scale} onPress={() => onAthlete(athlete)} onDrag={drag} />)}
      {placements.map(({ athlete, y }, index) => (athlete.user_id === userId || index % 2 === 0) && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`View ${athlete.user.name}, ${athlete.sage_score} points`} key={athlete.id} onPress={() => onAthlete(athlete)} style={[styles.bubble, { left: 38 * scale, top: (y - 36) * scale, width: 150 * scale, backgroundColor: athlete.user_id === userId ? p.gold : p.white }]}><View style={styles.bust}><WallAvatar avatar={athlete.user.avatar} pose="bust" size={30} animated={false} /></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.bubbleTitle}>{athlete.user_id === userId ? 'You' : athlete.user.name.split(' ')[0]} · {athlete.sage_score} pts</Text><Text numberOfLines={1} style={styles.bubbleCaption}>#{athlete.rank} · {athlete.user_id === userId ? `${athlete.sessions} approved sessions` : relativePoints(athlete.sage_score, me?.sage_score)}</Text></View></TouchableOpacity>)}
      {rows.some(athlete => athlete.sage_score > 0) && [.25, .5, .75].map(fraction => { const y = wallWarpY(640 + (1 - fraction) * 2400, placements, ceiling); return <View key={fraction} pointerEvents="none" style={{ position: 'absolute', left: 40 * scale, top: (y + 30) * scale, flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={{ fontSize: 10, fontFamily:f.bold, color: foreground, opacity: .65 }}>{Number((ceiling * fraction).toFixed(1))} pts</Text><View style={{ width: Math.max(10, (wallEdge(y) - 120) * scale), borderTopWidth: 1, borderStyle: 'dotted', borderColor: foreground, opacity: .45 }} /></View>; })}
      {dragY !== null && <View pointerEvents="none" style={{ position: 'absolute', left: (wallEdge(dragY) - 40) * scale, top: (dragY - 40) * scale, opacity: .7 }}><WallAvatar avatar={me?.user.avatar} size={55 * scale} animated={false} /><View style={[styles.you, { top: -18, right: 25 }]}><Text style={styles.youText}>+{targetGain(dragY)} pts</Text></View></View>}
      {!rows.length && <View style={[styles.empty, { top: 530 * scale }]}><Text style={styles.bubbleTitle}>The wall is waiting for its first athlete.</Text><Text style={styles.bubbleCaption}>Join this challenge and start your climb.</Text></View>}
      {!!trail.length && trail[0].rank > 4 && <TouchableOpacity accessibilityRole="button" onPress={onHigher} style={[styles.camp, { top: Math.max(470, placements[0].y - 130) * scale }]}><Text style={styles.bubbleTitle}>Higher ranks ↑</Text><Text style={styles.bubbleCaption}>Explore above #{trail[0].rank}</Text></TouchableOpacity>}
      {!!nearby.length && nearby[nearby.length - 1].rank < total && <TouchableOpacity accessibilityRole="button" onPress={onLower} style={[styles.camp, { top: Math.min(WALL_BASE + 15, (placements[placements.length - 1]?.y ?? 420) + 110) * scale }]}><Text style={styles.bubbleTitle}>More climbers ↓</Text><Text style={styles.bubbleCaption}>Explore the ranks below</Text></TouchableOpacity>}
      <Text style={{ position: 'absolute', top: (WALL_BASE + 110) * scale, width: '100%', textAlign: 'center', color: p.white, fontSize: 13, fontFamily:f.bold }}>Base camp · 0 pts</Text>
    </ScrollView>
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 210*scale }}><Svg width="100%" height="100%"><Defs><LinearGradient id="wallHeaderFade" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={dark ? p.night.s0 : p.white} stopOpacity={.96} /><Stop offset=".7" stopColor={dark ? p.night.s0 : p.white} stopOpacity={.8} /><Stop offset="1" stopColor={dark ? p.night.s0 : p.white} stopOpacity={0} /></LinearGradient></Defs><Rect width="100%" height="100%" fill="url(#wallHeaderFade)" /></Svg></View>
    <View style={[styles.header, { top: Math.max(52*scale,insets.top+8) }]} pointerEvents="box-none">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Choose mountain challenge" onPress={onPickChallenge} style={{ flex: 1 }}><Text numberOfLines={1} style={{ fontSize: 11, fontFamily:f.body, color: foreground, opacity: .8 }}>{challenge.name} ⌄ · {demo ? 'Fictional scores' : timing.label}</Text>{!!partner&&<Text style={{fontSize:11,fontFamily:f.bold,color:foreground,marginTop:4}}><Text style={{fontSize:8,letterSpacing:.6}}>PARTNER  </Text> Presented by {partner}</Text>}<Text style={{ color: foreground, fontSize: 26, fontFamily:f.bold, letterSpacing: -.8, marginTop: 3 }}>The wall</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Scene: ${theme.label}${scene === 'auto' ? ', automatic' : ''}. Change time of day`} onPress={cycleScene} style={[styles.timeChip, { borderColor: foreground + '44', backgroundColor: dark ? p.white + '22' : p.white }]}><Text style={{ color: foreground, fontSize: 10, fontFamily:f.medium }}>{theme.label}{scene === 'auto' ? ' · auto' : ''}</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="My athlete" onPress={onProfile} style={styles.profile}><WallAvatar avatar={avatar ?? me?.user.avatar} pose="bust" size={36} animated={false} /></TouchableOpacity></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Open all rankings" onPress={onRankings} style={[styles.rankPill, { backgroundColor: me ? p.gold : p.white }]}><Text style={{ color: p.ink, fontSize: 14, fontFamily:f.bold }}>{me ? `#${me.rank}` : 'Explore'}</Text></TouchableOpacity><Text style={{ color: foreground, fontSize: 14, fontFamily:f.bold }}>{me ? `of ${total} · ${me.sage_score} pts` : `${total} ${total === 1 ? 'athlete' : 'athletes'}`}</Text>{passed > 0 && <Text style={{ color: foreground, fontSize: 11 }}>· Passed {passed}{previousRank ? ` from #${previousRank}` : ''}</Text>}</View>
    </View>
    <View pointerEvents="none" style={{ position: 'absolute', left: 4, top: 211*scale, bottom: 73*scale, width: 22 }}><View style={{ position: 'absolute', left: 5, top: 0, bottom: 0, width: 2, backgroundColor: foreground + '44' }} />{rows.map(athlete => <View key={athlete.id} style={{ position: 'absolute', top: `${Math.max(0, 1 - athlete.sage_score / Math.max(1, highest)) * 95}%`, left: 3, width: athlete.user_id === userId ? 10 : 7, height: athlete.user_id === userId ? 10 : 4, borderRadius: 5, backgroundColor: athlete.user_id === userId ? p.orange : foreground + '99' }} />)}<View style={{ position: 'absolute', top: `${scrollY / (WALL_HEIGHT * scale) * 100}%`, height: `${Math.min(100, size.height / (WALL_HEIGHT * scale) * 100)}%`, left: 0, width: 18, borderRadius: 5, borderWidth: 1, borderColor: foreground + '88' }} /></View>
    <View pointerEvents="box-none" style={styles.bottom}>
      <TouchableOpacity accessibilityRole="button" onPress={()=>{if(camera==='summit'&&me){onCamera('me');if(myY!==undefined)scrollTo(myY);}else{onCamera('summit');scrollTo(0);}}} style={[styles.tool,{backgroundColor:p.white,borderRadius:22,paddingHorizontal:16,shadowColor:p.ink,shadowOpacity:.15,shadowRadius:10}]}><Text style={styles.toolText}>{camera==='summit'&&me?`Back to you · #${me.rank}`:'Finish line ↑'}</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={()=>me?setPlan(Math.max(1,around?.nextGap??1)):onDetails()} style={[styles.tool,{backgroundColor:p.gold,borderRadius:18,borderWidth:1.5,borderColor:p.ink,paddingHorizontal:12}]}><Text style={styles.toolText}>{me?'↑ Plan your climb':'Join this climb'}</Text></TouchableOpacity>
    </View>
    {plan !== null && <Sheet title={`Your next climb · +${plan} pts`} onClose={() => setPlan(null)}><Text style={[s.muted, { marginBottom: 16 }]}>{demo ? 'Demo target — fictional scores. ' : ''}Target: {(me?.sage_score ?? 0) + plan} challenge points. Plan a workout using this challenge’s scoring rules. Your position moves when eligible workouts are approved.</Text><Button title={demo ? "Leave demo · view real challenges" : "See points & workout calculator"} onPress={() => { setPlan(null); onDetails('My estimate'); }} /><View style={{ marginTop: 10 }}><Button secondary title={demo ? "Leave demo · record a real workout" : "Record your next workout"} onPress={() => { setPlan(null); onRecord(); }} /></View></Sheet>}
  </View>;
}
const styles = StyleSheet.create({
  header: { position: 'absolute', left: 20, right: 20, top: 22 }, timeChip: { minHeight: 36, paddingHorizontal: 11, borderWidth: 1, borderRadius: 20, justifyContent: 'center' },
  profile: { width: 40, height: 40, borderRadius: 22, overflow: 'hidden', backgroundColor: p.cardPeach, borderWidth: 2, borderColor: p.white, alignItems: 'center' },
  rankPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 }, medal: { position: 'absolute', width: 24, height: 24, borderRadius: 13, borderWidth: 2, borderColor: p.ink, alignItems: 'center', justifyContent: 'center' }, medalText: { color: p.ink, fontSize: 12, fontFamily:f.bold },
  bubble: { position: 'absolute', minHeight: 48, paddingHorizontal: 6, paddingVertical: 5, borderWidth: 2, borderColor: p.ink, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 7, zIndex: 3, shadowColor: p.ink, shadowOpacity: .18, shadowOffset: { width: 0, height: 4 }, shadowRadius: 0, elevation: 3 }, bust: { width: 30, height: 30, borderRadius: 16, backgroundColor: p.cardSky, overflow: 'hidden' },
  bubbleTitle: { color: p.ink, fontSize: 12, fontFamily:f.bold }, bubbleCaption: { color: p.muted, fontSize: 10, marginTop: 3 }, you: { position: 'absolute', borderWidth: 2, borderColor: p.ink, borderRadius: 9, backgroundColor: p.white, paddingHorizontal: 7, paddingVertical: 2 }, youText: { color: p.ink, fontSize: 10, fontFamily:f.bold },
  bottom: { position: 'absolute', left: 16, right: 16, bottom: 104,flexDirection:'row',justifyContent:'space-between',alignItems:'center' }, tools: { flexDirection: 'row', alignSelf: 'center', backgroundColor: p.white, borderRadius: 24, elevation: 4, shadowColor: p.ink, shadowOpacity: .15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }, tool: { paddingHorizontal: 13, minHeight: 42, justifyContent: 'center' }, toolText: { color: p.ink, fontSize: 10, fontFamily:f.bold }, bottomCard: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: p.white, borderRadius: 22, padding: 14, elevation: 6, shadowColor: p.ink, shadowOpacity: .2, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }, record: { backgroundColor: p.orange, paddingHorizontal: 16, minHeight: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  camp: { position: 'absolute', left: 38, backgroundColor: p.white, borderWidth: 2, borderColor: p.ink, padding: 10, borderRadius: 13, zIndex: 5 }, empty: { position: 'absolute', left: 38, width: 170, padding: 14, borderRadius: 18, backgroundColor: p.white },
});
