import '../global.css';
import {reconcileRecordingOwner,recordingAppState} from '../lib/gpsRecorder';
import { useEffect } from 'react';
import { Slot, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, Platform, View, Text } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
// Test credentials and the account switcher must never be included in release builds.
const DevSwitcher = __DEV__ ? require('../components/DevSwitcher').DevSwitcher : () => null;
import { sageColors } from '../lib/theme';

function RootNavigator() {
  const { user, loading,recoveringPassword } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const isLandingPage = usePathname() === '/';
  const isPublicPage = segments[0] === 'privacy' || (Platform.OS === 'web' && isLandingPage);

  useEffect(() => {
    if (isPublicPage && !(isLandingPage && recoveringPassword)) return;
    if (loading) return;
    if(segments[0]==='(auth)'&&segments[1]==='auth-callback')return;
    if(recoveringPassword){if(segments[1]!=='reset-password')router.replace('/(auth)/reset-password');return;}

    const inAuth = segments[0] === '(auth)';
    const inAdmin = segments[0] === '(admin)';
    const inPending = segments[0] === 'pending';

    if (!user) {
      if (!inAuth) router.replace('/(auth)/login');
    } else if (user.role === 'admin') {
      if (!inAdmin) router.replace('/(admin)/dashboard');
    } else if (!user.onboarding_completed) {
      if(segments[0]!=='onboarding')router.replace('/onboarding');
    } else if (user.status === 'suspended') {
      if(!inPending)router.replace('/pending');
    } else {
      if (inAuth || inPending || inAdmin || segments[0]==='onboarding' || isLandingPage) router.replace('/(app)/home');
    }
  }, [user, loading, segments,recoveringPassword,isPublicPage,isLandingPage]);

  useEffect(()=>{if(loading)return;void reconcileRecordingOwner(user?.id).catch(()=>{});const subscription=AppState.addEventListener('change',state=>{void recordingAppState(user?.id,state).catch(()=>{});});return()=>subscription.remove();},[loading,user?.id]);

  // Block all route rendering until auth is resolved — prevents admin/app flash on cold start
  if (loading && !isPublicPage) {
    return (
      <View style={{ flex: 1, backgroundColor: sageColors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style="dark" />
        <Text style={{ color: sageColors.green, fontWeight: '900', fontSize: 48, letterSpacing: -1 }}>
          SAGE
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
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
