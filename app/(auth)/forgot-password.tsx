import { useState } from 'react';
import { Text,Platform } from 'react-native';
import { Page,Header,Button } from '../../components/ui/SageUI';
import { Field,form } from '../../components/ui/ProductUI';
import { supabase } from '../../lib/supabase';
export default function ForgotPassword(){const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');async function send(){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){setMessage('Enter a valid email.');return;}setBusy(true);const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:Platform.OS==='web'?`${globalThis.location.origin}/auth-callback`:'sage://auth-callback'});setMessage(error?.message??'If this account exists, a password reset email will arrive shortly.');setBusy(false);}return <Page><Header title="Reset your password"/><Field label="Email" value={email} onChange={setEmail}/><Text style={form.note}>{message}</Text><Button title={busy?'Sending…':'Send reset email'} disabled={busy} onPress={send}/></Page>;}
