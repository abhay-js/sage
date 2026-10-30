import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { sageColors as c } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    totalRaces: 0,
    openRaces: 0,
    totalEntries: 0,
  });

  useEffect(() => {
    async function load() {
      const [users, races, entries] = await Promise.all([
        supabase.from('users').select('status'),
        supabase.from('races').select('status'),
        supabase.from('entries').select('id'),
      ]);

      const u = users.data ?? [];
      const r = races.data ?? [];
      setStats({
        totalUsers: u.length,
        activeUsers: u.filter((x) => x.status === 'active').length,
        pendingUsers: u.filter((x) => x.status === 'pending').length,
        totalRaces: r.length,
        openRaces: r.filter((x) => x.status === 'open').length,
        totalEntries: entries.data?.length ?? 0,
      });
    }
    load();
  }, []);

  return (
    <SafeAreaView edges={['left','right']} className="flex-1 bg-sage-bg">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-sage-text text-xl font-bold mb-6">Admin Dashboard</Text>

        <View className="flex-row flex-wrap gap-3 mb-6">
          <StatCard label="Total users" value={stats.totalUsers} color="text-sage-text" />
          <StatCard label="Active" value={stats.activeUsers} color="text-sage-green" />
          <StatCard label="Pending" value={stats.pendingUsers} color="text-sage-orange" />
          <StatCard label="Open races" value={stats.openRaces} color="text-blue-400" />
          <StatCard label="Total entries" value={stats.totalEntries} color="text-purple-400" />
        </View>

        <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:20}}>{([['flags','Flags & reviews'],['results','Results & prizes'],['partners','Partners'],['settings','Settings']] as const).map(([route,label])=><TouchableOpacity key={route} accessibilityRole="button" onPress={()=>router.push(`/(admin)/${route}`)} style={{backgroundColor:c.surface,borderColor:c.border,borderWidth:1,borderRadius:10,padding:12}}><Text style={{color:c.text,fontWeight:'700'}}>{label} →</Text></TouchableOpacity>)}</View>
        {stats.pendingUsers > 0 && (
          <View className="bg-sage-orange/10 border border-sage-orange/30 rounded-xl p-4">
            <Text className="text-sage-orange font-semibold">
              {stats.pendingUsers} payment{stats.pendingUsers > 1 ? 's' : ''} waiting for review
            </Text>
            <Text className="text-sage-muted text-sm mt-1">Go to Payments tab to approve.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View className="bg-sage-surface border border-sage-border rounded-xl p-4 flex-1 min-w-[140px]">
      <Text className={`${color} text-2xl font-bold`}>{value}</Text>
      <Text className="text-sage-muted text-xs mt-1">{label}</Text>
    </View>
  );
}
