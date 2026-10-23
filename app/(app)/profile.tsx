import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useMyEntries } from '../../hooks/useEntries';
import { useActivities } from '../../hooks/useActivities';
import { useAthleteProfile, useProductChallenges } from '../../hooks/useProduct';
import { healthPlatformName } from '../../lib/healthSync';
import { useHealthSync } from '../../context/HealthSyncContext';
import { levelName, SPORT_OPTIONS } from '../../lib/productConfig';
import { Page, Section, s } from '../../components/ui/SageUI';
import { ProfileHeader } from '../../components/ui/ProfileHeader';
import { ProfilePhoto } from '../../components/ui/ProductUI';
import { SageIcon, SageIconName } from '../../components/ui/SageIcon';
import { sageColors as c } from '../../lib/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const athlete = useAthleteProfile();
  const catalog = useProductChallenges();
  const { entries, loading: entriesLoading, refetch: refreshEntries } = useMyEntries(user?.id);
  const { activities, loading: activitiesLoading, error: activitiesError, refetch: refreshActivities } = useActivities(user?.id);
  const health = useHealthSync();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  useFocusEffect(useCallback(() => { void refreshEntries(); void refreshActivities(); }, [refreshEntries, refreshActivities]));
  const profile = athlete.data?.profile;
  const name = profile?.full_name || user?.name || 'Athlete';
  const location = [profile?.city, profile?.country].filter(Boolean).join(', ');
  const points = entries.reduce((sum, entry) => sum + entry.sage_score, 0);
  const streak = entries.reduce((max, entry) => Math.max(max, entry.streak), 0);
  const hours = activities.reduce((sum, activity) => sum + activity.moving_time_secs, 0) / 3600;
  const finished = (catalog.data ?? []).filter(challenge => challenge.joined && (challenge.status === 'closed' || Date.parse(challenge.challenge_end) < Date.now()));
  const joined = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null;
  const sports = (profile?.sports ?? []).map(sport => SPORT_OPTIONS.find(option => option.id === sport)?.label ?? sport);
  const profileError = athlete.error || catalog.error || activitiesError;
  function retry() { athlete.refresh(); catalog.refresh(); void refreshActivities(); void refreshEntries(); }
  async function logout() {
    setSigningOut(true); setSignOutError('');
    try { await signOut(); } catch (error) { setSignOutError(error instanceof Error ? error.message : 'Unable to sign out. Try again.'); }
    finally { setSigningOut(false); }
  }
  const row = (icon: SageIconName, title: string, subtitle: string, onPress: () => void, last = false) => <TouchableOpacity accessibilityRole="button" onPress={onPress} activeOpacity={0.7} style={[styles.menuRow, !last && styles.menuDivider]}>
    <View style={styles.menuIcon}><SageIcon name={icon} size={20} /></View>
    <View style={{ flex: 1 }}><Text style={styles.menuTitle}>{title}</Text><Text style={styles.menuSubtitle}>{subtitle}</Text></View>
    <SageIcon name="chevron" size={17} color={c.muted} />
  </TouchableOpacity>;

  return <Page>
    <ProfileHeader title="My profile" />
    <View style={styles.identity}>
      <View pointerEvents="none" style={styles.orbit} /><View pointerEvents="none" style={styles.orbitSmall} />
      <View style={styles.identityTop}>
        <View style={styles.photoRing}><ProfilePhoto name={name} uri={profile?.profile_image_url} size={82} /></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Edit profile" onPress={() => router.push('/(app)/profile-edit')} style={styles.editButton}><Text style={styles.editLabel}>Edit profile</Text><SageIcon name="chevron" size={14} /></TouchableOpacity>
      </View>
      <Text style={styles.name}>{name}</Text>
      {!!location && <Text style={[s.muted, { marginTop: 6 }]}>{location}</Text>}
      <Text style={styles.email}>{user?.email}</Text>
      <View style={styles.identityFooter}>
        <View style={styles.level}><SageIcon name="shield" size={14} /><Text style={styles.levelLabel}>{athlete.loading && !athlete.data ? 'Loading level…' : levelName(athlete.data?.level, athlete.data?.levels ?? [])}</Text></View>
        {!!joined && <Text style={styles.joined}>Since {joined}</Text>}
      </View>
    </View>

    <View style={styles.scoreStrip}>
      {[[entriesLoading ? '—' : points.toLocaleString('en-IN'), 'Total points'], [catalog.loading && !catalog.data ? '—' : (catalog.data ?? []).filter(challenge => challenge.joined).length, 'Challenges'], [entriesLoading ? '—' : streak, 'Day streak']].map(([value, label], index) => <View key={label} style={[styles.score, index > 0 && styles.scoreDivider]}><Text style={styles.scoreValue}>{value}</Text><Text style={styles.scoreLabel}>{label}</Text></View>)}
    </View>
    {!!profileError && <TouchableOpacity accessibilityRole="button" onPress={retry} style={styles.error}><Text style={{ color: c.orange, fontSize: 12 }}>Some profile data couldn’t load. Tap to retry.</Text></TouchableOpacity>}

    <Section title="Built by showing up" action="Training details" onPress={() => router.push('/(app)/profile-details')} />
    <View style={styles.trainingGrid}>
      <View style={[styles.trainingTile, { backgroundColor: c.pale }]}><SageIcon name="activity" size={23} /><Text style={styles.trainingValue}>{activitiesLoading ? '—' : activities.length}</Text><Text style={styles.trainingLabel}>Workouts logged</Text></View>
      <View style={[styles.trainingTile, { backgroundColor: c.peach }]}><SageIcon name="clock" size={23} color={c.orange} /><Text style={styles.trainingValue}>{activitiesLoading ? '—' : hours.toFixed(1)}<Text style={styles.unit}> hrs</Text></Text><Text style={styles.trainingLabel}>Time in training</Text></View>
    </View>

    <Section title="Your athlete DNA" />
    <View style={styles.card}>
      <Text style={styles.smallLabel}>SPORTS YOU LOVE</Text>
      <View style={styles.sports}>{sports.length ? sports.map(sport => <View key={sport} style={styles.sport}><Text style={styles.sportLabel}>{sport}</Text></View>) : <Text style={s.muted}>Add your sports to make this space yours.</Text>}</View>
      {profile?.primary_sport && <Text style={styles.primary}>Main focus · {SPORT_OPTIONS.find(option => option.id === profile.primary_sport)?.label ?? profile.primary_sport}</Text>}
      <View style={styles.goal}>
        <View style={styles.goalIcon}><SageIcon name="flag" color={c.orange} /></View>
        <View style={{ flex: 1 }}><Text style={styles.smallLabel}>NEXT HORIZON</Text><Text style={styles.goalTitle}>{profile?.goal_name || 'Every workout is a step forward'}</Text>{!!profile?.goal_target && <Text style={s.muted}>{profile.goal_target}</Text>}{!!profile?.goal_date && <Text style={styles.menuSubtitle}>{new Date(`${profile.goal_date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>}</View>
      </View>
    </View>

    <Section title="Your climb so far" />
    <View style={[styles.card, { paddingVertical: 24 }]}>
      <View style={[s.row, { gap: 10, marginBottom: 22 }]}><SageIcon name="trophy" color={c.orange} /><Text style={s.section}>Challenge achievements</Text></View>
      <View style={s.row}>{[[finished.length, 'Completed'], [finished.filter(challenge => challenge.rank === 1).length, 'Wins'], [finished.filter(challenge => challenge.rank != null && challenge.rank <= 3).length, 'Top 3 finishes']].map(([value, label]) => <View key={label} style={{ flex: 1 }}><Text style={styles.achievementValue}>{catalog.loading && !catalog.data ? '—' : value}</Text><Text style={styles.trainingLabel}>{label}</Text></View>)}</View>
    </View>

    <Section title="Make Sage yours" />
    <View style={styles.menu}>
      {row('user', 'Personal details', 'Photo, sports and training goals', () => router.push('/(app)/profile-edit'))}
      {row('heart', 'Workout connections', `${healthPlatformName()} · ${health.enabled ? 'Auto import on' : 'Set up workout imports'}`, () => router.push('/(app)/health-connect'))}
      {row('shield', 'Privacy & permissions', 'Your data stays in your control', () => router.push('/privacy'), true)}
    </View>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: signingOut }} disabled={signingOut} onPress={logout} style={styles.signOut}><Text style={styles.signOutLabel}>{signingOut ? 'Signing out…' : 'Sign out'}</Text></TouchableOpacity>
    {!!signOutError && <Text accessibilityRole="alert" style={{ color: c.orange, textAlign: 'center' }}>{signOutError}</Text>}
    <Text style={styles.footer}>SAGE · KEEP FINDING YOUR HIGHER GROUND</Text>
  </Page>;
}

const styles = StyleSheet.create({
  identity: { backgroundColor: c.pale, padding: 24, borderRadius: 26, overflow: 'hidden' },
  orbit: { position: 'absolute', width: 210, height: 210, borderRadius: 105, borderWidth: 1, borderColor: c.green, opacity: 0.09, right: -85, top: -80 },
  orbitSmall: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 1, borderColor: c.green, opacity: 0.09, right: -55, top: -50 },
  identityTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  photoRing: { padding: 5, borderRadius: 50, backgroundColor: c.surface },
  editButton: { flexDirection: 'row', gap: 4, paddingVertical: 11, paddingHorizontal: 13, backgroundColor: c.surface, borderRadius: 30, minHeight: 44, alignItems: 'center' },
  editLabel: { color: c.green, fontSize: 11, fontWeight: '700' },
  name: { color: c.text, fontSize: 30, fontWeight: '700', letterSpacing: -1, marginTop: 20 },
  email: { color: c.muted, fontSize: 12, marginTop: 6 },
  identityFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', marginTop: 22 },
  level: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: c.green, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 10 },
  levelLabel: { color: c.green, fontSize: 10, fontWeight: '700' }, joined: { color: c.muted, fontSize: 10 },
  scoreStrip: { flexDirection: 'row', paddingVertical: 23, backgroundColor: c.green, borderRadius: 22, marginTop: 14 },
  score: { flex: 1, alignItems: 'center', paddingHorizontal: 5 }, scoreDivider: { borderLeftWidth: 1, borderLeftColor: c.onAccent },
  scoreValue: { color: c.onAccent, fontSize: 25, fontWeight: '700', letterSpacing: -0.7 }, scoreLabel: { color: c.onAccent, fontSize: 10, marginTop: 5 },
  trainingGrid: { flexDirection: 'row', gap: 12 }, trainingTile: { flex: 1, padding: 20, borderRadius: 22 },
  trainingValue: { color: c.text, fontSize: 32, fontWeight: '600', letterSpacing: -1, marginTop: 24 }, unit: { fontSize: 13, color: c.muted, letterSpacing: 0 },
  trainingLabel: { color: c.muted, fontSize: 11, marginTop: 6 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 20 },
  smallLabel: { color: c.muted, fontWeight: '700', fontSize: 9, letterSpacing: 1.5, marginBottom: 9 },
  sports: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, sport: { backgroundColor: c.pale, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12 }, sportLabel: { color: c.green, fontWeight: '600', fontSize: 11 },
  primary: { color: c.muted, fontSize: 11, marginTop: 12 },
  goal: { flexDirection: 'row', gap: 12, marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: c.border },
  goalIcon: { backgroundColor: c.peach, width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }, goalTitle: { color: c.text, fontSize: 14, fontWeight: '600', lineHeight: 21 },
  achievementValue: { color: c.text, fontSize: 27, fontWeight: '700' },
  menu: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, paddingHorizontal: 16 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 17, gap: 12 }, menuDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
  menuIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: c.pale, borderRadius: 14 },
  menuTitle: { color: c.text, fontWeight: '600', fontSize: 13 }, menuSubtitle: { color: c.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  signOut: { borderWidth: 1, borderColor: c.border, borderRadius: 18, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: 24 }, signOutLabel: { color: c.orange, fontWeight: '700', fontSize: 13 },
  footer: { fontSize: 8, letterSpacing: 1.4, color: c.muted, textAlign: 'center', marginTop: 24 },
  error: { padding: 16, marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: c.border },
});
