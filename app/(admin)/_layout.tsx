import { Tabs, useRouter } from 'expo-router';
import { Text, TouchableOpacity, Alert, Platform } from 'react-native';
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
      <Text style={{ color: '#f87171', fontSize: 13, fontWeight: '700' }}>Sign Out</Text>
    </TouchableOpacity>
  );
}

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: '900', fontSize: 16 },
        headerRight: () => <SignOutButton />,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 82 : 62,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: c.orange,
        tabBarInactiveTintColor: c.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>💳</Text>,
        }}
      />
      <Tabs.Screen
        name="races"
        options={{
          title: 'Challenges',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>🏁</Text>,
        }}
      />
      <Tabs.Screen name="workouts" options={{title: 'Workouts',tabBarIcon: () => <Text style={{fontSize:20}}>✓</Text>}}/>
      <Tabs.Screen
        name="athletes"
        options={{
          title: 'Athletes',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>👥</Text>,
        }}
      />
      <Tabs.Screen name="submissions" options={{href:null,title:"Submitted workouts"}}/><Tabs.Screen name="athlete-detail" options={{href:null,title:"Athlete review"}}/><Tabs.Screen name="challenge-editor" options={{href:null,title:"Challenge editor"}}/><Tabs.Screen name="race-management" options={{href:null,title:'Manage races'}}/>
      <Tabs.Screen name="athlete-management" options={{href:null,title:'Manage athletes'}}/>
    </Tabs>
  );
}
