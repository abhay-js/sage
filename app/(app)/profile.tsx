import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '../../hooks/useAuth';
import { useMyEntries } from '../../hooks/useEntries';
import { StreakDots } from '../../components/StreakDots';
import { supabase } from '../../lib/supabase';
import { ActivityLog } from '../../types';
import { syncHealthPlatform, healthPlatformName } from '../../lib/healthSync';

// Health import only works in a native dev/prod build, not Expo Go or web
const HEALTH_SUPPORTED = Platform.OS !== 'web' && Constants.appOwnership !== 'expo';

const SPORT_ICONS: Record<string, string> = { Ride: '🚴', Run: '🏃', Swim: '🏊', Trail: '🥾' };

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { entries } = useMyEntries(user?.id);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [sessionsAttended, setSessionsAttended] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [healthSyncing, setHealthSyncing] = useState(false);
  const router = useRouter();

  const fetchSessionsAttended = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('session_enrollments')
      .select('*, session:group_sessions(id, title, sport_type, session_date, host:users(name))')
      .eq('user_id', user.id)
      .eq('status', 'attended')
      .order('created_at', { ascending: false });
    setSessionsAttended(data ?? []);
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => setActivities(data ?? []));
    fetchSessionsAttended();
  }, [user?.id]);

  // Re-fetch sessions attended whenever this tab comes into focus
  // so the count updates after a host marks session as completed
  useFocusEffect(useCallback(() => {
    fetchSessionsAttended();
  }, [fetchSessionsAttended]));

  async function syncNow() {
    if (!user || entries.length === 0 || syncing) return;
    setSyncing(true);
    await Promise.all(
      entries.map((e) =>
        supabase.functions.invoke('backfill-entry', { body: { user_id: user.id, race_id: e.race_id } })
      )
    );
    const { data } = await supabase.from('activity_logs').select('*').eq('user_id', user.id);
    setActivities(data ?? []);
    setSyncing(false);
  }

  async function syncHealth() {
    if (!user || healthSyncing) return;
    setHealthSyncing(true);
    try {
      const count = await syncHealthPlatform(user.id, lastSynced);
      if (count > 0) {
        const { data } = await supabase.from('activity_logs').select('*').eq('user_id', user.id);
        setActivities(data ?? []);
        Alert.alert('Synced!', `Imported ${count} new workout${count !== 1 ? 's' : ''} from ${healthPlatformName()}.`);
      } else {
        Alert.alert('Up to date', `No new workouts found in ${healthPlatformName()}.`);
      }
    } catch (e: any) {
      Alert.alert('Sync failed', e.message ?? 'Could not read health data.');
    } finally {
      setHealthSyncing(false);
    }
  }

  const lastSynced = activities.length > 0
    ? new Date(Math.max(...activities.map((a) => new Date(a.activity_date).getTime())))
    : null;

  const totalScore = entries.reduce((s, e) => s + e.sage_score, 0);
  const totalSessions = entries.reduce((s, e) => s + e.sessions, 0);
  const totalHours = entries.reduce((s, e) => s + e.total_hours, 0);
  const totalRaces = entries.length;
  const topStreak = entries.reduce((max, e) => Math.max(max, e.streak), 0);

  // Sport-specific distance stats
  const runs = activities.filter((a) => a.sport_type === 'Run');
  const rides = activities.filter((a) => a.sport_type === 'Ride');
  const swims = activities.filter((a) => a.sport_type === 'Swim');

  const runKm = runs.reduce((s, a) => s + (a.distance_meters ?? 0), 0) / 1000;
  const rideKm = rides.reduce((s, a) => s + (a.distance_meters ?? 0), 0) / 1000;
  const swimM = swims.reduce((s, a) => s + (a.distance_meters ?? 0), 0);
  const totalElevation = activities.reduce((s, a) => s + (a.elevation_gain ?? 0), 0);
  const totalCalories = activities.reduce((s, a) => s + (a.calories ?? 0), 0);

  // Heart rate stats
  const hrActivities = activities.filter((a) => a.avg_heartrate != null);
  const avgHR = hrActivities.length > 0
    ? Math.round(hrActivities.reduce((s, a) => s + a.avg_heartrate!, 0) / hrActivities.length)
    : null;
  const maxHR = activities.reduce((max, a) => Math.max(max, a.max_heartrate ?? 0), 0) || null;

  // HR Zone breakdown (based on avg HR per activity vs recorded max HR)
  const refMax = maxHR ?? 190;
  const ZONES = [
    { label: 'Zone 1', name: 'Recovery',  min: 0,   max: 0.60, color: '#60a5fa', bg: 'bg-blue-400' },
    { label: 'Zone 2', name: 'Base',      min: 0.60, max: 0.70, color: '#4ade80', bg: 'bg-sage-green' },
    { label: 'Zone 3', name: 'Aerobic',   min: 0.70, max: 0.80, color: '#facc15', bg: 'bg-yellow-400' },
    { label: 'Zone 4', name: 'Threshold', min: 0.80, max: 0.90, color: '#fb923c', bg: 'bg-orange-400' },
    { label: 'Zone 5', name: 'Max',       min: 0.90, max: 1.00, color: '#f87171', bg: 'bg-red-400' },
  ];

  const zoneTimes = ZONES.map((z) => {
    const secs = hrActivities
      .filter((a) => {
        const pct = a.avg_heartrate! / refMax;
        return pct >= z.min && (z.max === 1.00 ? pct >= z.min : pct < z.max);
      })
      .reduce((s, a) => s + a.moving_time_secs, 0);
    return { ...z, secs };
  });

  const totalZoneSecs = zoneTimes.reduce((s, z) => s + z.secs, 0);

  const initials =
    user?.name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-sage-bg">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Avatar + identity */}
        <View className="items-center px-5 pt-8 pb-6">
          <View className="w-20 h-20 rounded-full bg-sage-green/20 items-center justify-center mb-3">
            <Text className="text-sage-green font-black text-2xl">{initials}</Text>
          </View>
          <Text className="text-sage-text font-black text-xl">{user?.name}</Text>
          <Text className="text-sage-muted text-sm mt-0.5">{user?.email}</Text>
          {user?.status === 'active' && (
            <View className="bg-sage-green/15 px-4 py-1 rounded-full mt-2">
              <Text className="text-sage-green text-xs font-bold">ACTIVE MEMBER</Text>
            </View>
          )}
        </View>

        <View className="px-5">
          {/* Hero stats */}
          <View className="bg-sage-surface rounded-2xl p-5 mb-4">
            <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mb-4">
              All-Time Stats
            </Text>
            <View className="flex-row justify-between">
              <HeroStat label="SCORE" value={totalScore.toLocaleString()} accent />
              <HeroStat label="SESSIONS" value={String(totalSessions)} />
              <HeroStat label="HOURS" value={totalHours.toFixed(0)} />
              <HeroStat label="RACES" value={String(totalRaces)} />
            </View>
            {topStreak > 0 && (
              <View className="mt-4 pt-4 border-t border-[#141414] flex-row items-center justify-between">
                <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase">
                  Best Streak
                </Text>
                <View className="flex-row items-center gap-1">
                  <Text style={{ fontSize: 18 }}>🔥</Text>
                  <Text className="text-sage-text font-black text-lg">{topStreak} days</Text>
                </View>
              </View>
            )}
            {sessionsAttended.length > 0 && (
              <View className="mt-4 pt-4 border-t border-[#141414] flex-row items-center justify-between">
                <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase">
                  Group Sessions
                </Text>
                <View className="flex-row items-center gap-1.5">
                  <Text style={{ fontSize: 16 }}>👥</Text>
                  <Text className="font-black text-lg" style={{ color: '#60a5fa' }}>
                    {sessionsAttended.length} attended
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Sport distances */}
          {(runKm > 0 || rideKm > 0 || swimM > 0) && (
            <View className="bg-sage-surface rounded-2xl p-5 mb-4">
              <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mb-4">
                Distance Breakdown
              </Text>
              <View className="gap-3">
                {runKm > 0 && (
                  <SportRow icon="🏃" label="Running" value={`${runKm.toFixed(1)} km`} sessions={runs.length} color="text-emerald-400" />
                )}
                {rideKm > 0 && (
                  <SportRow icon="🚴" label="Cycling" value={`${rideKm.toFixed(1)} km`} sessions={rides.length} color="text-blue-400" />
                )}
                {swimM > 0 && (
                  <SportRow icon="🏊" label="Swimming" value={swimM >= 1000 ? `${(swimM / 1000).toFixed(2)} km` : `${Math.round(swimM)} m`} sessions={swims.length} color="text-cyan-400" />
                )}
                {totalElevation > 0 && (
                  <SportRow icon="⛰️" label="Elevation" value={`${Math.round(totalElevation).toLocaleString()} m`} color="text-orange-400" />
                )}
                {totalCalories > 0 && (
                  <SportRow icon="🔥" label="Calories" value={`${Math.round(totalCalories).toLocaleString()} kcal`} color="text-red-400" />
                )}
              </View>
            </View>
          )}

          {/* Heart rate zones */}
          {hrActivities.length > 0 && (
            <View className="bg-sage-surface rounded-2xl p-5 mb-4">
              <View className="flex-row justify-between items-start mb-4">
                <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase">
                  Heart Rate Zones
                </Text>
                <View className="items-end">
                  <Text className="text-sage-muted text-[9px]">
                    avg <Text className="text-red-400 font-bold">{avgHR} bpm</Text>
                    {'  '}max <Text className="text-orange-400 font-bold">{maxHR} bpm</Text>
                  </Text>
                  <Text className="text-sage-muted text-[9px] mt-0.5">{hrActivities.length} activities tracked</Text>
                </View>
              </View>

              <View className="gap-3">
                {zoneTimes.map((z) => {
                  const pct = totalZoneSecs > 0 ? z.secs / totalZoneSecs : 0;
                  const mins = Math.round(z.secs / 60);
                  const display = mins >= 60
                    ? `${Math.floor(mins / 60)}h ${mins % 60}m`
                    : `${mins}m`;
                  return (
                    <View key={z.label}>
                      <View className="flex-row justify-between items-center mb-1.5">
                        <View className="flex-row items-center gap-2">
                          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
                          <Text className="text-sage-text text-xs font-bold">{z.label}</Text>
                          <Text className="text-sage-muted text-xs">{z.name}</Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <Text className="text-sage-muted text-xs">{Math.round(pct * 100)}%</Text>
                          <Text className="font-bold text-xs" style={{ color: z.color }}>{display}</Text>
                        </View>
                      </View>
                      <View className="h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden">
                        <View
                          className="h-full rounded-full"
                          style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: z.color }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>

              <View className="mt-4 pt-3 border-t border-[#141414]">
                <Text className="text-sage-muted text-[9px] text-center">
                  Based on avg HR per activity vs your max {maxHR} bpm
                </Text>
              </View>
            </View>
          )}

          {/* Training heatmap */}
          <View className="bg-sage-surface rounded-2xl p-5 mb-4">
            <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mb-4">
              Training Streak
            </Text>
            <StreakDots activities={activities} weeks={10} />
          </View>

          {/* Sessions attended */}
          {sessionsAttended.length > 0 && (
            <View className="bg-sage-surface rounded-2xl p-5 mb-4">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase">
                  Sessions Attended
                </Text>
                <Text className="text-sage-green font-black text-sm">{sessionsAttended.length}</Text>
              </View>
              {sessionsAttended.map((e: any, i: number) => {
                const s = e.session;
                if (!s) return null;
                const dateStr = new Date(s.session_date + 'T00:00:00').toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                });
                return (
                  <View
                    key={e.id}
                    className="flex-row items-center gap-3 py-3 border-b border-[#141414]"
                  >
                    <Text style={{ fontSize: 20 }}>{SPORT_ICONS[s.sport_type] ?? '🏅'}</Text>
                    <View className="flex-1">
                      <Text className="text-sage-text font-semibold text-sm" numberOfLines={1}>
                        {s.title}
                      </Text>
                      <Text className="text-sage-muted text-xs mt-0.5">
                        {dateStr} · by {s.host?.name ?? 'Sage'}
                      </Text>
                    </View>
                    <View className="bg-sage-green/15 px-2.5 py-0.5 rounded-full">
                      <Text className="text-sage-green text-xs font-bold">✓</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Strava */}
          <View className="bg-sage-surface rounded-2xl p-4 mb-4">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-[#FC4C02]/20 items-center justify-center">
                  <Text style={{ fontSize: 18 }}>🟠</Text>
                </View>
                <View>
                  <Text className="text-sage-text font-bold text-sm">Strava</Text>
                  <Text className="text-sage-muted text-xs">
                    {user?.strava_athlete_id
                      ? `Connected · ${activities.length} activities`
                      : 'Not connected'}
                  </Text>
                  {lastSynced && (
                    <Text className="text-sage-muted text-[10px] mt-0.5">
                      Last activity {lastSynced.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/strava')}
                activeOpacity={0.8}
                className="bg-[#FC4C02]/20 border border-[#FC4C02]/30 px-3 py-1.5 rounded-full"
              >
                <Text className="text-[#FC4C02] text-xs font-bold">
                  {user?.strava_athlete_id ? 'RECONNECT' : 'CONNECT'}
                </Text>
              </TouchableOpacity>
            </View>
            {user?.strava_athlete_id && entries.length > 0 && (
              <TouchableOpacity
                onPress={syncNow}
                disabled={syncing}
                activeOpacity={0.8}
                className="bg-[#FC4C02]/10 border border-[#FC4C02]/20 rounded-xl py-2.5 items-center"
              >
                <Text className="text-[#FC4C02] text-xs font-bold">
                  {syncing ? 'SYNCING…' : '↻ SYNC NOW'}
                </Text>
              </TouchableOpacity>
            )}
            <Text className="text-sage-muted text-[9px] text-center mt-2">
              Activities sync automatically via Strava webhook. Use Sync Now to catch up manually.
            </Text>
          </View>

          {/* Apple Health / Health Connect — hidden in Expo Go and web */}
          {HEALTH_SUPPORTED && (
            <View className="bg-sage-surface rounded-2xl p-4 mb-4">
              <View className="flex-row items-center gap-3 mb-3">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: Platform.OS === 'ios' ? '#ff375f20' : '#4285f420' }}
                >
                  <Text style={{ fontSize: 20 }}>{Platform.OS === 'ios' ? '❤️' : '💚'}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sage-text font-bold text-sm">{healthPlatformName()}</Text>
                  <Text className="text-sage-muted text-xs">
                    Garmin · Apple Watch · Polar · Fitbit — all in one
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={syncHealth}
                disabled={healthSyncing}
                activeOpacity={0.8}
                className="rounded-xl py-2.5 items-center mb-2"
                style={{
                  backgroundColor: Platform.OS === 'ios' ? '#ff375f15' : '#4285f415',
                  borderWidth: 1,
                  borderColor: Platform.OS === 'ios' ? '#ff375f30' : '#4285f430',
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: Platform.OS === 'ios' ? '#ff375f' : '#4285f4' }}
                >
                  {healthSyncing ? 'IMPORTING…' : `↻ IMPORT FROM ${healthPlatformName().toUpperCase()}`}
                </Text>
              </TouchableOpacity>
              <Text className="text-sage-muted text-[9px] text-center">
                Reads workouts from the last 90 days on first import.
              </Text>
            </View>
          )}

          {/* Sign out */}
          <TouchableOpacity
            onPress={handleSignOut}
            activeOpacity={0.7}
            className="bg-red-500/10 border border-red-500/20 rounded-2xl py-3.5 items-center mb-8"
          >
            <Text className="text-red-400 font-bold text-sm tracking-wide">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="items-center">
      <Text className={`font-black text-2xl ${accent ? 'text-sage-green' : 'text-sage-text'}`}>
        {value}
      </Text>
      <Text className="text-sage-muted text-[9px] font-bold tracking-widest mt-1">{label}</Text>
    </View>
  );
}

function SportRow({
  icon, label, value, sessions, color,
}: {
  icon: string; label: string; value: string; sessions?: number; color: string;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-2.5">
        <Text style={{ fontSize: 20 }}>{icon}</Text>
        <View>
          <Text className="text-sage-text font-semibold text-sm">{label}</Text>
          {sessions != null && (
            <Text className="text-sage-muted text-xs">{sessions} sessions</Text>
          )}
        </View>
      </View>
      <Text className={`font-black text-base ${color}`}>{value}</Text>
    </View>
  );
}
