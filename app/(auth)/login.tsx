import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

function makeReferralCode(name: string): string {
  const prefix = name.trim().split(' ')[0].toUpperCase().slice(0, 4);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

async function ensureUserRow(userId: string, name: string, email: string | null) {
  const { data: existing } = await supabase.from('users').select('id').eq('id', userId).single();
  if (!existing) {
    await supabase.from('users').insert({
      id: userId,
      name,
      email,
      status: 'pending',
      role: 'athlete',
      referral_code: makeReferralCode(name),
      referred_by: null,
    });
  }
}

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        });
        if (error) throw error;
        return; // browser redirects to Google then back
      }

      // Native: open browser, intercept PKCE callback
      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'sage', path: 'auth-callback' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUri, skipBrowserRedirect: true },
      });
      if (error || !data.url) throw error ?? new Error('No OAuth URL');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
      if (result.type !== 'success') { setLoading(false); return; }

      const { data: session, error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
      if (sessionError) throw sessionError;

      const googleUser = session.user!;
      const displayName =
        googleUser.user_metadata?.full_name ??
        googleUser.user_metadata?.name ??
        googleUser.email?.split('@')[0] ??
        'Athlete';
      await ensureUserRow(googleUser.id, displayName, googleUser.email ?? null);
      // Navigation handled by _layout.tsx once useAuth picks up the user row
    } catch (e: any) {
      Alert.alert('Google sign-in failed', e.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-sage-bg items-center justify-center px-6">
      <View className="items-center mb-14">
        <Text className="text-sage-green font-black text-6xl tracking-tight">SAGE</Text>
        <Text className="text-sage-muted text-base mt-2 text-center">
          Train with the village.{'\n'}Compete. Improve. Win.
        </Text>
      </View>

      {loading ? (
        <View className="items-center gap-3">
          <ActivityIndicator color="#4ade80" size="large" />
          <Text className="text-sage-muted text-sm">Signing in…</Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={handleGoogle}
          activeOpacity={0.85}
          className="bg-white rounded-2xl py-4 w-full items-center flex-row justify-center gap-3"
        >
          <Text style={{ fontSize: 18 }}>G</Text>
          <Text style={{ color: '#111', fontWeight: '900', fontSize: 14, letterSpacing: 1 }}>
            CONTINUE WITH GOOGLE
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
