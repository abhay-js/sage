import { useCallback } from 'react';
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useActivities } from '../../hooks/useActivities';
import { Page, Section, Button, s } from '../../components/ui/SageUI';
import { ProfileHeader } from '../../components/ui/ProfileHeader';
import { Skeleton } from '../../components/ui/ProductUI';
import { SageIcon, SageIconName } from '../../components/ui/SageIcon';
import { sageColors as c } from '../../lib/theme';

export default function TrainingDetails() {
  const router = useRouter();
  const { user } = useAuth();
  const { activities, loading, error, refetch } = useActivities(user?.id);
  useFocusEffect(useCallback(() => { void refetch(); }, [refetch]));
  const hours = activities.reduce((sum, activity) => sum + activity.moving_time_secs, 0) / 3600;
  const sports = [...new Set(activities.map(activity => activity.sport_type))];
  const names: Record<string, string> = { Run: 'Running', Ride: 'Cycling', Swim: 'Swimming', WeightTraining: 'Strength', CrossFit: 'HYROX' };
  const icons: Record<string, SageIconName> = { Run: 'activity', Ride: 'bike', Swim: 'swim', WeightTraining: 'strength', CrossFit: 'strength' };
  const heartRates = activities.filter(activity => activity.avg_heartrate != null);
  const peakRates = activities.filter(activity => activity.max_heartrate != null);
  const elevation = activities.filter(activity => activity.elevation_gain != null);
  const calories = activities.filter(activity => activity.calories != null);
  return <Page>
    <ProfileHeader title="Training details" detail />
    <Text style={s.eyebrow}>YOUR ALL-TIME EFFORT</Text><Text style={[s.title, { fontSize: 34 }]}>Every session adds up.</Text>
    <Text style={[s.muted, { marginTop: 10, marginBottom: 24 }]}>Your recorded workouts, across every sport.</Text>
    {!!error && <View style={{ marginBottom: 18 }}><Text accessibilityRole="alert" style={{ color: c.orange, marginBottom: 12 }}>{error}</Text><Button title="Retry workouts" onPress={refetch} /></View>}
    {loading ? <Skeleton /> : <>
      <View style={styles.summary}><View style={{ flex: 1 }}><Text style={styles.summaryValue}>{activities.length}</Text><Text style={styles.summaryLabel}>Workouts logged</Text></View><View style={{ flex: 1 }}><Text style={styles.summaryValue}>{hours.toFixed(1)}</Text><Text style={styles.summaryLabel}>Training hours</Text></View></View>
      <Section title="Your sports" />
      {sports.length ? sports.map(sport => {
        const workouts = activities.filter(activity => activity.sport_type === sport);
        const measured = workouts.filter(activity => activity.distance_meters != null);
        const distance = measured.reduce((sum, activity) => sum + (activity.distance_meters ?? 0), 0);
        return <View key={sport} style={styles.card}>
          <View style={[s.row, { gap: 12 }]}><View style={styles.icon}><SageIcon name={icons[sport] ?? 'activity'} /></View><View style={{ flex: 1 }}><Text style={s.section}>{names[sport] ?? sport}</Text><Text style={[s.muted, { fontSize: 11 }]}>{workouts.length} workout{workouts.length === 1 ? '' : 's'}</Text></View></View>
          <View style={[s.row, { marginTop: 20, gap: 24 }]}><View style={{ flex: 1 }}><Text style={styles.value}>{(workouts.reduce((sum, activity) => sum + activity.moving_time_secs, 0) / 3600).toFixed(1)} <Text style={styles.unit}>hrs</Text></Text><Text style={styles.label}>Time training</Text></View>{measured.length > 0 && <View style={{ flex: 1 }}><Text style={styles.value}>{(distance / 1000).toFixed(1)} <Text style={styles.unit}>km</Text></Text><Text style={styles.label}>Recorded distance</Text></View>}</View>
        </View>;
      }) : <View style={styles.card}><SageIcon name="route" size={28} /><Text style={[s.section, { marginTop: 16 }]}>Your story starts with a workout.</Text><Text style={[s.muted, { marginTop: 8 }]}>Record an activity or connect your workouts to build your training history.</Text></View>}
      {(elevation.length > 0 || calories.length > 0 || heartRates.length > 0 || peakRates.length > 0) && <><Section title="Recorded highlights" /><View style={styles.card}>
        {elevation.length > 0 && <Detail label="Total elevation" value={`${Math.round(elevation.reduce((sum, activity) => sum + (activity.elevation_gain ?? 0), 0)).toLocaleString('en-IN')} m`} />}
        {calories.length > 0 && <Detail label="Active calories" value={`${Math.round(calories.reduce((sum, activity) => sum + (activity.calories ?? 0), 0)).toLocaleString('en-IN')} kcal`} />}
        {heartRates.length > 0 && <Detail label="Mean workout heart rate" value={`${Math.round(heartRates.reduce((sum, activity) => sum + activity.avg_heartrate!, 0) / heartRates.length)} bpm`} />}
        {peakRates.length > 0 && <Detail label="Highest recorded heart rate" value={`${Math.round(Math.max(...peakRates.map(activity => activity.max_heartrate!)))} bpm`} />}
        {heartRates.length > 0 && <Text style={[s.muted, { fontSize: 10, marginTop: 12 }]}>Mean heart rate averages the recorded workout averages. Missing measurements are excluded.</Text>}
      </View></>}
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(app)/log')} style={styles.activityLink}><View><Text style={s.section}>Explore your activities</Text><Text style={s.muted}>Workouts, charts and scoring details</Text></View><SageIcon name="arrow" /></TouchableOpacity>
    </>}
  </Page>;
}
function Detail({ label, value }: { label: string; value: string }) { return <View style={[s.between, { paddingVertical: 12, gap: 12 }]}><Text style={[s.muted, { flex: 1 }]}>{label}</Text><Text style={[s.section, { fontSize: 13 }]}>{value}</Text></View>; }
const styles = StyleSheet.create({
  summary: { backgroundColor: c.green, borderRadius: 24, padding: 24, flexDirection: 'row', gap: 20 },
  summaryValue: { color: c.onAccent, fontSize: 32, fontWeight: '700' }, summaryLabel: { color: c.onAccent, fontSize: 12, marginTop: 6 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 22, marginBottom: 12 },
  icon: { padding: 12, backgroundColor: c.pale, borderRadius: 16 },
  value: { color: c.text, fontSize: 25, fontWeight: '600' }, unit: { color: c.muted, fontSize: 12 }, label: { color: c.muted, fontSize: 11, marginTop: 5 },
  activityLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 20, borderRadius: 20, backgroundColor: c.pale, marginTop: 14 },
});
