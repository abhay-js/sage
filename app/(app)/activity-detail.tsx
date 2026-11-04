import {ActivityIndicator,Text,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {useAuth} from '../../context/AuthContext';
import {useActivities} from '../../hooks/useActivities';
import {useProductChallenges} from '../../hooks/useProduct';
import {ActivityLogDetails} from '../../components/ui/ActivityLogDetails';
import {Button,Page} from '../../components/ui/AdventureUI';
import {workoutDetailColors as c} from '../../lib/workoutDetailPalette';

export default function ActivityDetailScreen(){
 const {id}=useLocalSearchParams<{id?:string}>(),router=useRouter(),{user}=useAuth();
 const workouts=useActivities(user?.id),catalog=useProductChallenges();
 const activity=workouts.activities.find(workout=>workout.id===id);
 const close=()=>router.canGoBack()?router.back():router.replace('/(app)/log');
 if(activity)return <ActivityLogDetails activity={activity} challenges={catalog.data??[]} onClose={close}/>;
 return <Page><View style={{gap:16,paddingVertical:32}}>
  {workouts.loading?<><ActivityIndicator color={c.green}/><Text style={{color:c.text}}>Loading workout…</Text></>:<>
   <Text accessibilityRole="alert" style={{color:c.text}}>{workouts.error?'Unable to load this workout.':'This workout is no longer available.'}</Text>
   {!!workouts.error&&<Button title="Retry workout" onPress={()=>void workouts.refetch()}/>}
  </>}
  <Button secondary title="Back to activity log" onPress={close}/>
 </View></Page>;
}
