import {memo,useEffect,useRef} from 'react';
import {View,Text} from 'react-native';
import MapView,{Polyline,Marker} from 'react-native-maps';
import {RecordedLocation} from '../../lib/gpsRecording';
import {adventureColors as c} from '../../lib/theme';
import {s} from './AdventureUI';
export const RecordingRouteMap=memo(function RecordingRouteMap({points,live=false}:{points:RecordedLocation[];live?:boolean}){
 const map=useRef<MapView>(null),segments=new Map<number,RecordedLocation[]>();for(const p of points){const segment=segments.get(p.segment??0)??[];segment.push(p);segments.set(p.segment??0,segment);}
 const latest=points[points.length-1];useEffect(()=>{if(live&&latest)map.current?.animateCamera({center:latest},{duration:400});},[live,latest?.latitude,latest?.longitude]);
 function fit(){if(points.length)map.current?.fitToCoordinates(points,{edgePadding:{top:30,right:30,bottom:30,left:30},animated:false});}
 return <View style={[s.card,{height:220,marginVertical:16}]}>{!points.length?<View style={{padding:24,flex:1,justifyContent:'center'}}><Text style={s.section}>{live?'Waiting for a precise GPS fix…':'No GPS route recorded'}</Text><Text style={[s.muted,{marginTop:8}]}>Step outside with a clear view of the sky. The route appears once Sage receives your location.</Text></View>:<MapView ref={map} style={{flex:1}} initialRegion={{...points[0],latitudeDelta:0.008,longitudeDelta:0.008}} onMapReady={fit} showsUserLocation={live} userInterfaceStyle="light" rotateEnabled={false}>{[...segments].map(([id,route])=><Polyline key={id} coordinates={route} strokeColor={c.orange} strokeWidth={4}/>)}<Marker coordinate={points[0]} title="Start" pinColor={c.green}/><Marker coordinate={points[points.length-1]} title={live?'Latest position':'Finish'} pinColor={c.orange}/></MapView>}</View>;
});
