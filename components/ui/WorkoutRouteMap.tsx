import { useRef } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useWorkoutRoute } from '../../hooks/useWorkoutRoute';
import { sageColors as c } from '../../lib/theme';
import { s } from './SageUI';

export function WorkoutRouteMap({ activityId,workoutId }: { activityId: string;workoutId?:string }) {
  const {points,loading,error} = useWorkoutRoute(activityId,workoutId);
  const segments=new Map<number,typeof points>();for(const p of points){const segment=(p as typeof p & {segment?:number}).segment??0,route=segments.get(segment)??[];route.push(p);segments.set(segment,route);}
  const map = useRef<MapView>(null);
  function fit() { if (points.length) map.current?.fitToCoordinates(points,{edgePadding:{top:45,right:35,bottom:45,left:35},animated:false}); }
  return <View style={{marginBottom:20}}><Text style={[s.section,{marginBottom:12}]}>GPS route</Text>
    {loading ? <View style={[s.card,{padding:25}]}><ActivityIndicator color={c.green}/><Text style={[s.muted,{marginTop:10,textAlign:'center'}]}>Reading your workout route…</Text></View> : Platform.OS !== 'ios' || points.length < 2 ? <View style={[s.card,{padding:18}]}><Text style={s.muted}>{error ?? (Platform.OS !== 'ios' ? 'Apple Health route maps are available on your iPhone.' : 'No GPS route recorded for this workout. Allow Workout Routes access in Health to view recorded outdoor routes.')}</Text></View> : <View style={[s.card,{height:320}]}><MapView ref={map} style={{flex:1}} onMapReady={fit} onLayout={fit} initialRegion={{...points[0],latitudeDelta:0.015,longitudeDelta:0.015}} scrollEnabled zoomEnabled rotateEnabled={false} showsUserLocation={false} userInterfaceStyle="light">
      <>{[...segments].map(([id,route])=><Polyline key={id} coordinates={route} strokeColor={c.orange} strokeWidth={4}/>)}</>
      <Marker coordinate={points[0]} title="Start" pinColor={c.green}/><Marker coordinate={points[points.length-1]} title="Finish" pinColor={c.orange}/>
    </MapView></View>}
  </View>;
}
