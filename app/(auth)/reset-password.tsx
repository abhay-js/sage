import { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Page,Header,Button } from '../../components/ui/SageUI';
import { form } from '../../components/ui/ProductUI';
import { TextInput } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
export default function ResetPassword(){const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');const {finishRecovery}=useAuth(),router=useRouter();async function save(){if(password.length<8||password!==confirm){setMessage('Use at least 8 characters and matching passwords.');return;}setBusy(true);const {error}=await supabase.auth.updateUser({password});setBusy(false);if(error){setMessage(error.message);return;}finishRecovery();router.replace('/(app)/home');}return <Page><Header title="Choose a new password"/><TextInput accessibilityLabel="New password" secureTextEntry value={password} onChangeText={setPassword} style={form.field}/><TextInput accessibilityLabel="Confirm new password" secureTextEntry value={confirm} onChangeText={setConfirm} style={form.field}/><Text style={form.note}>{message}</Text><Button title="Save password" disabled={busy} onPress={save}/></Page>;}
