import {View,Text,TouchableOpacity,Linking} from 'react-native';
import Svg,{Polyline,Circle} from 'react-native-svg';
import {RecordedLocation} from '../../lib/gpsRecording';
import {sageColors as c} from '../../lib/theme';
import {s} from './SageUI';
export function RecordingRouteMap({points,live=false}:{points:RecordedLocation[];live?:boolean}){
 if(!points.length)return <View style={[s.card,{padding:18,marginVertical:16}]}><Text style={s.muted}>No recorded GPS route available.</Text></View>;
 const lats=points.map(p=>p.latitude),lons=points.map(p=>p.longitude),minLat=Math.min(...lats),maxLat=Math.max(...lats),minLon=Math.min(...lons),maxLon=Math.max(...lons),scaleLat=Math.max(0.0001,maxLat-minLat),scaleLon=Math.max(0.0001,maxLon-minLon),segments=new Map<number,RecordedLocation[]>();for(const p of points){const route=segments.get(p.segment??0)??[];route.push(p);segments.set(p.segment??0,route);}
 const coord=(p:RecordedLocation)=>`${20+(p.longitude-minLon)/scaleLon*280},${210-(p.latitude-minLat)/scaleLat*190}`;
 return <View style={[s.card,{padding:18,marginVertical:16}]}><Text style={s.section}>Recorded route</Text><Svg height={230} width="100%" viewBox="0 0 320 230">{[...segments].map(([id,route])=><Polyline key={id} points={route.map(coord).join(' ')} fill="none" stroke={c.orange} strokeWidth={3}/>)}<Circle cx={Number(coord(points[0]).split(',')[0])} cy={Number(coord(points[0]).split(',')[1])} r={4} fill={c.green}/></Svg><Text style={s.muted}>Route outline · pause gaps are left separate</Text><TouchableOpacity onPress={()=>void Linking.openURL(`https://www.openstreetmap.org/?mlat=${points[0].latitude}&mlon=${points[0].longitude}#map=15/${points[0].latitude}/${points[0].longitude}`)}><Text style={{color:c.orange,marginTop:10}}>Open start location on map</Text></TouchableOpacity></View>;
}
