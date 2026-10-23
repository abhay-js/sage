export const supportedTypes: Record<string, string> = {
  running: 'Run',
  cycling: 'Ride',
  swimming: 'Swim',
  functionalStrengthTraining: 'WeightTraining',
  traditionalStrengthTraining: 'WeightTraining',
};

export type WorkoutUpload = {
  id: string;
  type: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  distanceMeters: number | null;
  averageHeartRate: number | null;
  calories: number | null;
  sourceName: string;
  sourceBundleIdentifier: string;
};

export type Race = {
  id: string;
  status: string;
  challenge_start: string;
  challenge_end: string;
  sport_types: string[];
};

export function validateWorkout(value: unknown): WorkoutUpload {
  if (!value || typeof value !== 'object') throw new Error('Invalid workout record');
  const workout = value as Record<string, unknown>;
  const id = requiredString(workout.id, 'id');
  const type = requiredString(workout.type, 'type');
  const startedAt = requiredDate(workout.startedAt, 'startedAt');
  const endedAt = requiredDate(workout.endedAt, 'endedAt');
  const durationSeconds = requiredNumber(workout.durationSeconds, 'durationSeconds', 0);
  if (!supportedTypes[type]) throw new Error(`Unsupported workout type: ${type}`);
  if (Date.parse(endedAt) < Date.parse(startedAt)) throw new Error('endedAt must follow startedAt');
  return {
    id,
    type,
    startedAt,
    endedAt,
    durationSeconds,
    distanceMeters: optionalNumber(workout.distanceMeters, 'distanceMeters', 0),
    averageHeartRate: optionalNumber(workout.averageHeartRate, 'averageHeartRate', 1, 300),
    calories: optionalNumber(workout.calories, 'calories', 0),
    sourceName: requiredString(workout.sourceName, 'sourceName'),
    sourceBundleIdentifier: requiredString(workout.sourceBundleIdentifier, 'sourceBundleIdentifier'),
  };
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

function requiredDate(value: unknown, field: string): string {
  const text = requiredString(value, field);
  if (Number.isNaN(Date.parse(text))) throw new Error(`${field} must be an ISO timestamp`);
  return new Date(text).toISOString();
}

function requiredNumber(value: unknown, field: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${field} must be a number between ${min} and ${max}`);
  }
  return value;
}

function optionalNumber(value: unknown, field: string, min: number, max = Number.MAX_SAFE_INTEGER): number | null {
  return value === null || value === undefined ? null : requiredNumber(value, field, min, max);
}

export function isStravaSource(workout: WorkoutUpload): boolean {
  return `${workout.sourceName} ${workout.sourceBundleIdentifier}`.toLowerCase().includes('strava');
}

export function isInsideCurrentRace(workout: WorkoutUpload, races: Race[]): boolean {
  const started = Date.parse(workout.startedAt);
  const sport = supportedTypes[workout.type];
  return races.some((race) =>
    race.sport_types.includes(sport) &&
    started >= Date.parse(race.challenge_start) &&
    started <= endOfDate(race.challenge_end)
  );
}

export function endOfDate(value: string): number {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? Date.parse(`${value}T23:59:59.999Z`)
    : Date.parse(value);
}
