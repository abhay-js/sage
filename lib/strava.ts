import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

const STRAVA_CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID!;
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/mobile/authorize';

export function useStravaAuth() {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'sage', path: 'strava' });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: STRAVA_CLIENT_ID,
      scopes: ['activity:read_all'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      extraParams: { approval_prompt: 'auto' },
    },
    { authorizationEndpoint: STRAVA_AUTH_URL }
  );

  return { request, response, promptAsync, redirectUri };
}

export async function exchangeStravaCode(code:string,redirectUri:string) {
  const {data,error}=await supabase.functions.invoke('strava-auth',{body:{action:'exchange',code,redirectUri}});
  if(error||data?.error)throw new Error(data?.error??error?.message??'Strava connection failed');
  return data;
}
export async function refreshStravaToken(_refreshToken:string) {
  const {data,error}=await supabase.functions.invoke('strava-auth',{body:{action:'refresh'}});
  if(error||data?.error)throw new Error(data?.error??error?.message??'Strava refresh failed');
  return data;
}

export async function getStravaActivities(
  accessToken: string,
  after: number,
  page = 1,
  perPage = 200
) {
  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&page=${page}&per_page=${perPage}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error('Failed to fetch Strava activities');
  return res.json();
}

export async function getStravaActivity(accessToken: string, activityId: string) {
  const res = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch activity');
  return res.json();
}

export async function ensureFreshToken(userId: string, user: {
  strava_access_token: string;
  strava_refresh_token: string;
  strava_token_expires_at: string;
}): Promise<string> {
  const expiresAt = new Date(user.strava_token_expires_at).getTime();
  if (Date.now() < expiresAt - 60_000) return user.strava_access_token;

  const tokens = await refreshStravaToken(user.strava_refresh_token);
  return tokens.access_token;
}
