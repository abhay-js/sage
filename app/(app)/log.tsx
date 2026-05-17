import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useMyEntries } from '../../hooks/useEntries';
import { ActivityItem } from '../../components/ActivityItem';
import { supabase } from '../../lib/supabase';
import { ActivityLog } from '../../types';
import { SCORE_PER_SESSION, SCORE_PER_HOUR } from '../../lib/config';

export default function LogScreen() {
  const { user } = useAuth();
  const { entries } = useMyEntries(user?.id);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('activity_date', { ascending: false })
      .then(({ data }) => {
        setActivities(data ?? []);
        setLoading(false);
      });
  }, [user?.id]);

  const selectedEntry = entries.find((e) => e.race_id === selectedRaceId);
  const selectedRace = selectedEntry?.race as any;

  const filteredActivities =
    selectedRaceId && selectedRace
      ? activities.filter((a) => {
          const t = new Date(a.activity_date).getTime();
          return (
            selectedRace.sport_types?.includes(a.sport_type) &&
            t >= new Date(selectedRace.challenge_start).getTime() &&
            t <= new Date(selectedRace.challenge_end).getTime()
          );
        })
      : activities;

  function pointsForActivity(a: ActivityLog): number | undefined {
    if (!selectedRaceId || !selectedRace) return undefined;
    if (!selectedRace.sport_types?.includes(a.sport_type)) return undefined;
    return SCORE_PER_SESSION + Math.floor((a.moving_time_secs / 3600) * SCORE_PER_HOUR);
  }

  const totalSessions = filteredActivities.length;
  const totalMins = Math.round(filteredActivities.reduce((s, a) => s + a.moving_time_secs, 0) / 60);

  return (
    <SafeAreaView className="flex-1 bg-sage-bg">
      {/* Header */}
      <View className="px-5 pt-5 pb-3">
        <Text className="text-sage-text text-3xl font-black mb-4">Training Log</Text>

        {/* Race filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 20 }}
          className="-mx-5 px-5 mb-3"
        >
          <TouchableOpacity
            onPress={() => setSelectedRaceId(null)}
            activeOpacity={0.7}
            className={`mr-2 px-4 py-1.5 rounded-full ${
              selectedRaceId === null ? 'bg-sage-green' : 'bg-sage-surface'
            }`}
          >
            <Text
              className={`text-sm font-bold ${selectedRaceId === null ? 'text-black' : 'text-sage-muted'}`}
            >
              All
            </Text>
          </TouchableOpacity>
          {entries.map((e) => (
            <TouchableOpacity
              key={e.race_id}
              onPress={() => setSelectedRaceId(e.race_id)}
              activeOpacity={0.7}
              className={`mr-2 px-4 py-1.5 rounded-full ${
                selectedRaceId === e.race_id ? 'bg-sage-green' : 'bg-sage-surface'
              }`}
            >
              <Text
                className={`text-sm font-bold ${
                  selectedRaceId === e.race_id ? 'text-black' : 'text-sage-muted'
                }`}
              >
                {(e.race as any)?.name ?? 'Race'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Summary strip */}
        {!loading && filteredActivities.length > 0 && (
          <View className="flex-row gap-3 mb-1">
            <View className="flex-1 bg-sage-surface rounded-2xl px-4 py-3">
              <Text className="text-sage-text font-black text-xl">{totalSessions}</Text>
              <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mt-0.5">
                Activities
              </Text>
            </View>
            <View className="flex-1 bg-sage-surface rounded-2xl px-4 py-3">
              <Text className="text-sage-text font-black text-xl">
                {totalMins >= 60 ? `${(totalMins / 60).toFixed(1)}h` : `${totalMins}m`}
              </Text>
              <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mt-0.5">
                Total Time
              </Text>
            </View>
          </View>
        )}

        {selectedRace && (
          <View className="mt-3 bg-sage-green/10 border border-sage-green/20 rounded-xl px-3 py-2">
            <Text className="text-sage-green text-xs font-semibold">
              Counting: {selectedRace.sport_types?.join(', ')} · within challenge window
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <Text className="text-sage-muted text-sm text-center py-8">Loading…</Text>
      ) : (
        <FlatList
          data={filteredActivities}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ActivityItem activity={item} pointsEarned={pointsForActivity(item)} />
          )}
          ListEmptyComponent={
            <View className="py-16 items-center">
              <Text className="text-4xl mb-3">⚡</Text>
              <Text className="text-sage-text font-bold text-base mb-1">No activities yet</Text>
              <Text className="text-sage-muted text-sm">Connect Strava to see your training here.</Text>
            </View>
          }
          ListFooterComponent={<View className="h-6" />}
        />
      )}
    </SafeAreaView>
  );
}
