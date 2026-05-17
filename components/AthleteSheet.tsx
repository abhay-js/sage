import { useEffect, useState } from 'react';
import {
  View, Text, Modal, Pressable, ScrollView, ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';

interface AthleteStats {
  name: string;
  status: string;
  totalScore: number;
  totalSessions: number;
  totalHours: number;
  topStreak: number;
  raceCount: number;
  races: { name: string; score: number; sessions: number; streak: number }[];
}

interface Props {
  userId: string | null;
  onClose: () => void;
}

export function AthleteSheet({ userId, onClose }: Props) {
  const [stats, setStats] = useState<AthleteStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setStats(null); return; }
    setLoading(true);
    Promise.all([
      supabase.from('users').select('name, status').eq('id', userId).single(),
      supabase.from('entries')
        .select('sage_score, sessions, total_hours, streak, race:races(name)')
        .eq('user_id', userId),
    ]).then(([{ data: u }, { data: entries }]) => {
      if (!u) { setLoading(false); return; }
      const e = entries ?? [];
      setStats({
        name: u.name,
        status: u.status,
        totalScore: e.reduce((s, x) => s + x.sage_score, 0),
        totalSessions: e.reduce((s, x) => s + x.sessions, 0),
        totalHours: e.reduce((s, x) => s + x.total_hours, 0),
        topStreak: e.reduce((m, x) => Math.max(m, x.streak), 0),
        raceCount: e.length,
        races: e.map((x) => ({
          name: (x.race as any)?.name ?? 'Race',
          score: x.sage_score,
          sessions: x.sessions,
          streak: x.streak,
        })),
      });
      setLoading(false);
    });
  }, [userId]);

  const initials =
    stats?.name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  return (
    <Modal
      visible={!!userId}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/*
        Layout:
          - Pressable backdrop covers the full screen (tap to dismiss)
          - Sheet is absolutely positioned AT THE BOTTOM, rendered after the backdrop
            so it sits on top in z-order — no Pressable wrapper around it, so
            ScrollView receives scroll events unobstructed
      */}
      <View style={{ flex: 1 }}>
        {/* Dimmed backdrop — tap anywhere here to close */}
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
          }}
        />

        {/* Sheet — no Pressable, scroll works freely */}
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: '#111',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          maxHeight: '82%',
        }}>
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#333' }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 52 }}
            bounces
            scrollEventThrottle={16}
          >
            {loading ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator color="#4ade80" />
              </View>
            ) : stats ? (
              <>
                {/* Avatar + name */}
                <View style={{ alignItems: 'center', marginBottom: 24, marginTop: 8 }}>
                  <View style={{
                    width: 72, height: 72, borderRadius: 36,
                    backgroundColor: '#4ade8022',
                    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                  }}>
                    <Text style={{ color: '#4ade80', fontSize: 24, fontWeight: '900' }}>
                      {initials}
                    </Text>
                  </View>
                  <Text style={{ color: '#f5f5f5', fontWeight: '900', fontSize: 20 }}>
                    {stats.name}
                  </Text>
                  {stats.status === 'active' && (
                    <View style={{
                      backgroundColor: '#4ade8015', borderRadius: 20,
                      paddingHorizontal: 12, paddingVertical: 4, marginTop: 6,
                    }}>
                      <Text style={{ color: '#4ade80', fontSize: 11, fontWeight: '800' }}>
                        ACTIVE MEMBER
                      </Text>
                    </View>
                  )}
                </View>

                {/* Hero stats */}
                <View style={{
                  backgroundColor: '#1a1a1a', borderRadius: 20,
                  padding: 16, marginBottom: 16,
                }}>
                  <Text style={{
                    color: '#737373', fontSize: 10, fontWeight: '800',
                    letterSpacing: 2, marginBottom: 14,
                  }}>
                    ALL-TIME STATS
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <StatPill label="SCORE" value={stats.totalScore.toLocaleString()} accent />
                    <StatPill label="SESSIONS" value={String(stats.totalSessions)} />
                    <StatPill label="HOURS" value={stats.totalHours.toFixed(0)} />
                    <StatPill label="RACES" value={String(stats.raceCount)} />
                  </View>
                  {stats.topStreak > 0 && (
                    <View style={{
                      marginTop: 12, paddingTop: 12,
                      borderTopWidth: 1, borderTopColor: '#222',
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <Text style={{ color: '#737373', fontSize: 10, fontWeight: '800', letterSpacing: 2 }}>
                        BEST STREAK
                      </Text>
                      <Text style={{ color: '#f5f5f5', fontWeight: '900', fontSize: 18 }}>
                        🔥 {stats.topStreak} days
                      </Text>
                    </View>
                  )}
                </View>

                {/* Race history */}
                {stats.races.length > 0 && (
                  <View style={{ backgroundColor: '#1a1a1a', borderRadius: 20, padding: 16 }}>
                    <Text style={{
                      color: '#737373', fontSize: 10, fontWeight: '800',
                      letterSpacing: 2, marginBottom: 12,
                    }}>
                      RACE HISTORY
                    </Text>
                    {stats.races.map((r, i) => (
                      <View key={i} style={{
                        flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'center', paddingVertical: 10,
                        borderBottomWidth: i < stats.races.length - 1 ? 1 : 0,
                        borderBottomColor: '#222',
                      }}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <Text
                            style={{ color: '#f5f5f5', fontWeight: '700', fontSize: 13 }}
                            numberOfLines={1}
                          >
                            {r.name}
                          </Text>
                          <Text style={{ color: '#737373', fontSize: 11, marginTop: 2 }}>
                            {r.sessions} sessions
                            {r.streak > 0 ? `  ·  🔥 ${r.streak}d` : ''}
                          </Text>
                        </View>
                        <Text style={{ color: '#4ade80', fontWeight: '900', fontSize: 16 }}>
                          {r.score.toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <Text style={{ color: '#737373', textAlign: 'center', paddingVertical: 40 }}>
                Athlete not found.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function StatPill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: accent ? '#4ade80' : '#f5f5f5', fontWeight: '900', fontSize: 22 }}>
        {value}
      </Text>
      <Text style={{ color: '#737373', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}
