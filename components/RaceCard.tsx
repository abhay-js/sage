import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Race, Entry } from '../types';

interface Props {
  race: Race;
  entry?: Entry;
  onJoin?: () => void;
  onLeave?: () => void;
  onPress?: () => void;
}

const SPORT_ICONS: Record<string, string> = {
  Run: '🏃', Ride: '🚴', Swim: '🏊', WeightTraining: '🏋️', Rowing: '🚣',
  Hike: '🥾', Walk: '🚶', Yoga: '🧘', CrossFit: '💪', Workout: '⚡',
};

export function RaceCard({ race, entry, onJoin, onLeave, onPress }: Props) {
  const daysLeft = Math.max(0, Math.ceil((new Date(race.challenge_end).getTime() - Date.now()) / 86_400_000));
  const totalDays = Math.ceil(
    (new Date(race.challenge_end).getTime() - new Date(race.challenge_start).getTime()) / 86_400_000
  );
  const elapsed = totalDays - daysLeft;
  const progress = totalDays > 0 ? Math.min(elapsed / totalDays, 1) : 0;
  const urgent = daysLeft <= 7;

  function confirmLeave() {
    Alert.alert('Leave race', `Leave ${race.name}? Your progress will be lost.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: onLeave },
    ]);
  }

  const cardStyle = entry ? { borderLeftWidth: 3, borderLeftColor: '#4ade80' } : undefined;

  const inner = (
    <>
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-3">
          <Text className="text-sage-text font-bold text-base leading-snug">{race.name}</Text>
          {race.city ? <Text className="text-sage-muted text-xs mt-0.5">{race.city}</Text> : null}
        </View>
        <View className={`px-2.5 py-1 rounded-full ${urgent ? 'bg-orange-500/20' : 'bg-sage-green/10'}`}>
          <Text className={`text-xs font-bold ${urgent ? 'text-orange-400' : 'text-sage-green'}`}>
            {daysLeft}d left
          </Text>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-1.5 mb-3">
        {race.sport_types.map((s) => (
          <View key={s} className="flex-row items-center gap-1 bg-[#0a0a0a] px-2.5 py-1 rounded-full">
            <Text style={{ fontSize: 11 }}>{SPORT_ICONS[s] ?? '🏅'}</Text>
            <Text className="text-sage-muted text-xs font-semibold">{s}</Text>
          </View>
        ))}
      </View>

      {entry ? (
        <>
          <View className="flex-row justify-between mb-3">
            <StatBlock label="SCORE" value={entry.sage_score.toLocaleString()} accent />
            <StatBlock label="SESSIONS" value={String(entry.sessions)} />
            <StatBlock label="HOURS" value={entry.total_hours.toFixed(1)} />
            <StatBlock label="STREAK" value={entry.streak > 0 ? `${entry.streak}🔥` : '0'} />
          </View>
          <View className="flex-row justify-between items-center mb-1.5">
            <Text className="text-sage-muted text-[10px] font-bold tracking-widest uppercase">Progress</Text>
            <Text className="text-sage-muted text-[10px] font-bold">{Math.round(progress * 100)}%</Text>
          </View>
          <View className="h-2 bg-[#0a0a0a] rounded-full overflow-hidden mb-3">
            <View className="h-full bg-sage-green rounded-full" style={{ width: `${Math.round(progress * 100)}%` }} />
          </View>
          {onLeave && (
            <TouchableOpacity onPress={confirmLeave} activeOpacity={0.7}>
              <Text className="text-sage-muted text-xs text-center">Leave race</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <TouchableOpacity
          onPress={onJoin}
          className="bg-sage-green rounded-xl py-3 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-black font-black text-sm tracking-widest">JOIN RACE →</Text>
        </TouchableOpacity>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        className="bg-sage-surface rounded-2xl p-4 mb-3"
        style={cardStyle}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return (
    <View className="bg-sage-surface rounded-2xl p-4 mb-3" style={cardStyle}>
      {inner}
    </View>
  );
}

function StatBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="items-center">
      <Text className={`font-black text-xl ${accent ? 'text-sage-green' : 'text-sage-text'}`}>{value}</Text>
      <Text className="text-sage-muted text-[9px] font-bold tracking-widest mt-0.5">{label}</Text>
    </View>
  );
}
