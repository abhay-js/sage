import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useSession } from '../../hooks/useSessions';
import { supabase } from '../../lib/supabase';
import { SessionEnrollment } from '../../types';
import { AthleteSheet } from '../../components/AthleteSheet';

const SPORT_ICONS: Record<string, string> = { Ride: '🚴', Run: '🏃', Swim: '🏊', Trail: '🥾' };
type HostTab = 'requests' | 'enrolled' | 'settings';
type EnrollmentWithUser = SessionEnrollment & { user: any };

async function rpc(fn: string, params: Record<string, unknown>, label: string) {
  const { error } = await supabase.rpc(fn, params);
  if (error) {
    Alert.alert(
      `${label} failed`,
      error.message.includes('does not exist')
        ? 'Run session-host-functions.sql + session-functions-v2.sql in Supabase.'
        : error.message,
    );
    return false;
  }
  return true;
}

async function direct(op: () => PromiseLike<{ error: any }>, label: string) {
  const { error } = await op();
  if (error) {
    Alert.alert(
      `${label} failed`,
      error.message.includes('23514')
        ? 'Run sessions-migration.sql in Supabase first.'
        : error.message,
    );
    return false;
  }
  return true;
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { session, accepted, pending, rejected, loading, refetch } = useSession(id);
  const [busy, setBusy] = useState(false);
  const [hostTab, setHostTab] = useState<HostTab>('requests');
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  if (loading || !session) {
    return (
      <SafeAreaView className="flex-1 bg-sage-bg items-center justify-center">
        <Text className="text-sage-muted">Loading…</Text>
      </SafeAreaView>
    );
  }

  const isHost = session.host_id === user?.id;
  const myEnrollment: EnrollmentWithUser | undefined =
    [...accepted, ...pending, ...rejected].find((e) => e.user_id === user?.id);
  const myStatus = myEnrollment?.status;
  const isEnrolled = ['enrolled', 'attended', 'no_show'].includes(myStatus ?? '');
  const isPending = myStatus === 'pending';
  const isRejected = myStatus === 'rejected';
  const isAttended = myStatus === 'attended';
  const isNoShow = myStatus === 'no_show';
  const enrolledCount = accepted.length;
  const isFull = enrolledCount >= session.max_participants;
  const isArchived = session.status === 'archived';
  const isCancelled = session.status === 'cancelled';
  const isCompleted = session.status === 'completed';
  const isLocked = isCompleted || isCancelled; // no changes allowed

  const dateStr = new Date(session.session_date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  // ── Actions ──────────────────────────────────────────────────────────────
  async function requestJoin() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from('session_enrollments').insert({
      session_id: session.id, user_id: user.id, status: 'pending',
    });
    if (error?.code === '23505') {
      await direct(
        () => supabase.from('session_enrollments')
          .update({ status: 'pending' })
          .eq('session_id', session.id).eq('user_id', user.id),
        'Request',
      );
    } else if (error) {
      Alert.alert('Request failed', error.message.includes('23514')
        ? 'Run sessions-migration.sql in Supabase first.' : error.message);
    }
    await refetch();
    setBusy(false);
  }

  async function cancelRequest() {
    if (!myEnrollment) return;
    setBusy(true);
    await direct(
      () => supabase.from('session_enrollments').update({ status: 'cancelled' }).eq('id', myEnrollment.id),
      'Cancel',
    );
    await refetch();
    setBusy(false);
  }

  async function leaveSession() {
    if (!myEnrollment) return;
    Alert.alert('Leave session', 'Remove yourself from this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive', onPress: async () => {
          setBusy(true);
          await direct(
            () => supabase.from('session_enrollments').update({ status: 'cancelled' }).eq('id', myEnrollment.id),
            'Leave',
          );
          await refetch();
          setBusy(false);
        },
      },
    ]);
  }

  async function acceptRequest(e: EnrollmentWithUser) {
    setBusy(true);
    await rpc('host_accept_request', { p_enrollment_id: e.id }, 'Accept');
    await refetch();
    setBusy(false);
  }

  async function rejectRequest(e: EnrollmentWithUser) {
    setBusy(true);
    await rpc('host_reject_request', { p_enrollment_id: e.id }, 'Reject');
    await refetch();
    setBusy(false);
  }

  async function undoRejection(e: EnrollmentWithUser) {
    setBusy(true);
    await rpc('host_undo_rejection', { p_enrollment_id: e.id }, 'Undo rejection');
    await refetch();
    setBusy(false);
  }

  async function markAttendance(e: EnrollmentWithUser, status: 'attended' | 'no_show' | 'enrolled') {
    setBusy(true);
    await rpc('host_mark_attendance', { p_enrollment_id: e.id, p_status: status }, 'Mark');
    await refetch();
    setBusy(false);
  }

  async function completeSession() {
    Alert.alert(
      'Mark as Completed?',
      'This finalises the session. Attendance records are locked — no more changes to requests or marks.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete', onPress: async () => {
            setBusy(true);
            await rpc('host_complete_session', { p_session_id: session.id }, 'Complete');
            await refetch();
            setBusy(false);
          },
        },
      ],
    );
  }

  async function archiveSession() {
    setBusy(true);
    await direct(() => supabase.from('group_sessions').update({ status: 'archived' }).eq('id', session.id), 'Archive');
    await refetch();
    setBusy(false);
  }

  async function reactivateSession() {
    Alert.alert(
      'Re-activate session?',
      'This will cancel ALL existing enrollments and reset spots to 0. Athletes must request to join again. This treats it as a brand-new session.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Re-activate', onPress: async () => {
            setBusy(true);
            await rpc('host_reactivate_session', { p_session_id: session.id }, 'Re-activate');
            await refetch();
            setBusy(false);
          },
        },
      ],
    );
  }

  async function cancelSession() {
    Alert.alert('Cancel session', 'Cancel for all participants?', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel session', style: 'destructive', onPress: async () => {
          await direct(() => supabase.from('group_sessions').update({ status: 'cancelled' }).eq('id', session.id), 'Cancel');
          router.back();
        },
      },
    ]);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-sage-bg">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Nav */}
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row justify-between items-center mb-4">
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <Text className="text-sage-muted text-sm font-bold">← Back</Text>
            </TouchableOpacity>
            {isHost && !isCancelled && (
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/(app)/session-edit', params: { id: session.id } })}
                activeOpacity={0.8}
                className="bg-sage-surface px-4 py-1.5 rounded-full"
              >
                <Text className="text-sage-muted text-xs font-bold">✏️ Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="flex-row items-start gap-3 mb-1">
            <Text style={{ fontSize: 26, lineHeight: 34 }}>{SPORT_ICONS[session.sport_type] ?? '🏅'}</Text>
            <View className="flex-1">
              <Text className="text-sage-text text-2xl font-black leading-tight">{session.title}</Text>
              <TouchableOpacity onPress={() => setProfileUserId(session.host_id)} activeOpacity={0.7} className="self-start mt-0.5">
                <Text className="text-sage-muted text-sm">
                  hosted by <Text className="text-sage-text font-semibold underline">{session.host?.name ?? 'Sage'}</Text>
                  {isHost && <Text className="text-sage-green"> · You</Text>}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {isCancelled && (
            <View className="mt-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-1.5 self-start">
              <Text className="text-red-400 text-xs font-bold">SESSION CANCELLED</Text>
            </View>
          )}
          {isArchived && (
            <View className="mt-2 bg-[#73737322] border border-[#73737340] rounded-xl px-3 py-1.5 self-start">
              <Text className="text-sage-muted text-xs font-bold">ARCHIVED</Text>
            </View>
          )}
          {isCompleted && (
            <View className="mt-2 bg-[#60a5fa22] border border-[#60a5fa40] rounded-xl px-3 py-1.5 self-start">
              <Text style={{ color: '#60a5fa', fontSize: 11, fontWeight: '800' }}>✓ COMPLETED</Text>
            </View>
          )}
        </View>

        <View className="px-5 gap-4 pb-10">
          {/* Key info */}
          <View className="bg-sage-surface rounded-2xl p-4">
            <InfoRow icon="📅" label="Date" value={dateStr} />
            <InfoRow icon="⏰" label="Start" value={session.start_time.slice(0, 5)} />
            {session.meeting_point && <InfoRow icon="📍" label="Meeting point" value={session.meeting_point} />}
            {session.distance_km != null && <InfoRow icon="🛣️" label="Distance" value={`${session.distance_km} km`} />}
            {session.duration_mins != null && <InfoRow icon="⏱" label="Duration" value={`${session.duration_mins} min`} />}
            <InfoRow
              icon="👥" label="Spots"
              value={`${enrolledCount} / ${session.max_participants} filled`}
              valueColor={isFull ? '#f87171' : '#4ade80'}
            />
          </View>

          {/* Requirements */}
          {(session.ride_type || session.min_ftp || session.avg_speed_kmh || session.elevation_gain_m ||
            session.workout_type || session.min_pace || session.surface_type) && (
            <View className="bg-sage-surface rounded-2xl p-4">
              <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mb-3">Requirements</Text>
              {session.ride_type && <InfoRow icon="🚴" label="Ride type" value={session.ride_type.replace('_', ' ')} />}
              {session.min_ftp && <InfoRow icon="⚡" label="Min FTP" value={`${session.min_ftp} W`} />}
              {session.avg_speed_kmh && <InfoRow icon="💨" label="Avg speed" value={`${session.avg_speed_kmh} km/h`} />}
              {session.elevation_gain_m && <InfoRow icon="⛰️" label="Elevation" value={`${session.elevation_gain_m} m`} />}
              {session.workout_type && <InfoRow icon="🏃" label="Workout" value={session.workout_type.replace('_', ' ')} />}
              {session.min_pace && <InfoRow icon="⏱" label="Min pace" value={`sub ${session.min_pace} /km`} />}
              {session.surface_type && <InfoRow icon="🗺️" label="Surface" value={session.surface_type} />}
            </View>
          )}

          {/* Description */}
          {session.description && (
            <View className="bg-sage-surface rounded-2xl p-4">
              <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mb-2">About</Text>
              <Text className="text-sage-text text-sm leading-relaxed">{session.description}</Text>
            </View>
          )}

          {/* Links — map + route always visible, WhatsApp only for host here */}
          {(session.map_link || session.route_link || (session.whatsapp_link && isHost)) && (
            <View className="gap-3">
              {session.map_link && (
                <TouchableOpacity onPress={() => Linking.openURL(session.map_link!)} activeOpacity={0.8} className="bg-sage-surface rounded-2xl py-3.5 items-center flex-row justify-center gap-2">
                  <Text style={{ fontSize: 16 }}>📍</Text>
                  <Text className="text-sage-green font-bold text-sm">View Start Point</Text>
                </TouchableOpacity>
              )}
              {session.route_link && (
                <TouchableOpacity onPress={() => Linking.openURL(session.route_link!)} activeOpacity={0.8} className="bg-sage-surface rounded-2xl py-3.5 items-center">
                  <Text className="text-sage-green font-bold text-sm">View Route →</Text>
                </TouchableOpacity>
              )}
              {/* Host always sees WhatsApp here; athletes see it in the enrolled block below */}
              {session.whatsapp_link && isHost && (
                <TouchableOpacity onPress={() => Linking.openURL(session.whatsapp_link!)} activeOpacity={0.8} className="rounded-2xl py-3.5 items-center flex-row justify-center gap-2" style={{ backgroundColor: '#25D36615', borderWidth: 1, borderColor: '#25D36630' }}>
                  <Text style={{ fontSize: 18 }}>💬</Text>
                  <Text style={{ color: '#25D366', fontWeight: '800', fontSize: 14 }}>WhatsApp Group</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── HOST TABS ── */}
          {isHost && (
            <>
              {/* Tab bar */}
              <View className="flex-row gap-1 bg-sage-surface rounded-2xl p-1">
                <HostTabBtn
                  label="Requests"
                  badge={pending.length > 0 ? pending.length : undefined}
                  active={hostTab === 'requests'}
                  onPress={() => setHostTab('requests')}
                />
                <HostTabBtn
                  label="Enrolled"
                  badge={accepted.length > 0 ? accepted.length : undefined}
                  active={hostTab === 'enrolled'}
                  onPress={() => setHostTab('enrolled')}
                />
                <HostTabBtn
                  label="Settings"
                  active={hostTab === 'settings'}
                  onPress={() => setHostTab('settings')}
                />
              </View>

              {/* Requests tab */}
              {hostTab === 'requests' && (
                <View className="bg-sage-surface rounded-2xl p-4 gap-4">
                  {/* Pending */}
                  <View>
                    <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mb-3">
                      Pending · {pending.length}
                    </Text>
                    {pending.length === 0 ? (
                      <Text className="text-sage-muted text-sm">No pending requests.</Text>
                    ) : (
                      pending.map((req) => (
                        <View key={req.id} className="flex-row items-center gap-3 py-3 border-b border-[#141414]">
                          <AvatarBtn name={req.user?.name} color="#f59e0b" onPress={() => setProfileUserId(req.user_id)} />
                          <TouchableOpacity onPress={() => setProfileUserId(req.user_id)} activeOpacity={0.7} className="flex-1">
                            <Text className="text-sage-text font-semibold text-sm" numberOfLines={1}>{req.user?.name ?? 'Athlete'}</Text>
                          </TouchableOpacity>
                          {!isLocked && (<>
                          <TouchableOpacity onPress={() => rejectRequest(req)} disabled={busy} activeOpacity={0.7} className="bg-red-500/15 border border-red-500/25 px-3 py-1.5 rounded-full mr-1.5">
                            <Text className="text-red-400 text-xs font-bold">✕</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => acceptRequest(req)} disabled={busy || isFull} activeOpacity={0.7} className="bg-sage-green/15 border border-sage-green/30 px-3 py-1.5 rounded-full">
                            <Text className="text-sage-green text-xs font-bold">✓ Accept</Text>
                          </TouchableOpacity>
                        </>)}
                        </View>
                      ))
                    )}
                  </View>

                  {/* Rejected */}
                  {rejected.length > 0 && (
                    <View>
                      <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase mb-3">
                        Rejected · {rejected.length}
                      </Text>
                      {rejected.map((r) => (
                        <View key={r.id} className="flex-row items-center gap-3 py-3 border-b border-[#141414]">
                          <AvatarBtn name={r.user?.name} color="#737373" onPress={() => setProfileUserId(r.user_id)} />
                          <TouchableOpacity onPress={() => setProfileUserId(r.user_id)} activeOpacity={0.7} className="flex-1">
                            <Text className="text-sage-muted font-semibold text-sm" numberOfLines={1}>{r.user?.name ?? 'Athlete'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => undoRejection(r)} disabled={busy} activeOpacity={0.7} className="bg-sage-surface border border-[#2a2a2a] px-3 py-1.5 rounded-full">
                            <Text className="text-sage-muted text-xs font-bold">Undo</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Enrolled tab */}
              {hostTab === 'enrolled' && (
                <View className="bg-sage-surface rounded-2xl p-4">
                  {accepted.length === 0 ? (
                    <Text className="text-sage-muted text-sm">No one enrolled yet.</Text>
                  ) : (
                    accepted.map((enr) => {
                      const att = enr.status === 'attended';
                      const ns = enr.status === 'no_show';
                      return (
                        <View key={enr.id} className="py-3 border-b border-[#141414]">
                          <View className="flex-row items-center gap-3 mb-2">
                            <AvatarBtn name={enr.user?.name} color="#4ade80" onPress={() => setProfileUserId(enr.user_id)} />
                            <TouchableOpacity onPress={() => setProfileUserId(enr.user_id)} activeOpacity={0.7} className="flex-1">
                              <Text className="text-sage-text font-semibold text-sm" numberOfLines={1}>{enr.user?.name ?? 'Athlete'}</Text>
                            </TouchableOpacity>
                            {(att || ns) && (
                              <View className={`px-2.5 py-0.5 rounded-full ${att ? 'bg-sage-green/15' : 'bg-red-500/15'}`}>
                                <Text className={`text-xs font-bold ${att ? 'text-sage-green' : 'text-red-400'}`}>
                                  {att ? '✓ Attended' : '✗ No-show'}
                                </Text>
                              </View>
                            )}
                          </View>
                          {!isLocked && (
                          <View className="flex-row gap-2 ml-11">
                            <TouchableOpacity
                              onPress={() => att ? markAttendance(enr, 'enrolled') : markAttendance(enr, 'attended')}
                              disabled={busy} activeOpacity={0.7}
                              className={`flex-1 py-1.5 rounded-xl items-center ${att ? 'bg-sage-green/20 border border-sage-green/30' : 'bg-[#0a0a0a]'}`}
                            >
                              <Text className={`text-xs font-bold ${att ? 'text-sage-green' : 'text-sage-muted'}`}>
                                {att ? 'Undo' : '✓ Attended'}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => ns ? markAttendance(enr, 'enrolled') : markAttendance(enr, 'no_show')}
                              disabled={busy} activeOpacity={0.7}
                              className={`flex-1 py-1.5 rounded-xl items-center ${ns ? 'bg-red-500/20 border border-red-500/30' : 'bg-[#0a0a0a]'}`}
                            >
                              <Text className={`text-xs font-bold ${ns ? 'text-red-400' : 'text-sage-muted'}`}>
                                {ns ? 'Undo' : '✗ No-show'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* Settings tab */}
              {hostTab === 'settings' && (
                <View className="bg-sage-surface rounded-2xl p-4 gap-3">
                  {isCompleted ? (
                    <View className="rounded-xl py-4 items-center" style={{ backgroundColor: '#60a5fa15', borderWidth: 1, borderColor: '#60a5fa30' }}>
                      <Text style={{ color: '#60a5fa', fontWeight: '800', fontSize: 14 }}>✓ Session Completed</Text>
                      <Text className="text-sage-muted text-xs mt-1">Attendance records are final.</Text>
                    </View>
                  ) : isCancelled ? (
                    <View className="bg-red-500/10 rounded-xl py-4 items-center">
                      <Text className="text-red-400 font-bold text-sm">Session Cancelled</Text>
                    </View>
                  ) : isArchived ? (
                    <TouchableOpacity onPress={reactivateSession} disabled={busy} activeOpacity={0.8} className="bg-sage-green/15 border border-sage-green/30 rounded-xl py-3.5 items-center">
                      <Text className="text-sage-green font-bold text-sm">↑ Re-activate Session</Text>
                      <Text className="text-sage-muted text-xs mt-1">Resets spots to 0 · fresh start</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity onPress={completeSession} disabled={busy} activeOpacity={0.8} className="rounded-xl py-3.5 items-center" style={{ backgroundColor: '#60a5fa15', borderWidth: 1, borderColor: '#60a5fa30' }}>
                        <Text style={{ color: '#60a5fa', fontWeight: '700', fontSize: 14 }}>✓ Mark as Completed</Text>
                        <Text className="text-sage-muted text-xs mt-0.5">Locks attendance — no more changes</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={archiveSession} disabled={busy} activeOpacity={0.8} className="bg-[#73737318] border border-[#73737330] rounded-xl py-3.5 items-center">
                        <Text className="text-sage-muted font-bold text-sm">Archive Session</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={cancelSession} activeOpacity={0.7} className="bg-red-500/10 border border-red-500/20 rounded-xl py-3.5 items-center">
                        <Text className="text-red-400 font-bold text-sm">Cancel Session</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </>
          )}

          {/* ── ATHLETE VIEW ── */}
          {!isHost && (
            <>
              <View className="bg-sage-surface rounded-2xl px-4 py-3 flex-row justify-between items-center">
                <Text className="text-sage-muted text-xs font-bold tracking-widest uppercase">Spots filled</Text>
                <Text className="text-sage-text font-black text-lg">
                  {enrolledCount}<Text className="text-sage-muted font-normal text-sm"> / {session.max_participants}</Text>
                </Text>
              </View>

              {/* CTA based on status */}
              {isCancelled ? (
                <StatusCard color="red" title="Session Cancelled" />
              ) : isArchived ? (
                <StatusCard color="gray" title="Session Archived" />
              ) : isAttended ? (
                <View className="bg-sage-green/10 border border-sage-green/20 rounded-2xl p-5 items-center gap-2">
                  <Text style={{ fontSize: 36 }}>🏅</Text>
                  <Text className="text-sage-green font-black text-lg">You Attended!</Text>
                  <Text className="text-sage-muted text-sm text-center">Great work completing this session. It'll show in your profile.</Text>
                </View>
              ) : isNoShow ? (
                <View className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 items-center gap-2">
                  <Text style={{ fontSize: 36 }}>😔</Text>
                  <Text className="text-red-400 font-black text-base">Marked as No-Show</Text>
                  <Text className="text-sage-muted text-sm text-center">You were marked absent. Reach out to the host if this is incorrect.</Text>
                </View>
              ) : isRejected ? (
                <View className="bg-[#73737318] border border-[#73737330] rounded-2xl p-5 items-center gap-2">
                  <Text style={{ fontSize: 36 }}>🚫</Text>
                  <Text className="text-sage-muted font-black text-base">Request Rejected</Text>
                  <Text className="text-sage-muted text-sm text-center">The host declined your request for this session.</Text>
                </View>
              ) : isPending ? (
                <View className="gap-3">
                  <View className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 items-center">
                    <Text className="text-orange-400 font-black text-sm mb-1">Request Sent ⏳</Text>
                    <Text className="text-sage-muted text-xs text-center">Waiting for the host to accept.</Text>
                  </View>
                  <TouchableOpacity onPress={cancelRequest} disabled={busy} activeOpacity={0.7} className="bg-sage-surface rounded-2xl py-3.5 items-center">
                    <Text className="text-sage-muted font-bold text-sm">Cancel Request</Text>
                  </TouchableOpacity>
                </View>
              ) : isEnrolled ? (
                <View className="gap-3">
                  {/* Confirmed banner */}
                  <View className="bg-sage-green/10 border border-sage-green/20 rounded-2xl py-4 items-center">
                    <Text className="text-sage-green font-black text-base">✓ You're In!</Text>
                    <Text className="text-sage-muted text-xs mt-1">Host has accepted your request</Text>
                  </View>
                  {/* WhatsApp — prominent, right after confirmation */}
                  {session.whatsapp_link ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(session.whatsapp_link!)}
                      activeOpacity={0.85}
                      className="rounded-2xl py-4 items-center flex-row justify-center gap-2"
                      style={{ backgroundColor: '#25D36620', borderWidth: 1.5, borderColor: '#25D36650' }}
                    >
                      <Text style={{ fontSize: 22 }}>💬</Text>
                      <Text style={{ color: '#25D366', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 }}>
                        Join WhatsApp Group
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity onPress={leaveSession} disabled={busy} activeOpacity={0.7} className="bg-sage-surface rounded-2xl py-3.5 items-center">
                    <Text className="text-sage-muted font-bold text-sm">Leave Session</Text>
                  </TouchableOpacity>
                </View>
              ) : isFull ? (
                <StatusCard color="red" title="Session Full" />
              ) : (
                <TouchableOpacity onPress={requestJoin} disabled={busy} activeOpacity={0.85} className="bg-sage-green rounded-2xl py-4 items-center">
                  <Text className="text-black font-black text-base tracking-widest">
                    {busy ? 'REQUESTING…' : 'REQUEST TO JOIN →'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <AthleteSheet userId={profileUserId} onClose={() => setProfileUserId(null)} />
    </SafeAreaView>
  );
}

// ── Small sub-components ──────────────────────────────────────────────────

function HostTabBtn({
  label, badge, active, onPress,
}: {
  label: string; badge?: number; active: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress} activeOpacity={0.8} className="flex-1 items-center py-2 rounded-xl flex-row justify-center gap-1.5"
      style={{ backgroundColor: active ? '#0a0a0a' : 'transparent' }}
    >
      <Text style={{ color: active ? '#f5f5f5' : '#737373', fontWeight: '700', fontSize: 12 }}>
        {label}
      </Text>
      {badge != null && (
        <View style={{ backgroundColor: active ? '#4ade80' : '#525252', borderRadius: 10, minWidth: 18, paddingHorizontal: 5, height: 18, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: active ? '#000' : '#f5f5f5', fontSize: 10, fontWeight: '900' }}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function AvatarBtn({ name, color, onPress }: { name?: string; color: string; onPress: () => void }) {
  const initials = name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: color + '22' }}>
        <Text style={{ color, fontWeight: '900', fontSize: 12 }}>{initials}</Text>
      </View>
    </TouchableOpacity>
  );
}

function StatusCard({ color, title }: { color: 'red' | 'gray'; title: string }) {
  const bg = color === 'red' ? 'bg-red-500/10' : 'bg-[#73737318]';
  const text = color === 'red' ? 'text-red-400' : 'text-sage-muted';
  return (
    <View className={`${bg} rounded-2xl py-4 items-center`}>
      <Text className={`${text} font-bold`}>{title}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, valueColor }: {
  icon: string; label: string; value: string; valueColor?: string;
}) {
  return (
    <View className="flex-row items-center justify-between py-2.5 border-b border-[#141414]">
      <View className="flex-row items-center gap-2">
        <Text style={{ fontSize: 14 }}>{icon}</Text>
        <Text className="text-sage-muted text-sm">{label}</Text>
      </View>
      <Text className="font-semibold text-sm" style={{ color: valueColor ?? '#e5e5e5' }}>{value}</Text>
    </View>
  );
}
