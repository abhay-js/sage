import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import { exchangeStravaCode } from '../../lib/strava';

WebBrowser.maybeCompleteAuthSession();

const STRAVA_CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID!;

export default function StravaConnectScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'sage',
    path: 'strava',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: STRAVA_CLIENT_ID,
      scopes: ['activity:read_all'],
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const tokens = await exchangeStravaCode(code, redirectUri);

      await supabase.from('users').update({
        strava_athlete_id: String(tokens.athlete.id),
        strava_access_token: tokens.access_token,
        strava_refresh_token: tokens.refresh_token,
        strava_token_expires_at: new Date(tokens.expires_at * 1000).toISOString(),
      }).eq('id', session.user.id);

      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-sage-bg items-center justify-center px-6">
      <View className="items-center mb-12">
        <View className="w-20 h-20 rounded-full bg-[#FC4C02]/20 items-center justify-center mb-4">
          <Text style={{ fontSize: 36 }}>🟠</Text>
        </View>
        <Text className="text-sage-text font-black text-2xl mb-2">Connect Strava</Text>
        <Text className="text-sage-muted text-sm text-center leading-5">
          We read your activities to automatically track training and compute your score.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#FC4C02" size="large" />
      ) : (
        <>
          <TouchableOpacity
            onPress={() => promptAsync()}
            disabled={!request}
            activeOpacity={0.85}
            className="bg-[#FC4C02] rounded-2xl py-4 w-full items-center mb-4"
          >
            <Text className="text-white font-black text-base tracking-widest">
              CONNECT WITH STRAVA
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text className="text-sage-muted text-sm">Skip for now</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
