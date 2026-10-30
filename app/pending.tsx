import {useSafeAreaInsets} from 'react-native-safe-area-context';
import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const SPORT_TYPES = [
  { key: 'runner',     label: 'Runner',     icon: '🏃', desc: 'Road, trail, track' },
  { key: 'cyclist',   label: 'Cyclist',    icon: '🚴', desc: 'Road, gravel, MTB' },
  { key: 'swimmer',   label: 'Swimmer',    icon: '🏊', desc: 'Pool, open water' },
  { key: 'triathlete', label: 'Triathlete', icon: '🏅', desc: 'Swim, bike, run' },
  { key: 'hybrid',    label: 'Hybrid',     icon: '⚡', desc: 'Mix of disciplines' },
];

export default function PendingScreen() {
  const insets=useSafeAreaInsets();
  const { user, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<string>(user?.sport_type ?? '');
  const [saving, setSaving] = useState(false);

  async function saveSportType() {
    if (!user || !selected) return;
    setSaving(true);
    await supabase.from('users').update({ sport_type: selected }).eq('id', user.id);
    await refreshProfile();
    setSaving(false);
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        await signOut();
        router.replace('/(auth)/login');
      }},
    ]);
  }

  return (
    <ScrollView
      className="flex-1 bg-sage-bg"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top+16, paddingBottom: insets.bottom+16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="items-center mb-6">
        <Text className="text-sage-green font-black text-5xl tracking-tight mb-1">SAGE</Text>
        <Text className="text-sage-text font-black text-2xl mt-3">
          Hi, {user?.name?.split(' ')[0]}!
        </Text>
        <Text className="text-sage-muted text-sm mt-1 text-center">
          Tell us how you train
        </Text>
      </View>

      {/* Sport type selector */}
      <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mb-3">
        I primarily train as a...
      </Text>

      {SPORT_TYPES.map((s) => {
        const isSelected = selected === s.key;
        return (
          <TouchableOpacity
            key={s.key}
            onPress={() => setSelected(s.key)}
            activeOpacity={0.8}
            className={`flex-row items-center p-4 rounded-2xl mb-3 border ${
              isSelected
                ? 'bg-sage-green/10 border-sage-green'
                : 'bg-sage-surface border-transparent'
            }`}
          >
            <Text style={{ fontSize: 28, marginRight: 12 }}>{s.icon}</Text>
            <View className="flex-1">
              <Text className={`font-bold text-base ${isSelected ? 'text-sage-green' : 'text-sage-text'}`}>
                {s.label}
              </Text>
              <Text className="text-sage-muted text-xs mt-0.5">{s.desc}</Text>
            </View>
            {isSelected && (
              <View className="w-5 h-5 rounded-full bg-sage-green items-center justify-center">
                <Text className="text-sage-onAccent text-xs font-black">✓</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      {selected && selected !== user?.sport_type && (
        <TouchableOpacity
          onPress={saveSportType}
          disabled={saving}
          activeOpacity={0.85}
          className="bg-sage-green rounded-2xl py-3.5 items-center mt-1 mb-6"
        >
          <Text className="text-sage-onAccent font-black tracking-widest">
            {saving ? 'SAVING…' : 'SAVE'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Payment pending notice */}
      <View className="bg-sage-surface rounded-2xl p-5 mt-2 mb-4">
        <View className="flex-row items-center gap-3 mb-2">
          <Text style={{ fontSize: 24 }}>⏳</Text>
          <Text className="text-sage-text font-black text-base">Account pending</Text>
        </View>
        <Text className="text-sage-muted text-sm leading-5">
          Your payment is under review. We'll activate your account within 24 hours.
        </Text>
        <TouchableOpacity
          onPress={refreshProfile}
          activeOpacity={0.7}
          className="border border-sage-border rounded-xl py-2.5 items-center mt-4"
        >
          <Text className="text-sage-muted font-semibold text-sm">Check Status</Text>
        </TouchableOpacity>
      </View>

      {/* Sign out */}
      <TouchableOpacity
        onPress={handleSignOut}
        activeOpacity={0.7}
        className="bg-red-500/10 border border-red-500/20 rounded-2xl py-3.5 items-center mt-2"
      >
        <Text className="text-red-400 font-bold text-sm tracking-wide">Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
