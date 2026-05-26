import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

// This screen handles the deep-link redirect from Google OAuth on native.
// WebBrowser.maybeCompleteAuthSession() signals the waiting openAuthSessionAsync
// call in login.tsx to resolve, so the flow continues there.
WebBrowser.maybeCompleteAuthSession();

export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    // Fallback: if somehow this screen stays visible, go home
    const t = setTimeout(() => router.replace('/'), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#4ade80" size="large" />
    </View>
  );
}
