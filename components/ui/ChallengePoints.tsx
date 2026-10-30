import { useState } from 'react';
import { Text, View, TouchableOpacity, TextInput } from 'react-native';
import { ChallengeConfiguration } from '../../types/product';
import { adventureColors as c } from '../../lib/theme';
import { Chips, Section, s } from './AdventureUI';
import { thresholdPoints } from '../../lib/thresholdScoring';
import { SageIcon, SageIconName } from './SageIcon';

const sportDetails: Record<string, { label: string; icon: SageIconName }> = {
  Run: { label: 'Run', icon: 'activity' }, Ride: { label: 'Ride', icon: 'bike' },
  Swim: { label: 'Swim', icon: 'swim' }, WeightTraining: { label: 'Strength', icon: 'strength' },
};
const units = { KM: 'km', METERS: 'm', MINUTES: 'min', SESSION: 'session' };

export function ChallengePoints({ config, expanded = false }: { config: ChallengeConfiguration; expanded?: boolean }) {
  const [open, setOpen] = useState(expanded);
  const sports = [...new Set(config.scoringRules.map(rule => rule.sport))];
  return <>
    <Section title="How to Earn Points" action={open ? 'Hide table' : 'Full scoring table'} onPress={() => setOpen(!open)} />
    {config.scoringMode === 'LEGACY' ? <View style={[s.card, { padding: 18 }]}>
      <Text style={s.section}>Sessions + hours</Text>
      <Text style={[s.muted, { marginTop: 8 }]}>{config.legacy.sessionPoints} points per approved session + {config.legacy.hourPoints} points per training hour.</Text>
      {open && <Text style={[s.muted, { marginTop: 8 }]}>7-day streak: +{config.legacy.streak7} pts · 30-day streak: +{config.legacy.streak30} pts</Text>}
    </View> : <>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Show scoring thresholds" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={[s.card, s.row, { flexWrap: 'wrap', padding: 12, gap: 8 }]}>
        {sports.map(sport => <View key={sport} style={{ flexGrow: 1, minWidth: 64, alignItems: 'center', paddingVertical: 8 }}>
          <SageIcon name={sportDetails[sport]?.icon ?? 'activity'} color={sport === 'Run' ? c.orange : c.green} />
          <Text style={[s.section, { fontSize: 11, marginTop: 8 }]}>{sportDetails[sport]?.label ?? sport}</Text>
          <Text style={[s.muted, { fontSize: 10 }]}>Up to {Math.max(...config.scoringRules.filter(rule => rule.sport === sport).map(rule => rule.points))} pts</Text>
        </View>)}
        {!sports.length && <Text style={s.muted}>Scoring thresholds have not been configured.</Text>}
      </TouchableOpacity>
      {open && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
        {sports.map(sport => <View key={sport} style={[s.card, { flexGrow: 1, flexBasis: '45%', padding: 16 }]}>
          <View style={[s.row, { gap: 8, marginBottom: 10 }]}><SageIcon name={sportDetails[sport]?.icon ?? 'activity'} size={18} /><Text style={s.section}>{sportDetails[sport]?.label ?? sport}</Text></View>
          {config.scoringRules.filter(rule => rule.sport === sport).sort((a, b) => a.order - b.order).map(rule => <View key={rule.id} style={[s.between, { gap: 8, paddingVertical: 9, borderTopWidth: 1, borderTopColor: c.border }]}>
            <Text style={s.muted}>{rule.threshold} {units[rule.unit]}</Text><Text style={[s.section, { fontSize: 12 }]}>{rule.points} pts</Text>
          </View>)}
        </View>)}
      </View>}
    </>}
    <Text style={[s.muted, { fontSize: 11, marginTop: 12 }]}>Points are awarded once a verified workout is approved.{config.scoringMode === 'THRESHOLD' ? ' The highest qualifying row applies per workout; rows do not stack.' : ''}{config.maxWorkoutsPerDay ? ` Maximum ${config.maxWorkoutsPerDay} qualifying workouts per day.` : ''}</Text>
  </>;
}

