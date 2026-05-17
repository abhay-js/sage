import {
  SCORE_PER_SESSION,
  SCORE_PER_HOUR,
  STREAK_BONUS_7D,
  STREAK_BONUS_30D,
} from './config';
import { ActivityLog, Race } from '../types';

export function computeScore(
  activities: ActivityLog[],
  race: Race,
  bonusPoints: number
): { sage_score: number; sessions: number; total_hours: number; streak: number } {
  const start = new Date(race.challenge_start).getTime();
  const end = new Date(race.challenge_end).getTime();

  const qualifying = activities.filter((a) => {
    const t = new Date(a.activity_date).getTime();
    return race.sport_types.includes(a.sport_type) && t >= start && t <= end;
  });

  const sessions = qualifying.length;
  const total_hours = qualifying.reduce((s, a) => s + a.moving_time_secs / 3600, 0);
  const streak = computeStreak(qualifying);
  const streak_bonus = streak >= 30 ? STREAK_BONUS_30D : streak >= 7 ? STREAK_BONUS_7D : 0;

  const sage_score =
    sessions * SCORE_PER_SESSION +
    Math.floor(total_hours * SCORE_PER_HOUR) +
    streak_bonus +
    bonusPoints;

  return { sage_score, sessions, total_hours, streak };
}

function computeStreak(activities: ActivityLog[]): number {
  if (activities.length === 0) return 0;

  const daySet = new Set(
    activities.map((a) => a.activity_date.slice(0, 10))
  );

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (daySet.has(key)) {
      streak++;
    } else if (streak > 0) {
      break;
    }
  }

  return streak;
}
