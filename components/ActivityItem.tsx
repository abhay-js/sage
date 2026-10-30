import {sageColors as c} from '../lib/theme';
import { View, Text } from 'react-native';
import { ActivityLog } from '../types';

const SPORT_ICONS: Record<string, string> = {
  Run: '🏃', Ride: '🚴', Swim: '🏊', WeightTraining: '🏋️', Rowing: '🚣',
  Hike: '🥾', Walk: '🚶', Yoga: '🧘', CrossFit: '💪', Workout: '⚡',
};

const SPORT_BG: Record<string, string> = {
  Run: c.pale,
  Ride: c.infoBg,
  Swim: c.sky,
  WeightTraining: c.purpleBg,
  Rowing: c.purpleBg,
  Hike: c.pale,
  Yoga: c.purpleBg,
};

interface Props {
  activity: ActivityLog;
  pointsEarned?: number;
}

export function ActivityItem({ activity, pointsEarned }: Props) {
  const icon = SPORT_ICONS[activity.sport_type] ?? '🏅';
  const bg = SPORT_BG[activity.sport_type] ?? c.surface;
  const mins = Math.round(activity.moving_time_secs / 60);
  const km = activity.distance_meters != null ? (activity.distance_meters / 1000).toFixed(1) : null;
  const elev = activity.elevation_gain ? `↑${Math.round(activity.elevation_gain)}m` : null;
  const date = new Date(activity.activity_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  const meta = [date, `${mins}m`, km ? `${km}km` : null, elev].filter(Boolean).join(' · ');

  return (
    <View className="flex-row items-center px-5 py-3.5 border-b border-sage-divider">
      <View
        className="w-11 h-11 rounded-2xl items-center justify-center mr-3"
        style={{ backgroundColor: bg }}
      >
        <Text style={{ fontSize: 20 }}>{icon}</Text>
      </View>

      <View className="flex-1">
        <Text className="text-sage-text font-bold text-sm" numberOfLines={1}>
          {activity.activity_name}
        </Text>
        <Text className="text-sage-muted text-xs mt-0.5">{meta}</Text>
      </View>

      {pointsEarned != null ? (
        <View className="bg-sage-green/15 px-2.5 py-1 rounded-full">
          <Text className="text-sage-green text-xs font-black">+{pointsEarned}pts</Text>
        </View>
      ) : null}
    </View>
  );
}
