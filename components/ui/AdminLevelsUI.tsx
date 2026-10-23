import { View,Text,TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { sageColors as c } from '../../lib/theme';
import { s } from './SageUI';
export function AdminLevelTabs({selected}:{selected:'athletes'|'challenges'}) {
  const router=useRouter();
  return <View style={[s.row,{marginBottom:26,borderBottomWidth:1,borderColor:c.border}]}>{(['athletes','challenges'] as const).map(tab=><TouchableOpacity accessibilityRole="tab" accessibilityState={{selected:selected===tab}} key={tab} onPress={()=>router.replace(tab==='athletes'?'/(admin)/athletes':'/(admin)/races')} style={{flex:1,paddingVertical:15,alignItems:'center',borderBottomWidth:2,borderColor:selected===tab?c.orange:c.bg}}><Text style={{color:selected===tab?c.text:c.muted,fontWeight:'800'}}>{tab==='athletes'?'Athletes':'Challenges'}</Text></TouchableOpacity>)}</View>;
}
export function LevelBadge({level}:{level:number|null}) {
  return <View style={{alignSelf:'flex-start',backgroundColor:level?c.pale:c.peach,paddingHorizontal:8,paddingVertical:4,borderRadius:6,marginTop:5}}><Text style={{fontSize:9,fontWeight:'800',color:level?c.green:c.orange}}>{level?`LEVEL ${level}`:'UNDER REVIEW'}</Text></View>;
}
