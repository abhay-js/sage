import { ScoringRule } from '../types/product';

// Thresholds from GamifiedFitnessChallengeApp-main_2/src/App.tsx.
const referenceRows: Record<string, { unit: ScoringRule['unit']; rows: [number, number][] }> = {
  Run: { unit: 'KM', rows: [[3, 5], [5, 10], [10, 25], [15, 40], [20, 55]] },
  Ride: { unit: 'KM', rows: [[10, 5], [20, 10], [40, 25], [60, 40], [100, 65]] },
  Swim: { unit: 'METERS', rows: [[500, 5], [1000, 12], [2000, 25], [3000, 40], [4000, 55]] },
  WeightTraining: { unit: 'MINUTES', rows: [[30, 5], [45, 10], [60, 15], [90, 25]] },
};

export function referenceScoringRules(sports: string[]): ScoringRule[] {
  return [...new Set(sports)].flatMap(sport => (referenceRows[sport]?.rows ?? []).map(([threshold, points], order) => ({
    id: `reference-${sport}-${threshold}`, sport, threshold, points, unit: referenceRows[sport].unit, order,
  })));
}
