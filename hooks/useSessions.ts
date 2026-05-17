import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GroupSession, SessionEnrollment } from '../types';

type EnrollmentWithUser = SessionEnrollment & { user: any };

interface SessionFilters {
  sport?: string;
  mine?: boolean;
  userId?: string;
}

export function useSessions(filters: SessionFilters = {}) {
  const [sessions, setSessions] = useState<(GroupSession & { host: any })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('group_sessions')
      .select('*, host:users(id, name)')
      .order('session_date', { ascending: true });

    if (filters.mine && filters.userId) {
      q = q.eq('host_id', filters.userId);
    } else {
      q = q.in('status', ['open', 'full']);
    }

    if (filters.sport) q = q.eq('sport_type', filters.sport);
    const { data } = await q;
    setSessions(data ?? []);
    setLoading(false);
  }, [filters.sport, filters.mine, filters.userId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { sessions, loading, refetch: fetch };
}

export function useSession(sessionId: string | undefined) {
  const [session, setSession] = useState<(GroupSession & { host: any }) | null>(null);
  const [accepted, setAccepted] = useState<EnrollmentWithUser[]>([]);
  const [pending, setPending] = useState<EnrollmentWithUser[]>([]);
  const [rejected, setRejected] = useState<EnrollmentWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!sessionId) { setLoading(false); return; }
    setLoading(true);
    const [{ data: s }, { data: e }] = await Promise.all([
      supabase.from('group_sessions').select('*, host:users(id, name)').eq('id', sessionId).single(),
      supabase
        .from('session_enrollments')
        .select('*, user:users(id, name)')
        .eq('session_id', sessionId)
        .in('status', ['pending', 'enrolled', 'attended', 'no_show', 'rejected']),
    ]);
    setSession(s);
    const all: EnrollmentWithUser[] = e ?? [];
    setAccepted(all.filter((x) => ['enrolled', 'attended', 'no_show'].includes(x.status)));
    setPending(all.filter((x) => x.status === 'pending'));
    setRejected(all.filter((x) => x.status === 'rejected'));
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { session, accepted, pending, rejected, loading, refetch: fetch };
}

export function useMySessionEnrollments(userId: string | undefined) {
  const [myEnrollments, setMyEnrollments] = useState<{ session_id: string; status: string }[]>([]);

  const fetch = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('session_enrollments')
      .select('session_id, status')
      .eq('user_id', userId)
      .in('status', ['pending', 'enrolled', 'attended', 'no_show', 'rejected']);
    setMyEnrollments(data ?? []);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  const enrolledIds = new Set(
    myEnrollments.filter((e) => ['enrolled', 'attended', 'no_show'].includes(e.status)).map((e) => e.session_id),
  );
  const pendingIds = new Set(
    myEnrollments.filter((e) => e.status === 'pending').map((e) => e.session_id),
  );
  const rejectedIds = new Set(
    myEnrollments.filter((e) => e.status === 'rejected').map((e) => e.session_id),
  );

  return { enrolledIds, pendingIds, rejectedIds, refetch: fetch };
}
