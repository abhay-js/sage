import { Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { adventureColors as c } from '../../lib/theme';

/** Reference artwork only; measured routes are rendered by RecordingRouteMap. */
export function RecorderPreviewMap({ indoor = false }: { indoor?: boolean }) {
  const streets = 'M-20 55L410 170M-20 139L407 30M75-20L153 230M244-20L315 230';
  const route = 'M125 149L111 94Q104 65 134 54L225 32Q247 28 254 53L280 128Q288 151 262 159L170 184Q137 193 125 149Z';
  return <View accessibilityRole="image" accessibilityLabel={indoor ? 'Illustration of a strength session, no route' : 'Illustrative park route, not a recorded GPS route'} style={{ height: 205, borderRadius: 20, overflow: 'hidden', backgroundColor: c.pale, marginBottom: 16 }}>
    <Svg width="100%" height="100%" viewBox="0 0 380 205" preserveAspectRatio="xMidYMid slice">
      <Rect width={380} height={205} fill={c.pale} />
      {indoor ? <><Circle cx={190} cy={108} r={66} fill={c.ridge} /><G fill={c.green} transform="rotate(-25 190 108)"><Rect x={129} y={82} width={18} height={52} rx={5}/><Rect x={149} y={72} width={21} height={72} rx={5}/><Rect x={170} y={102} width={40} height={12} rx={3}/><Rect x={210} y={72} width={21} height={72} rx={5}/><Rect x={233} y={82} width={18} height={52} rx={5}/></G></> : <>
        <Path d={streets} fill="none" stroke={c.surface} strokeWidth={15}/><Path d={streets} fill="none" stroke={c.border} strokeWidth={1}/>
        <Path d="M321-20Q277 46 334 97T351 230" fill="none" stroke={c.sky} strokeWidth={24}/>
        <Rect x={130} y={52} width={112} height={84} rx={27} fill={c.ridge}/><G fill={c.forest}><Circle cx={169} cy={93} r={13}/><Circle cx={193} cy={100} r={17}/><Circle cx={208} cy={83} r={12}/></G>
        <Path d={route} fill="none" stroke={c.peach} strokeWidth={9}/><Path d={route} fill="none" stroke={c.orange} strokeWidth={4} strokeLinecap="round"/>
        <Circle cx={125} cy={149} r={6} fill={c.orange} stroke={c.surface} strokeWidth={3}/>
      </>}
    </Svg>
    <Text style={{ position: 'absolute', top: 12, left: 12, color: c.green, backgroundColor: c.surface, padding: 6, borderRadius: 7, fontSize: 8, fontWeight: '700', letterSpacing: 1 }}>{indoor ? 'INDOOR SESSION · NO ROUTE' : 'ILLUSTRATIVE ROUTE · NO GPS'}</Text>
  </View>;
}
