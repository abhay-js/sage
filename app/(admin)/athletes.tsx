import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';

type AthleteRow = User & { race_count: number; last_activity: string | null };

export default function AthletesScreen() {
  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: users } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    const { data: entries } = await supabase.from('entries').select('user_id, race_id');
    const { data: logs } = await supabase
      .from('activity_logs')
      .select('user_id, activity_date')
      .order('activity_date', { ascending: false });

    const lastActivity: Record<string, string> = {};
    for (const l of logs ?? []) {
      if (!lastActivity[l.user_id]) lastActivity[l.user_id] = l.activity_date;
    }

    const raceCounts: Record<string, number> = {};
    for (const e of entries ?? []) raceCounts[e.user_id] = (raceCounts[e.user_id] ?? 0) + 1;

    setAthletes(
      (users ?? []).map((u) => ({
        ...u,
        race_count: raceCounts[u.id] ?? 0,
        last_activity: lastActivity[u.id] ?? null,
      }))
    );
    setLoading(false);
  }

  async function resync(user: User) {
    const { data: entries } = await supabase
      .from('entries')
      .select('race_id')
      .eq('user_id', user.id);

    if (!entries?.length) { Alert.alert('No races', `${user.name} hasn't joined any races.`); return; }

    for (const entry of entries) {
      await supabase.functions.invoke('backfill-entry', {
        body: { user_id: user.id, race_id: entry.race_id },
      });
    }
    Alert.alert('Resynced', `Backfill triggered for ${user.name}.`);
  }

  async function markReferralPaid(userId: string) {
    const { error } = await supabase
      .from('referrals')
      .update({ cash_paid: true })
      .eq('referrer_id', userId)
      .eq('status', 'rewarded')
      .eq('cash_paid', false);
    if (!error) Alert.alert('Done', 'Referral marked as paid.');
    else Alert.alert('Error', error.message);
  }

  const filtered = athletes
    .filter((a) => filter === 'all' || a.status === filter)
    .filter(
      (a) =>
        !search ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.email?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <SafeAreaView className="flex-1 bg-sage-bg">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-sage-text text-xl font-bold mb-3">Athletes</Text>

        <TextInput
          className="bg-sage-surface border border-sage-border text-sage-text rounded-xl px-4 py-2.5 mb-3"
          placeholder="Search by name or email…"
          placeholderTextColor="#737373"
          value={search}
          onChangeText={setSearch}
        />

        <View className="flex-row gap-2 mb-2">
          {(['all', 'active', 'pending', 'suspended'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full border ${
                filter === f ? 'bg-sage-surface border-sage-green' : 'bg-transparent border-sage-border'
              }`}
            >
              <Text className={`text-xs font-medium ${filter === f ? 'text-sage-green' : 'text-sage-muted'}`}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <View className="bg-sage-surface border border-sage-border rounded-2xl p-4 mb-3">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1">
                <Text className="text-sage-text font-semibold">{item.name}</Text>
                <Text className="text-sage-muted text-xs">{item.email ?? item.phone}</Text>
              </View>
              <View className={`px-2 py-0.5 rounded-full ml-2 ${
                item.status === 'active' ? 'bg-sage-green/20' :
                item.status === 'pending' ? 'bg-sage-orange/20' :
                'bg-red-500/20'
              }`}>
                <Text className={`text-xs font-medium ${
                  item.status === 'active' ? 'text-sage-green' :
                  item.status === 'pending' ? 'text-sage-orange' :
                  'text-red-400'
                }`}>{item.status}</Text>
              </View>
            </View>

            <View className="flex-row gap-4 mb-3">
              <Text className="text-sage-muted text-xs">{item.race_count} races</Text>
              {item.plan_expires_at && (
                <Text className="text-sage-muted text-xs">
                  Expires {new Date(item.plan_expires_at).toLocaleDateString('en-IN')}
                </Text>
              )}
              {item.last_activity && (
                <Text className="text-sage-muted text-xs">
                  Last: {new Date(item.last_activity).toLocaleDateString('en-IN')}
                </Text>
              )}
            </View>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => resync(item)}
                className="bg-sage-surface border border-sage-border px-3 py-1.5 rounded-full"
              >
                <Text className="text-sage-muted text-xs">Resync</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => markReferralPaid(item.id)}
                className="bg-sage-surface border border-sage-border px-3 py-1.5 rounded-full"
              >
                <Text className="text-sage-muted text-xs">Mark referral paid</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !loading ? <Text className="text-sage-muted text-sm text-center py-8">No athletes.</Text> : null
        }
      />
    </SafeAreaView>
  );
}
