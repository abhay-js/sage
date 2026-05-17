import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useLeaderboard } from '../../hooks/useEntries';
import { LeaderboardRow } from '../../components/LeaderboardRow';
import { supabase } from '../../lib/supabase';
import { Race, Entry } from '../../types';

type SortKey = 'sage_score' | 'sessions' | 'total_hours' | 'streak';
type Tab = 'ranks' | 'awards' | 'tips';
type AnyEntry = Entry & { user: any };

// ── Achievement definitions ───────────────────────────────────────────────
const ACHIEVEMENTS: {
  id: string; emoji: string; title: string; desc: string;
  check: (e: Entry) => boolean;
}[] = [
  { id: 'first',   emoji: '⚡', title: 'First Move',    desc: 'Logged your first session',  check: (e) => e.sessions >= 1 },
  { id: 's5',      emoji: '🔥', title: 'On Fire',       desc: '5 sessions done',             check: (e) => e.sessions >= 5 },
  { id: 's10',     emoji: '💪', title: 'Consistent',    desc: '10 sessions done',            check: (e) => e.sessions >= 10 },
  { id: 's25',     emoji: '🎯', title: 'Dedicated',     desc: '25 sessions done',            check: (e) => e.sessions >= 25 },
  { id: 's50',     emoji: '🏅', title: 'Machine',       desc: '50 sessions done',            check: (e) => e.sessions >= 50 },
  { id: 'str3',    emoji: '🌱', title: 'Building',      desc: '3-day streak',                check: (e) => e.streak >= 3 },
  { id: 'str7',    emoji: '🌟', title: 'Week Strong',   desc: '7-day streak',                check: (e) => e.streak >= 7 },
  { id: 'str14',   emoji: '⚡', title: 'Two Weeks',     desc: '14-day streak',               check: (e) => e.streak >= 14 },
  { id: 'str30',   emoji: '👑', title: 'Unstoppable',   desc: '30-day streak',               check: (e) => e.streak >= 30 },
  { id: 'h5',      emoji: '⏱️', title: 'Five Hours',    desc: '5 hours trained',             check: (e) => e.total_hours >= 5 },
  { id: 'h20',     emoji: '🏆', title: 'Twenty Hours',  desc: '20 hours trained',            check: (e) => e.total_hours >= 20 },
  { id: 'p1k',     emoji: '🌟', title: '1K Points',     desc: '1,000 sage score',            check: (e) => e.sage_score >= 1000 },
  { id: 'p5k',     emoji: '🥇', title: 'Elite',         desc: '5,000 sage score',            check: (e) => e.sage_score >= 5000 },
];

// ── Sport-specific tips ───────────────────────────────────────────────────
const SPORT_TIPS: Record<string, string[]> = {
  Run: [
    'Run easy 80% of the time. Zone 2 base is everything.',
    'Consistency beats intensity — daily easy runs win long-term.',
    'Rest days ARE training days. That\'s when you get stronger.',
    'Long run once a week at conversational pace builds endurance.',
    'Cadence around 170-180 spm reduces injury risk significantly.',
  ],
  Ride: [
    'Base miles in Zone 2 build the engine for everything else.',
    'Cadence above 90 rpm reduces knee stress on long rides.',
    'Fuel starts at 45 min — don\'t wait until you\'re empty.',
    'Recovery rides should feel embarrassingly easy. That\'s the point.',
    'Consistent low-intensity volume beats occasional hard days.',
  ],
  Swim: [
    'Technique before speed. Drill work pays dividends in the water.',
    'Bilateral breathing balances your stroke and improves efficiency.',
    'Pull buoy sets isolate upper body — great for strength work.',
    'Kick less in open water to save your legs for the run/ride.',
  ],
  WeightTraining: [
    'Progressive overload is the law. Add weight or reps every week.',
    'Compound lifts (squat, deadlift, press) first when you\'re fresh.',
    'Sleep is when you grow. Prioritize 8 hours around training.',
    'Protein within 30 min post-workout accelerates recovery.',
  ],
  Rowing: [
    'Drive with legs first, then lean back, then pull arms.',
    'Catch angle and posture matter more than raw power.',
    'Long slow steady pieces build your aerobic base on the water.',
  ],
};

