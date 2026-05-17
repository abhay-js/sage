import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const ROLES = [
  { key: 'athlete', label: 'Athlete', icon: '🏃', desc: 'Train, compete, track progress' },
  { key: 'influencer', label: 'Influencer', icon: '📣', desc: 'Promote races, earn commissions' },
];

export default function PendingScreen() {
  const { user, signOut, refreshProfile } = useAuth();
  const [selectedRole, setSelectedRole] = useState(user?.role ?? 'athlete');
  const [saving, setSaving] = useState(false);

  async function saveRole() {
    if (!user) return;
    setSaving(true);
    await supabase.from('users').update({ role: selectedRole }).eq('id', user.id);
    await refreshProfile();
    setSaving(false);
    Alert.alert('Saved', 'Your role has been updated.');
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <View className="flex-1 bg-sage-bg px-6">
      {/* Sign out — top right */}
      <View className="pt-14 pb-6 flex-row justify-end">
        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.7}
          className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-full"
        >
          <Text className="text-red-400 text-sm font-bold">Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Status */}
      <View className="items-center mb-8">
        <View className="w-20 h-20 rounded-full bg-sage-green/10 items-center justify-center mb-4">
          <Text style={{ fontSize: 36 }}>⏳</Text>
        </View>
        <Text className="text-sage-text font-black text-2xl mb-2 text-center">Almost there!</Text>
        <Text className="text-sage-muted text-sm text-center leading-6">
          Your payment is under review.{'\n'}We'll activate your account within 24 hours.
        </Text>
      </View>

      {/* Role selector */}
      <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mb-3">
        I am a...
      </Text>
      {ROLES.map((r) => (
        <TouchableOpacity
          key={r.key}
          onPress={() => setSelectedRole(r.key as any)}
          activeOpacity={0.8}
          className={`flex-row items-center p-4 rounded-2xl mb-3 border ${
            selectedRole === r.key
              ? 'bg-sage-green/10 border-sage-green'
              : 'bg-sage-surface border-transparent'
          }`}
        >
          <Text style={{ fontSize: 28 }} className="mr-3">{r.icon}</Text>
          <View className="flex-1">
            <Text className={`font-bold text-base ${selectedRole === r.key ? 'text-sage-green' : 'text-sage-text'}`}>
              {r.label}
            </Text>
            <Text className="text-sage-muted text-xs mt-0.5">{r.desc}</Text>
          </View>
          {selectedRole === r.key && (
            <View className="w-5 h-5 rounded-full bg-sage-green items-center justify-center">
              <Text className="text-black text-xs font-black">✓</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}

      {selectedRole !== user?.role && (
        <TouchableOpacity
          onPress={saveRole}
          disabled={saving}
          activeOpacity={0.85}
          className="bg-sage-green rounded-2xl py-3.5 items-center mt-1 mb-4"
        >
          <Text className="text-black font-black tracking-widest">
            {saving ? 'SAVING…' : 'SAVE ROLE'}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={refreshProfile}
        activeOpacity={0.7}
        className="border border-sage-border rounded-2xl py-3 items-center mt-2"
      >
        <Text className="text-sage-muted font-semibold text-sm">Check Status</Text>
      </TouchableOpacity>
    </View>
  );
}
