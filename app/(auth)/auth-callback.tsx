import { useEffect,useState } from 'react';
import { Text,Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Page,Button } from '../../components/ui/SageUI';
import { Skeleton,form } from '../../components/ui/ProductUI';
export default function AuthCallback(){const link=Linking.useURL(),router=useRouter(),{beginRecovery}=useAuth(),[message,setMessage]=useState('');useEffect(()=>{const url=Platform.OS==='web'?globalThis.location.href:link;if(!url)return;let active=true;async function handle(){try{const parsed=new URL(url!);const params=new URLSearchParams(parsed.hash.slice(1)||parsed.search.slice(1));if(params.get('error_description'))throw new Error(params.get('error_description')!);const recovery=params.get('type')==='recovery';if(recovery)beginRecovery();const code=params.get('code'),access=params.get('access_token'),refresh=params.get('refresh_token');if(code){const {error}=await supabase.auth.exchangeCodeForSession(code);if(error)throw error;}else if(access&&refresh){const {error}=await supabase.auth.setSession({access_token:access,refresh_token:refresh});if(error)throw error;}else throw new Error('This sign-in link is incomplete or expired. Request a new email.');if(active)router.replace(recovery?'/(auth)/reset-password':'/');}catch(e){if(active)setMessage((e as Error).message);}}void handle();return()=>{active=false;};},[link]);return <Page>{message?<><Text style={form.note}>{message}</Text><Button title="Back to sign in" onPress={()=>router.replace('/(auth)/login')}/></>:<Skeleton/>}</Page>;}
