import { createClient } from '@supabase/supabase-js';

// Node 20 needs a WebSocket implementation during Expo's static web export.
// Keep this dependency out of native bundles.
if (typeof globalThis.WebSocket === 'undefined') {
  try { (globalThis as any).WebSocket = require('ws'); } catch {}
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } },
);
