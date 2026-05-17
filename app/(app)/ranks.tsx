import { useState, useEffect } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useMyEntries, useLeaderboard } from '../../hooks/useEntries';
import { LeaderboardRow } from '../../components/LeaderboardRow';
import { Entry } from '../../types';

type SortKey = 'sage_score' | 'sessions' | 'total_hours' | 'streak';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'sage_score', label: 'Score' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'total_hours', label: 'Hours' },
  { key: 'streak', label: 'Streak' },
];

type AnyEntry = Entry & { user: any };

function PodiumBlock({
  entry,
  rank,
}: {
  entry?: AnyEntry;
  rank: 1 | 2 | 3;
}) {
  const configs = {
    1: { emoji: '🥇', textColor: '#facc15', bg: 'rgba(250,204,21,0.15)', barH: 64 },
    2: { emoji: '🥈', textColor: '#d4d4d8', bg: 'rgba(212,212,216,0.12)', barH: 44 },
    3: { emoji: '🥉', textColor: '#f59e0b', bg: 'rgba(245,158,11,0.12)', barH: 32 },
  };
  const cfg = configs[rank];

  if (!entry) {
    return (
      <View className="flex-1 items-center justify-end">
        <View style={{ height: cfg.barH, backgroundColor: '#1a1a1a', borderRadius: 8 }} className="w-full rounded-t-xl" />
      </View>
    );
  }

  const firstName = entry.user?.name?.split(' ')[0] ?? 'Athlete';
  const initials = entry.user?.name
    ?.split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  return (
    <View className="flex-1 items-center">
      <Text className="text-xs font-bold text-sage-muted mb-1" numberOfLines={1}>
        {firstName}
      </Text>
      <View
        className="w-12 h-12 rounded-full items-center justify-center mb-1"
        style={{ backgroundColor: cfg.bg }}
      >
        <Text className="text-sm font-black" style={{ color: cfg.textColor }}>
          {initials}
        </Text>
      </View>
      <Text style={{ fontSize: rank === 1 ? 22 : 18 }}>{cfg.emoji}</Text>
      <View
        className="w-full rounded-t-xl mt-2 items-center justify-center"
        style={{ height: cfg.barH, backgroundColor: '#1a1a1a' }}
      >
        <Text className="text-xs font-black" style={{ color: cfg.textColor }}>
          {entry.sage_score.toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

export default function RanksScreen() {
  const { user } = useAuth();
  const { entries: myEntries } = useMyEntries(user?.id);
  const [selectedRaceId, setSelectedRaceId] = useState<string | undefined>(undefined);
  const [sortKey, setSortKey] = useState<SortKey>('sage_score');

  // Set default race once entries load
  useEffect(() => {
    if (!selectedRaceId && myEntries.length > 0) {
      setSelectedRaceId(myEntries[0].race_id);
    }
  }, [myEntries]);

  const { entries, loading } = useLeaderboard(selectedRaceId);

  const sorted = [...entries].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));
  const top3 = sorted.slice(0, 3) as AnyEntry[];
  const myRank = sorted.findIndex((e) => e.user_id === user?.id) + 1;

  return (
    <SafeAreaView className="flex-1 bg-sage-bg">
      {/* Header */}
      <View className="px-5 pt-5 pb-3">
        <Text className="text-sage-text text-3xl font-black mb-4">Leaderboard</Text>

        {myEntries.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 20 }}
            className="-mx-5 px-5 mb-3"
          >
            {myEntries.map((e) => (
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
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 20 }}
          className="-mx-5 px-5"
        >
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setSortKey(opt.key)}
              activeOpacity={0.7}
              className={`mr-2 px-3 py-1 rounded-full border ${
                sortKey === opt.key
                  ? 'border-sage-green bg-sage-green/10'
                  : 'border-transparent bg-transparent'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  sortKey === opt.key ? 'text-sage-green' : 'text-sage-muted'
                }`}
              >
                {opt.label.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <Text className="text-sage-muted text-sm text-center py-8">Loading…</Text>
      ) : myEntries.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-4xl mb-3">🏆</Text>
          <Text className="text-sage-text font-bold text-base mb-1">No races yet</Text>
          <Text className="text-sage-muted text-sm">Join a race to enter the leaderboard.</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Your rank callout */}
              {myRank > 0 && (
                <View className="mx-5 mb-5 bg-sage-surface rounded-2xl px-4 py-3 flex-row justify-between items-center">
                  <Text className="text-sage-muted text-xs font-bold tracking-widest uppercase">
                    Your Rank
                  </Text>
                  <Text className="text-sage-green font-black text-2xl">#{myRank}</Text>
                </View>
              )}

              {/* Podium */}
              {top3.length > 0 && (
                <View className="px-5 mb-2">
                  <View className="flex-row items-end gap-2" style={{ height: 160 }}>
                    <PodiumBlock entry={top3[1]} rank={2} />
                    <PodiumBlock entry={top3[0]} rank={1} />
                    <PodiumBlock entry={top3[2]} rank={3} />
                  </View>
                </View>
              )}

              {sorted.length > 0 && (
                <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase px-5 pt-4 pb-2">
                  All Athletes
                </Text>
              )}
            </>
          }
          renderItem={({ item, index }) => (
            <LeaderboardRow
              rank={index + 1}
              user={item.user}
              entry={item}
              isMe={item.user_id === user?.id}
            />
          )}
          ListEmptyComponent={
            sorted.length === 0 ? (
              <Text className="text-sage-muted text-sm text-center py-8">No athletes yet.</Text>
            ) : null
          }
          ListFooterComponent={<View className="h-6" />}
        />
      )}
    </SafeAreaView>
  );
}
