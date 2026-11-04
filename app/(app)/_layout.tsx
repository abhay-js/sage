import {useEffect,useState} from 'react';
import {Keyboard,Platform,useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {HealthSyncProvider} from '../../context/HealthSyncContext';
import {Tabs} from 'expo-router';
import {useRecordingDraft} from '../../hooks/useGpsRecorder';
import {sageColors as c} from '../../lib/theme';
import {appTabs,hiddenAppScreens} from '../../lib/appNavigation';
import {AppTabBar} from '../../components/ui/AppTabBar';
export default function AppLayout(){
 const viewport=useWindowDimensions(),navScale=Math.min(Math.min(viewport.width,520)/390,viewport.height/844);
 const record=useRecordingDraft(),insets=useSafeAreaInsets(),[keyboard,setKeyboard]=useState(false);
 useEffect(()=>{if(Platform.OS==='web')return;const show=Keyboard.addListener('keyboardDidShow',()=>setKeyboard(true)),hide=Keyboard.addListener('keyboardDidHide',()=>setKeyboard(false));return()=>{show.remove();hide.remove();};},[]);
 return <HealthSyncProvider><Tabs backBehavior="history" tabBar={props=><AppTabBar {...props} record={record} floating/>} screenOptions={({route})=>({headerShown:false,sceneStyle:{backgroundColor:c.bg,paddingBottom:route.name==='home'||route.name==='ranks'||route.name==='challenge-detail'||route.name==='profile-edit'||keyboard?0:8+58*navScale+Math.max(insets.bottom,22*navScale)+(record&&route.name!=='record-activity'?48:0)},tabBarHideOnKeyboard:true})}>
  {appTabs.map(tab=><Tabs.Screen key={tab.name} name={tab.name} options={{title:tab.title}}/>)}
  {hiddenAppScreens.map(name=><Tabs.Screen key={name} name={name} options={{href:null}}/>)}
 </Tabs></HealthSyncProvider>;
}
