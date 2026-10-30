import { ReactNode } from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { sageColors } from '../../lib/theme';
export type SageIconName = 'shuffle' | 'plus' | 'users' | 'home' | 'flag' | 'mountain' | 'activity' | 'user' | 'heart' | 'chevron' | 'arrow' | 'list' | 'map' | 'clock' | 'route' | 'up' | 'check' | 'flame' | 'trophy' | 'shield' | 'info' | 'bike' | 'swim' | 'strength' | 'sun' | 'gift';
export function SageIcon({ name, size = 20, color = sageColors.green }: { name: SageIconName; size?: number; color?: string }) {
  const paths: Record<string, ReactNode> = {
    shuffle:<><Path d="M17 3h4v4M3 17l6-6M14 8l7-5M17 21h4v-4M3 7l6 6M14 16l7 5"/></>,
    plus:<Path d="M12 5v14M5 12h14"/>,
    users:<><Circle cx="9" cy="8" r="3.5"/><Path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><Circle cx="17" cy="9" r="2.6"/><Path d="M17 14.3c2.5.2 4.1 1.9 4.5 4.7"/></>,
    gift: <><Path d="M3 10h18v11H3ZM2 7h20v3H2ZM12 7v14" /><Path d="M12 7H7.5a2.5 2.5 0 1 1 2-4c1.4 1.1 2.5 4 2.5 4ZM12 7h4.5a2.5 2.5 0 1 0-2-4c-1.4 1.1-2.5 4-2.5 4Z" /></>,
    sun: <><Circle cx="12" cy="12" r="4" /><Path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></>,
    strength: <><Path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12" /></>,
    swim: <><Path d="M2 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 20c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" /><Circle cx="15" cy="6" r="2" /><Path d="m6 13 5-5 4 3 4-1" /></>,
    bike: <><Circle cx="5" cy="17" r="3.5" /><Circle cx="19" cy="17" r="3.5" /><Path d="m5 17 4-8 4 8h-3.5L14 7h3M8 12h7" /></>,
    home: <><Path d="m3 11 9-8 9 8" /><Path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    flag: <><Path d="M5 21V4" /><Path d="M5 5h11l-2 3 2 3H5" /></>,
    mountain: <><Path d="m2 20 7-12 4 6 2-3 7 9Z" /><Path d="m7 11 2-3 2 3" /></>,
    activity: <><Path d="M3 12h4l2-7 4 14 2-7h6" /></>,
    user: <><Circle cx="12" cy="8" r="4" /><Path d="M4 21a8 8 0 0 1 16 0" /></>,
    heart: <><Path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8Z" /></>,
    chevron: <Path d="m9 18 6-6-6-6" />,
    arrow: <><Path d="m19 12-7-7M19 12l-7 7M19 12H5" /></>,
    list: <><Path d="M8 6h13M8 12h13M8 18h13" /><Path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
    map: <><Path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" /><Path d="M9 3v15M15 6v15" /></>,
    clock: <><Circle cx="12" cy="12" r="9" /><Path d="M12 7v5l3 2" /></>,
    route: <><Circle cx="6" cy="19" r="2" /><Circle cx="18" cy="5" r="2" /><Path d="M8 19h2a2 2 0 0 0 2-2V7a2 2 0 0 1 2-2h2" /></>,
    up: <><Path d="m12 19V5M6 11l6-6 6 6" /></>,
    check: <Path d="m5 12 4 4L19 6" />,
    flame: <Path d="M12 22c4 0 7-2.7 7-6.7 0-3-1.7-5.8-4.2-8.2.1 2-1 3.6-2.2 4.3.2-3.6-1.8-6.8-4.5-9.4.2 4.6-3.1 7-3.1 11.8C5 18.6 8 22 12 22Z" />,
    trophy: <><Path d="M8 4h8v5a4 4 0 0 1-8 0Z" /><Path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v4M8 21h8M10 17h4" /></>,
    shield: <><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><Path d="m9 12 2 2 4-5" /></>,
    info: <><Circle cx="12" cy="12" r="9" /><Path d="M12 11v5M12 8h.01" /></>,
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">{paths[name]}</Svg>;
}
