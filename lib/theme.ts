// Shared semantic palette; Tailwind reads the same source.
export const sageColors: {
  bg: string; surface: string; border: string; text: string; muted: string;
  green: string; orange: string; peach: string; ink: string;
  onAccent: string; pale: string; sky: string;
  primary:string;divider:string;secondary:string;danger:string;warning:string;warningBg:string;
  info:string;infoBg:string;purple:string;purpleBg:string;
} = require('./theme.cjs');

// Athlete, authentication and admin screens share the V2 semantic palette.
export const adventureColors: typeof sageColors & {
  skin: string; hair: string; trail: string; ridge: string; forest: string; gold: string;
} = require('./theme.cjs').adventure;
