import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '../../hooks/useAuth';
import { useSessions, useMySessionEnrollments } from '../../hooks/useSessions';
import { SessionCard } from '../../components/SessionCard';
import { GroupSession } from '../../types';

type FilterKey = 'All' | 'Nearby' | 'Mine' | 'Ride' | 'Run' | 'Swim' | 'Trail';
const SPORT_FILTERS: FilterKey[] = ['All', 'Nearby', 'Mine', 'Ride', 'Run', 'Swim', 'Trail'];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const dφ = (lat2 - lat1) * Math.PI / 180;
  const dλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const NEARBY_RADIUS_KM = 20;

export default function SessionsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('All');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const sport = !['All', 'Nearby', 'Mine'].includes(filter) ? filter : undefined;
  const mine = filter === 'Mine';

  const { sessions: rawSessions, loading, refetch } = useSessions({ sport, mine, userId: user?.id });
  const { enrolledIds, pendingIds, rejectedIds, refetch: refetchEnrollments } = useMySessionEnrollments(user?.id);

  useFocusEffect(useCallback(() => {
    refetch();
    refetchEnrollments();
  }, [refetch, refetchEnrollments]));

  async function activateNearby() {
    if (userCoords) { setFilter('Nearby'); return; }
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow location access to see nearby sessions.');
        setFilter('All');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setFilter('Nearby');
    } catch {
      Alert.alert('Error', 'Could not get your location.');
      setFilter('All');
    } finally {
      setLocating(false);
    }
  }

  function handleFilterPress(f: FilterKey) {
    if (f === 'Nearby') { activateNearby(); return; }
    setFilter(f);
  }

  // Compute distances and apply nearby filter
  const sessionsWithDistance = rawSessions.map((s) => {
    const dist =
      userCoords && s.latitude != null && s.longitude != null
        ? haversineKm(userCoords.lat, userCoords.lng, s.latitude, s.longitude)
        : null;
    return { ...s, distanceKm: dist };
  });

  let sessions = mine
    ? sessionsWithDistance
    : sessionsWithDistance.filter((s) => !rejectedIds.has(s.id));

  if (filter === 'Nearby' && userCoords) {
    sessions = sessions
      .filter((s) => s.distanceKm != null && s.distanceKm <= NEARBY_RADIUS_KM)
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  return (
    <SafeAreaView className="flex-1 bg-sage-bg">
      {/* Header */}
      <View className="px-5 pt-5 pb-4 flex-row justify-between items-start">
        <View>
          <Text className="text-sage-text text-3xl font-black">Sessions</Text>
          <Text className="text-sage-muted text-sm mt-0.5">
            {mine ? 'Sessions you host'
              : filter === 'Nearby' ? `Within ${NEARBY_RADIUS_KM} km`
              : 'Find your crew'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(app)/session-create')}
          activeOpacity={0.8}
          className="bg-sage-green rounded-xl px-4 py-2.5 mt-1"
        >
          <Text className="text-black font-black text-sm tracking-wide">+ HOST</Text>
        </TouchableOpacity>
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        className="mb-4 max-h-10"
      >
        {SPORT_FILTERS.map((f) => {
          const active = filter === f;
          const isNearby = f === 'Nearby';
          const isMine = f === 'Mine';
          const isLoading = isNearby && locating;

          return (
            <TouchableOpacity
              key={f}
              onPress={() => handleFilterPress(f)}
              activeOpacity={0.7}
              disabled={isLoading}
              className="mr-2 px-4 py-1.5 rounded-full"
              style={{
                backgroundColor: active
                  ? isMine ? '#7c3aed' : isNearby ? '#3b82f6' : '#4ade80'
                  : '#1a1a1a',
              }}
            >
              <Text style={{
                fontWeight: '700', fontSize: 13,
                color: active ? (isMine || isNearby ? '#fff' : '#000') : '#737373',
              }}>
                {isLoading ? '…' : isNearby ? '📍 Nearby' : isMine ? '⚡ My Sessions' : f}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <Text className="text-sage-muted text-sm text-center py-8">Loading…</Text>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          renderItem={({ item }) => {
            const isHosted = item.host_id === user?.id;
            return (
              <SessionCard
                session={item}
                isEnrolled={enrolledIds.has(item.id)}
                isPending={pendingIds.has(item.id)}
                isHosted={isHosted}
                distanceKm={(item as any).distanceKm ?? undefined}
                statusLabel={isHosted ? statusLabel(item.status) : undefined}
                statusColor={isHosted ? statusColor(item.status) : undefined}
                onPress={() =>
                  router.push({ pathname: '/(app)/session-detail', params: { id: item.id } })
                }
              />
            );
          }}
          ListEmptyComponent={
            <View className="py-16 items-center">
              <Text className="text-4xl mb-3">
                {filter === 'Nearby' ? '📍' : mine ? '⚡' : '🗓️'}
              </Text>
              <Text className="text-sage-text font-bold text-base mb-1">
                {filter === 'Nearby'
                  ? `No sessions within ${NEARBY_RADIUS_KM} km`
                  : mine ? 'No sessions hosted yet'
                  : 'No sessions yet'}
              </Text>
              <Text className="text-sage-muted text-sm">
                {filter === 'Nearby'
                  ? 'Hosts near you haven\'t posted any sessions yet.'
                  : 'Be the first to host one!'}
              </Text>
              {filter !== 'Nearby' && (
                <TouchableOpacity
                  onPress={() => router.push('/(app)/session-create')}
                  activeOpacity={0.8}
                  className="mt-5 bg-sage-green rounded-xl px-6 py-3"
                >
                  <Text className="text-black font-black tracking-wide">HOST A SESSION →</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListFooterComponent={<View className="h-6" />}
        />
      )}
    </SafeAreaView>
  );
}

function statusLabel(status: string) {
  return { open: 'Open', full: 'Full', archived: 'Archived', cancelled: 'Cancelled', completed: 'Done', draft: 'Draft' }[status] ?? status;
}
function statusColor(status: string) {
  return { open: '#4ade80', full: '#f87171', archived: '#737373', cancelled: '#f87171', completed: '#60a5fa' }[status] ?? '#737373';
}
