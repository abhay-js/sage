import { Tabs } from 'expo-router';
import { Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { useAuth } from '../../hooks/useAuth';

function SignOutButton() {
  const { signOut } = useAuth();
  function confirm() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
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
        headerStyle: { backgroundColor: '#111' },
        headerTintColor: '#f5f5f5',
        headerTitleStyle: { fontWeight: '900', fontSize: 16 },
        headerRight: () => <SignOutButton />,
        tabBarStyle: {
          backgroundColor: '#111',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 82 : 62,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#fb923c',
        tabBarInactiveTintColor: '#525252',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
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
          title: 'Races',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>🏁</Text>,
        }}
      />
      <Tabs.Screen
        name="athletes"
        options={{
          title: 'Athletes',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>👥</Text>,
        }}
      />
    </Tabs>
  );
}
