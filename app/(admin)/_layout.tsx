import {AppTabBar} from '../../components/ui/AppTabBar';
import {adminTabs,parentAdminTab} from '../../lib/appNavigation';
import { Tabs, useRouter } from 'expo-router';
import { Text, TouchableOpacity, Alert, View, useWindowDimensions } from 'react-native';
import {AdminSidebar} from '../../components/ui/AdminSidebar';
import { sageColors as c } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';

function SignOutButton() {
  const { signOut } = useAuth();
  const router = useRouter();
  function confirm() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        await signOut();
        router.replace('/(auth)/login');
      }},
    ]);
  }
  return (
    <TouchableOpacity onPress={confirm} style={{ marginRight: 16 }}>
      <Text style={{ color: c.danger, fontSize: 13, fontWeight: '700' }}>Sign Out</Text>
    </TouchableOpacity>
  );
}

export default function AdminLayout(){
 const desktop=useWindowDimensions().width>=900;
 return <View style={{flex:1,flexDirection:'row'}}>{desktop&&<AdminSidebar/>}<View style={{flex:1}}><Tabs backBehavior="history" tabBar={props=>desktop?null:<AppTabBar {...props} items={adminTabs} parentTab={parentAdminTab}/>} screenOptions={({route})=>({headerShown:!(desktop&&route.name==='races'),headerStyle:{backgroundColor:desktop?c.surface:c.bg},headerTintColor:c.text,headerTitleStyle:{fontWeight:'800',fontSize:17},headerShadowVisible:false,headerRight:()=> <SignOutButton/>,sceneStyle:{backgroundColor:c.bg},tabBarHideOnKeyboard:true})}>
  {adminTabs.map(tab=><Tabs.Screen key={tab.name} name={tab.name} options={{title:tab.name==='races'?'Challenges':tab.name==='dashboard'?'Dashboard':tab.title}}/>)}
  {['submissions','athlete-detail','challenge-editor','race-management','athlete-management','flags','results','partners','settings'].map(name=><Tabs.Screen key={name} name={name} options={{href:null,title:name==='race-management'?'Challenge details':name==='challenge-editor'?'Challenge editor':name==='athlete-detail'?'Athlete details':name==='flags'?'Flags and reviews':name==='results'?'Results and prizes':name==='partners'?'Partners':name==='settings'?'Settings':undefined}}/>)}
 </Tabs></View></View>;
}
