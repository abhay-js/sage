import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

function makeReferralCode(name: string): string {
  const prefix = name.trim().split(' ')[0].toUpperCase().slice(0, 4);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!name.trim()) { Alert.alert('Missing name', 'Enter your full name.'); return; }
    if (!email.trim()) { Alert.alert('Missing email', 'Enter your email address.'); return; }
    if (password.length < 6) { Alert.alert('Weak password', 'Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) throw error;
      if (!data.user) throw new Error('Signup failed — try again.');
      if (!data.session) throw new Error('Disable email confirmations in Supabase Auth settings.');

      await supabase.from('users').insert({
        id: data.user.id,
        name: name.trim(),
        email: email.trim(),
        status: 'pending',
        role: 'athlete',
        referral_code: makeReferralCode(name),
        referred_by: null,
      });

      await supabase.auth.refreshSession();
      router.replace('/pending');
    } catch (e: any) {
      const msg: string = e.message ?? '';
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        Alert.alert('Account exists', 'An account with this email already exists. Sign in instead.');
      } else {
        Alert.alert('Signup failed', msg || 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-sage-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-10">
          <Text className="text-sage-green font-black text-5xl tracking-tight">SAGE</Text>
          <Text className="text-sage-text font-black text-2xl mt-4">Create Account</Text>
          <Text className="text-sage-muted text-sm mt-1">Join the village. Start training.</Text>
        </View>

        {loading ? (
          <View className="items-center gap-3">
            <ActivityIndicator color="#4ade80" size="large" />
            <Text className="text-sage-muted text-sm">Creating your account…</Text>
          </View>
        ) : (
          <>
            <View className="gap-3">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                placeholderTextColor="#525252"
                autoCapitalize="words"
                autoCorrect={false}
                className="bg-sage-surface rounded-2xl px-4 py-4 text-sage-text text-sm"
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor="#525252"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="bg-sage-surface rounded-2xl px-4 py-4 text-sage-text text-sm"
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password (min 6 characters)"
                placeholderTextColor="#525252"
                secureTextEntry
                className="bg-sage-surface rounded-2xl px-4 py-4 text-sage-text text-sm"
              />
              <TouchableOpacity
                onPress={handleSignup}
                activeOpacity={0.85}
                className="bg-sage-green rounded-2xl py-4 items-center mt-1"
              >
                <Text className="text-sage-bg font-black text-base tracking-widest">CREATE ACCOUNT</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-sage-muted text-[10px] text-center mt-4 leading-4">
              Connect Strava later from your profile to auto-sync workouts.
            </Text>

            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} className="mt-6 items-center">
              <Text className="text-sage-muted text-sm">
                Already have an account?{' '}
                <Text className="text-sage-green font-bold">Sign in</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
