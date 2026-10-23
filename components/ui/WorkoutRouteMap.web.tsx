import {Text,View} from 'react-native';
import {useWorkoutRoute} from '../../hooks/useWorkoutRoute';
import {RecordedLocation} from '../../lib/gpsRecording';
import {RecordingRouteMap} from './RecordingRouteMap';
import {s} from './SageUI';
export function WorkoutRouteMap({activityId,workoutId}:{activityId:string;workoutId?:string}){
 const route=useWorkoutRoute(activityId,workoutId),uploaded=activityId.startsWith('gps_')||activityId.startsWith('fit_');
 if(uploaded&&!route.loading&&!route.error)return <RecordingRouteMap points={route.points as RecordedLocation[]}/>;
 return <View style={[s.card,{padding:18,marginBottom:20}]}><Text style={s.section}>GPS route</Text><Text style={s.muted}>{uploaded?(route.error??'Loading your recorded route…'):'Open this workout in Sage on your iPhone to view its Apple Health route map.'}</Text></View>;
}
