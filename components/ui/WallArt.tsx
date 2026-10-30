import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { AthleteAvatar, normalizeAvatar, SKIN_TONES, AVATAR_KITS } from '../../lib/avatar';
import { wallPalette as p } from '../../lib/wallPalette';
import { wallPaths, wallSkyTemplate, wallRockTemplate, wallAvatarTemplate, wallTrophyTemplate } from '../../lib/wallArtwork';
import { WallTime, fillWallTemplate } from '../../lib/wallScene';

export const WallSky = memo(function WallSky({ time, width, height }: { time: WallTime; width: number; height: number }) {
  const xml = useMemo(() => fillWallTemplate(wallSkyTemplate, { th: p[time], forestD: wallPaths.forest, forest2D: wallPaths.forest2 }), [time]);
  return <SvgXml xml={xml} width={width} height={height} preserveAspectRatio="xMidYMid slice" />;
});
export const WallRock = memo(function WallRock({ time, width, height }: { time: WallTime; width: number; height: number }) {
  const xml = useMemo(() => fillWallTemplate(wallRockTemplate, { th: p[time], H: wallPaths.H, viewBox: `0 0 390 ${wallPaths.H}`, ...Object.fromEntries(Object.entries(wallPaths).map(([key, value]) => [key + 'D', value])), planLineD: 'M0 0' }), [time]);
  return <SvgXml xml={xml} width={width} height={height} />;
});
export function WallTrophy({ size = 44 }: { size?: number }) {
  return <SvgXml xml={fillWallTemplate(wallTrophyTemplate, {})} width={size} height={size * 48 / 44} />;
}
export const WallAvatar = memo(function WallAvatar({ avatar, pose = 'climb', size = 52, delay = 0, animated = true }: { avatar?: Partial<AthleteAvatar> | null; pose?: 'climb' | 'stand' | 'wave' | 'bust'; size?: number; delay?: number; animated?: boolean }) {
  const bob = useRef(new Animated.Value(0)).current, [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => { let active = true; void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }); const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion); return () => { active = false; sub.remove(); }; }, []);
  useEffect(() => {
    if (!animated || reduceMotion || pose === 'bust') return;
    const loop = Animated.loop(Animated.sequence([Animated.delay(delay * 1000), Animated.timing(bob, { toValue: -2, duration: 900, useNativeDriver: true }), Animated.timing(bob, { toValue: 0, duration: 900, useNativeDriver: true })]));
    loop.start(); return () => { loop.stop(); bob.setValue(0); };
  }, [animated, reduceMotion, pose, delay]);
  const xml = useMemo(() => {
    const a = normalizeAvatar(avatar), sport = a.movement.toLowerCase(), kit = AVATAR_KITS.find(value => value.id === a.kit)!.color;
    const on = (value: boolean) => value ? 'inline' : 'none';
    const covered = sport === 'ride' || sport === 'swim';
    const colors = p.avatar;
    return fillWallTemplate(wallAvatarTemplate, {
      kit, kitAccent: sport === 'ride' ? p.ink : p.white, skin: SKIN_TONES.find(value => value.id === a.skin)!.color,
      hair: colors.hair, pants: sport === 'ride' ? colors.ridePants : sport === 'swim' ? colors.swimPants : colors.runPants,
      shoe: sport === 'ride' ? colors.ridePants : sport === 'swim' ? colors.swimShoe : kit, pack: sport === 'ride' ? kit : colors.pack,
      eye: sport === 'ride' ? colors.rideEye : sport === 'swim' ? colors.swimEye : colors.runEye,
      headT: pose === 'climb' ? 'translate(42 36) rotate(6) scale(.92)' : pose === 'bust' ? 'translate(50 52) scale(1.25)' : 'translate(50 38)',
      shadowO: pose === 'climb' ? 0 : .18, mouthD: pose === 'wave' ? 'M-6 14Q0 23 6 14Z' : 'M-5 15Q0 20 5 15', mouthFill: pose === 'wave' ? colors.mouth : 'none',
      show: { climb: on(pose === 'climb'), stand: on(pose === 'stand' || pose === 'wave'), bust: on(pose === 'bust'), armDown: on(pose === 'stand'), armUp: on(pose === 'wave'), bib: on(sport === 'run'), zip: on(sport === 'ride'), wave: on(sport === 'swim'), tank: 'none', lift: 'none', hairShort: on(!covered), hairSpiky: 'none', hairCurly: 'none', hairFringe: 'none', hairLong: 'none', hairPony: 'none', hairBun: 'none', lashes: 'none', helmet: on(sport === 'ride'), cap: on(sport === 'swim'), band: on(sport === 'run' && a.gear !== 'None'), sweat: 'none' },
    });
  }, [avatar, pose]);
  return <Animated.View pointerEvents="none" style={{ width: size, height: size * 1.2, transform: [{ translateY: bob }] }}><SvgXml xml={xml} width={size} height={size * 1.2} /></Animated.View>;
});
