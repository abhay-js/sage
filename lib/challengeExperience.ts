import { BoardAthlete, ProductChallenge, ChallengeConfiguration } from '../types/product';
import { challengeState } from './productConfig';

export const sportLabel = (sport: string) => ({ WeightTraining: 'Strength', CrossFit: 'HYROX', Ride: 'Ride' }[sport] ?? sport);
export function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60].map(value => String(value).padStart(2, '0')).join(':');
}
export function challengeTiming(challenge: ProductChallenge, now = Date.now()) {
  const start = Date.parse(challenge.challenge_start), end = Date.parse(challenge.challenge_end);
  const days = Math.max(1, Math.ceil((end - start) / 86400000));
  const day = Math.min(days, Math.max(1, Math.floor((now - start) / 86400000) + 1));
  const state = challengeState(challenge, now);
  return { state, day, days, label: state === 'Live' ? `Day ${day} / ${days}` : state === 'Upcoming' ? `Starts ${new Date(start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : state === 'Completed' ? 'Challenge complete' : 'Not yet published' };
}
export function preferredChallenge(challenges: ProductChallenge[]) {
  const visible = challenges.filter(challenge => challenge.status !== 'draft');
  return visible.find(challenge => challenge.joined && challengeState(challenge) === 'Live')
    ?? visible.find(challenge => challengeState(challenge) === 'Live')
    ?? visible.find(challenge => challenge.joined)
    ?? visible.find(challenge => challenge.participant_count > 0)
    ?? visible[0];
}
export function scoringSummary(config: ChallengeConfiguration) {
  if (config.scoringMode === 'LEGACY') return `${config.legacy.sessionPoints} pts / session + ${config.legacy.hourPoints} pts / hour`;
  return [...new Set(config.scoringRules.map(rule => rule.sport))].map(sport => `${sportLabel(sport)} · up to ${Math.max(...config.scoringRules.filter(rule => rule.sport === sport).map(rule => rule.points))} pts`).join('  /  ') || 'Points menu coming soon';
}
export function relativePoints(score: number, mine?: number | null) {
  if (mine == null) return `${score} pts`;
  const gap = score - mine;
  return gap === 0 ? 'Level on points' : `${Math.abs(gap)} pts ${gap > 0 ? 'ahead' : 'behind'}`;
}
export function mountainRows(summit: BoardAthlete[], nearby: BoardAthlete[]) {
  return [...new Map([...summit, ...nearby].map(athlete => [athlete.id, athlete])).values()].sort((a, b) => a.rank - b.rank);
}
