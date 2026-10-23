import assert from 'node:assert/strict';
import test from 'node:test';
import { isInsideCurrentRace, isStravaSource, validateWorkout, type Race } from './logic';

const workout = validateWorkout({
  id: 'health-1',
  type: 'running',
  startedAt: '2026-09-04T04:00:00Z',
  endedAt: '2026-09-04T05:00:00Z',
  durationSeconds: 3600,
  distanceMeters: 10_000,
  averageHeartRate: 150,
  calories: 500,
  sourceName: 'Apple Watch',
  sourceBundleIdentifier: 'com.apple.health',
});

const race: Race = {
  id: 'race-1',
  status: 'open',
  challenge_start: '2026-09-01',
  challenge_end: '2026-09-10',
  sport_types: ['Run'],
};

test('validates and canonicalizes workout timestamps', () => {
  assert.equal(workout.startedAt, '2026-09-04T04:00:00.000Z');
  assert.equal(workout.durationSeconds, 3600);
});

test('rejects unsupported types and invalid heart rates', () => {
  assert.throws(() => validateWorkout({ ...workout, type: 'walking' }), /Unsupported/);
  assert.throws(() => validateWorkout({ ...workout, averageHeartRate: 400 }), /averageHeartRate/);
});

test('matches sport and challenge window', () => {
  assert.equal(isInsideCurrentRace(workout, [race]), true);
  assert.equal(isInsideCurrentRace({ ...workout, type: 'cycling' }, [race]), false);
});

test('rejects Strava-origin records', () => {
  assert.equal(isStravaSource({ ...workout, sourceBundleIdentifier: 'com.strava.app' }), true);
  assert.equal(isStravaSource(workout), false);
});
