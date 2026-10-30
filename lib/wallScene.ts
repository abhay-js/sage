import { BoardAthlete } from '../types/product';
import { wallPaths } from './wallArtwork';
import { wallPalette } from './wallPalette';

export type WallTime = 'morning' | 'afternoon' | 'evening' | 'night';
export const WALL_WIDTH = 390, WALL_HEIGHT = wallPaths.H, WALL_TOP = 640, WALL_BASE = 3040;
export function localWallTime(hour = new Date().getHours()): WallTime {
  return hour >= 5 && hour < 11 ? 'morning' : hour >= 11 && hour < 16 ? 'afternoon' : hour >= 16 && hour < 19 ? 'evening' : 'night';
}
export function wallEdge(y: number) {
  let x = 232 + 13 * Math.sin(y / 97) + 7 * Math.sin(y / 41);
  if (y > WALL_BASE - 160) x -= (y - WALL_BASE + 160) * .55;
  return x;
}
export function wallScoreY(score: number, ceiling: number) {
  return WALL_TOP + (1 - Math.max(0, Math.min(1, score / Math.max(1, ceiling)))) * (WALL_BASE - WALL_TOP);
}
export function wallScoreAtY(y: number, ceiling: number) {
  return Math.max(0, Math.max(1, ceiling) * (1 - (y - WALL_TOP) / (WALL_BASE - WALL_TOP)));
}
export function wallPlacements(athletes: BoardAthlete[], ceiling: number) {
  const rows = [...athletes].sort((a, b) => a.rank - b.rank).map(athlete => ({ athlete, y: wallScoreY(athlete.sage_score, ceiling) }));
  // Keep tied/close scores tappable without letting the last climber fall below base camp.
  for (let index = rows.length - 2; index >= 0; index--) rows[index].y = Math.min(rows[index].y, rows[index + 1].y - 88);
  const shift = Math.max(0, 550 - (rows[0]?.y ?? 550));
  return rows.map(row => ({ ...row, y: row.y + shift, x: wallEdge(row.y + shift) }));
}
/** Move score bands with the spaced-out nearby climbers, preserving vertical ordering. */
export function wallWarpY(y: number, placements: ReturnType<typeof wallPlacements>, ceiling: number) {
  const scores = new Map<number, number[]>();
  for (const row of placements) {
    const original = wallScoreY(row.athlete.sage_score, ceiling);
    scores.set(original, [...(scores.get(original) ?? []), row.y]);
  }
  const anchors = [{ from: 470, to: 470 }, ...[...scores].map(([from, ys]) => ({ from, to: ys.reduce((sum, value) => sum + value, 0) / ys.length })), { from: WALL_HEIGHT, to: WALL_HEIGHT }].sort((a, b) => a.from - b.from);
  for (let index = 1; index < anchors.length; index++) {
    const left = anchors[index - 1], right = anchors[index];
    if (y <= right.from) return left.to + Math.max(0, (y - left.from) / Math.max(1, right.from - left.from)) * (right.to - left.to);
  }
  return y;
}
export function wallCrowds(athletes: BoardAthlete[], visibleIds: Set<string>, ceiling: number) {
  const bands = new Map<number, BoardAthlete[]>();
  for (const athlete of athletes) {
    if (athlete.rank <= 3 || visibleIds.has(athlete.id)) continue;
    const band = Math.floor(athlete.sage_score / Math.max(1, ceiling / 12));
    bands.set(band, [...(bands.get(band) ?? []), athlete]);
  }
  return [...bands].sort(([a], [b]) => b - a).map(([band, members]) => {
    const score = members.reduce((sum, athlete) => sum + athlete.sage_score, 0) / members.length;
    const y = wallScoreY(score, ceiling);
    return { band, members, y, x: wallEdge(y), firstRank: Math.min(...members.map(athlete => athlete.rank)), lastRank: Math.max(...members.map(athlete => athlete.rank)) };
  });
}
export function fillWallTemplate(template: string, values: Record<string, unknown>) {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    if (key.startsWith('art.')) return wallPalette.art[`c${key.slice(4)}` as keyof typeof wallPalette.art];
    return String(key.split('.').reduce<unknown>((value, part) => (value as Record<string, unknown>)?.[part], values) ?? '');
  }).replace(/\s(?:class|style)="[^"]*"/g, '');
}
