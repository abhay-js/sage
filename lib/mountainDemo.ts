import { AthleteAvatar } from './avatar';
import { emptyChallengeConfig } from './productConfig';
import { AroundMe, BoardAthlete, ProductChallenge } from '../types/product';

export const MOUNTAIN_DEMO_ID = 'w7-demo-300';
export const MOUNTAIN_DEMO_SELF = 'w7-demo-you';
const firstNames = ['Aarav', 'Diya', 'Kabir', 'Ananya', 'Arjun', 'Meera', 'Ishaan', 'Tara', 'Rohan', 'Sana', 'Dev', 'Zoya', 'Kiran', 'Priya', 'Neha', 'Vihaan', 'Aisha', 'Aditya', 'Nisha', 'Yash'];
const lastNames = ['Mehta', 'Shah', 'Rao', 'Kapoor', 'Iyer', 'Thomas', 'Singh', 'Patel', 'Nair', 'Khan', 'Das', 'Menon', 'Joshi', 'Verma', 'Bose'];
/** Synthetic display data only. Never passed to auth, scoring or submission APIs. */
export function createMountainDemo(): { challenge: ProductChallenge; athletes: BoardAthlete[]; around: AroundMe } {
  const athletes: BoardAthlete[] = Array.from({ length: 300 }, (_, index) => {
    const rank = index + 1, self = rank === 47;
    const avatar: AthleteAvatar = { skin: (['warm', 'deep', 'light', 'dark'] as const)[index % 4], kit: (['orange', 'forest', 'lilac', 'gold', 'charcoal'] as const)[index % 5], gear: (['Cap', 'Band', 'None'] as const)[index % 3], movement: (['Run', 'Ride', 'Swim'] as const)[Math.floor(index / 4) % 3] };
    return { id: `w7-demo-entry-${rank}`, user_id: self ? MOUNTAIN_DEMO_SELF : `w7-demo-athlete-${rank}`, rank, sage_score: Math.max(0, Math.round(480 * Math.pow(1 - index / 299, 1.6))), level: index % 3 + 1, user: { name: self ? 'You · Demo athlete' : `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length)]}`, avatar }, sessions: Math.max(0, 28 - Math.floor(index / 12)), streak: index % 8, total_hours: Math.round((30 - index / 10) * 10) / 10 };
  });
  const config = emptyChallengeConfig();
  config.description = 'Local visual demo with 300 fictional athletes. Scores do not belong to real accounts.';
  const challenge: ProductChallenge = { id: MOUNTAIN_DEMO_ID, name: 'W7 Demo · 300 athletes', city: null, sport_types: ['Run', 'Ride', 'Swim', 'WeightTraining'], challenge_start: '2026-01-01T00:00:00Z', challenge_end: '2099-01-01T00:00:00Z', race_date: '2099-01-01', status: 'open', config, eligible_levels: [1, 2, 3], participant_count: 300, joined: false, level_at_join: null, eligibility: 'ELIGIBLE', sage_score: 0, rank: null, revision: 1 };
  const current = athletes[46];
  return { challenge, athletes, around: { current, above: athletes.slice(43, 46), below: athletes.slice(47, 50), summit: athletes.slice(0, 3), total: athletes.length, nextGap: athletes[45].sage_score - current.sage_score + 1 } };
}

export function demoBoard(athletes: BoardAthlete[], page: number, query: string) {
  const filtered = athletes.filter(athlete => athlete.user.name.toLowerCase().includes(query.toLowerCase()));
  return { athletes: filtered.slice(page * 50, (page + 1) * 50), total: filtered.length };
}
