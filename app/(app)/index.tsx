import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useRaces } from '../../hooks/useRaces';
import { useMyEntries } from '../../hooks/useEntries';
import { RaceCard } from '../../components/RaceCard';
import { supabase } from '../../lib/supabase';
import { Race } from '../../types';

const SPORT_FILTERS = ['All', 'Run', 'Ride', 'Swim', 'WeightTraining', 'Rowing'];

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }
  const { races, loading: racesLoading } = useRaces('open');
  const { entries, refetch } = useMyEntries(user?.id);
  const [filter, setFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const joinedRaceIds = new Set(entries.map((e) => e.race_id));
  const myRaces = races.filter((r) => joinedRaceIds.has(r.id));
  const discoverRaces = races.filter(
    (r) => !joinedRaceIds.has(r.id) && (filter === 'All' || r.sport_types.includes(filter))
  );
  const topStreak = entries.reduce((max, e) => Math.max(max, e.streak), 0);
  const firstName = user?.name?.split(' ')[0] ?? 'Athlete';

  async function leaveRace(race: Race) {
    if (!user) return;
    await supabase.from('entries').delete().eq('user_id', user.id).eq('race_id', race.id);
    refetch();
  }

  async function joinRace(race: Race) {
    if (!user) return;
    const { error } = await supabase.from('entries').insert({
      user_id: user.id,
      race_id: race.id,
      sage_score: 0,
      sessions: 0,
      total_hours: 0,
      streak: 0,
      bonus_points: 0,
    });
    if (error) {
      if (error.code === '23505') return;
      Alert.alert('Error', error.message);
    } else {
      refetch();
      await supabase.functions.invoke('backfill-entry', {
        body: { user_id: user.id, race_id: race.id },
      });
      refetch();
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-sage-bg">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4ade80" />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-5 pb-5">
          <View>
            <Text className="text-sage-muted text-xs font-bold tracking-widest uppercase">
              Welcome back
            </Text>
            <Text className="text-sage-text text-3xl font-black">{firstName}</Text>
          </View>
          <View className="flex-row items-center gap-3">
              {topStreak > 0 && (
              <View className="bg-sage-surface rounded-2xl px-3 py-2 items-center">
                <Text style={{ fontSize: 22 }}>🔥</Text>
                <Text className="text-sage-text font-black text-sm leading-tight">{topStreak}</Text>
                <Text className="text-sage-muted text-[9px] font-bold tracking-wider uppercase">streak</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={handleSignOut}
              activeOpacity={0.7}
              className="bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-full"
            >
              <Text className="text-red-400 text-xs font-bold">Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* My Races */}
        {myRaces.length > 0 && (
          <View className="mb-5">
            <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase px-5 mb-3">
              Your Races
            </Text>
            <View className="px-5">
              {myRaces.map((race) => (
                <RaceCard
                  key={race.id}
                  race={race}
                  entry={entries.find((e) => e.race_id === race.id)}
                  onLeave={() => leaveRace(race)}
                  onPress={() => router.push({ pathname: '/(app)/race-detail', params: { id: race.id } })}
                />
              ))}
            </View>
          </View>
        )}

        {/* Discover */}
        <View className="mb-8">
          <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase px-5 mb-3">
            Discover Races
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            className="mb-4"
          >
            {SPORT_FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                activeOpacity={0.7}
                className={`mr-2 px-4 py-1.5 rounded-full ${
                  filter === f ? 'bg-sage-green' : 'bg-sage-surface'
                }`}
              >
                <Text
                  className={`text-sm font-bold ${filter === f ? 'text-black' : 'text-sage-muted'}`}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View className="px-5">
            {discoverRaces.map((race) => (
              <RaceCard key={race.id} race={race} onJoin={() => joinRace(race)} />
            ))}
            {discoverRaces.length === 0 && !racesLoading && (
              <View className="py-10 items-center">
                <Text className="text-2xl mb-2">🏁</Text>
                <Text className="text-sage-muted text-sm">No open races right now.</Text>
                <Text className="text-sage-muted text-xs mt-1">Check back soon.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
