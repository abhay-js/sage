import { View, Text, TouchableOpacity } from 'react-native';
import { GroupSession } from '../types';

const SPORT_ICONS: Record<string, string> = {
  Ride: '🚴', Run: '🏃', Swim: '🏊', Trail: '🥾',
};

const RIDE_TYPE_LABELS: Record<string, string> = {
  recovery: 'Recovery', endurance: 'Endurance', tempo: 'Tempo',
  race_pace: 'Race Pace', climbing: 'Climbing', social: 'Social',
};
const RUN_TYPE_LABELS: Record<string, string> = {
  easy: 'Easy Run', long: 'Long Run', intervals: 'Intervals',
  tempo: 'Tempo', race_simulation: 'Race Sim',
};

interface Props {
  session: GroupSession & { host: any };
  isEnrolled?: boolean;
  isPending?: boolean;
  isHosted?: boolean;
  distanceKm?: number;
  statusLabel?: string;
  statusColor?: string;
  onPress: () => void;
}

export function SessionCard({
  session, isEnrolled, isPending, isHosted, distanceKm, statusLabel, statusColor, onPress,
}: Props) {
  const spotsLeft = session.max_participants - session.current_count;
  const isFull = session.status === 'full' || spotsLeft <= 0;
  const isArchived = session.status === 'archived';

  const dateStr = new Date(session.session_date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
  const timeStr = session.start_time.slice(0, 5);

  const typeLabel = session.ride_type
    ? RIDE_TYPE_LABELS[session.ride_type]
    : session.workout_type
    ? RUN_TYPE_LABELS[session.workout_type]
    : null;

  // Border color: purple for hosted, green for enrolled, none otherwise
  const borderColor = isHosted ? '#7c3aed' : isEnrolled ? '#4ade80' : undefined;

  // Badge
  let badgeText = `${spotsLeft} left`;
  let badgeBg = '#0a0a0a';
  let badgeText2 = '#737373';

  if (isHosted && statusLabel) {
    badgeText = statusLabel.toUpperCase();
    badgeBg = (statusColor ?? '#737373') + '22';
    badgeText2 = statusColor ?? '#737373';
  } else if (isEnrolled) {
    badgeText = 'JOINED';
    badgeBg = '#4ade8022';
    badgeText2 = '#4ade80';
  } else if (isPending) {
    badgeText = 'PENDING ⏳';
    badgeBg = '#f59e0b22';
    badgeText2 = '#f59e0b';
  } else if (isFull) {
    badgeText = 'FULL';
    badgeBg = '#f8717122';
    badgeText2 = '#f87171';
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        { borderRadius: 20, padding: 16, marginBottom: 12, backgroundColor: '#1a1a1a' },
        borderColor ? { borderLeftWidth: 3, borderLeftColor: borderColor } : undefined,
        isArchived ? { opacity: 0.6 } : undefined,
      ]}
    >
      {/* Top row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Text style={{ fontSize: 15 }}>{SPORT_ICONS[session.sport_type] ?? '🏅'}</Text>
            <Text
              style={{ color: '#f5f5f5', fontWeight: '900', fontSize: 15, flex: 1 }}
              numberOfLines={1}
            >
              {session.title}
            </Text>
          </View>
          <Text style={{ color: '#737373', fontSize: 12 }}>
            {isHosted ? "⚡ You're hosting" : `by ${session.host?.name ?? 'Sage'}`}
          </Text>
        </View>
        <View style={{ backgroundColor: badgeBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: badgeText2, fontSize: 11, fontWeight: '800' }}>{badgeText}</Text>
        </View>
      </View>

      {/* Info row */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 2 }}>
        <InfoPill icon="📅" text={dateStr} />
        <InfoPill icon="⏰" text={timeStr} />
        {session.distance_km != null && <InfoPill icon="🛣️" text={`${session.distance_km} km`} />}
        {session.duration_mins != null && <InfoPill icon="⏱" text={`${session.duration_mins} min`} />}
        {distanceKm != null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3b82f620', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ fontSize: 11 }}>📍</Text>
            <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: '700' }}>
              {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)} km`} away
            </Text>
          </View>
        )}
      </View>

      {/* Requirement badges */}
      {(typeLabel || session.min_ftp || session.avg_speed_kmh || session.min_pace || session.surface_type) ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {typeLabel && <Badge text={typeLabel} />}
          {session.min_ftp ? <Badge text={`${session.min_ftp}+ FTP`} /> : null}
          {session.avg_speed_kmh ? <Badge text={`${session.avg_speed_kmh} km/h`} /> : null}
          {session.min_pace ? <Badge text={`sub ${session.min_pace}`} /> : null}
          {session.surface_type ? <Badge text={session.surface_type} /> : null}
        </View>
      ) : null}

      {session.meeting_point ? (
        <Text style={{ color: '#737373', fontSize: 11, marginTop: 8 }} numberOfLines={1}>
          📍 {session.meeting_point}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

function InfoPill({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: 11 }}>{icon}</Text>
      <Text style={{ color: '#737373', fontSize: 12 }}>{text}</Text>
    </View>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <View style={{ backgroundColor: '#0a0a0a', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ color: '#737373', fontSize: 11, fontWeight: '600', textTransform: 'capitalize' }}>
        {text}
      </Text>
    </View>
  );
}
