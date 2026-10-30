import { View, Text } from 'react-native';
import Svg,{Circle,Defs,LinearGradient,Stop,Rect,Path} from 'react-native-svg';
import type { AthleteAvatar } from '../../lib/avatar';
import type { HomeScene } from '../../lib/homeDashboard';
import { homeColors as c } from '../../lib/homePalette';
import { DawnAvatar } from './DawnArt';
export function HomeChallengeArt({scene,avatar,rival}:{scene:HomeScene;avatar?:AthleteAvatar|null;rival?:AthleteAvatar|null}) {
  const theme=scene==='run'?c.run:scene==='duel'?c.duel:scene==='upcoming'?c.upcoming:c.mountain;
  return <View pointerEvents="none" style={{height:104,overflow:'hidden',backgroundColor:theme.top}}><Svg width="100%" height={104} viewBox="0 0 300 104" preserveAspectRatio="xMidYMax slice"><Defs><LinearGradient id="home-scene" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={theme.top}/><Stop offset="1" stopColor={theme.bottom}/></LinearGradient></Defs><Rect width={300} height={104} fill="url(#home-scene)"/>
    {scene==='mountain'&&<><Circle cx={252} cy={30} r={14} fill={c.gold}/><Path d="M0 104V70L44 50L90 68L140 42L190 64L230 46L300 70V104Z" fill={c.mountain.ridge}/><Path d="M120 104L210 14L300 104Z" fill={c.mountain.slope}/><Path d="M210 14L226 36L218 34L212 42L204 34L196 39Z" fill={c.surface}/><Path d="M210 14L300 104H262Z" fill={c.mountain.shadow} opacity={.55}/><Path d="M0 104V90L80 80L160 92L240 82L300 94V104Z" fill={c.mountain.base}/><Path d="M210 14V-2" stroke={c.text} strokeWidth={2}/><Path d="M211-2L226 3L211 8Z" fill={c.gold}/></>}
    {scene==='run'&&<><Path d="M0 104V64Q150 40 300 64V104Z" fill={c.run.sand}/><Path d="M0 104V80Q150 58 300 80V104Z" fill={c.run.track}/><Path d="M0 92Q150 72 300 92" stroke={c.surface} strokeWidth={2} strokeDasharray="8 8" fill="none"/><Path d="M248 46V82" stroke={c.text} strokeWidth={2}/><Path d="M249 46H270V60H249Z" fill={c.text}/><Path d="M249 46H256V53H249Z M263 46H270V53H263Z M256 53H263V60H256Z" fill={c.surface}/></>}
    {scene==='upcoming'&&<><Path d="M0 104L60 40L110 80L170 20L230 70L300 30V104Z" fill={c.upcoming.ridge}/><Path d="M150 104L170 76L190 104Z M110 104L126 82L142 104Z" fill={c.gold}/>{[[40,26],[96,16],[260,14]].map(([x,y])=><Circle key={x} cx={x} cy={y} r={2} fill={c.surface}/>)}</>}
  </Svg>
  {(scene==='run'||scene==='mountain')&&<View style={{position:'absolute',left:scene==='run'?140:182,top:scene==='run'?45:44}}><DawnAvatar avatar={avatar} pose={scene==='run'?'run':'climb'} size={30}/></View>}
  {scene==='duel'&&<View style={{position:'absolute',left:0,right:0,top:30,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:18}}><View style={{width:62,height:62,borderRadius:31,overflow:'hidden',backgroundColor:c.surface,borderWidth:3,borderColor:c.gold}}><DawnAvatar avatar={avatar} pose="bust" size={58}/></View><Text style={{fontSize:18,fontWeight:'800',color:c.surface}}>VS</Text><View style={{width:62,height:62,borderRadius:31,overflow:'hidden',backgroundColor:c.surface,alignItems:'center',justifyContent:'center'}}>{rival?<DawnAvatar avatar={rival} pose="bust" size={58}/>:<Text style={{fontSize:12,color:c.muted}}>Rival</Text>}</View></View>}
  </View>;
}
