import '../global.css';
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { DevSwitcher } from '../components/DevSwitcher';

function RootNavigator() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';
    const inAdmin = segments[0] === '(admin)';
    const inPending = segments[0] === 'pending';

    if (!user) {
      if (!inAuth) router.replace('/(auth)/login');
    } else if (user.role === 'admin') {
      if (!inAdmin) router.replace('/(admin)');
    } else if (user.status === 'pending') {
      if (!inPending) router.replace('/pending');
    } else if (user.status === 'active') {
      if (inAuth || inPending || inAdmin) router.replace('/(app)');
    }
  }, [user, loading, segments]);

  // Block all route rendering until auth is resolved — prevents admin/app flash on cold start
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style="light" />
        <Text style={{ color: '#4ade80', fontWeight: '900', fontSize: 48, letterSpacing: -1 }}>
          SAGE
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Slot />
      <DevSwitcher />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
