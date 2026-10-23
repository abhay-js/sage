import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthContextValue {
  recoveringPassword: boolean;
  beginRecovery: () => void;
  finishRecovery: () => void;
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  recoveringPassword: false,
  beginRecovery: () => {},
  finishRecovery: () => {},
  user: null,
  loading: true,
  error: null,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recoveringPassword,setRecoveringPassword] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async (authUser: SupabaseUser) => {
      try { await fetchProfile(authUser.id, authUser); }
      catch (e) { if (mounted) { setError(e instanceof Error ? e.message : 'Unable to load your profile.'); setLoading(false); } }
    };
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) { setError(error.message); setLoading(false); }
      else if (session?.user) void load(session.user);
      else setLoading(false);
    }).catch(e => { if (mounted) { setError(e.message); setLoading(false); } });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if(_event==='PASSWORD_RECOVERY') setRecoveringPassword(true);
      // Let the auth event release its lock before querying the profile.
      if (session?.user) setTimeout(() => { if (mounted) void load(session.user); }, 0);
      else { setUser(null); setError(null); setLoading(false); }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  async function fetchProfile(id: string, authUser?: SupabaseUser) {
    setError(null);
    let { data, error: readError } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
    if (readError) throw new Error(`Unable to load your profile: ${readError.message}`);
    if (!data) {
      await new Promise(r => setTimeout(r, 1200));
      const { data: retried } = await supabase.from('users').select('*').eq('id', id).single();
      data = retried;
    }
    // Create the profile on first authenticated sign-in, including confirmed email accounts.
    if (!data && authUser) {
      const displayName = authUser.user_metadata?.full_name
        ?? authUser.user_metadata?.name
        ?? authUser.email?.split('@')[0]
        ?? 'Athlete';
      const prefix = displayName.trim().split(' ')[0].toUpperCase().slice(0, 4);
      const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const { error: createError } = await supabase.from('users').upsert(
        { id: authUser.id, name: displayName, email: authUser.email ?? null,
          status: 'pending', role: 'athlete',
          referral_code: `${prefix}-${suffix}`, referred_by: null },
        { onConflict: 'id', ignoreDuplicates: true }
      );
      if (createError) throw new Error(`Unable to create your profile: ${createError.message}`);
      const { data: created, error: profileError } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      if (profileError) throw new Error(`Unable to load your profile: ${profileError.message}`);
      data = created;
    }
    if (!data) throw new Error('Your account profile is unavailable. Please try signing in again.');
    const {data: athleteProfile,error: athleteError}=await supabase.from('athlete_profiles').select('onboarding_completed').eq('user_id',id).maybeSingle();
    if(athleteError)throw new Error(`Unable to load onboarding: ${athleteError.message}`);
    setUser({...data,onboarding_completed:athleteProfile?.onboarding_completed??false});
    setLoading(false);
  }

  async function refreshProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await fetchProfile(session.user.id, session.user);
  }

  async function signOut() {
    setUser(null);
    setLoading(false);
    await supabase.auth.signOut({ scope: 'local' });
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, refreshProfile, signOut,recoveringPassword,beginRecovery:()=>setRecoveringPassword(true),finishRecovery:()=>setRecoveringPassword(false) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
