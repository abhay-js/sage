import { Platform } from 'react-native';
import { mountainTerrain } from '../../lib/mountainTerrain';
import Svg, { SvgXml, Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { adventureColors as c } from '../../lib/theme';
import { AthleteAvatar, AVATAR_KITS, SKIN_TONES, normalizeAvatar } from '../../lib/avatar';
import {BitmojiAvatar} from './BitmojiAvatar';

export function AthleteIllustration({ current = false, size = 90, seated = false, avatar }: { current?: boolean; size?: number; seated?: boolean; avatar?: AthleteAvatar | null }) {
  const appearance = normalizeAvatar(avatar ?? (current ? null : {kit:'forest',gear:'None'}));
  if(appearance.appearance)return <BitmojiAvatar appearance={appearance.appearance} size={size} height={size*106/90} pose={seated?'step':undefined}/>;
  const kit = AVATAR_KITS.find(option => option.id === appearance.kit)!.color;
  const skin = SKIN_TONES.find(option => option.id === appearance.skin)!.color;
  return <Svg width={size} height={size * 106 / 90} viewBox="0 0 90 106" {...(Platform.OS==='web'?{'aria-hidden':true}:{accessibilityElementsHidden:true,importantForAccessibility:'no-hide-descendants' as const})}>
    <Ellipse cx="45" cy="99" rx="25" ry="5" fill={c.green} opacity={0.12} />
    {appearance.movement === 'Ride' && !seated && <G fill="none" stroke={c.ink} strokeWidth="3"><Circle cx="19" cy="87" r="12"/><Circle cx="72" cy="87" r="12"/><Path d="M19 87l16-20 12 20H19l12-25h8m8 25l16-25 9 25M57 61h12"/></G>}
    <Path d={seated ? 'M31 69 29 84 42 91M57 69 62 84 50 91' : 'M31 69 29 92M57 69 62 92'} fill="none" stroke={c.ink} strokeWidth="10" strokeLinecap="round" />
    <Path d={seated ? 'M39 92h9M46 92h9' : 'M26 95h9M59 95h10'} stroke={c.surface} strokeWidth="7" strokeLinecap="round" />
    <Path d="M31 48Q20 47 20 66M58 49Q70 47 72 62" fill="none" stroke={skin} strokeWidth="9" strokeLinecap="round" />
    <Path d="M27 46Q44 39 61 46L63 73Q46 80 27 72Z" fill={kit} />
    <Path d="M33 50l1 18" stroke={c.onAccent} opacity={0.2} strokeWidth="4" strokeLinecap="round" />
    <Path d="M45 52v9m-4-5h8" stroke={c.surface} strokeWidth="2" strokeLinecap="round" />
    <Rect x="37" y="35" width="14" height="14" rx="6" fill={skin} />
    <Ellipse cx="44" cy="27" rx="22" ry="23" fill={skin} />
    <Ellipse cx="22" cy="30" rx="4" ry="6" fill={skin} /><Ellipse cx="66" cy="30" rx="4" ry="6" fill={skin} />
    <Path d="M23 23Q18 2 42 2Q64 0 65 22L59 14 50 18 37 13 27 23Z" fill={c.hair} />
    <Circle cx="36" cy="29" r="2" fill={c.ink} /><Circle cx="52" cy="29" r="2" fill={c.ink} />
    <Path d="M39 38q5 4 10-1" fill="none" stroke={c.hair} strokeWidth="1.8" strokeLinecap="round" />
    {appearance.gear === 'Cap' && <><Path d="M22 19Q21 -1 44 0 65 0 66 19Z" fill={kit} /><Path d="M20 19q-8 4-6 6h37q3-3-3-6Z" fill={kit} /><Path d="M44 3v12" stroke={c.surface} opacity={0.5} strokeWidth="2" /></>}
    {appearance.gear === 'Band' && <><Path d="M23 18q20-7 42 0v7q-21-7-42 0Z" fill={kit}/><Path d="M65 20l8 7m-8-6 8-2" stroke={kit} strokeWidth="3"/></>}
    {appearance.movement === 'Swim' && <G stroke={c.ink} strokeWidth="3" fill={c.sky}><Rect x="28" y="24" width="14" height="10" rx="4"/><Rect x="47" y="24" width="14" height="10" rx="4"/><Path d="M42 28h5"/></G>}
  </Svg>;
}

export function TrailLandscape({ tall = false }: { tall?: boolean }) {
  return <Svg width="100%" height="100%" viewBox={tall ? '0 0 430 1700' : '0 0 430 200'} preserveAspectRatio="none" {...(Platform.OS==='web'?{'aria-hidden':true}:{accessibilityElementsHidden:true,importantForAccessibility:'no-hide-descendants' as const})}>
    <Rect width="430" height={tall ? 1700 : 200} fill={c.sky} />
    <Circle cx="345" cy={tall ? 95 : 35} r="24" fill={c.surface} opacity={0.8} />
    {tall ? <>
      <Path d="M0 400 215 90 430 400V1700H0Z" fill={c.ridge} /><Path d="m145 192 70-102 76 112-50-23-27 19-32-25Z" fill={c.surface} />
      <Path d="M0 700Q200 360 430 620V1700H0Z" fill={c.forest} /><Path d="M0 1080Q210 710 430 1030V1700H0Z" fill={c.ridge} />
      <Path d="M0 1480Q230 1130 430 1440V1700H0Z" fill={c.green} opacity={0.45} />
      <Path d="M220 200C80 380 390 430 235 570S80 800 230 920 380 1120 215 1240 90 1500 230 1700" stroke={c.trail} strokeWidth="23" fill="none" />
      {[450, 790, 1160, 1510].map((y, i) => <G key={y} transform={`translate(${i % 2 ? 330 : 40} ${y})`}><Path d="M0 50 18 8 36 50ZM5 30 18 0 31 30Z" fill={c.green} /><Path d="M18 45v18" stroke={c.hair} strokeWidth="4" /></G>)}
    </> : <>
      <Path d="M0 160 100 58 160 115 235 28 345 145 405 70 430 120V200H0Z" fill={c.ridge} />
      <Path d="m209 61 26-33 35 38-25-9-13 12Z" fill={c.surface} />
      <Path d="M0 170Q150 100 300 170T430 160V200H0Z" fill={c.forest} />
      <Path d="M210 200Q95 158 200 145T235 100" fill="none" stroke={c.trail} strokeWidth="12" />
      <G transform="translate(35 122)"><Path d="M0 50 18 8 36 50ZM5 30 18 0 31 30Z" fill={c.green} /></G>
    </>}
  </Svg>;
}

export function MountainTerrain(){return <SvgXml xml={mountainTerrain} width="100%" height="100%"/>;}
