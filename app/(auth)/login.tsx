import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Link, useRouter } from 'expo-router';
import { Brand } from '../../components/ui/SageUI';

export default function LoginScreen({ initialCreating = false }: { initialCreating?: boolean }) {
  const { refreshProfile, error: profileError } = useAuth();
  const [creating, setCreating] = useState(initialCreating);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation,setConfirmation]=useState('');
  const router=useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function submit() {
    if (loading) return;
    setMessage('');
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setMessage('Enter a valid email address.');
      return;
    }
    if (!password || (creating && password.length < 8)) {
      setMessage(creating ? 'Use a password with at least 8 characters.' : 'Enter your password.');
      return;
    }
    if (creating && !name.trim()) {
      setMessage('Enter your name.');
      return;
    }
    if(creating&&password!==confirmation){setMessage('Passwords do not match.');return;}
    setLoading(true);
    try {
      if (creating) {
        const { data, error } = await supabase.auth.signUp({
          email: address, password, options: { data: { full_name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage('Check your email to confirm your account, then return here to sign in.');
          setCreating(false);
          setPassword('');
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: address, password });
        if (error) throw error;
      }
      await refreshProfile();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const fieldClass = 'bg-sage-surface border border-sage-border rounded-2xl px-4 py-4 text-sage-text mb-4';
  return (
    <KeyboardAvoidingView className="flex-1 bg-sage-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-md self-center">
          <View className="items-center mb-10"><Brand /><Text className="text-sage-muted text-base mt-4 text-center">Every workout. Another step up.</Text></View>
          <Text className="text-sage-text text-2xl font-bold mb-6">{creating ? 'Join the village' : 'Welcome back'}</Text>
          {creating && <>
            <Text className="text-sage-muted mb-2">Name</Text>
            <TextInput accessibilityLabel="Name" value={name} onChangeText={setName} editable={!loading} autoComplete="name" className={fieldClass} />
          </>}
          <Text className="text-sage-muted mb-2">Email</Text>
          <TextInput accessibilityLabel="Email" value={email} onChangeText={setEmail} editable={!loading} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" className={fieldClass} />
          <Text className="text-sage-muted mb-2">Password</Text>
          <TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} editable={!loading} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={creating ? 'new-password' : 'current-password'} returnKeyType="go" onSubmitEditing={submit} className={fieldClass} />
          {creating&&<><Text className="text-sage-muted mb-2">Confirm Password</Text><TextInput accessibilityLabel="Confirm Password" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" className={fieldClass}/></>}
          {!creating&&<TouchableOpacity accessibilityRole="button" onPress={()=>router.push('/(auth)/forgot-password')} className="pb-4"><Text className="text-sage-orange">Forgot password?</Text></TouchableOpacity>}
          {!!(message || profileError) && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className="text-sage-orange mb-4">{message || profileError}</Text>}
          <TouchableOpacity accessibilityRole="button" disabled={loading} onPress={submit} activeOpacity={0.85} className="bg-sage-orange rounded-2xl py-4 items-center" style={{ opacity: loading ? 0.6 : 1 }}>
            <Text className="text-sage-onAccent font-black text-base">{loading ? 'Please wait…' : creating ? 'CREATE ACCOUNT' : 'SIGN IN'}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" disabled={loading} onPress={() => { setCreating(!creating); setMessage(''); setPassword(''); }} className="py-5 items-center">
            <Text className="text-sage-muted">{creating ? 'Already a member? Sign in' : 'New to Sage? Create an account'}</Text>
          </TouchableOpacity>
          <Link href="/privacy" className="text-sage-muted text-center underline py-3">Privacy policy</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
