import { HealthSyncProvider } from '../../context/HealthSyncContext';
import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import { sageColors as c } from '../../lib/theme';
import { SageIcon, SageIconName } from '../../components/ui/SageIcon';
const tabs: { name: string; title: string; icon: SageIconName }[] = [
  { name: 'home', title: 'Home', icon: 'home' },
  { name: 'challenges', title: 'Challenge', icon: 'flag' },
  { name: 'ranks', title: 'Mountain', icon: 'mountain' },
  { name: 'record-activity', title: 'Record', icon: 'route' },
  { name: 'log', title: 'Activity', icon: 'activity' },
  { name: 'profile', title: 'Profile', icon: 'user' },
];
export default function AppLayout() {
  return <HealthSyncProvider><Tabs screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, height: Platform.OS === 'ios' ? 86 : 68, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 24 : 9 }, tabBarActiveTintColor: c.green, tabBarInactiveTintColor: c.muted, tabBarLabelStyle: { fontSize: 10, fontWeight: '700' } }}>
    {tabs.map(t => <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title, tabBarIcon: ({ focused }) => t.name === 'record-activity' ? <View style={{ padding: 7, marginTop: -12, borderRadius: 13, backgroundColor: focused ? c.orange : c.green }}><SageIcon name={t.icon} size={23} color={c.onAccent} /></View> : <SageIcon name={t.icon} size={22} color={focused ? c.green : c.muted} /> }} />)}
    {['health-connect','garmin','submit-activity','sessions','village','profile-details','profile-edit','workout-result','challenge-detail','race-detail','session-detail','session-create','session-edit'].map(name => <Tabs.Screen key={name} name={name} options={{ href: null }} />)}
  </Tabs></HealthSyncProvider>;
}
