import { useState } from 'react';
import { Linking, Modal, Text, View } from 'react-native';
import { Submission, submissionTitle } from '../../hooks/useSubmissions';
import { useRpc, useScoreAudits } from '../../hooks/useProduct';
import { MetricSample, WorkoutLocation, formatPace } from '../../lib/activityMetrics';
import { formatDuration, sportLabel } from '../../lib/challengeExperience';
import { adventureColors as c } from '../../lib/theme';
import { Page, Header, BackAction, Button, Section, Empty, s } from './AdventureUI';
import { RecordingRouteMap } from './RecordingRouteMap';
import { MetricChart } from './WorkoutAnalytics';

interface SubmissionDetail extends Submission {
  reviewed_at?: string | null;
  streams?: { locations?: WorkoutLocation[]; heartRate?: MetricSample[]; speed?: MetricSample[]; elevation?: MetricSample[] };
  history?: { id: string; status: string; reason?: string | null; created_at: string }[];
}
function dateLabel(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—';
  return new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function measurement(value: unknown, unit: string, decimals = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(decimals)} ${unit}` : '—';
}

export function SubmissionDetails({ submission, onClose }: { submission: Submission; onClose: () => void }) {
  const [linkError, setLinkError] = useState('');
  const detail = useRpc<SubmissionDetail>('sage_submission_detail', { p_id: submission.id });
  const item = detail.data ?? submission, metrics = item.metrics ?? {};
  const audits = useScoreAudits(item.activity_id ?? undefined);
  const streams = detail.data?.streams, distance = metrics.distance_meters, seconds = metrics.moving_time_secs;
  const sport = metrics.sport_type, swimming = sport === 'Swim', riding = sport === 'Ride';
  const duration = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? formatDuration(value) : '—';
  const pace = typeof distance === 'number' && distance > 0 && typeof seconds === 'number' && seconds > 0 ? seconds / 60 / (distance / (swimming ? 100 : 1000)) : null;
  // Uploaded speed samples are in km/h; zero-speed samples create gaps in pace charts.
  let stopped = false;
  const paceSamples: MetricSample[] = [];
  for (const point of streams?.speed ?? []) {
    if (point.value <= 0) { stopped = true; continue; }
    paceSamples.push({ ...point, value: (swimming ? 6 : 60) / point.value, breakBefore: point.breakBefore || stopped });
    stopped = false;
  }
  const rows: [string, string][] = [
    ['Source', item.source === 'fit' ? 'FIT upload' : item.source === 'gps' ? 'Recorded in Sage' : 'Shared Strava link'],
    ['Sport', sport ? sportLabel(sport) : '—'], ['Workout started', dateLabel(metrics.activity_started_at)],
    ['Active time', duration(seconds)], ['Elapsed time', duration(metrics.elapsed_time_secs)],
    ['Distance', typeof distance === 'number' ? measurement(distance / 1000, 'km', 2) : '—'],
    ['Average heart rate', metrics.avg_heartrate > 0 ? measurement(metrics.avg_heartrate, 'bpm') : '—'], ['Maximum heart rate', metrics.max_heartrate > 0 ? measurement(metrics.max_heartrate, 'bpm') : '—'],
    ['Calories', measurement(metrics.calories, 'kcal')], ['Elevation gain', measurement(metrics.elevation_gain, 'm')],
    ['Average speed', typeof metrics.avg_speed === 'number' ? measurement(metrics.avg_speed * 3.6, 'km/h', 1) : '—'],
    ['Average power', measurement(metrics.avg_power, 'W')],
    ['Indoor', metrics.indoor === true ? 'Yes' : metrics.indoor === false ? 'No' : '—'],
    ['Submitted', dateLabel(item.created_at)],
  ];
  if (pace !== null && ['Run', 'Walk', 'Hike', 'Swim'].includes(sport)) rows.splice(6, 0, ['Average pace', `${formatPace(pace)} /${swimming ? '100m' : 'km'}`]);
  return <Modal visible animationType="slide" onRequestClose={onClose}><Page brand={false}>
    <Header title="Workout details" eyebrow="Your submission" action={<BackAction label="Close" onPress={onClose} />} />
    <Text style={[s.title, { fontSize: 23 }]}>{metrics.activity_name ?? submissionTitle(item)}</Text>
    {item.file_name && <Text selectable style={[s.muted, { marginTop: 8 }]}>{item.file_name}</Text>}
    {item.source === 'strava_link' && !!item.source_url && <View style={[s.card, { padding: 16, marginTop: 16, gap: 12 }]}>
      <Text style={s.section}>Submitted Strava activity</Text>
      <Text selectable accessibilityLabel={`Strava activity link: ${item.source_url}`} style={[s.muted, { color: c.green }]}>{item.source_url}</Text>
      <Button secondary title="Open activity in Strava" onPress={() => { setLinkError(''); void Linking.openURL(item.source_url!).catch(() => setLinkError('Could not open Strava. Copy the link above and open it in your browser.')); }} />
      {!!linkError && <Text accessibilityRole="alert" style={[s.muted, { color: c.orange }]}>{linkError}</Text>}
    </View>}
    <View style={[s.card, { padding: 18, marginTop: 18, backgroundColor: c.pale }]}>
      <Text style={[s.section, { color: item.status === 'approved' ? c.green : c.orange }]}>{item.status === 'approved' ? '✓ Approved' : item.status === 'rejected' ? 'Not counted · Rejected' : 'Awaiting review'}</Text>
      <Text style={[s.muted, { marginTop: 6 }]}>{item.status === 'approved' ? 'Challenge points depend on dates, eligible sports and challenge rules.' : item.status === 'rejected' ? 'This submission does not earn challenge points.' : item.source === 'strava_link' ? 'This Strava activity is awaiting review. Open the submitted link to see which workout you shared.' : 'Your recorded measurements are available below. Points are awarded after approval for eligible challenges.'}</Text>
      {!!item.reason && <Text style={[s.muted, { marginTop: 8 }]}>{item.reason}</Text>}
    </View>
    <Section title="Recorded measurements" />
    <View style={s.card}>{rows.map(([label, value]) => <View key={label} style={[s.between, { padding: 14, gap: 16, borderBottomWidth: 1, borderBottomColor: c.border }]}><Text style={s.muted}>{label}</Text><Text selectable style={[s.section, { textAlign: 'right', fontSize: 12, flexShrink: 1 }]}>{value}</Text></View>)}</View>
    <Text style={[s.muted, { fontSize: 10, marginTop: 10 }]}>— means this measurement was not included. Active time excludes recorded pauses; elapsed time includes them.</Text>
    {!!item.note && <><Section title="Your note" /><Text style={s.muted}>{item.note}</Text></>}
    {item.source === 'strava_link' && !item.activity_id && <Text style={[s.muted, { marginTop: 16 }]}>A shared link does not include parsed workout measurements. They appear once the reviewer confirms the activity details.</Text>}
    <Section title="Route & performance" />
    {detail.error ? <View style={{ gap: 12 }}><Text accessibilityRole="alert" style={s.muted}>{detail.error}</Text><Button secondary title="Retry workout details" onPress={detail.refresh} /></View> : detail.loading && !detail.data ? <Empty loading text="Loading recorded samples" /> : <>
      {!!streams?.locations?.length ? <RecordingRouteMap points={streams.locations.map(point => ({ ...point, segment: point.segment ?? 0 }))} /> : <View style={[s.card, { padding: 18, marginBottom: 14 }]}><Text style={s.muted}>No GPS route was included in this submission. Indoor workouts can have distance without a route.</Text></View>}
      <MetricChart title="Heart rate" samples={streams?.heartRate ?? []} duration={metrics.elapsed_time_secs ?? seconds ?? 0} unit="bpm" color={c.orange} empty="No heart-rate samples were included. An average alone cannot produce a chart." />
      {(riding || ['Run', 'Walk', 'Hike', 'Swim'].includes(sport)) && <MetricChart title={riding ? 'Speed' : 'Pace'} samples={riding ? streams?.speed ?? [] : paceSamples} duration={metrics.elapsed_time_secs ?? seconds ?? 0} unit={riding ? 'km/h' : swimming ? 'min/100m' : 'min/km'} color={c.green} pace={!riding} empty="No timed speed samples were included in this submission." />}
      {!!streams?.elevation?.length && <MetricChart title="Elevation" samples={streams.elevation} duration={metrics.elapsed_time_secs ?? seconds ?? 0} unit="m" color={c.green} empty="No elevation samples were included." />}
    </>}
    <Section title="Your points receipt" />
    {!item.activity_id ? <Text style={s.muted}>{item.status === 'rejected' ? 'Rejected submissions do not earn points.' : 'Your points receipt will appear after approval.'}</Text> : audits.error ? <View style={{ gap: 12 }}><Text accessibilityRole="alert" style={s.muted}>{audits.error}</Text><Button secondary title="Retry points receipt" onPress={audits.refresh} /></View> : audits.loading ? <Empty loading text="Loading points receipt" /> : !audits.data?.length ? <Text style={s.muted}>No joined challenge counted this workout. Check challenge dates and eligible sports.</Text> : audits.data.map(receipt => <View key={receipt.race_id} style={[s.card, { padding: 18, marginBottom: 12 }]}><Text style={s.section}>{receipt.race_name ?? 'Challenge'}</Text><Text style={{ color: c.green, fontSize: 30, fontWeight: '800', marginTop: 10 }}>+{receipt.total_points} pts</Text><Text style={s.muted}>{receipt.status.replace(/_/g, ' ')} · Base {receipt.base_points} · Bonus {receipt.bonus_points}</Text>{receipt.bonuses.map(bonus => <Text key={bonus.id} style={s.muted}>{bonus.label}: +{bonus.points}</Text>)}</View>)}
    {!!detail.data?.history?.length && <><Section title="Review history" />{detail.data.history.map(event => <View key={event.id} style={[s.card, { padding: 16, marginBottom: 10 }]}><Text style={s.section}>{event.status.toUpperCase()}</Text><Text style={s.muted}>{dateLabel(event.created_at)}</Text>{!!event.reason && <Text style={s.muted}>{event.reason}</Text>}</View>)}</>}
    <View style={{ marginTop: 24 }}><Button secondary title="Back to submissions" onPress={onClose} /></View>
  </Page></Modal>;
}
