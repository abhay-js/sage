import { activityLogColors } from './activityLogPalette';
export const homeColors={...activityLogColors,
  dot:'#C9D3DA',progress:'#E7EDF1',tagOverlay:'#0F1B24C7',gold:'#FFC94D',
  mountain:{top:'#BFE0F5',bottom:'#E6F2FA',ridge:'#B9D0DE',slope:'#6FA38B',shadow:'#2F6B57',base:'#1E4A3C'},
  run:{top:'#F8E3C6',bottom:'#F2D2AE',sand:'#E9C9A3',track:'#C9734A',ink:'#7A3B20',chip:'#FBEBDD'},
  duel:{top:'#2A4A7A',bottom:'#1F3A68',chip:'#E1E9F5'},
  upcoming:{top:'#1A2A33',bottom:'#2C3F4A',ridge:'#3A4E5A'},
} as const;
