import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Challenge } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SPORT_ICONS: Record<string, string> = {
  Run: '🏃',
  Ride: '🚴',
  Swim: '🏊',
  Trail: '🥾',
  Any: '⚡',
};

const DIFF_COLORS: Record<string, string> = {
  beginner: '#4ade80',
  intermediate: '#fb923c',
  elite: '#f87171',
};

interface LeaderboardRow {
  user_id: string;
  user_name: string;
  user_email: string;
  progress: number;
  rank: number;
}

function daysLeft(endDate: string): number {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function rankMedal(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return String(rank);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [joined, setJoined] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'about'>('leaderboard');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const [{ data: chal }, { data: part }, { data: lb }] = await Promise.all([
      supabase.from('challenges').select('*').eq('id', id).single(),
      user
        ? supabase
            .from('challenge_participants')
            .select('id')
            .eq('challenge_id', id)
            .eq('user_id', user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.rpc('get_challenge_leaderboard', { p_challenge_id: id }),
    ]);

    setChallenge(chal ?? null);
    setJoined(!!part);
    setLeaderboard(lb ?? []);
    setLoading(false);
  }, [id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleJoin() {
    if (!user || !challenge) return;
    setActionLoading(true);
    await supabase
      .from('challenge_participants')
      .insert({ challenge_id: challenge.id, user_id: user.id });
    await load();
    setActionLoading(false);
  }

  async function handleLeave() {
    if (!user || !challenge) return;
    Alert.alert('Leave challenge?', 'Your progress will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          await supabase
            .from('challenge_participants')
            .delete()
            .eq('challenge_id', challenge.id)
            .eq('user_id', user.id);
          await load();
          setActionLoading(false);
        },
      },
    ]);
  }

  if (loading || !challenge) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#4ade80" size="large" />
      </View>
    );
  }

  const color = challenge.cover_color || '#4ade80';
  const dc = DIFF_COLORS[challenge.difficulty] ?? '#737373';
  const icon = SPORT_ICONS[challenge.sport_type] ?? '⚡';
  const dl = daysLeft(challenge.end_date);

  const myRow = leaderboard.find((r) => r.user_id === user?.id);
  const progress = myRow?.progress ?? 0;
  const progressPct = Math.min(1, progress / challenge.target_value);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View
          style={{
            height: 220,
            backgroundColor: color + '20',
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
            overflow: 'hidden',
            padding: 20,
            paddingTop: 52,
            justifyContent: 'flex-end',
          }}
        >
          <Text
            style={{
              position: 'absolute',
              right: 12,
              bottom: 4,
              fontSize: 130,
              opacity: 0.1,
            }}
          >
            {icon}
          </Text>

          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{
              position: 'absolute',
              top: 52,
              left: 20,
              backgroundColor: '#00000044',
              borderRadius: 20,
              width: 36,
              height: 36,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#f5f5f5', fontSize: 18, fontWeight: '700' }}>‹</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <View
              style={{
                backgroundColor: dc + '22',
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: dc + '44',
              }}
            >
              <Text style={{ color: dc, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
                {challenge.difficulty.toUpperCase()}
              </Text>
            </View>
            {challenge.is_brand_challenge && challenge.brand_name && (
              <View
                style={{
                  backgroundColor: color + '22',
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: color + '44',
                }}
              >
                <Text style={{ color, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
                  🏷 {challenge.brand_name.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <Text
            style={{
              color: '#f5f5f5',
              fontSize: 26,
              fontWeight: '900',
              lineHeight: 30,
              marginBottom: 6,
            }}
            numberOfLines={2}
          >
            {challenge.title}
          </Text>
          {challenge.subtitle && (
            <Text
              style={{ color: '#a3a3a3', fontSize: 14, fontWeight: '500' }}
              numberOfLines={1}
            >
              {challenge.subtitle}
            </Text>
          )}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 }}>
          <View
            style={{
              backgroundColor: '#1a1a1a',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            {[
              { label: 'DAYS LEFT', value: `${dl}d` },
              { label: 'ATHLETES', value: String(challenge.participant_count) },
              { label: 'TARGET', value: `${challenge.target_value}${challenge.target_unit}` },
              ...(joined && myRow ? [{ label: 'YOUR RANK', value: `#${myRow.rank}` }] : []),
            ].map((stat, i) => (
              <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ color: '#f5f5f5', fontSize: 18, fontWeight: '900' }}>
                  {stat.value}
                </Text>
                <Text
                  style={{
                    color: '#737373',
                    fontSize: 9,
                    fontWeight: '700',
                    letterSpacing: 0.5,
                    marginTop: 3,
                  }}
                >
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>

          {joined && (
            <View
              style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: '#737373',
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 1,
                  marginBottom: 10,
                }}
              >
                YOUR PROGRESS
              </Text>
              <View
                style={{
                  height: 8,
                  backgroundColor: color + '22',
                  borderRadius: 4,
                  marginBottom: 8,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: 8,
                    width: `${progressPct * 100}%`,
                    backgroundColor: color,
                    borderRadius: 4,
                  }}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#f5f5f5', fontSize: 14, fontWeight: '700' }}>
                  {progress.toFixed(1)} / {challenge.target_value}
                  {challenge.target_unit}
                </Text>
                <Text style={{ color: color, fontSize: 14, fontWeight: '800' }}>
                  {Math.round(progressPct * 100)}%
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={joined ? handleLeave : handleJoin}
            activeOpacity={0.85}
            disabled={actionLoading}
            style={{
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              marginBottom: 16,
              backgroundColor: joined ? '#1a1a1a' : '#4ade80',
              borderWidth: joined ? 1 : 0,
              borderColor: joined ? '#2a2a2a' : 'transparent',
            }}
          >
            {actionLoading ? (
              <ActivityIndicator color={joined ? '#737373' : '#000'} />
            ) : (
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '800',
                  letterSpacing: 0.5,
                  color: joined ? '#737373' : '#000',
                }}
              >
                {joined ? 'Leave Challenge' : 'Join Challenge'}
              </Text>
            )}
          </TouchableOpacity>

          {challenge.reward_title && (
            <View
              style={{
                backgroundColor: '#ffcc0012',
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#ffcc0022',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Text style={{ fontSize: 24 }}>🏅</Text>
                <Text style={{ color: '#ffcc00', fontSize: 14, fontWeight: '800' }}>
                  {challenge.reward_title}
                </Text>
              </View>
              {challenge.reward_description && (
                <Text style={{ color: '#a3a3a3', fontSize: 13, lineHeight: 18 }}>
                  {challenge.reward_description}
                </Text>
              )}
            </View>
          )}

          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#1a1a1a',
              borderRadius: 12,
              padding: 4,
              marginBottom: 20,
            }}
          >
            {(['leaderboard', 'about'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: activeTab === tab ? color + '22' : 'transparent',
                  borderWidth: activeTab === tab ? 1 : 0,
                  borderColor: activeTab === tab ? color + '44' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    letterSpacing: 0.5,
                    color: activeTab === tab ? color : '#737373',
                  }}
                >
                  {tab === 'leaderboard' ? 'LEADERBOARD' : 'ABOUT'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'leaderboard' && (
            <View>
              {leaderboard.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Text style={{ fontSize: 32, marginBottom: 12 }}>🏁</Text>
                  <Text style={{ color: '#f5f5f5', fontSize: 16, fontWeight: '700', marginBottom: 6 }}>
                    No athletes yet
                  </Text>
                  <Text style={{ color: '#737373', fontSize: 13 }}>Be the first to join!</Text>
                </View>
              ) : (
                leaderboard.map((row) => {
                  const isMe = row.user_id === user?.id;
                  return (
                    <View
                      key={row.user_id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderRadius: 14,
                        marginBottom: 8,
                        backgroundColor: isMe ? color + '14' : '#1a1a1a',
                        borderWidth: isMe ? 1 : 0,
                        borderColor: isMe ? color + '33' : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          width: 32,
                          fontSize: row.rank <= 3 ? 20 : 14,
                          fontWeight: '800',
                          color: row.rank <= 3 ? '#f5f5f5' : '#737373',
                          textAlign: 'center',
                        }}
                      >
                        {rankMedal(row.rank)}
                      </Text>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: color + '33',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginHorizontal: 10,
                        }}
                      >
                        <Text style={{ color, fontSize: 13, fontWeight: '800' }}>
                          {initials(row.user_name || row.user_email || 'U')}
                        </Text>
                      </View>
                      <Text
                        style={{
                          flex: 1,
                          color: '#f5f5f5',
                          fontSize: 14,
                          fontWeight: isMe ? '800' : '600',
                        }}
                        numberOfLines={1}
                      >
                        {row.user_name || row.user_email}
                        {isMe ? '  (you)' : ''}
                      </Text>
                      <Text style={{ color: color, fontSize: 14, fontWeight: '800' }}>
                        {row.progress.toFixed(1)}
                        <Text style={{ color: '#737373', fontSize: 11, fontWeight: '600' }}>
                          {' '}{challenge.target_unit}
                        </Text>
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {activeTab === 'about' && (
            <View>
              {challenge.description && (
                <View
                  style={{
                    backgroundColor: '#1a1a1a',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 14,
                  }}
                >
                  <Text
                    style={{
                      color: '#737373',
                      fontSize: 10,
                      fontWeight: '800',
                      letterSpacing: 1,
                      marginBottom: 10,
                    }}
                  >
                    DESCRIPTION
                  </Text>
                  <Text style={{ color: '#a3a3a3', fontSize: 14, lineHeight: 22 }}>
                    {challenge.description}
                  </Text>
                </View>
              )}

              <View
                style={{
                  backgroundColor: '#1a1a1a',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 14,
                }}
              >
                <Text
                  style={{
                    color: '#737373',
                    fontSize: 10,
                    fontWeight: '800',
                    letterSpacing: 1,
                    marginBottom: 12,
                  }}
                >
                  DETAILS
                </Text>
                {[
                  { label: 'Sport', value: challenge.sport_type },
                  { label: 'Type', value: challenge.challenge_type },
                  {
                    label: 'Target',
                    value: `${challenge.target_value} ${challenge.target_unit}`,
                  },
                  {
                    label: 'Starts',
                    value: formatDate(challenge.start_date),
                  },
                  {
                    label: 'Ends',
                    value: formatDate(challenge.end_date),
                  },
                  { label: 'Difficulty', value: challenge.difficulty },
                ].map((item, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 6,
                      borderBottomWidth: i < 5 ? 1 : 0,
                      borderBottomColor: '#2a2a2a',
                    }}
                  >
                    <Text style={{ color: '#737373', fontSize: 13, fontWeight: '600' }}>
                      {item.label}
                    </Text>
                    <Text
                      style={{
                        color: '#f5f5f5',
                        fontSize: 13,
                        fontWeight: '700',
                        textTransform: 'capitalize',
                      }}
                    >
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>

              {challenge.is_brand_challenge && challenge.brand_name && (
                <View
                  style={{
                    backgroundColor: color + '12',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 14,
                    borderWidth: 1,
                    borderColor: color + '22',
                  }}
                >
                  <Text
                    style={{
                      color: '#737373',
                      fontSize: 10,
                      fontWeight: '800',
                      letterSpacing: 1,
                      marginBottom: 12,
                    }}
                  >
                    BRAND
                  </Text>
                  <Text style={{ color: '#f5f5f5', fontSize: 18, fontWeight: '900', marginBottom: 10 }}>
                    {challenge.brand_name}
                  </Text>
                  <View style={{ gap: 10 }}>
                    {challenge.brand_instagram && (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(`https://instagram.com/${challenge.brand_instagram}`)
                        }
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                      >
                        <Text style={{ fontSize: 18 }}>📸</Text>
                        <Text style={{ color: color, fontSize: 14, fontWeight: '700' }}>
                          @{challenge.brand_instagram}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {challenge.brand_website && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(challenge.brand_website!)}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                      >
                        <Text style={{ fontSize: 18 }}>🌐</Text>
                        <Text style={{ color: color, fontSize: 14, fontWeight: '700' }}>
                          {challenge.brand_website}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
