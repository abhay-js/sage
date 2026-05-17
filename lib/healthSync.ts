/**
 * Health platform sync — reads workouts from Apple Health (iOS) or
 * Health Connect (Android) and upserts them to Supabase activity_logs.
 *
 * Requires a development build (EAS Build) — does NOT work in Expo Go.
 * Check __DEV__ + Platform before calling any health APIs.
 */
import { Platform, Alert } from 'react-native';
import { supabase } from './supabase';

// ── Sport type mapping ────────────────────────────────────────────────────

const IOS_TYPE_MAP: Record<number, string> = {
  37: 'Run',           // HKWorkoutActivityTypeRunning
  13: 'Ride',          // HKWorkoutActivityTypeCycling
  46: 'Swim',          // HKWorkoutActivityTypeSwimming
  24: 'Hike',          // HKWorkoutActivityTypeHiking
  50: 'WeightTraining',// HKWorkoutActivityTypeTraditionalStrengthTraining
  55: 'Rowing',        // HKWorkoutActivityTypeRowing
  20: 'Run',           // HKWorkoutActivityTypeTrackAndField
  63: 'Run',           // HKWorkoutActivityTypeWalking
};

const ANDROID_TYPE_MAP: Record<string, string> = {
  'RUNNING': 'Run',
  'BIKING': 'Ride',
  'SWIMMING_POOL': 'Swim',
  'SWIMMING_OPEN_WATER': 'Swim',
  'HIKING': 'Hike',
  'STRENGTH_TRAINING': 'WeightTraining',
  'ROWING_MACHINE': 'Rowing',
  'WALKING': 'Walk',
};

// ── iOS HealthKit ─────────────────────────────────────────────────────────

async function syncIOS(userId: string, since: Date): Promise<number> {
  // Dynamically import so the module doesn't break Android or Expo Go
  let AppleHealthKit: any;
  try {
    AppleHealthKit = require('react-native-health').default;
  } catch {
    Alert.alert('Not available', 'Apple Health sync requires a development build.');
    return 0;
  }

  // Request permissions
  await new Promise<void>((resolve, reject) => {
    AppleHealthKit.initHealthKit(
      {
        permissions: {
          read: [
            AppleHealthKit.Constants.Permissions.Workout,
            AppleHealthKit.Constants.Permissions.HeartRate,
            AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
            AppleHealthKit.Constants.Permissions.DistanceCycling,
            AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          ],
          write: [],
        },
      },
      (err: any) => (err ? reject(new Error(err)) : resolve()),
    );
  });

  // Fetch workouts
  const workouts: any[] = await new Promise((resolve, reject) => {
    AppleHealthKit.getSamples(
      {
        startDate: since.toISOString(),
        endDate: new Date().toISOString(),
        type: 'Workout',
      },
      (err: any, results: any[]) => (err ? reject(err) : resolve(results ?? [])),
    );
  });

  if (workouts.length === 0) return 0;

  const rows = workouts.map((w: any) => ({
    user_id: userId,
    strava_activity_id: `health_ios_${w.id ?? w.startDate}`,
    sport_type: IOS_TYPE_MAP[w.activityType] ?? 'Workout',
    activity_name: w.sourceName ?? 'Apple Health workout',
    activity_date: w.startDate.split('T')[0],
    moving_time_secs: Math.round((new Date(w.endDate).getTime() - new Date(w.startDate).getTime()) / 1000),
    elapsed_time_secs: Math.round((new Date(w.endDate).getTime() - new Date(w.startDate).getTime()) / 1000),
    distance_meters: w.distance ? w.distance * 1000 : null,    // HealthKit gives km
    avg_heartrate: w.heartRate?.average ?? null,
    max_heartrate: w.heartRate?.max ?? null,
    calories: w.calories ?? null,
    elevation_gain: w.elevationAscended ?? null,
    avg_speed: null,
  }));

  const { error } = await supabase.from('activity_logs').upsert(rows, {
    onConflict: 'strava_activity_id',
    ignoreDuplicates: false,
  });

  if (error) throw new Error(error.message);
  return rows.length;
}

// ── Android Health Connect ────────────────────────────────────────────────

async function syncAndroid(userId: string, since: Date): Promise<number> {
  let HC: any;
  try {
    HC = require('react-native-health-connect');
  } catch {
    Alert.alert('Not available', 'Health Connect sync requires a development build.');
    return 0;
  }

  const available = await HC.initialize();
  if (!available) {
    Alert.alert('Health Connect not installed', 'Install Health Connect from the Play Store to use this feature.');
    return 0;
  }

  await HC.requestPermission([
    { accessType: 'read', recordType: 'ExerciseSession' },
    { accessType: 'read', recordType: 'Distance' },
    { accessType: 'read', recordType: 'HeartRate' },
    { accessType: 'read', recordType: 'TotalCaloriesBurned' },
    { accessType: 'read', recordType: 'ElevationGained' },
  ]);

  const { records } = await HC.readRecords('ExerciseSession', {
    timeRangeFilter: {
      operator: 'after',
      startTime: since.toISOString(),
    },
  });

  if (!records?.length) return 0;

  const rows = records.map((r: any) => ({
    user_id: userId,
    strava_activity_id: `health_android_${r.metadata?.id ?? r.startTime}`,
    sport_type: ANDROID_TYPE_MAP[r.exerciseType] ?? 'Workout',
    activity_name: r.title ?? 'Health Connect workout',
    activity_date: r.startTime.split('T')[0],
    moving_time_secs: Math.round(
      (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 1000,
    ),
    elapsed_time_secs: Math.round(
      (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 1000,
    ),
    distance_meters: r.distance?.inMeters ?? null,
    avg_heartrate: null,
    max_heartrate: null,
    calories: r.energy?.inKilocalories ?? null,
    elevation_gain: r.elevation?.inMeters ?? null,
    avg_speed: null,
  }));

  const { error } = await supabase.from('activity_logs').upsert(rows, {
    onConflict: 'strava_activity_id',
    ignoreDuplicates: false,
  });

  if (error) throw new Error(error.message);
  return rows.length;
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Syncs workouts from the device's health platform (Apple Health or Health Connect).
 * Uses the same incremental logic as Strava backfill — only fetches since last known activity.
 * Returns the number of new activities synced.
 */
export async function syncHealthPlatform(
  userId: string,
  lastActivityDate: Date | null,
): Promise<number> {
  // Default: fetch last 90 days on first sync
  const since = lastActivityDate
    ? new Date(lastActivityDate.getTime() - 86400 * 1000) // 1 day buffer
    : new Date(Date.now() - 90 * 86400 * 1000);

  if (Platform.OS === 'ios') return syncIOS(userId, since);
  if (Platform.OS === 'android') return syncAndroid(userId, since);
  return 0;
}

export function healthPlatformName(): string {
  return Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';
}
