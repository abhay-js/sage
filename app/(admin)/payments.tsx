import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';

type PendingUser = User & { strava_connected: boolean };

export default function PaymentsScreen() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    setUsers(
      (data ?? []).map((u) => ({ ...u, strava_connected: !!u.strava_athlete_id }))
    );
    setLoading(false);
  }

  async function approve(user: User) {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const { error } = await supabase.from('users').update({
      status: 'active',
      plan_expires_at: expiresAt.toISOString(),
    }).eq('id', user.id);

    if (error) { Alert.alert('Error', error.message); return; }

    await supabase.functions.invoke('backfill-entry', {
      body: { user_id: user.id },
    });

    Alert.alert('Approved', `${user.name} is now active.`);
    load();
  }

  async function reject(user: User) {
    Alert.alert('Reject', `Reject ${user.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('users').update({ status: 'suspended' }).eq('id', user.id);
          load();
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-sage-bg">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-sage-text text-xl font-bold">Pending Payments</Text>
        <Text className="text-sage-muted text-sm">{users.length} pending</Text>
      </View>

      {loading ? (
        <Text className="text-sage-muted text-sm text-center py-8">Loading…</Text>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <View className="bg-sage-surface border border-sage-border rounded-2xl p-4 mb-3">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                  <Text className="text-sage-text font-semibold">{item.name}</Text>
                  <Text className="text-sage-muted text-xs">{item.email ?? item.phone}</Text>
                  <Text className="text-sage-muted text-xs">
                    Signed up {new Date(item.created_at).toLocaleDateString('en-IN')}
                  </Text>
                </View>
                <View className={`px-2 py-0.5 rounded-full ${item.strava_connected ? 'bg-sage-green/20' : 'bg-sage-orange/20'}`}>
                  <Text className={`text-xs ${item.strava_connected ? 'text-sage-green' : 'text-sage-orange'}`}>
                    {item.strava_connected ? 'Strava ✓' : 'No Strava'}
                  </Text>
                </View>
              </View>

              {item.payment_screenshot_url ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(item.payment_screenshot_url!)}
                  className="mb-3"
                >
                  <Text className="text-blue-400 text-sm underline">View payment screenshot →</Text>
                </TouchableOpacity>
              ) : (
                <Text className="text-sage-orange text-sm mb-3">No screenshot uploaded</Text>
              )}

              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => approve(item)}
                  className="flex-1 bg-sage-green rounded-xl py-2.5 items-center"
                >
                  <Text className="text-black font-semibold text-sm">Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => reject(item)}
                  className="flex-1 border border-red-500/30 rounded-xl py-2.5 items-center"
                >
                  <Text className="text-red-400 font-semibold text-sm">Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text className="text-sage-muted text-sm text-center py-8">No pending payments.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