export function PointsEstimate({ config }: { config: ChallengeConfiguration }) {
  const sports = [...new Set(config.scoringRules.map(rule => rule.sport))];
  const [sport, setSport] = useState(sports[0]??'Run'), [distance, setDistance] = useState('5'), [minutes, setMinutes] = useState('30');
  const rules = config.scoringRules.filter(rule => rule.sport === sport);
  const needsDistance = rules.some(rule => rule.unit === 'KM' || rule.unit === 'METERS');
  const needsTime = config.scoringMode === 'LEGACY' || rules.some(rule => rule.unit === 'MINUTES');
  const valid = (!needsDistance || distance.trim() !== '' && Number.isFinite(Number(distance)) && Number(distance) > 0) && (!needsTime || minutes.trim() !== '' && Number.isFinite(Number(minutes)) && Number(minutes) > 0);
  const points = valid ? config.scoringMode === 'LEGACY' ? config.legacy.sessionPoints + Math.floor(Number(minutes) / 60 * config.legacy.hourPoints) : thresholdPoints(config, sport, Number(distance) * 1000, Number(minutes) * 60) : 0;
  return <View style={[s.card, { marginTop: 20, padding: 18 }]}>
    <Text style={s.eyebrow}>YOUR NEXT MOVE</Text><Text style={[s.section, { marginBottom: 14 }]}>What could your workout earn?</Text>
    {sports.length>0&&<Chips options={sports.map(id => ({ id, label: sportDetails[id]?.label ?? id }))} value={sport} onChange={setSport} />}
    <View style={[s.row, { gap: 12 }]}>{[{ label: 'Distance · km', value: distance, set: setDistance, visible: needsDistance }, { label: 'Active time · min', value: minutes, set: setMinutes, visible: needsTime }].filter(field => field.visible).map(field => <View key={field.label} style={{ flex: 1 }}><Text style={[s.label, { marginBottom: 8 }]}>{field.label}</Text><TextInput accessibilityLabel={field.label} keyboardType="decimal-pad" value={field.value} onChangeText={field.set} maxLength={8} style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, color: c.text, backgroundColor: c.bg, fontSize: 18 }} /></View>)}</View>
    <View accessibilityLiveRegion="polite" style={{ backgroundColor: c.pale, padding: 18, borderRadius: 14, marginTop: 16 }}><Text style={s.eyebrow}>ESTIMATED BASE POINTS</Text><Text style={{ color: c.green, fontSize: 34, fontWeight: '800' }}>{valid ? `+${points}` : '—'}<Text style={{ fontSize: 12 }}> pts</Text></Text><Text style={[s.muted, { fontSize: 10, marginTop: 5 }]}>{valid ? config.scoringMode==='LEGACY'?'Session + active-time points. Cumulative rounding may change the final total.':'Highest completed workout tier. Bonuses and limits apply after verification.' : 'Enter a positive amount to see your estimate.'}</Text></View>
    <Text style={[s.muted, { fontSize: 10, marginTop: 12 }]}>An estimate only. Your athlete level, daily limits and approval can affect the final score.</Text>
  </View>;
}

export function ChallengeBonuses({ config }: { config: ChallengeConfiguration }) {
  const icons: Record<string, SageIconName> = { EARLY_BIRD: 'sun', STREAK: 'flame', OUTDOOR: 'bike', BRICK: 'strength', ELEVATION: 'mountain', CUSTOM: 'gift' };
  return <><Section title="Bonus Missions" />{config.bonuses.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
    {config.bonuses.map(bonus => <View key={bonus.id} style={[s.card, { flexBasis: '45%', flexGrow: 1, padding: 17, backgroundColor: c.peach }]}>
      <SageIcon name={icons[bonus.type] ?? 'gift'} color={c.orange} />
      <Text style={[s.section, { marginTop: 12 }]}>{bonus.title}</Text>
      <Text style={[s.muted, { fontSize: 11, marginTop: 5 }]}>{bonus.description}</Text>
      <Text style={{ color: c.orange, fontWeight: '800', marginTop: 12 }}>+{bonus.points} pts</Text>
      <Text style={[s.muted, { fontSize: 10 }]}>{bonus.maxUses ?? 1} use(s) per athlete</Text>
    </View>)}
  </View> : <Text style={s.muted}>No bonus missions configured.</Text>}</>;
}
