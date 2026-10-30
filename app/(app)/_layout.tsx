import {useEffect,useState} from 'react';
import {Keyboard,Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {HealthSyncProvider} from '../../context/HealthSyncContext';
import {Tabs} from 'expo-router';
import {useRecordingDraft} from '../../hooks/useGpsRecorder';
import {sageColors as c} from '../../lib/theme';
import {appTabs,hiddenAppScreens} from '../../lib/appNavigation';
import {AppTabBar} from '../../components/ui/AppTabBar';
export default function AppLayout(){
 const record=useRecordingDraft(),insets=useSafeAreaInsets(),[keyboard,setKeyboard]=useState(false);
 useEffect(()=>{if(Platform.OS==='web')return;const show=Keyboard.addListener('keyboardDidShow',()=>setKeyboard(true)),hide=Keyboard.addListener('keyboardDidHide',()=>setKeyboard(false));return()=>{show.remove();hide.remove();};},[]);
 return <HealthSyncProvider><Tabs backBehavior="history" tabBar={props=><AppTabBar {...props} record={record} floating/>} screenOptions={({route})=>({headerShown:false,sceneStyle:{backgroundColor:c.bg,paddingBottom:route.name==='home'||route.name==='profile-edit'||keyboard?0:72+Math.max(insets.bottom,8)+(record&&route.name!=='record-activity'?48:0)},tabBarHideOnKeyboard:true})}>
  {appTabs.map(tab=><Tabs.Screen key={tab.name} name={tab.name} options={{title:tab.title}}/>)}
  {hiddenAppScreens.map(name=><Tabs.Screen key={name} name={name} options={{href:null}}/>)}
 </Tabs></HealthSyncProvider>;
}
