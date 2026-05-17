import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import { exchangeStravaCode } from '../../lib/strava';

WebBrowser.maybeCompleteAuthSession();

const STRAVA_CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID!;

function makeReferralCode(name: string): string {
  const prefix = name.trim().split(' ')[0].toUpperCase().slice(0, 4);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'sage',
    path: 'strava',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: STRAVA_CLIENT_ID,
      scopes: ['read', 'activity:read_all', 'profile:read_all'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      extraParams: { approval_prompt: 'auto' },
    },
    { authorizationEndpoint: 'https://www.strava.com/oauth/authorize' }
  );

  useEffect(() => {
    if (response?.type !== 'success') return;
    handleCode(response.params.code);
  }, [response]);

  async function handleCode(code: string) {
    setLoading(true);
    try {
      const tokens = await exchangeStravaCode(code, redirectUri);
      const athlete = tokens.athlete;

      const email = `athlete.${athlete.id}@strava.app`;
      const password = `strava_${athlete.id}_sage`;

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      let userId: string;

      if (signInError?.message.includes('Email not confirmed')) {
        throw new Error('Disable email confirmations in Supabase Auth settings, then try again.');
      } else if (signInError) {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError || !data.user) throw signUpError ?? new Error('Signup failed');
        if (!data.session) throw new Error('Enable email confirmations is still ON in Supabase — disable it, then try again.');
        userId = data.user.id;
        await supabase.from('users').insert({
          id: userId,
          name: `${athlete.firstname} ${athlete.lastname}`.trim(),
          email: athlete.email ?? null,
          status: 'pending',
          role: 'athlete',
          referral_code: makeReferralCode(athlete.firstname),
          referred_by: null,
        });
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session!.user.id;
        const { data: existing } = await supabase.from('users').select('id').eq('id', userId).single();
        if (!existing) {
          await supabase.from('users').insert({
            id: userId,
            name: `${athlete.firstname} ${athlete.lastname}`.trim(),
            email: athlete.email ?? null,
            status: 'pending',
            role: 'athlete',
            referral_code: makeReferralCode(athlete.firstname),
            referred_by: null,
          });
        }
      }

      // Save / refresh Strava tokens
      await supabase.from('users').update({
        strava_athlete_id: String(athlete.id),
        strava_access_token: tokens.access_token,
        strava_refresh_token: tokens.refresh_token,
        strava_token_expires_at: new Date(tokens.expires_at * 1000).toISOString(),
      }).eq('id', userId);

      // Trigger a fresh auth state so useAuth re-fetches the profile
      await supabase.auth.refreshSession();
      router.replace('/pending');
    } catch (e: any) {
      const msg: string = e.message ?? '';
      if (msg.includes('after') && msg.includes('second')) {
        Alert.alert('Slow down', 'Please wait 48 seconds before trying again (Supabase rate limit).');
      } else {
        Alert.alert('Login failed', msg || 'Something went wrong. Try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-sage-bg items-center justify-center px-6">
      {/* Brand */}
      <View className="items-center mb-14">
        <Text className="text-sage-green font-black text-6xl tracking-tight">SAGE</Text>
        <Text className="text-sage-muted text-base mt-2 text-center">
          Train with the village.{'\n'}Compete. Improve. Win.
        </Text>
      </View>

      {/* Strava CTA */}
      {loading ? (
        <View className="items-center gap-3">
          <ActivityIndicator color="#4ade80" size="large" />
          <Text className="text-sage-muted text-sm">Connecting your account…</Text>
        </View>
      ) : (
        <>
          <TouchableOpacity
            onPress={() => promptAsync()}
            disabled={!request}
            activeOpacity={0.85}
            className="bg-[#FC4C02] rounded-2xl py-4 w-full items-center mb-3"
          >
            <Text className="text-white font-black text-base tracking-widest">
              LOGIN WITH STRAVA
            </Text>
          </TouchableOpacity>
          <Text className="text-sage-muted text-xs text-center leading-5">
            We only read your activities.{'\n'}We never post anything on your behalf.
          </Text>
        </>
      )}
    </View>
  );
}
