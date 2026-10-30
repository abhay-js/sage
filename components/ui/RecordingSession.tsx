import { useMemo, useState } from 'react';
import { Linking, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GpsRecording, recordingSummary } from '../../lib/gpsRecording';
import { ProductChallenge } from '../../types/product';
import { formatDuration, scoringSummary } from '../../lib/challengeExperience';
import { thresholdPoints } from '../../lib/thresholdScoring';
import { formatPace } from '../../lib/activityMetrics';
import { adventureColors as c } from '../../lib/theme';
import { Button, Sheet, s } from './AdventureUI';
import { RecordingRouteMap } from './RecordingRouteMap';

export interface RecordingSessionProps {
  record: GpsRecording; now: number; busy: boolean; error?: string;
  challenge?: ProductChallenge; onPause: () => void; onResume: () => void; onFinish: () => void;
  onSave: (note: string) => void; onDiscard: () => void;
}
export function RecordingSession({ record, now, busy, error, challenge, onPause, onResume, onFinish, onSave, onDiscard }: RecordingSessionProps) {
  const [note, setNote] = useState(''), [discard, setDiscard] = useState(false);
  const measured = useMemo(() => recordingSummary(record, record.finishedAt ?? now), [record, record.finishedAt, record.status === 'recording' ? now : 0]);
  const seconds = Math.floor(record.intervals.reduce((total, interval) => total + (interval.end ?? now) - interval.start, 0) / 1000);
  const active = record.status === 'recording', finished = record.status === 'finished', last = record.points[record.points.length - 1];
  const stale = active && (!last || now - last.timestamp > 20000);
  const pace = measured.distanceMeters > 0 ? record.sport === 'Ride' ? (measured.distanceMeters / Math.max(1, seconds) * 3.6).toFixed(1) : formatPace(seconds / 60 / (measured.distanceMeters / 1000)) : '—';
  const estimate = challenge?.sport_types.includes(record.sport) ? challenge.config.scoringMode === 'THRESHOLD' ? thresholdPoints(challenge.config, record.sport, measured.distanceMeters, seconds) : challenge.config.legacy.sessionPoints + Math.floor(seconds / 3600 * challenge.config.legacy.hourPoints) : 0;
  return <>
    <RecordingRouteMap points={measured.locations} live={active} />
    <Text style={[s.eyebrow, { color: active ? c.orange : c.green, marginTop: 12 }]}>{active ? '● RECORDING · FIND YOUR RHYTHM' : finished ? '✓ REVIEW YOUR EFFORT' : 'Ⅱ PAUSED · TAKE YOUR TIME'}</Text>
    {!finished && <Text accessibilityLabel={`Active time ${formatDuration(seconds)}`} style={{ fontSize: 52, fontWeight: '800', letterSpacing: -2, color: c.text, fontVariant: ['tabular-nums'], marginBottom: 20 }}>{formatDuration(seconds)}</Text>}
    <View style={[s.row, { gap: 18, marginBottom: 22, marginTop: finished ? 12 : 0 }]}><View style={{ flex: 1 }}><Text style={[s.title, { fontSize: 29 }]}>{(measured.distanceMeters / 1000).toFixed(2)}</Text><Text style={[s.label, { marginTop: 6 }]}>DISTANCE · KM</Text></View><View style={{ flex: 1 }}><Text style={[s.title, { fontSize: finished ? 25 : 29 }]}>{finished ? formatDuration(seconds) : pace}</Text><Text style={[s.label, { marginTop: 6 }]}>{finished ? 'ACTIVE TIME' : record.sport === 'Ride' ? 'AVG SPEED · KM/H' : 'AVG PACE · MIN/KM'}</Text></View></View>
    {!finished && <View style={[s.row, { gap: 10, marginBottom: 14 }]}><View style={{ flex: 1 }}><Button secondary title={active ? 'Pause' : 'Resume'} icon={active ? 'clock' : 'route'} disabled={busy} onPress={active ? onPause : onResume} /></View><View style={{ flex: 1 }}><Button title="Finish" disabled={busy} onPress={onFinish} /></View></View>}
    {active && <Text style={[s.muted, { fontSize: 11, marginBottom: 12 }]}>{stale ? 'Waiting for a precise GPS signal. Missing movement is not added.' : `GPS accuracy about ${Math.round(last!.accuracy)} m · ${record.background ? 'Screen-lock recording enabled' : 'Keep Sage open to record'}`}</Text>}
    {!record.background && !finished && <Text style={[s.muted, { color: c.orange, fontSize: 11, marginBottom: 12 }]}>This workout pauses when you leave Sage. Enable background location in phone Settings to record with the screen locked.</Text>}
    {!!record.gpsError && <Text accessibilityRole="alert" style={[s.muted, { color: c.orange, marginBottom: 12 }]}>{record.gpsError}</Text>}
    <View style={[s.card, { padding: 18, marginBottom: 16 }]}><Text style={s.eyebrow}>{finished ? 'YOUR POINTS PREVIEW' : 'YOUR EFFORT GOES SOMEWHERE'}</Text><Text style={s.section}>{challenge?.name ?? 'Your eligible challenges'}</Text>{challenge && <><Text style={[s.muted, { marginTop: 6 }]}>{scoringSummary(challenge.config)}</Text><Text style={{ color: c.green, fontWeight: '800', fontSize: 28, marginTop: 10 }}>~{estimate}<Text style={{ fontSize: 12 }}> base pts</Text></Text></>}<Text style={[s.muted, { marginTop: 8, fontSize: 10 }]}>An estimate only. Approval, dates, sport eligibility, limits, bonuses and rounding determine the final receipt. Approved workouts count toward every eligible joined challenge.</Text></View>
    {finished && <>
      <Text style={s.muted}>Your route and measurements are saved on this phone until submitted. You can resume this same workout or submit it for review.</Text>
      <Text style={[s.section, { fontSize: 12, marginTop: 16 }]}>A note about your activity · optional</Text>
      <TextInput accessibilityLabel="Note for admin" placeholder="How did it feel? Anything the reviewer should know?" placeholderTextColor={c.muted} multiline editable={!busy} maxLength={1000} value={note} onChangeText={setNote} style={[s.card, { padding: 16, color: c.text, marginVertical: 12, minHeight: 85 }]} />
      <Button title={busy ? 'Submitting…' : 'Save activity · submit for review'} disabled={busy || measured.distanceMeters < 10 || seconds < 10} onPress={() => onSave(note)} />
      {(measured.distanceMeters < 10 || seconds < 10) && <Text style={[s.muted, { fontSize: 11, marginTop: 10 }]}>At least 10 seconds and 10 metres of valid GPS movement are needed. Resume your workout to keep going.</Text>}
      <View style={{ marginTop: 10 }}><Button secondary title="Resume this recording" icon="route" disabled={busy} onPress={onResume} /></View>
      <Text style={[s.muted, { fontSize: 10, marginTop: 10 }]}>Offline? Your workout stays here. Return when connected to retry. Phone GPS does not measure heart rate.</Text>
    </>}
    {!!error && <View style={{ marginTop: 14 }}><Text accessibilityRole="alert" style={{ color: c.orange, fontSize: 12 }}>{error}</Text>{!finished && <TouchableOpacity accessibilityRole="button" onPress={() => void Linking.openSettings()} style={{ paddingVertical: 14 }}><Text style={{ color: c.green }}>Open phone settings</Text></TouchableOpacity>}</View>}
    <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => setDiscard(true)} style={{ padding: 18, alignItems: 'center' }}><Text style={{ color: c.muted, fontSize: 12 }}>Discard activity</Text></TouchableOpacity>
    {discard && <Sheet title="Discard this activity?" onClose={() => { if (!busy) setDiscard(false); }}><Text style={[s.muted, { marginBottom: 18 }]}>Its unsent route and measurements will be removed from this phone.</Text><Button title="Discard activity" disabled={busy} onPress={() => { setDiscard(false); onDiscard(); }} /><View style={{ marginTop: 10 }}><Button secondary title="Keep my workout" disabled={busy} onPress={() => setDiscard(false)} /></View></Sheet>}
  </>;
}
