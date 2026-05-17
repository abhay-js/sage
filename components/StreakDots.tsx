import { View, Text } from 'react-native';
import { ActivityLog } from '../types';

interface Props {
  activities: ActivityLog[];
  sportTypes?: string[];
  weeks?: number;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function StreakDots({ activities, sportTypes, weeks = 10 }: Props) {
  const daySet = new Set(
    activities
      .filter((a) => !sportTypes || sportTypes.includes(a.sport_type))
      .map((a) => a.activity_date.slice(0, 10))
  );

  const today = new Date();
  const totalDays = weeks * 7;
  const days: { key: string; active: boolean }[] = [];

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, active: daySet.has(key) });
  }

  const DOT = 24;
  const GAP = 3;

  return (
    <View>
      <View className="flex-row mb-1.5" style={{ gap: GAP }}>
        {DAY_LABELS.map((l, i) => (
          <Text
            key={i}
            className="text-sage-muted text-[10px] font-bold text-center"
            style={{ width: DOT }}
          >
            {l}
          </Text>
        ))}
      </View>
      <View className="flex-row flex-wrap" style={{ gap: GAP }}>
        {days.map((d) => (
          <View
            key={d.key}
            style={{
              width: DOT,
              height: DOT,
              borderRadius: 5,
              backgroundColor: d.active ? '#4ade80' : '#1a1a1a',
            }}
          />
        ))}
      </View>
    </View>
  );
}
