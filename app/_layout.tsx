import '../global.css';
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../hooks/useAuth';
import { DevSwitcher } from '../components/DevSwitcher';

export default function RootLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';
    const inAdmin = segments[0] === '(admin)';
    const inApp = segments[0] === '(app)';
    const inPending = segments[0] === 'pending';

    if (!user) {
      if (!inAuth) router.replace('/(auth)/login');
    } else if (user.role === 'admin') {
      if (!inAdmin) router.replace('/(admin)');
    } else if (user.status === 'pending') {
      if (!inPending) router.replace('/pending');
    } else if (user.status === 'active') {
      if (inAuth || inPending) router.replace('/(app)');
    }
  }, [user, loading, segments]);

  return (
    <>
      <StatusBar style="light" />
      <Slot />
      <DevSwitcher />
    </>
  );
}
