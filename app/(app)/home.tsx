import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useProductChallenges, useAroundMe, useAthleteProfile } from '../../hooks/useProduct';
import { useActivities } from '../../hooks/useActivities';
import { healthPlatformName } from '../../lib/healthSync';
import { useHealthSync } from '../../context/HealthSyncContext';
import { challengeState } from '../../lib/productConfig';
import { Page, Brand, Button, Section, s } from '../../components/ui/SageUI';
import { ProfilePhoto, Skeleton, form } from '../../components/ui/ProductUI';
import { MountainArt } from '../../components/ui/MountainArt';
import { SageIcon } from '../../components/ui/SageIcon';
import { sageColors as c } from '../../lib/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: challenges, loading, error, refresh } = useProductChallenges();
  const { data: profile } = useAthleteProfile();
  const { activities, refetch } = useActivities(user?.id);
  const active = challenges?.find(challenge => challenge.joined && challengeState(challenge) === 'Live')
    ?? challenges?.find(challenge => challenge.joined && challengeState(challenge) === 'Upcoming');
  const { data: around } = useAroundMe(active?.id);
  const health = useHealthSync();
  const today = activities.filter(activity => new Date(activity.activity_started_at ?? activity.activity_date).toDateString() === new Date().toDateString());
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const upcoming = active && challengeState(active) === 'Upcoming';
  const daysLeft = active ? Math.max(0, Math.ceil((Date.parse(active.challenge_end) - Date.now()) / 86400000)) : 0;
  async function sync() {
    if (!health.enabled) { router.push('/(app)/health-connect'); return; }
    await health.sync();
    await refetch();
    refresh();
  }

  return <Page>
    <View style={[s.between, styles.masthead]}>
      <Brand />
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push('/(app)/profile')}>
        <ProfilePhoto name={user?.name ?? 'Athlete'} uri={profile?.profile?.profile_image_url} size={42} />
      </TouchableOpacity>
    </View>

    <View style={styles.intro}>
      <Text style={s.eyebrow}>{greeting.toUpperCase()}, {user?.name?.split(' ')[0]?.toUpperCase() || 'ATHLETE'}</Text>
      <Text accessibilityRole="header" style={styles.headline}>Find your{ '\n' }higher ground.</Text>
      <Text style={[s.muted, { marginTop: 14 }]}>A little further. A little stronger. Every day.</Text>
    </View>

    <View style={styles.sectionHeading}><Text style={s.eyebrow}>01 / YOUR CHALLENGE</Text><View style={styles.rule} /></View>
    {loading && !challenges ? <Skeleton /> : active ? <View style={s.card}>
      <View style={styles.challengeHeading}>
        <Text style={[s.eyebrow, { color: c.green }]}>{upcoming ? 'UP NEXT' : 'THE CLIMB IS ON'}</Text>
        <Text accessibilityRole="header" style={[s.title, { fontSize: 28, marginBottom: 14 }]}>{active.name}</Text>
        <View style={s.row}>
          <View style={styles.statusDot} />
          <Text style={styles.status}>{upcoming ? `Starts ${new Date(active.challenge_start).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : `Day ${Math.max(1, Math.ceil((Date.now() - Date.parse(active.challenge_start)) / 86400000))} of ${Math.max(1, Math.ceil((Date.parse(active.challenge_end) - Date.parse(active.challenge_start)) / 86400000))}`}</Text>
        </View>
      </View>
      <View style={styles.landscape}><MountainArt /></View>
      <View style={s.body}>
        <View style={styles.metrics}>
          {([['Your rank', active.rank ? `#${active.rank}` : '—'], ['Your points', active.sage_score], ['Days left', daysLeft]] as const).map(([label, value], index) => <View key={label} style={[styles.metric, index > 0 && styles.metricDivider]}>
            <Text style={s.label}>{label.toUpperCase()}</Text><Text style={[s.value, { fontSize: 25 }]}>{value}</Text>
          </View>)}
        </View>
        <Text style={[s.muted, { marginBottom: 20 }]}>{around?.nextGap ? `${around.nextGap} pts to your next rival. Keep climbing.` : active.rank === 1 ? 'You are leading the climb.' : 'Your journey starts here.'}</Text>
        <Button title="View Mountain" onPress={() => router.push({ pathname: '/(app)/ranks', params: { raceId: active.id } })} />
        <TouchableOpacity accessibilityRole="button" onPress={() => router.push({ pathname: '/(app)/challenge-detail', params: { id: active.id } })} style={styles.details}>
          <Text style={styles.link}>Challenge details & rewards</Text><SageIcon name="chevron" size={16} />
        </TouchableOpacity>
      </View>
    </View> : <View style={s.card}>
      <View style={styles.landscape}><MountainArt /></View>
      <View style={[s.body, { padding: 24 }]}><Text style={[s.title, { fontSize: 27 }]}>Your next climb awaits.</Text>
        <Text style={[s.muted, { marginTop: 12, marginBottom: 24 }]}>Find your next Sage Clash and make every workout count.</Text>
        <Button title="Browse Challenges" onPress={() => router.push('/(app)/challenges')} />
      </View>
    </View>}
    {!!error && <><Text style={form.note}>{error}</Text><Button title="Retry challenges" onPress={refresh} /></>}

    <View style={[styles.sectionHeading, { marginTop: 32 }]}><Text style={s.eyebrow}>02 / YOUR DAILY PRACTICE</Text><View style={styles.rule} /></View>
    <View style={styles.daily}>
      <View style={styles.distance}><SageIcon name="route" size={22} /><Text style={styles.dailyValue}>{(today.reduce((sum, activity) => sum + (activity.distance_meters ?? 0), 0) / 1000).toFixed(1)}<Text style={styles.unit}> km</Text></Text><Text style={s.label}>DISTANCE TODAY</Text></View>
      <View style={styles.streak}><SageIcon name="flame" size={22} color={c.orange} /><Text style={styles.dailyValue}>{around?.current?.streak ?? 0}<Text style={styles.unit}> days</Text></Text><Text style={s.label}>CURRENT STREAK</Text></View>
    </View>

    <Section title="Keep it connected" />
    <View style={[s.card, { padding: 22 }]}>
      <View style={[s.row, { gap: 12 }]}><SageIcon name="activity" size={24} /><Text style={[s.section, { flex: 1 }]}>{healthPlatformName()}</Text></View>
      <Text style={[s.muted, { marginTop: 14, marginBottom: 20 }]}>Bring your workouts along. Sync automatically when you open Sage, or add Garmin and indoor FIT uploads in your connections.</Text>
      <Button disabled={health.busy} title={health.busy ? 'Syncing…' : health.enabled ? 'Sync workouts' : 'Connect your workouts'} onPress={sync} />
      {!!health.error && <Text style={form.note}>{health.error}</Text>}
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(app)/health-connect')} style={styles.details}><Text style={styles.link}>Manage workout connections</Text><SageIcon name="chevron" size={16} /></TouchableOpacity>
    </View>
    <Text style={styles.signoff}>ONE WORKOUT AT A TIME.</Text>
  </Page>;
}

