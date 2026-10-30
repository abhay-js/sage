import {normalizeAppearance,AvatarAppearance} from './avatarBuilder';
const palette: {
  avatarSkins: Record<'warm'|'deep'|'light'|'dark', string>;
  avatarKits: Record<'orange'|'forest'|'lilac'|'gold'|'charcoal', string>;
} = require('./theme.cjs');
export const SKIN_TONES = [
  { id: 'warm', label: 'Warm', color: palette.avatarSkins.warm },
  { id: 'deep', label: 'Deep', color: palette.avatarSkins.deep },
  { id: 'light', label: 'Light', color: palette.avatarSkins.light },
  { id: 'dark', label: 'Dark', color: palette.avatarSkins.dark },
] as const;
export const AVATAR_KITS = [
  { id: 'orange', label: 'Orange', color: palette.avatarKits.orange },
  { id: 'forest', label: 'Forest', color: palette.avatarKits.forest },
  { id: 'lilac', label: 'Lilac', color: palette.avatarKits.lilac },
  { id: 'gold', label: 'Gold', color: palette.avatarKits.gold },
  { id: 'charcoal', label: 'Charcoal', color: palette.avatarKits.charcoal },
] as const;
export const AVATAR_GEAR = ['Cap', 'Band', 'None'] as const;
export const AVATAR_MOVEMENTS = ['Run', 'Ride', 'Swim'] as const;
export interface AthleteAvatar {
  appearance?: AvatarAppearance;
  skin: typeof SKIN_TONES[number]['id'];
  kit: typeof AVATAR_KITS[number]['id'];
  gear: typeof AVATAR_GEAR[number];
  movement: typeof AVATAR_MOVEMENTS[number];
}
export const DEFAULT_AVATAR: AthleteAvatar = { skin: 'warm', kit: 'orange', gear: 'Cap', movement: 'Run' };
export function normalizeAvatar(value?: Partial<AthleteAvatar> | null): AthleteAvatar {
  return {
    ...(value?.appearance&&typeof value.appearance==='object'&&!Array.isArray(value.appearance)?{appearance:normalizeAppearance(value.appearance)}:{}),
    skin: SKIN_TONES.some(tone => tone.id === value?.skin) ? value!.skin! : DEFAULT_AVATAR.skin,
    kit: AVATAR_KITS.some(kit => kit.id === value?.kit) ? value!.kit! : DEFAULT_AVATAR.kit,
    gear: AVATAR_GEAR.includes(value?.gear as AthleteAvatar['gear']) ? value!.gear! : DEFAULT_AVATAR.gear,
    movement: AVATAR_MOVEMENTS.includes(value?.movement as AthleteAvatar['movement']) ? value!.movement! : DEFAULT_AVATAR.movement,
  };
}
