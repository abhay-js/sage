export type RoutePoint = { latitude: number; longitude: number };

export function healthWorkoutId(activityId: string): string | null {
  if (!activityId.startsWith('health_ios_')) return null;
  return activityId.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)?.[1] ?? null;
}

export function routePoints(result: any): RoutePoint[] {
  const locations = result?.data?.locations;
  if (!Array.isArray(locations)) return [];
  return locations.filter(p => p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180)
    .map(p => ({latitude:p.latitude,longitude:p.longitude}));
}