const styles = StyleSheet.create({
  masthead: { paddingVertical: 8, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: c.border },
  intro: { paddingTop: 32, paddingBottom: 34 },
  headline: { color: c.text, fontSize: 43, lineHeight: 47, fontWeight: '600', letterSpacing: -2 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  rule: { height: 1, backgroundColor: c.border, flex: 1, marginBottom: 8 },
  challengeHeading: { padding: 24, backgroundColor: c.pale },
  landscape: { height: 156 },
  status: { color: c.green, fontSize: 12, fontWeight: '600' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.green, marginRight: 7 },
  metrics: { flexDirection: 'row', marginBottom: 18 },
  metric: { flex: 1, paddingVertical: 4 },
  metricDivider: { borderLeftWidth: 1, borderLeftColor: c.border, paddingLeft: 12 },
  details: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, minHeight: 48, paddingTop: 12 },
  link: { color: c.green, fontWeight: '600', fontSize: 12, flexShrink: 1 },
  daily: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  distance: { flex: 1, padding: 20, paddingTop: 24, paddingBottom: 26, backgroundColor: c.pale },
  streak: { flex: 1, padding: 20, paddingTop: 24, paddingBottom: 26, backgroundColor: c.peach, marginTop: 20 },
  dailyValue: { color: c.text, fontSize: 30, fontWeight: '600', letterSpacing: -1, marginTop: 20, marginBottom: 8 },
  unit: { fontSize: 13, letterSpacing: 0, fontWeight: '500', color: c.muted },
  signoff: { textAlign: 'center', color: c.muted, fontSize: 9, letterSpacing: 2.5, marginTop: 32, marginBottom: 8 },
});
