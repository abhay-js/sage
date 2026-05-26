import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id, session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchProfile(session.user.id, session.user);
      else { setUser(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(id: string, authUser?: SupabaseUser) {
    let { data } = await supabase.from('users').select('*').eq('id', id).single();
    if (!data) {
      await new Promise(r => setTimeout(r, 1200));
      const { data: retried } = await supabase.from('users').select('*').eq('id', id).single();
      data = retried;
    }
    // Google OAuth: row may not exist yet (web redirect or native timing race)
    if (!data && authUser?.app_metadata?.provider === 'google') {
      const displayName = authUser.user_metadata?.full_name
        ?? authUser.user_metadata?.name
        ?? authUser.email?.split('@')[0]
        ?? 'Athlete';
      const prefix = displayName.trim().split(' ')[0].toUpperCase().slice(0, 4);
      const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      await supabase.from('users').upsert(
        { id: authUser.id, name: displayName, email: authUser.email ?? null,
          status: 'pending', role: 'athlete',
          referral_code: `${prefix}-${suffix}`, referred_by: null },
        { onConflict: 'id', ignoreDuplicates: true }
      );
      const { data: created } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      data = created;
    }
    setUser(data ?? null);
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
    <AuthContext.Provider value={{ user, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