export default function RaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [race, setRace] = useState<Race | null>(null);
  const [myEntry, setMyEntry] = useState<Entry | null>(null);
  const [dbTips, setDbTips] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>('ranks');
  const [sortKey, setSortKey] = useState<SortKey>('sage_score');
  const { entries, loading } = useLeaderboard(id);

  useEffect(() => {
    if (!id) return;
    supabase.from('races').select('*').eq('id', id).single()
      .then(({ data }) => setRace(data));
    // Fetch admin-managed tips for this race
    supabase.from('race_tips').select('content').eq('race_id', id)
      .order('sort_order', { ascending: true })
      .then(({ data }) => { if (data?.length) setDbTips(data.map((t) => t.content)); });
  }, [id]);

  useEffect(() => {
    if (!id || !user?.id) return;
    supabase.from('entries').select('*')
      .eq('race_id', id).eq('user_id', user.id).single()
      .then(({ data }) => setMyEntry(data));
  }, [id, user?.id]);

  const sorted = [...entries].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));
  const top3 = sorted.slice(0, 3) as AnyEntry[];
  const myRank = sorted.findIndex((e) => e.user_id === user?.id) + 1;
  const nextEntry = myRank > 1 ? sorted[myRank - 2] : null;
  const pointsToNext = nextEntry && myEntry ? (nextEntry[sortKey] as number) - (myEntry[sortKey] as number) : 0;
  const daysLeft = race
    ? Math.max(0, Math.ceil((new Date(race.challenge_end).getTime() - Date.now()) / 86_400_000))
    : 0;
  const totalDays = race
    ? Math.ceil((new Date(race.challenge_end).getTime() - new Date(race.challenge_start).getTime()) / 86_400_000)
    : 1;
  const progress = Math.min((totalDays - daysLeft) / totalDays, 1);

  const unlockedIds = new Set(
    myEntry ? ACHIEVEMENTS.filter((a) => a.check(myEntry!)).map((a) => a.id) : [],
  );

  // Tips: admin-managed DB tips take priority; fall back to sport-specific defaults
  const raceSports = race?.sport_types ?? [];
  const staticTips = raceSports.flatMap((s) => (SPORT_TIPS[s] ?? []));
  const tips = dbTips.length > 0 ? dbTips : (staticTips.length > 0 ? staticTips : SPORT_TIPS.Run);

  return (
    <SafeAreaView className="flex-1 bg-sage-bg">
      {/* Fixed header */}
      <View className="px-5 pt-4 pb-3">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} className="mb-4">
          <Text className="text-sage-muted text-sm font-bold">← Back</Text>
        </TouchableOpacity>

        {race && (
          <View className="mb-3">
            <Text className="text-sage-text text-2xl font-black">{race.name}</Text>
            {race.city && <Text className="text-sage-muted text-sm mt-0.5">{race.city}</Text>}
            <View className="flex-row items-center gap-3 mt-2">
              <Text className="text-sage-muted text-xs">
                {daysLeft > 0 ? `${daysLeft} days left` : 'Ended'}
              </Text>
              {myRank > 0 && (
                <View className="bg-sage-green/15 px-2.5 py-0.5 rounded-full">
                  <Text className="text-sage-green text-xs font-bold">Your rank #{myRank}</Text>
                </View>
              )}
            </View>
            {/* Race progress bar */}
            <View className="h-1 bg-[#1a1a1a] rounded-full mt-2 overflow-hidden">
              <View className="h-full bg-sage-green/50 rounded-full" style={{ width: `${Math.round(progress * 100)}%` }} />
            </View>
          </View>
        )}

        {/* Tab bar */}
        <View className="flex-row gap-1 bg-sage-surface rounded-2xl p-1">
          {([['ranks', 'Ranks'], ['awards', 'Awards'], ['tips', 'Tips']] as const).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setTab(key)}
              activeOpacity={0.8}
              className="flex-1 items-center py-2 rounded-xl"
              style={{ backgroundColor: tab === key ? '#0a0a0a' : 'transparent' }}
            >
              <Text style={{
                color: tab === key ? '#f5f5f5' : '#737373',
                fontWeight: '700', fontSize: 12,
                letterSpacing: 0.5, textTransform: 'uppercase',
              }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── RANKS TAB ── */}
      {tab === 'ranks' && (
        <>
          {/* Sort pills */}
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            className="mb-2 max-h-9"
          >
            {([['sage_score','Score'],['sessions','Sessions'],['total_hours','Hours'],['streak','Streak']] as const).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                onPress={() => setSortKey(key)}
                activeOpacity={0.7}
                className={`mr-2 px-3 py-1 rounded-full border ${sortKey === key ? 'border-sage-green bg-sage-green/10' : 'border-transparent bg-transparent'}`}
              >
                <Text className={`text-xs font-bold ${sortKey === key ? 'text-sage-green' : 'text-sage-muted'}`}>
                  {label.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <Text className="text-sage-muted text-sm text-center py-8">Loading…</Text>
          ) : (
            <FlatList
              data={sorted}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <>
                  {myRank > 0 && (
                    <View className="mx-5 mb-4 bg-sage-surface rounded-2xl px-4 py-3 flex-row justify-between items-center">
                      <Text className="text-sage-muted text-xs font-bold tracking-widest uppercase">Your Rank</Text>
                      <Text className="text-sage-green font-black text-2xl">#{myRank}</Text>
                    </View>
                  )}
                  {top3.length > 0 && (
                    <View className="px-5 mb-4">
                      <View className="flex-row items-end gap-2" style={{ height: 140 }}>
                        <PodiumBlock entry={top3[1]} rank={2} />
                        <PodiumBlock entry={top3[0]} rank={1} />
                        <PodiumBlock entry={top3[2]} rank={3} />
                      </View>
                    </View>
                  )}
                  {sorted.length > 0 && (
                    <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase px-5 pt-2 pb-2">
                      All Athletes
                    </Text>
                  )}
                </>
              }
              renderItem={({ item, index }) => (
                <LeaderboardRow rank={index + 1} user={item.user} entry={item} isMe={item.user_id === user?.id} sortKey={sortKey} />
              )}
              ListEmptyComponent={
                <View className="py-16 items-center">
                  <Text className="text-4xl mb-3">🏆</Text>
                  <Text className="text-sage-text font-bold text-base mb-1">No athletes yet</Text>
                  <Text className="text-sage-muted text-sm">Be the first to join.</Text>
                </View>
              }
              ListFooterComponent={<View className="h-6" />}
            />
          )}
        </>
      )}

      {/* ── AWARDS TAB ── */}
      {tab === 'awards' && (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 8 }}>
          {!myEntry ? (
            <View className="py-16 items-center">
              <Text className="text-4xl mb-3">🏅</Text>
              <Text className="text-sage-text font-bold text-base mb-1">Join this race to earn awards</Text>
              <Text className="text-sage-muted text-sm">Log sessions to unlock badges.</Text>
            </View>
          ) : (
            <>
              <View className="bg-sage-surface rounded-2xl px-4 py-3 flex-row justify-between items-center mb-4">
                <Text className="text-sage-muted text-xs font-bold tracking-widest uppercase">Unlocked</Text>
                <Text className="text-sage-green font-black text-lg">
                  {unlockedIds.size}
                  <Text className="text-sage-muted font-normal text-sm"> / {ACHIEVEMENTS.length}</Text>
                </Text>
              </View>

              <View className="flex-row flex-wrap gap-3">
                {ACHIEVEMENTS.map((a) => {
                  const unlocked = unlockedIds.has(a.id);
                  return (
                    <View
                      key={a.id}
                      style={{
                        width: '47%',
                        backgroundColor: unlocked ? '#1a1a1a' : '#111',
                        borderRadius: 16,
                        padding: 16,
                        opacity: unlocked ? 1 : 0.45,
                        borderWidth: unlocked ? 1 : 0,
                        borderColor: '#4ade8030',
                      }}
                    >
                      <Text style={{ fontSize: 28, marginBottom: 8 }}>{a.emoji}</Text>
                      <Text style={{ color: unlocked ? '#f5f5f5' : '#737373', fontWeight: '800', fontSize: 13, marginBottom: 2 }}>
                        {a.title}
                      </Text>
                      <Text style={{ color: '#737373', fontSize: 11 }}>{a.desc}</Text>
                      {unlocked && (
                        <View style={{ position: 'absolute', top: 10, right: 10 }}>
                          <Text style={{ color: '#4ade80', fontSize: 11, fontWeight: '900' }}>✓</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
              <View className="h-8" />
            </>
          )}
        </ScrollView>
      )}

      {/* ── TIPS TAB ── */}
      {tab === 'tips' && (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 8 }}>
          {/* Progress snapshot */}
          {myEntry && (
            <View className="bg-sage-surface rounded-2xl p-4 mb-4">
              <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mb-3">Your Progress</Text>
              <View className="flex-row justify-between">
                <SnapStat label="RANK" value={myRank > 0 ? `#${myRank}` : '—'} accent />
                <SnapStat label="SCORE" value={myEntry.sage_score.toLocaleString()} />
                <SnapStat label="SESSIONS" value={String(myEntry.sessions)} />
                <SnapStat label="STREAK" value={myEntry.streak > 0 ? `${myEntry.streak}🔥` : '0'} />
              </View>
            </View>
          )}

          {/* Gap to next rank */}
          {myEntry && myRank > 1 && nextEntry && (
            <View className="bg-[#7c3aed15] border border-[#7c3aed30] rounded-2xl p-4 mb-4">
              <Text className="text-[#a78bfa] text-[10px] font-bold tracking-widest uppercase mb-1">
                Gap to #{myRank - 1}
              </Text>
              <Text className="text-sage-text font-black text-xl">
                +{pointsToNext.toLocaleString()} pts
              </Text>
              <Text className="text-sage-muted text-xs mt-1">
                {(nextEntry as any).user?.name?.split(' ')[0] ?? 'Next athlete'} is ahead — keep pushing.
              </Text>
            </View>
          )}

          {myRank === 1 && myEntry && (
            <View className="bg-[#facc1515] border border-[#facc1530] rounded-2xl p-4 mb-4">
              <Text className="text-yellow-400 text-[10px] font-bold tracking-widest uppercase mb-1">
                You're Leading
              </Text>
              <Text className="text-sage-text font-black text-xl">🥇 #{myRank}</Text>
              <Text className="text-sage-muted text-xs mt-1">Keep training — the gap can shrink fast.</Text>
            </View>
          )}

          {/* Days left context */}
          {race && (
            <View className="bg-sage-surface rounded-2xl p-4 mb-4 flex-row justify-between items-center">
              <View>
                <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mb-1">
                  Race window
                </Text>
                <Text className="text-sage-text font-black text-xl">
                  {daysLeft > 0 ? `${daysLeft} days left` : 'Race ended'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text className="text-sage-muted text-xs">{Math.round(progress * 100)}% complete</Text>
                {daysLeft <= 7 && daysLeft > 0 && (
                  <Text className="text-orange-400 text-xs font-bold mt-0.5">Final push! ⚡</Text>
                )}
              </View>
            </View>
          )}

          {/* Sport tips */}
          <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mb-3">
            Training Tips
          </Text>
          {tips.map((tip, i) => (
            <View key={i} className="bg-sage-surface rounded-2xl p-4 mb-3 flex-row gap-3">
              <Text className="text-sage-green font-black text-lg leading-tight">#{i + 1}</Text>
              <Text className="text-sage-text text-sm leading-relaxed flex-1">{tip}</Text>
            </View>
          ))}
          <View className="h-8" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function PodiumBlock({ entry, rank }: { entry?: AnyEntry; rank: 1 | 2 | 3 }) {
  const configs = {
    1: { emoji: '🥇', color: '#facc15', bg: 'rgba(250,204,21,0.15)', h: 56 },
    2: { emoji: '🥈', color: '#d4d4d8', bg: 'rgba(212,212,216,0.12)', h: 38 },
    3: { emoji: '🥉', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', h: 28 },
  };
  const c = configs[rank];
  if (!entry) {
    return (
      <View className="flex-1 items-center justify-end">
        <View style={{ height: c.h, backgroundColor: '#1a1a1a', borderRadius: 8 }} className="w-full rounded-t-xl" />
      </View>
    );
  }
  const firstName = entry.user?.name?.split(' ')[0] ?? 'Athlete';
  const initials = entry.user?.name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';
  return (
    <View className="flex-1 items-center">
      <Text className="text-xs font-bold text-sage-muted mb-1" numberOfLines={1}>{firstName}</Text>
      <View className="w-10 h-10 rounded-full items-center justify-center mb-1" style={{ backgroundColor: c.bg }}>
        <Text className="text-sm font-black" style={{ color: c.color }}>{initials}</Text>
      </View>
      <Text style={{ fontSize: rank === 1 ? 20 : 16 }}>{c.emoji}</Text>
      <View className="w-full rounded-t-xl mt-1.5 items-center justify-center" style={{ height: c.h, backgroundColor: '#1a1a1a' }}>
        <Text className="text-xs font-black" style={{ color: c.color }}>{entry.sage_score.toLocaleString()}</Text>
      </View>
    </View>
  );
}

function SnapStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="items-center">
      <Text className={`font-black text-xl ${accent ? 'text-sage-green' : 'text-sage-text'}`}>{value}</Text>
      <Text className="text-sage-muted text-[9px] font-bold tracking-widest mt-0.5">{label}</Text>
    </View>
  );
}
